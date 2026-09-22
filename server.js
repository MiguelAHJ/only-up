/**
 * Torre Vertical — servidor de salas
 *
 * Sirve el juego en  /  y retransmite las posiciones en  /ws?sala=ABCD
 *
 * Un solo proceso, una sola memoria: las salas viven aquí y punto. Esto es
 * mucho más simple que la versión de Deno Deploy, que necesitaba una base de
 * datos solo para que sus dos regiones se pusieran de acuerdo. Con servidor
 * propio ese problema no existe.
 *
 * Por qué WebSocket y no conexión directa entre navegadores: un WebSocket es
 * una conexión SALIENTE a un puerto normal, así que no tiene que atravesar el
 * NAT. Funciona detrás de VPN, de wifi de oficina y de cualquier router
 * doméstico — justo donde el P2P fracasaba.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PUERTO = process.env.PORT || 3000;
const HZ = 15;                   // veces por segundo que se reparte el estado
const REPOSO_MS = 1000;          // sala quieta: 1 reparto por segundo, no 15
const MAX_POR_SALA = 16;
const MAX_SALAS = 200;
/* Se echa a quien lleva un rato mudo. Eran 60 s y era muy poco: el cliente
   deja de mandar posición en cuanto entra en pausa (Alt+Tab suelta el ratón)
   o la pestaña pasa a segundo plano, así que irte un minuto al baño bastaba
   para que os sacara a los dos y, al quedarse la sala vacía, se cerrara. Tres
   minutos cubre las ausencias cortas; para las largas está la reconexión
   automática del cliente. Subirlo más solo dejaría fantasmas flotando. */
const INACTIVIDAD = 180_000;

const salas = new Map();

const num = (v, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const texto = (v, d, max) => (typeof v === "string" && v.length ? v.slice(0, max) : d);

/* ─────────────────────────── web ─────────────────────────── */
const INDEX = path.join(__dirname, "index.html");

/* Archivos estáticos, solo bajo /modelos/.
   Hasta ahora este servidor devolvía index.html para CUALQUIER url, así que
   pedir un .gltf traía el HTML del juego y el cargador se atragantaba sin
   decir por qué. Se sirve una lista blanca de extensiones y se comprueba
   que la ruta resuelta caiga dentro de la carpeta: con "../" en la url no
   se sale de ahí. */
const RAIZ_MODELOS = path.join(__dirname, "modelos") + path.sep;
const TIPOS = {
  ".gltf": "model/gltf+json",
  ".glb":  "model/gltf-binary",
  ".bin":  "application/octet-stream",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".ktx2": "image/ktx2",
};
function servirModelo(ruta, res) {
  let abs;
  try { abs = path.resolve(__dirname, "." + decodeURIComponent(ruta)); }
  catch (e) { res.writeHead(400); res.end(); return; }
  if (!abs.startsWith(RAIZ_MODELOS)) { res.writeHead(403); res.end(); return; }
  const tipo = TIPOS[path.extname(abs).toLowerCase()];
  if (!tipo) { res.writeHead(404); res.end(); return; }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": tipo, "cache-control": "public, max-age=3600" });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const ruta = (req.url || "/").split("?")[0];

  if (ruta === "/salud") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, salas: salas.size, subida: process.uptime() }));
    return;
  }

  // Diagnóstico: qué salas hay abiertas ahora mismo
  if (ruta === "/salas") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify([...salas.values()].map((s) => ({
      sala: s.codigo, semilla: s.seed, altura: s.altura, dif: s.dif, jugadores: s.jugadores.size,
    }))));
    return;
  }

  if (ruta.startsWith("/modelos/")) { servirModelo(ruta, res); return; }

  fs.readFile(INDEX, (err, html) => {
    if (err) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Falta index.html junto a server.js");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
});

/* ─────────────────────────── salas ─────────────────────────── */
function repartir(sala) {
  if (!sala || !sala.jugadores) return;   // cinturón: un reparto no tumba el proceso
  const p = [...sala.jugadores.values()].map((j) => ({
    id: j.id, name: j.name, color: j.color,
    x: j.x, y: j.y, z: j.z, ry: j.ry, best: j.best,
  }));
  const msg = JSON.stringify({ t: "state", p });

  /* Si nadie se ha movido, este mensaje es byte a byte el mismo que el
     anterior (el cliente redondea a 2 decimales, así que un jugador quieto da
     siempre lo mismo). Mandarlo 15 veces por segundo a una sala de gente AFK
     es tráfico que no informa de nada.
     Medido antes de esto: una sala de 4 con las pestañas olvidadas gastaba
     ~59 GB al mes, y una de 16 unos 910 GB —con 1 TB incluido en Ashburn eso
     es el cupo entero—. Quieta, la sala baja a 1 reparto por segundo (hace
     falta alguno para que nadie se dé por desaparecido); en cuanto alguien se
     mueve, el mensaje cambia y vuelve a los 15 Hz en el siguiente tick, así
     que jugando no se nota absolutamente nada. */
  const ahora = Date.now();
  if (msg === sala.ultimoMsg && ahora - sala.ultimoReparto < REPOSO_MS) return;
  sala.ultimoMsg = msg;
  sala.ultimoReparto = ahora;

  for (const j of sala.jugadores.values()) {
    if (j.ws.readyState === 1) { try { j.ws.send(msg); } catch { /* se cerrará solo */ } }
  }
}

