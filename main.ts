/**
 * Torre Vertical — servidor de salas
 *
 * Un solo archivo que hace dos cosas:
 *   1. Sirve el juego en  /          (index.html, al lado de este archivo)
 *   2. Retransmite posiciones en /ws?sala=ABCD
 *
 * Por qué un retransmisor y no P2P: un WebSocket es una conexión SALIENTE a un
 * puerto normal. No tiene que atravesar el NAT, así que funciona detrás de una
 * VPN, de un wifi de oficina o de un router con NAT simétrico — exactamente los
 * casos en los que la conexión directa entre navegadores fracasa.
 *
 * Desplegar en Deno Deploy:
 *   1. Sube esta carpeta a un repositorio de GitHub.
 *   2. En dash.deno.com → New Project → elige el repo → entry point: main.ts
 *   3. Te da una URL del tipo https://tu-app.deno.dev
 *
 * Probar en local:  deno run -A main.ts   (luego abre http://localhost:8000)
 */

const HZ = 15;                       // veces por segundo que se reparte el estado
const MAX_POR_SALA = 16;
const MAX_SALAS = 200;

type Jugador = {
  id: string;
  name: string;
  color: string;
  x: number; y: number; z: number; ry: number; best: number;
  ws: WebSocket;
};

type Sala = {
  codigo: string;
  seed: string;
  altura: number;
  jugadores: Map<string, Jugador>;
  timer: number | null;
};

const salas = new Map<string, Sala>();

const num = (v: unknown, def = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : def;
const texto = (v: unknown, def: string, max: number) =>
  typeof v === "string" && v.length ? v.slice(0, max) : def;

function repartir(sala: Sala) {
  const p = [...sala.jugadores.values()].map((j) => ({
    id: j.id, name: j.name, color: j.color,
    x: j.x, y: j.y, z: j.z, ry: j.ry, best: j.best,
  }));
  const msg = JSON.stringify({ t: "state", p });
  for (const j of sala.jugadores.values()) {
    if (j.ws.readyState === WebSocket.OPEN) {
      try { j.ws.send(msg); } catch { /* se cerrará solo */ }
    }
  }
}

function arrancar(sala: Sala) {
  if (sala.timer !== null) return;
  sala.timer = setInterval(() => repartir(sala), 1000 / HZ);
}

function parar(sala: Sala) {
  if (sala.timer !== null) { clearInterval(sala.timer); sala.timer = null; }
}

function salir(sala: Sala, id: string) {
  sala.jugadores.delete(id);
  if (sala.jugadores.size === 0) {
    parar(sala);
    salas.delete(sala.codigo);
    console.log(`sala ${sala.codigo} vacía, cerrada`);
  }
}

function manejarWS(req: Request, codigo: string): Response {
  const { socket, response } = Deno.upgradeWebSocket(req);
  const id = crypto.randomUUID().slice(0, 8);
  let sala: Sala | null = null;

  socket.onopen = () => { /* esperamos el hello para conocer la semilla */ };

  socket.onmessage = (ev) => {
    let d: Record<string, unknown>;
    try { d = JSON.parse(String(ev.data)); } catch { return; }
    if (!d || typeof d !== "object") return;

    if (d.t === "hello") {
      if (salas.size >= MAX_SALAS && !salas.has(codigo)) {
        socket.close(1013, "demasiadas salas");
        return;
      }
      // El PRIMERO que entra fija la torre; los demás la reciben.
      sala = salas.get(codigo) ?? {
        codigo,
        seed: texto(d.seed, "20260918", 32),
        altura: num(d.altura, 800),
        jugadores: new Map(),
        timer: null,
      };
      salas.set(codigo, sala);

      if (sala.jugadores.size >= MAX_POR_SALA) {
        socket.close(1013, "sala llena");
        return;
      }

      sala.jugadores.set(id, {
        id,
        name: texto(d.name, "escalador", 14),
        color: texto(d.color, "#4FD1C5", 9),
        x: 0, y: 0, z: 0, ry: 0, best: 0,
        ws: socket,
      });

      socket.send(JSON.stringify({
        t: "init", id, seed: sala.seed, altura: sala.altura,
      }));
      arrancar(sala);
      console.log(`sala ${codigo}: entra ${id} (${sala.jugadores.size})`);

    } else if (d.t === "p" && sala) {
      const j = sala.jugadores.get(id);
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

  if (url.pathname === "/salas") {
    // pequeño panel: qué salas hay abiertas ahora mismo
    const datos = [...salas.values()].map((s) => ({
      sala: s.codigo, jugadores: s.jugadores.size, semilla: s.seed, altura: s.altura,
    }));
    return Response.json(datos);
  }

  return new Response(await html(), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
});
