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
const MAX_POR_SALA = 16;
const MAX_SALAS = 200;
const INACTIVIDAD = 60_000;      // se echa a quien lleva un minuto mudo

const salas = new Map();

const num = (v, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const texto = (v, d, max) => (typeof v === "string" && v.length ? v.slice(0, max) : d);

/* ─────────────────────────── web ─────────────────────────── */
const INDEX = path.join(__dirname, "index.html");

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
      sala: s.codigo, semilla: s.seed, altura: s.altura, jugadores: s.jugadores.size,
    }))));
    return;
  }

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
  const p = [...sala.jugadores.values()].map((j) => ({
    id: j.id, name: j.name, color: j.color,
    x: j.x, y: j.y, z: j.z, ry: j.ry, best: j.best,
  }));
  const msg = JSON.stringify({ t: "state", p });
  for (const j of sala.jugadores.values()) {
    if (j.ws.readyState === 1) { try { j.ws.send(msg); } catch { /* se cerrará solo */ } }
  }
}

function cerrarSala(sala) {
  clearInterval(sala.timer);
  salas.delete(sala.codigo);
  console.log(`sala ${sala.codigo} cerrada`);
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
        jugadores: new Map(),
        timer: null,
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

      ws.send(JSON.stringify({ t: "init", id, seed: sala.seed, altura: sala.altura }));

      if (!sala.timer) sala.timer = setInterval(() => repartir(sala), 1000 / HZ);
      console.log(`sala ${codigo}: entra ${id} (${sala.jugadores.size})`);

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

server.listen(PUERTO, () => {
  console.log(`Torre Vertical escuchando en el puerto ${PUERTO}`);
});
