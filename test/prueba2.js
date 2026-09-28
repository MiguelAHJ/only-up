/* Prueba 2: el que CREA la sala se va y los demás se quedan.
   Con el servidor de antes esto tumbaba el proceso entero. */
const { chromium } = require("playwright");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = "http://127.0.0.1:3112/#debug";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function hasta(fn, ms, etq) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > ms) throw new Error("TIMEOUT: " + etq);
    await espera(200);
  }
}
async function entrar(page, nombre) {
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__T, null, { timeout: 15000 });
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#pname", nombre);
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.fill("#room", "ZZZZ");
  await page.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await page.click("#btnJoin");
  await page.waitForFunction(() => window.__T.Net.online === true, null, { timeout: 15000 });
}
const vivo = async () => {
  try { const r = await fetch("http://127.0.0.1:3112/salud"); return (await r.json()).ok === true; }
  catch { return false; }
};
const otros = (p) => p.evaluate(() => __T.Net.otros().length);

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--use-gl=swiftshader"] });
  const A = await (await b.newContext()).newPage();   // crea la sala
  const B = await (await b.newContext()).newPage();
  const C = await (await b.newContext()).newPage();

  console.log("— A crea la sala ZZZZ, entran B y C");
  await entrar(A, "creador"); await entrar(B, "bea"); await entrar(C, "carlos");
  await hasta(async () => (await otros(B)) === 2, 10000, "los tres se ven");
  console.log("   B ve a", await otros(B), "· C ve a", await otros(C), "· servidor vivo:", await vivo());

  console.log("— el CREADOR se va (era la línea que tumbaba el proceso)");
  await A.evaluate(() => __T.Net.cerrar());
  await espera(3000);
  console.log("   servidor vivo:", await vivo(), "| B ve a", await otros(B), "| C ve a", await otros(C));
  if (!(await vivo())) throw new Error("el servidor se cayó al irse el creador");
  if ((await otros(B)) !== 1) throw new Error("B debería ver solo a C");

  console.log("— ahora se va B; queda C solo");
  await B.evaluate(() => __T.Net.cerrar());
  await espera(3000);
  console.log("   servidor vivo:", await vivo(), "| C ve a", await otros(C), "| C online:", await C.evaluate(() => __T.Net.online));

  console.log("— y se va C: la sala se cierra");
  await C.evaluate(() => __T.Net.cerrar());
  await espera(2000);
  console.log("   servidor vivo:", await vivo(), "| salas:", await (await fetch("http://127.0.0.1:3112/salas")).text());

  console.log("— se puede volver a crear la misma sala");
  await entrar(A, "creador2");
  console.log("   A dentro otra vez:", await A.evaluate(() => __T.Net.online), "| servidor vivo:", await vivo());

  await b.close();
  console.log("\nTODO OK");
})().catch((e) => { console.error("\nFALLÓ:", e.message); process.exit(1); });
