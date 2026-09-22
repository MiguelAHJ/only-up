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
const crypto = require("crypto");
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

/* ───────────────────── panel privado ─────────────────────
   Enseña quién está jugando, en qué sala y con qué nombre. Lo protege UNA
   SOLA COSA: que nadie conozca su dirección. Por eso la dirección no está
   escrita en este archivo —este repositorio es público y publicarla aquí
   sería no protegerla en absoluto—, sino en la variable de entorno
   PANEL_RUTA, que se pone en Coolify y no sale de ahí.

   Si esa variable no existe, el panel TAMPOCO existe: no se sirve, no
   responde, no hay nada que encontrar. Esa es la postura por defecto, y es
   la que tiene cualquiera que se baje este repositorio.

   Conviene saber qué NO cubre una dirección secreta: queda en el historial
   del navegador, en el portapapeles, en el registro de cualquier proxy por
   el que pase y en la cabecera Referer si desde el panel se pincha un
   enlace externo. Contra eso se hace lo que se puede (noindex, no-referrer,
   no-store, y no escribirla en los logs), pero quien la vea una vez la
   tiene para siempre. Ponerle además una contraseña son unas diez líneas
   el día que se quiera. */
const PANEL_RUTA = String(process.env.PANEL_RUTA || "").trim().replace(/^\/+|\/+$/g, "");
const PANEL_OK = /^[A-Za-z0-9_-]{12,64}$/.test(PANEL_RUTA);
if (PANEL_RUTA && !PANEL_OK) {
  console.log("PANEL_RUTA no vale: se esperan de 12 a 64 caracteres [A-Za-z0-9_-]. El panel queda apagado.");
}

/* Comparación de tiempo constante. Contra una ruta de 22 caracteres por
   HTTP el ataque por tiempos es teórico, pero cuesta cuatro líneas y evita
   tener que razonar sobre ello nunca más. */