/* Idempotente a propósito: la llaman tanto el cierre de cada conexión como el
   barrido de inactividad, y antes la misma sala se "cerraba" tres veces. */
function cerrarSala(sala) {
  if (!sala) return;
  if (sala.timer) { clearInterval(sala.timer); sala.timer = null; }
  if (salas.get(sala.codigo) === sala) {
    salas.delete(sala.codigo);
    console.log(`sala ${sala.codigo} cerrada`);
  }
}

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://x");
  const codigo = (url.searchParams.get("sala") || "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "AAAA";
  const id = Math.random().toString(36).slice(2, 10);
  let sala = null;

  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    if (raw.length > 4096) return;                 // nadie necesita mandar más
    let d;
    try { d = JSON.parse(String(raw)); } catch { return; }
    if (!d || typeof d !== "object") return;

    // Eco instantáneo: el navegador mide el viaje de ida y vuelta y lo
    // enseña en el HUD. Va antes que nada para no falsear la medida.
    if (d.t === "ping") {
      if (ws.readyState === 1) { try { ws.send('{"t":"pong"}'); } catch { /* da igual */ } }
      return;
    }

    if (d.t === "hello") {
      if (sala) return;                            // ya saludó
      if (!salas.has(codigo) && salas.size >= MAX_SALAS) {
        ws.close(1013, "demasiadas salas"); return;
      }

      // El PRIMERO que entra fija la torre; los demás la reciben.
      sala = salas.get(codigo) || {
        codigo,
        seed: texto(d.seed, "20260918", 32),
        altura: num(d.altura, 800),
        // La dificultad la fija el primero que entra, igual que la semilla:
        // si cada uno subiera la suya, no estaríais en la misma torre.
        dif: texto(d.dif, "facil", 12),
        jugadores: new Map(),
        timer: null,
        ultimoMsg: "", ultimoReparto: 0,   // para no repartir lo mismo 15 veces
      };
      salas.set(codigo, sala);

      if (sala.jugadores.size >= MAX_POR_SALA) {
        ws.close(1013, "sala llena"); return;
      }

      sala.jugadores.set(id, {
        id,
        name: texto(d.name, "escalador", 14),
        color: texto(d.color, "#4FD1C5", 9),
        x: 0, y: 0, z: 0, ry: 0, best: 0,
        visto: Date.now(),
        ws,
      });

      ws.send(JSON.stringify({ t: "init", id, seed: sala.seed, altura: sala.altura, dif: sala.dif }));

      /* OJO con esta línea: el temporizador tiene que cerrar sobre la SALA,
         no sobre la variable `sala` de esta conexión. Antes era
         `setInterval(() => repartir(sala), …)`, y como `salir()` pone
         `sala = null` al desconectarse, en cuanto el que había creado la sala
         se iba —quedándose los demás dentro— el temporizador empezaba a
         llamar a repartir(null): excepción sin capturar dentro de un timer,
         o sea el PROCESO ENTERO se caía y tiraba a todas las salas del
         servidor. Con `const s` la referencia ya no se puede volver null. */
      const s = sala;
      if (!s.timer) s.timer = setInterval(() => repartir(s), 1000 / HZ);
      console.log(`sala ${codigo}: entra ${id} (${s.jugadores.size})`);

    } else if (d.t === "p" && sala) {
      const j = sala.jugadores.get(id);
      if (!j) return;
      j.x = num(d.x); j.y = num(d.y); j.z = num(d.z);
      j.ry = num(d.ry); j.best = num(d.best);
      j.visto = Date.now();
    }
  });

  const salir = () => {
    if (!sala) return;
    sala.jugadores.delete(id);
    if (sala.jugadores.size === 0) cerrarSala(sala);
    sala = null;
  };
  ws.on("close", salir);
  ws.on("error", salir);
});

/* Limpieza: conexiones muertas que el navegador no llegó a cerrar bien
   (portátil que se suspende, wifi que se cae). Sin esto quedan fantasmas
   flotando en la torre de los demás.                                     */
setInterval(() => {
  const ahora = Date.now();
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) { ws.terminate(); return; }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* da igual */ }
  });
  for (const sala of salas.values()) {
    for (const [jid, j] of sala.jugadores) {
      if (ahora - j.visto > INACTIVIDAD) {
        sala.jugadores.delete(jid);
        try { j.ws.terminate(); } catch { /* da igual */ }
      }
    }
    if (sala.jugadores.size === 0) cerrarSala(sala);
  }
}, 30_000);

/* Red de seguridad.
   Esto es un relay: no guarda nada que no puedan volver a mandar los propios
   navegadores en el siguiente paquete. Así que un fallo suelto en una sala no
   tiene por qué tirar el proceso y con él TODAS las salas del servidor —que
   es exactamente lo que pasaba con el temporizador que cerraba sobre una
   variable que se volvía null.
   Queda registrado en los logs de Coolify: si ves estas líneas, hay un bug
   real que arreglar, no las ignores por que el juego siga en pie. */
process.on("uncaughtException", (e) => {
  console.error("[!] excepción no capturada, el servidor sigue en pie:", e);
});
process.on("unhandledRejection", (e) => {
  console.error("[!] promesa rechazada sin manejar:", e);
});

server.listen(PUERTO, () => {
  console.log(`Torre Vertical escuchando en el puerto ${PUERTO}`);
});
