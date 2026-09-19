/**
 * Torre Vertical — servidor de salas
 *
 * Sirve el juego en  /  y retransmite posiciones en  /ws?sala=ABCD
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE SERVIDOR USA UNA BASE DE DATOS
 *
 * Deno Deploy ejecuta la aplicación en DOS regiones a la vez en el plan
 * gratuito: `ord` (Chicago) y `ams` (Ámsterdam). Elegir una sola región es de
 * pago. Cada región es un proceso independiente con su propia memoria, así que
 * si las salas viven solo en memoria, un jugador enrutado a Ámsterdam crea su
 * propia sala "ABCD" que nadie más ve. Pasa exactamente eso: los de América
 * entran juntos y el de España se queda solo.
 *
 * La solución es que las dos regiones se cuenten lo que tienen a través de
 * Deno KV:
 *
 *   · Los jugadores conectados A ESTA región se retransmiten desde memoria,
 *     a 15 Hz. Fluido, sin coste.
 *   · Cada 200 ms esta región publica en KV su "trozo" de cada sala, y lee los
 *     trozos de las demás. Así los jugadores de la otra región aparecen aquí.
 *   · La semilla de la torre se fija en KV con una escritura atómica, de modo
 *     que gana el PRIMERO que entra en todo el mundo, no el primero de cada
 *     región. Sin esto, cada región generaría una torre distinta.
 *
 * Si no hay base de datos enlazada, el servidor sigue funcionando: simplemente
 * vuelve al comportamiento de antes (cada región por su cuenta) y lo avisa en
 * los logs.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DESPLIEGUE
 *   1. En el panel de Deno Deploy → pestaña "Databases" → crea una base
 *      Deno KV y enlázala a esta aplicación.
 *   2. Vuelve a desplegar.
 * ─────────────────────────────────────────────────────────────────────────
 */

const HZ = 15;                    // reparto a los clientes de esta región
const PERIODO_KV = 200;           // cada cuánto se sincroniza con la otra región
const TTL_TROZO = 4000;           // un trozo caduca solo si su región calla
const MAX_POR_SALA = 16;
const MAX_SALAS = 200;
const TTL_SEMILLA = 12 * 60 * 60 * 1000;

const MI_ID = crypto.randomUUID().slice(0, 8);

let kv: Deno.Kv | null = null;
try {
  kv = await Deno.openKv();
  console.log(`[${MI_ID}] KV enlazada: las regiones compartirán salas`);
} catch (e) {
  console.warn(`[${MI_ID}] Sin KV (${e instanceof Error ? e.message : e}). ` +
    `Cada región irá por su cuenta: enlaza una base Deno KV en el panel.`);
}

type JugadorPub = {
  id: string; name: string; color: string;
  x: number; y: number; z: number; ry: number; best: number;
};
type Jugador = JugadorPub & { ws: WebSocket };

type Sala = {
  codigo: string;
  seed: string;
  altura: number;
  locales: Map<string, Jugador>;
  remotos: JugadorPub[];          // de las otras regiones, vía KV
  timer: number | null;
};

const salas = new Map<string, Sala>();

