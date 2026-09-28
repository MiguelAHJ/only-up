/* Prueba 3 — las tres cosas nuevas:
   1. el latido evita que te echen estando en pausa
   2. el código de sala se ve jugando y el enlace se copia desde la pausa
   3. el servidor aguanta una excepción suelta sin morirse
   Además se hacen capturas para mirar cómo queda.                          */
const { chromium } = require("playwright");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3115;
const URL = `http://127.0.0.1:${PORT}/#debug`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function hasta(fn, ms, etq) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > ms) throw new Error("TIMEOUT: " + etq);
    await espera(200);
  }
}
async function entrar(page, nombre, sala) {
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__T, null, { timeout: 15000 });
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#pname", nombre);
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#room", sala);
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.click("#btnJoin");
  await page.waitForFunction(() => window.__T.Net.online === true, null, { timeout: 15000 });
}
const vivo = async () => {
  try { return (await (await fetch(`http://127.0.0.1:${PORT}/salud`)).json()).ok === true; }
  catch { return false; }
};

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--use-gl=swiftshader"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, permissions: ["clipboard-read", "clipboard-write"] });
  const A = await ctx.newPage();
  const B = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  for (const [n, p] of [["A", A], ["B", B]]) p.on("pageerror", (e) => console.log("!! error " + n + ":", e.message));

  console.log("— entran los dos a la sala WXYZ");
  await entrar(A, "miguel", "WXYZ");
  await entrar(B, "amigo", "WXYZ");
  await hasta(async () => (await A.evaluate(() => __T.Net.otros().length)) === 1, 10000, "verse");

  console.log("— 1. ¿se ve el código de sala jugando?");
  await A.evaluate(() => { __T.G.py = 212; __T.G.best = 212; });
  await espera(1200);
  const vista = await A.evaluate(() => {
    const s = document.getElementById("sala");
    return { oculto: s.hidden, cod: document.getElementById("hSalaCod").textContent,
             cnt: document.getElementById("hSalaCnt").textContent,
             hnet: document.getElementById("hNet").textContent };
  });
  console.log("   oculto:", vista.oculto, "| código:", JSON.stringify(vista.cod),
              "| debajo:", JSON.stringify(vista.cnt));
  if (vista.oculto || vista.cod !== "WXYZ") throw new Error("el código de sala no se ve jugando");
  await A.screenshot({ path: "shot-juego.png" });

  console.log("— 2. el latido: pausa y esperamos MÁS que la inactividad");
  await A.keyboard.press("Escape");          // la vía de verdad: ESC llama a pause()
  await espera(1000);
  await A.screenshot({ path: "shot-pausa.png" });
  const inv = await A.evaluate(() => ({
    oculto: document.getElementById("pInvite").hidden,
    cod: document.getElementById("pCode").textContent,
    lnk: document.getElementById("pLink").textContent,
  }));
  console.log("   bloque de invitación oculto:", inv.oculto, "| código:", inv.cod);
  console.log("   enlace:", inv.lnk);
  if (inv.oculto || !inv.lnk.includes("#sala=WXYZ")) throw new Error("falta el enlace de invitación");

  console.log("   esperando 14 s en pausa (inactividad del servidor = 6 s)…");
  await espera(14000);
  const trasPausa = await A.evaluate(() => ({ online: __T.Net.online, intentos: __T.Net.intentos }));
  console.log("   A sigue conectado:", trasPausa.online, "| reintentos:", trasPausa.intentos,
              trasPausa.online && trasPausa.intentos === 0 ? "✓ el latido lo mantuvo dentro" : "✗");
  if (!trasPausa.online || trasPausa.intentos !== 0) throw new Error("el latido no evitó la expulsión");
  console.log("   y B lo sigue viendo:", await B.evaluate(() => __T.Net.otros().length) === 1 ? "sí ✓" : "NO ✗");

  console.log("— 3. copiar el enlace desde la pausa");
  await A.click("#btnCopiar");
  await espera(600);
  const portapapeles = await A.evaluate(() => navigator.clipboard.readText().catch(() => "(sin permiso)"));
  const rotulo = await A.evaluate(() => document.querySelector("#btnCopiar strong").textContent);
  console.log("   botón dice:", JSON.stringify(rotulo), "| portapapeles:", portapapeles);

  console.log("— 4. el servidor aguanta una excepción suelta");
  await fetch(`http://127.0.0.1:${PORT}/reventar`).catch(() => {});
  await espera(1500);
  console.log("   servidor vivo tras la excepción:", await vivo() ? "sí ✓" : "NO ✗");
  if (!await vivo()) throw new Error("el servidor murió pese a la red de seguridad");
  console.log("   A sigue conectado:", await A.evaluate(() => __T.Net.online));

  console.log("— 5. volver al juego");
  await A.click("#btnResume");
  await espera(2000);
  console.log("   A:", await A.evaluate(() => document.getElementById("hNet").textContent),
              "| B:", await B.evaluate(() => document.getElementById("hNet").textContent));

  await b.close();
  console.log("\nTODO OK");
})().catch((e) => { console.error("\nFALLÓ:", e.message); process.exit(1); });
