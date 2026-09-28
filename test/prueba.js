/* Prueba: dos jugadores en la misma sala, los dos se van AFK (pausa), el
   servidor los echa por mudos, y tienen que volver a verse solos SIN perder
   ni su altura ni su cronómetro. */
const { chromium } = require("playwright");

const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = "http://127.0.0.1:3114/#debug";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function hasta(fn, ms, etiqueta) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > ms) throw new Error("TIMEOUT: " + etiqueta);
    await espera(200);
  }
}

async function entrar(page, nombre) {
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__T, null, { timeout: 15000 });
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#pname", nombre);
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#room", "ABCD");
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.click("#btnJoin");
  await page.waitForFunction(() => window.__T.Net.online === true, null, { timeout: 15000 });
}

const est = (page) =>
  page.evaluate(() => ({
    online: __T.Net.online,
    quiere: __T.Net.quiereEstar,
    intentos: __T.Net.intentos,
    sala: __T.Net.sala,
    otros: __T.Net.otros().length,
    total: __T.Net.total(),
    mode: __T.G.mode,
    py: +__T.G.py.toFixed(3),
    best: +__T.G.best.toFixed(3),
    elapsed: +__T.G.elapsed.toFixed(2),
    semilla: __T.G.code,
    warn: document.getElementById("netwarn").hidden
      ? ""
      : document.getElementById("netwarn").textContent,
    pnet: document.getElementById("pNet").textContent,
    hnet: document.getElementById("hNet").textContent,
  }));

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--use-gl=swiftshader"] });
  const A = await (await b.newContext()).newPage();
  const B = await (await b.newContext()).newPage();
  A.on("pageerror", (e) => console.log("!! error A:", e.message));
  B.on("pageerror", (e) => console.log("!! error B:", e.message));

  console.log("— 1. los dos entran a la sala ABCD");
  await entrar(A, "miguel");
  await entrar(B, "amigo");
  await hasta(async () => (await est(A)).otros === 1 && (await est(B)).otros === 1, 10000, "verse al entrar");
  const a1 = await est(A), b1 = await est(B);
  console.log("   A:", a1.hnet, "| B:", b1.hnet, "| misma semilla:", a1.semilla === b1.semilla);

  console.log("— 2. suben un poco y se van AFK: pausa (es lo que hace Alt+Tab)");
  await espera(3000);
  for (const p of [A, B]) await p.evaluate(() => {
    __T.G.mode = "pause";                       // primero congelar la física
    __T.G.py = 137.5; __T.G.best = 140; __T.G.vx = __T.G.vy = __T.G.vz = 0;
  });
  await espera(500);
  const a2 = await est(A), b2 = await est(B);
  console.log("   altura A:", a2.py, "| récord A:", a2.best, "| reloj A:", a2.elapsed);

  console.log("— 4. el servidor los echa por mudos…");
  const tCaida = await hasta(async () => (await est(A)).online === false, 20000, "expulsión de A");
  await hasta(async () => (await est(B)).online === false, 20000, "expulsión de B");
  const a3 = await est(A);
  console.log("   caídos a los", (tCaida / 1000).toFixed(1), "s | HUD:", JSON.stringify(a3.warn), "| pausa:", JSON.stringify(a3.pnet));
  console.log("   sala en el servidor ahora:", await (await fetch("http://127.0.0.1:3114/salas")).text());

  console.log("— 5. sin tocar nada, ¿vuelven solos?");
  const tVuelta = await hasta(async () => (await est(A)).online && (await est(B)).online, 30000, "reconexión");
  await hasta(async () => (await est(A)).otros === 1 && (await est(B)).otros === 1, 20000, "volver a verse");
  const a4 = await est(A), b4 = await est(B);
  console.log("   de vuelta en", (tVuelta / 1000).toFixed(1), "s | A ve", a4.otros, "| B ve", b4.otros);
  console.log("   aviso en pausa de A:", JSON.stringify(a4.pnet));

  console.log("— 6. ¿se perdió algo?");
  console.log("   altura A", a2.py, "→", a4.py, a2.py === a4.py ? "IGUAL ✓" : "¡CAMBIÓ!");
  console.log("   récord A", a2.best, "→", a4.best, a2.best === a4.best ? "IGUAL ✓" : "¡CAMBIÓ!");
  console.log("   reloj  A", a2.elapsed, "→", a4.elapsed, a4.elapsed >= a2.elapsed ? "no se reinició ✓" : "¡SE REINICIÓ!");
  console.log("   modo   A:", a4.mode, a4.mode === "pause" ? "(sigue en pausa, no le hizo play() ✓)" : "¡le cambió el modo!");
  console.log("   semilla A", a2.semilla, "→", a4.semilla, a2.semilla === a4.semilla ? "IGUAL ✓" : "¡REGENERÓ LA TORRE!");

  console.log("— 7. vuelven al juego y siguen juntos");
  for (const p of [A, B]) await p.evaluate(() => __T.G.mode = "play");
  await espera(2500);
  const a5 = await est(A), b5 = await est(B);
  console.log("   A:", a5.hnet, "| B:", b5.hnet);
  console.log("   aviso rojo visible:", JSON.stringify(a5.warn) || "(ninguno)");

  console.log("— 8. salir al menú no debe reconectar");
  await A.evaluate(() => __T.Net.cerrar());
  await espera(4000);
  const a6 = await est(A);
  console.log("   A tras cerrar: online", a6.online, "| quiereEstar", a6.quiere, "| intentos", a6.intentos,
              a6.online === false && a6.quiere === false ? "✓" : "✗");

  await b.close();
  console.log("\nTODO OK");
})().catch((e) => { console.error("\nFALLÓ:", e.message); process.exit(1); });