const num = (v: unknown, d = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;
const texto = (v: unknown, d: string, max: number) =>
  typeof v === "string" && v.length ? v.slice(0, max) : d;

/* ───────────────────────── semilla global ───────────────────────── */
/* Escritura atómica: solo triunfa si la clave no existía. Así la torre la
   fija el primer jugador del mundo, no el primero de cada región.          */
async function acordarSemilla(
  codigo: string, propuesta: string, altura: number,
): Promise<{ seed: string; altura: number }> {
  if (!kv) return { seed: propuesta, altura };
  const clave = ["semilla", codigo];
  try {
    const actual = await kv.get<{ seed: string; altura: number }>(clave);
    if (actual.value) return actual.value;
    const res = await kv.atomic()
      .check({ key: clave, versionstamp: null })
      .set(clave, { seed: propuesta, altura }, { expireIn: TTL_SEMILLA })
      .commit();
    if (res.ok) return { seed: propuesta, altura };
    const otra = await kv.get<{ seed: string; altura: number }>(clave);
    return otra.value ?? { seed: propuesta, altura };
  } catch {
    return { seed: propuesta, altura };
  }
}

/* ───────────────────────── puente entre regiones ───────────────────────── */
async function sincronizar(sala: Sala) {
  if (!kv) return;
  const mios: JugadorPub[] = [...sala.locales.values()].map((j) => ({
    id: j.id, name: j.name, color: j.color,
    x: j.x, y: j.y, z: j.z, ry: j.ry, best: j.best,
  }));
  try {
    // publico lo mío
    await kv.set(["sala", sala.codigo, MI_ID], { ts: Date.now(), jugadores: mios },
      { expireIn: TTL_TROZO });

    // leo lo de las demás regiones
    const ajenos: JugadorPub[] = [];
    const corte = Date.now() - TTL_TROZO;
    for await (
      const e of kv.list<{ ts: number; jugadores: JugadorPub[] }>(
        { prefix: ["sala", sala.codigo] },
      )
    ) {
      const id = e.key[2];
      if (id === MI_ID) continue;
      const v = e.value;
      if (!v || typeof v.ts !== "number" || v.ts < corte) continue;
      if (Array.isArray(v.jugadores)) ajenos.push(...v.jugadores);
    }
    sala.remotos = ajenos;
  } catch (e) {
    console.warn(`[${MI_ID}] fallo sincronizando ${sala.codigo}:`, e);
  }
}

/* ───────────────────────── reparto a los clientes ───────────────────────── */
function repartir(sala: Sala) {
  const p: JugadorPub[] = [
    ...[...sala.locales.values()].map((j) => ({
      id: j.id, name: j.name, color: j.color,
      x: j.x, y: j.y, z: j.z, ry: j.ry, best: j.best,
    })),
    ...sala.remotos,
  ];
  const msg = JSON.stringify({ t: "state", p });
  for (const j of sala.locales.values()) {
    if (j.ws.readyState === WebSocket.OPEN) {
      try { j.ws.send(msg); } catch { /* se cerrará solo */ }
    }
  }
}

function arrancar(sala: Sala) {
  if (sala.timer !== null) return;
  let desdeKv = 0;
  sala.timer = setInterval(() => {
    repartir(sala);
    desdeKv += 1000 / HZ;
    if (desdeKv >= PERIODO_KV) { desdeKv = 0; sincronizar(sala); }
  }, 1000 / HZ);
}

function parar(sala: Sala) {
  if (sala.timer !== null) { clearInterval(sala.timer); sala.timer = null; }
}

async function salir(sala: Sala, id: string) {
  sala.locales.delete(id);
  if (sala.locales.size === 0) {
    parar(sala);
    salas.delete(sala.codigo);
    // borro mi trozo para que la otra región no siga viendo fantasmas
    if (kv) { try { await kv.delete(["sala", sala.codigo, MI_ID]); } catch { /* da igual */ } }
    console.log(`[${MI_ID}] sala ${sala.codigo} vacía aquí, cerrada`);
  }
}

/* ───────────────────────── websocket ───────────────────────── */
function manejarWS(req: Request, codigo: string): Response {
  const { socket, response } = Deno.upgradeWebSocket(req);
  const id = MI_ID + "-" + crypto.randomUUID().slice(0, 6);
  let sala: Sala | null = null;

  socket.onmessage = async (ev) => {
    let d: Record<string, unknown>;
    try { d = JSON.parse(String(ev.data)); } catch { return; }
    if (!d || typeof d !== "object") return;

    if (d.t === "hello") {
      if (!salas.has(codigo) && salas.size >= MAX_SALAS) {
        socket.close(1013, "demasiadas salas"); return;
      }

      const acuerdo = await acordarSemilla(
        codigo, texto(d.seed, "20260918", 32), num(d.altura, 800),
      );

      sala = salas.get(codigo) ?? {
        codigo, seed: acuerdo.seed, altura: acuerdo.altura,
        locales: new Map(), remotos: [], timer: null,
      };
      // si otra región ya había fijado la torre, mando la suya
      sala.seed = acuerdo.seed;
      sala.altura = acuerdo.altura;
      salas.set(codigo, sala);

      if (sala.locales.size >= MAX_POR_SALA) {
        socket.close(1013, "sala llena"); return;
      }

      sala.locales.set(id, {
        id,
        name: texto(d.name, "escalador", 14),
        color: texto(d.color, "#4FD1C5", 9),
        x: 0, y: 0, z: 0, ry: 0, best: 0,
        ws: socket,
      });

      socket.send(JSON.stringify({
        t: "init", id, seed: sala.seed, altura: sala.altura, region: MI_ID,
      }));
      arrancar(sala);
      sincronizar(sala);
      console.log(`[${MI_ID}] sala ${codigo}: entra ${id} (${sala.locales.size} aquí)`);

    } else if (d.t === "p" && sala) {
      const j = sala.locales.get(id);
      if (!j) return;
      j.x = num(d.x); j.y = num(d.y); j.z = num(d.z);
      j.ry = num(d.ry); j.best = num(d.best);
    }
  };

  const cerrar = () => { if (sala) salir(sala, id); };
  socket.onclose = cerrar;
  socket.onerror = cerrar;

  return response;
}

/* ───────────────────────── http ───────────────────────── */
let htmlCache: string | null = null;
async function html(): Promise<string> {
  if (htmlCache) return htmlCache;
  try {
    htmlCache = await Deno.readTextFile(new URL("./index.html", import.meta.url));
  } catch {
    htmlCache = "<!doctype html><meta charset=utf-8><body style='font:16px system-ui;padding:40px'>" +
      "<h1>Falta index.html</h1><p>Copia <code>torre-preview.html</code> como " +
      "<code>index.html</code> junto a <code>main.ts</code>.</p>";
  }
  return htmlCache;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/ws") {
    if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("se esperaba un websocket", { status: 400 });
    }
    const codigo = (url.searchParams.get("sala") ?? "")
      .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "AAAA";
    return manejarWS(req, codigo);
  }

  // Diagnóstico: qué ve ESTA región. Ábrelo desde dos sitios distintos y
  // compara — si "kv" es true, los totales deben coincidir.
  if (url.pathname === "/salas") {
    return Response.json({
      region: MI_ID,
      kv: !!kv,
      salas: [...salas.values()].map((s) => ({
        sala: s.codigo, semilla: s.seed, altura: s.altura,
        aqui: s.locales.size,
        otrasRegiones: s.remotos.length,
        total: s.locales.size + s.remotos.length,
      })),
    });
  }

  return new Response(await html(), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
});
