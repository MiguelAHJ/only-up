/* Prueba 4 — modo siesta.
   A deja de tocar el teclado, se sale solo, deja de gastar, y al pulsar una
   tecla vuelve a la sala sin perder altura ni cronómetro. */
const { chromium } = require("playwright");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3203;
const URL = `http://127.0.0.1:${PORT}/#debug`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function hasta(fn, ms, etq) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > ms) throw new Error("TIMEOUT: " + etq);
    await espera(250);
  }
}
async function entrar(page, nombre) {
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__T, null, { timeout: 15000 });
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#pname", nombre);
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#room", "SIES");
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.click("#btnJoin");
  await page.waitForFunction(() => window.__T.Net.online === true, null, { timeout: 15000 });
}
const est = (p) => p.evaluate(() => ({
  online: __T.Net.online, dormido: __T.Net.dormido, quiere: __T.Net.quiereEstar,
  otros: __T.Net.otros().length, mode: __T.G.mode,
  py: +__T.G.py.toFixed(2), best: +__T.G.best.toFixed(2), elapsed: +__T.G.elapsed.toFixed(1),
  semilla: __T.G.code,
  warn: document.getElementById("netwarn").hidden ? "" : document.getElementById("netwarn").textContent,
  cnt: document.getElementById("hSalaCnt").textContent,
}));

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--use-gl=swiftshader"] });
  const A = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const B = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  for (const [n, p] of [["A", A], ["B", B]]) p.on("pageerror", (e) => console.log("!! error " + n + ":", e.message));

  console.log("— entran los dos (siesta puesta a 30 s para la prueba)");
  await entrar(A, "miguel");
  await entrar(B, "amigo");
  await hasta(async () => (await est(A)).otros === 1, 20000, "verse");
  const Bdespierto = setInterval(() => { B.keyboard.press("KeyD").catch(() => {}); }, 3000);
  await A.evaluate(() => { __T.G.py = 318; __T.G.best = 320; });
  await espera(1500);
  // A estuvo activo hasta justo ahora: arrancamos su reloj de siesta aquí
  await A.evaluate(() => { __T.G.ultimaEntrada = performance.now(); });
  const antes = await est(A);
  console.log("   A a", antes.py, "m · récord", antes.best, "· reloj", antes.elapsed);

  console.log("— A deja de tocar nada. Esperamos a que se duerma…");
  const t = await hasta(async () => (await est(A)).dormido, 60000, "que A se duerma");
  await espera(800);
  const d = await est(A);
  console.log("   dormido a los", (t / 1000).toFixed(1), "s | online:", d.online, "| quiereEstar:", d.quiere);
  console.log("   HUD:", JSON.stringify(d.warn));
  console.log("   junto al código:", JSON.stringify(d.cnt));
  await A.screenshot({ path: "shot-reposo.png" });

  console.log("— ¿desapareció de la torre de B?");
  await hasta(async () => (await est(B)).otros === 0, 10000, "B deja de ver a A");
  console.log("   B ve ahora a", (await est(B)).otros, "jugadores ✓");
  console.log("   salas en el servidor:", await (await fetch(`http://127.0.0.1:${PORT}/salas`)).text());

  console.log("— B sigue jugando tranquilo, ¿no le afecta?");
  console.log("   B online:", (await est(B)).online, "| B modo:", (await est(B)).mode);

  console.log("— A pulsa una tecla");
  await A.keyboard.press("KeyW");
  await hasta(async () => (await est(A)).online, 15000, "que A despierte");
  await hasta(async () => (await est(B)).otros === 1, 15000, "B vuelve a ver a A");
  const dsp = await est(A);
  console.log("   A de vuelta | online:", dsp.online, "| dormido:", dsp.dormido, "| B lo ve otra vez ✓");

  console.log("— ¿se perdió algo al despertar?");
  console.log("   récord ", antes.best, "→", dsp.best, antes.best === dsp.best ? "IGUAL ✓" : "¡CAMBIÓ!");
  console.log("   reloj  ", antes.elapsed, "→", dsp.elapsed, dsp.elapsed >= antes.elapsed ? "no se reinició ✓" : "¡SE REINICIÓ!");
  console.log("   semilla", antes.semilla, "→", dsp.semilla, antes.semilla === dsp.semilla ? "IGUAL ✓" : "¡REGENERÓ!");
  console.log("   modo   ", dsp.mode, dsp.mode === "play" ? "✓ sigue jugando" : "");
  if (antes.best !== dsp.best || dsp.elapsed < antes.elapsed || antes.semilla !== dsp.semilla)
    throw new Error("despertar perdió estado");

  clearInterval(Bdespierto);
  await b.close();
  console.log("\nTODO OK");
})().catch((e) => { console.error("\nFALLÓ:", e.message); process.exit(1); });