function mismaRuta(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

const CABECERAS_PANEL = {
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store, max-age=0",
};

/* Lo que ve el panel. Sale de la memoria viva del relay: aquí no se guarda
   nada nuevo ni se escribe en disco, es una foto del momento. */
function datosPanel() {
  const ahora = Date.now();
  const lista = [...salas.values()].map((s) => ({
    sala: s.codigo,
    semilla: s.seed,
    altura: s.altura,
    dif: s.dif,
    abierta: ahora - (s.creada || ahora),
    jugadores: [...s.jugadores.values()]
      .map((j) => ({
        nombre: j.name,
        color: j.color,
        y: Math.round(j.y * 10) / 10,
        best: Math.round(j.best * 10) / 10,
        dentro: ahora - (j.entrada || ahora),
        callado: ahora - j.visto,
      }))
      .sort((a, b) => b.best - a.best),
  }));
  lista.sort((a, b) => b.jugadores.length - a.jugadores.length || a.sala.localeCompare(b.sala));
  return {
    ahora,
    subida: Math.round(process.uptime()),
    salas: lista,
    total: lista.reduce((n, s) => n + s.jugadores.length, 0),
  };
}

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

/* La página del panel va aquí dentro, en texto, y no en un archivo aparte a
   propósito: el Dockerfile copia archivo por archivo, y ya nos pasó una vez
   que una carpeta no entró en la imagen y el fallo salió en producción sin
   que nada se quejara aquí. Lo que vive en server.js no se puede olvidar de
   copiar. */
const PANEL_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title>Torre Vertical</title>
<style>
:root{--f:#0d1117;--c:#161b22;--b:#252c36;--t:#e6edf3;--t2:#8b949e;--a:#e8b23a;--v:#3fb950;--r:#f85149}
*{box-sizing:border-box}
body{margin:0;padding:14px 14px 48px;background:var(--f);color:var(--t);
  font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}
h1{margin:0 0 2px;font-size:17px;letter-spacing:.02em}
h1 b{color:var(--a)}
.sub{color:var(--t2);font-size:13px;margin-bottom:14px}
.sub span{white-space:nowrap}
.aviso{background:#3d1d1d;border:1px solid var(--r);color:#ffc9c4;padding:8px 10px;
  border-radius:8px;margin-bottom:12px;font-size:13px}
.sala{background:var(--c);border:1px solid var(--b);border-radius:10px;
  margin-bottom:12px;overflow:hidden}
.cab{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;
  border-bottom:1px solid var(--b)}
.cod{font:600 17px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:var(--a)}
.chip{font-size:12px;color:var(--t2);background:#0d1117;border:1px solid var(--b);
  border-radius:999px;padding:2px 8px;white-space:nowrap}
.cuenta{margin-left:auto;font-size:13px;color:var(--t2)}
.jug{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;align-items:center;
  padding:9px 12px;border-top:1px solid #1d232c}
.jug:first-child{border-top:0}
.punto{width:10px;height:10px;border-radius:50%;background:#4FD1C5;grid-row:span 2}
.nom{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cifras{font:13px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--t2);
  grid-column:2/4;display:flex;flex-wrap:wrap;gap:4px 12px}
.cifras b{color:var(--t);font-weight:600}
.alt{font:600 14px/1 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right;white-space:nowrap}
.quieto{color:var(--a)}
.barra{grid-column:1/4;height:3px;background:#0d1117;border-radius:2px;margin-top:5px;overflow:hidden}
.barra i{display:block;height:100%;background:var(--v);border-radius:2px}
.vacio{color:var(--t2);text-align:center;padding:28px 12px;border:1px dashed var(--b);border-radius:10px}
.pie{color:#6e7681;font-size:12px;margin-top:16px}
</style>
</head>
<body>
<h1>Torre <b>Vertical</b></h1>
<div class="sub" id="sub">cargando…</div>
<div id="aviso"></div>
<div id="salas"></div>
<div class="pie" id="pie"></div>
<script>
(function(){
  var RUTA = location.pathname.replace(/\\/+$/, "");
  var $ = function(id){ return document.getElementById(id); };
  var ultimo = 0, timer = null;

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  /* El color lo elige el jugador y llega tal cual desde su navegador. Va a
     parar a un atributo style, así que se comprueba que sea un color y no
     otra cosa antes de escribirlo. */
  function color(c){
    return /^#[0-9a-fA-F]{3,8}$/.test(String(c)) ? c : "#4FD1C5";
  }
  function dur(ms){
    var s = Math.max(0, Math.round(ms/1000));
    if (s < 60) return s + " s";
    var m = Math.floor(s/60);
    if (m < 60) return m + " min";
    var h = Math.floor(m/60);
    return h + " h " + String(m % 60).padStart(2, "0");
  }
  var DIF = { facil:"fácil", media:"media", dificil:"difícil" };

  function pintar(d){
    var n = d.total, ns = d.salas.length;
    $("sub").innerHTML =
      "<span><b>" + n + "</b> " + (n === 1 ? "jugador" : "jugadores") + "</span> · " +
      "<span>" + ns + " " + (ns === 1 ? "sala" : "salas") + "</span> · " +
      "<span>servidor en pie desde hace " + dur(d.subida * 1000) + "</span>";

    if (!d.salas.length){
      $("salas").innerHTML = '<div class="vacio">No hay nadie jugando ahora mismo.</div>';
      return;
    }
    var h = "";
    for (var i = 0; i < d.salas.length; i++){
      var s = d.salas[i], nj = s.jugadores.length;
      h += '<section class="sala"><div class="cab">' +
        '<span class="cod">' + esc(s.sala) + "</span>" +
        '<span class="chip">' + esc(DIF[s.dif] || s.dif) + "</span>" +
        '<span class="chip">torre de ' + Math.round(s.altura) + " m</span>" +
        '<span class="chip">semilla ' + esc(s.semilla) + "</span>" +
        '<span class="chip">abierta ' + dur(s.abierta) + "</span>" +
        '<span class="cuenta">' + nj + "/16</span></div>";
      for (var k = 0; k < nj; k++){
        var j = s.jugadores[k];
        var pct = Math.max(0, Math.min(100, (j.y / (s.altura || 1)) * 100));
        var quieto = j.callado > 12000;
        h += '<div class="jug">' +
          '<span class="punto" style="background:' + color(j.color) + '"></span>' +
          '<span class="nom">' + esc(j.nombre) + "</span>" +
          '<span class="alt">' + j.y.toFixed(1) + " m</span>" +
          '<span class="cifras">' +
            "<span>récord <b>" + j.best.toFixed(1) + " m</b></span>" +
            "<span>dentro " + dur(j.dentro) + "</span>" +
            (quieto ? '<span class="quieto">sin moverse ' + dur(j.callado) + "</span>"
                    : "<span>activo</span>") +
          "</span>" +
          '<span class="barra"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
          "</div>";
      }
      h += "</section>";
    }
    $("salas").innerHTML = h;
  }

  function pedir(){
    fetch(RUTA + "/datos", { cache:"no-store", credentials:"omit" })
      .then(function(r){ if (!r.ok) throw new Error("respuesta " + r.status); return r.json(); })
      .then(function(d){ $("aviso").innerHTML = ""; ultimo = Date.now(); pintar(d); })
      .catch(function(e){
        $("aviso").innerHTML = '<div class="aviso">No se pudo leer el servidor (' +
          esc(e.message) + "). Reintentando…</div>";
      });
  }

  function reloj(){
    $("pie").textContent = ultimo
      ? "actualizado hace " + dur(Date.now() - ultimo) + " · se refresca solo cada 3 s"
      : "";
  }
  /* Con la pestaña de fondo no se pide nada: este panel no tiene por qué
     estar despertando al servidor desde un móvil en el bolsillo. */
  function arrancar(){
    if (timer) clearInterval(timer);
    if (document.hidden) return;
    pedir();
    timer = setInterval(pedir, 3000);
  }
  document.addEventListener("visibilitychange", arrancar);
  setInterval(reloj, 1000);
  arrancar();
})();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const ruta = (req.url || "/").split("?")[0];

  if (ruta === "/salud") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, salas: salas.size, subida: process.uptime() }));
    return;
  }

  /* El panel. Antes había aquí un /salas abierto a todo el mundo que
     enseñaba los códigos de sala —que son los códigos para ENTRAR— a quien
     escribiera la dirección. Ya no está: esos datos, y los nombres, viven
     ahora detrás de la ruta secreta.

     Ojo a lo que NO se hace: no se responde 401 ni 403. Una ruta
     equivocada cae al final del fichero y recibe el juego, exactamente
     igual que cualquier otra dirección inventada. Si respondiera "no
     autorizado" estaría confirmando que ahí hay algo, que es justo lo
     único que protege a este panel. */
  if (PANEL_OK) {
    if (ruta.startsWith("/") && ruta.endsWith("/datos") &&
        mismaRuta(ruta.slice(1, -6), PANEL_RUTA)) {
      res.writeHead(200, Object.assign({ "content-type": "application/json; charset=utf-8" }, CABECERAS_PANEL));
      res.end(JSON.stringify(datosPanel()));
      return;
    }
    const limpia = ruta.replace(/\/+$/, "");
    if (limpia.startsWith("/") && mismaRuta(limpia.slice(1), PANEL_RUTA)) {
      res.writeHead(200, Object.assign({ "content-type": "text/html; charset=utf-8" }, CABECERAS_PANEL));
      res.end(PANEL_HTML);
      return;
    }
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
        creada: Date.now(),          // solo para el panel: "abierta hace 12 min"
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
        entrada: Date.now(),         // solo para el panel: "dentro hace 8 min"
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
  /* Se dice SI el panel está encendido, nunca DÓNDE. Los registros de
     Coolify se leen desde el navegador, se copian y se pegan; una ruta que
     solo vale mientras nadie la ve no tiene nada que hacer en un log. */
  console.log(PANEL_OK
    ? "panel privado: encendido (la dirección está en PANEL_RUTA)"
    : "panel privado: apagado (no hay PANEL_RUTA)");
});
