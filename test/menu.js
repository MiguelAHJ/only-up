/* EL MENÚ EN DOS PASOS.
 *
 * Miguel: "apenas entran me preguntan «¿qué hago?»". El panel tenía
 * veintiocho elementos en una columna y lo primero que se leía era que
 * esto era una previsualización para Unity.
 *
 * Lo que vigila esta prueba:
 *   · que la portada sea CORTA y no mencione Unity ni la semilla
 *   · que se llegue a jugar en dos toques y se pueda volver
 *   · que tocar una dificultad EMPIECE la partida (no la seleccione)
 *   · que los campos del autor sigan existiendo en el DOM aunque estén
 *     plegados — elegirDif y regenerate los leen directamente
 *   · que en móvil los controles hablen de dedos y no de teclas
 *   · que en horizontal de móvil se llegue a JUGAR sin desplazarse
 */
const { chromium } = require("playwright");
const EXE  = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;

let fallos = 0;
const ok = (n, c, extra = "") => {
  if (!c) fallos++;
  console.log((c ? "  OK  " : "  FALLA") + "  " + n + (extra ? "   " + extra : ""));
};

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const errores = [];
  const limpio = t => !/Failed to load resource|ERR_CERT|net::ERR_/.test(t);

  // ═══════════ escritorio ═══════════
  const ctx = await b.newContext({ viewport:{width:1100,height:860} });
  const p = await ctx.newPage();
  p.on("pageerror", e => { errores.push(e.message); console.log("!! " + e.message); });
  p.on("console", m => { if (m.type() === "error" && limpio(m.text())) errores.push(m.text()); });
  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });

  const visible = () => p.evaluate(() =>
    ["mPortada","mDif","mAmigos"].filter(i => !document.getElementById(i).hidden).join(","));

  console.log("\n── la portada ───────────────────────────────────────────");
  ok("al entrar sólo se ve la portada", (await visible()) === "mPortada", await visible());

  /* "Cuántas cosas ve un recién llegado" es EL número del que iba todo
     esto. Se cuentan los elementos que de verdad se ven, no los del DOM:
     lo plegado no cuenta porque no compite por la atención. */
  const cuenta = await p.evaluate(() => {
    /* checkVisibility y no getBoundingClientRect: lo que hay dentro de un
       <details> cerrado sigue teniendo caja en algunos casos, y entonces
       los campos plegados contaban como "a la vista". */
    const vis = el => el.checkVisibility ? el.checkVisibility({checkOpacity:true, checkVisibilityCSS:true})
                                         : el.offsetParent !== null;
    const sec = document.getElementById("mPortada");
    return { hijos: [...sec.children].filter(vis).length,
             botones: [...sec.querySelectorAll("button")].filter(vis).length,
             campos: [...sec.querySelectorAll("input")].filter(vis).length };
  });
  ok("la portada cabe en pocas piezas", cuenta.hijos <= 5,
     cuenta.hijos + " bloques a la vista (antes: 28)");
  ok("y no pide rellenar nada", cuenta.campos === 0,
     cuenta.campos + " campos de texto visibles (antes: semilla y altura, de entrada)");

  const texto = await p.evaluate(() => document.getElementById("mPortada").innerText);
  ok("el botón principal dice que es en solitario",
     /SOLITARIO/i.test(texto), (texto.match(/JUGAR[^\n]*/) || [""])[0]);
  ok("la portada habla del juego, no de Unity",
     !/unity|previsualiza|generador|spatial/i.test(texto),
     texto.split("\n")[1] || "");

  console.log("\n── llegar a jugar y volver ──────────────────────────────");
  await p.click("#btnIrDif");
  ok("JUGAR lleva a la dificultad", (await visible()) === "mDif", await visible());
  await p.click("#mDif .volver");
  ok("y se puede volver", (await visible()) === "mPortada", await visible());
  await p.click("#btnIrAmigos");
  ok("JUGAR CON AMIGOS lleva a su pantalla", (await visible()) === "mAmigos", await visible());

  /* Al partir el menú en dos, la dificultad se quedó en la rama de
     solitario y la sala se quedó sin ella: el anfitrión abría siempre con
     la que tuviera puesta de antes, sin verla. Lo que viaja en el "hello"
     es G.dif, así que sin selector no había forma de decidir la torre. */
  const enSala = await p.evaluate(() => {
    const d = document.getElementById("difs");
    return { dentro: !!document.getElementById("difsSala").contains(d),
             visible: d.checkVisibility(),
             tarjetas: d.querySelectorAll(".dbtn").length };
  });
  ok("la sala tiene su selector de dificultad",
     enSala.dentro && enSala.visible && enSala.tarjetas === 3,
     enSala.tarjetas + " tarjetas, visibles: " + enSala.visible);

  /* Y ahí la tarjeta NO puede empezar la partida: falta el código de sala. */
  await p.click("#difsSala .dbtn:nth-child(3)");
  await p.waitForTimeout(300);
  const trasTocar = await p.evaluate(() => ({ modo: window.__T.G.mode, dif: window.__T.G.dif,
                                              paso: window.__T.Menu.paso }));
  ok("en la sala la tarjeta elige pero no entra en juego",
     trasTocar.modo === "menu" && trasTocar.paso === "amigos",
     "modo " + trasTocar.modo + " · sigue en " + trasTocar.paso);
  ok("y deja elegida la dificultad que viajará a la sala",
     trasTocar.dif === "dificil", trasTocar.dif);

  console.log("\n── tocar una dificultad empieza la partida ──────────────");
  await p.evaluate(() => window.__T.Menu.ir("dif"));
  const antes = await p.evaluate(() => window.__T.G.mode);
  await p.click("#difs .dbtn:nth-child(2)");        // MEDIA
  await p.waitForTimeout(600);
  const desp = await p.evaluate(() => ({ modo: window.__T.G.mode, dif: window.__T.G.dif,
                                          menu: document.getElementById("menu").hidden }));
  ok("un toque en la tarjeta entra en juego",
     antes === "menu" && desp.modo === "play" && desp.menu === true,
     antes + " → " + desp.modo);
  ok("y entra en la dificultad que se tocó", desp.dif === "media", desp.dif);

  console.log("\n── al salir vuelve a la dificultad, no a la portada ─────");
  await p.evaluate(() => window.__T.toMenu());
  await p.waitForTimeout(200);
  ok("quien ya ha jugado no repite la portada", (await visible()) === "mDif", await visible());

  console.log("\n── el panel del autor sigue entero ──────────────────────");
  /* Esto es lo que más miedo daba del cambio: elegirDif, alternarDia y
     regenerate leen #seed y #height del DOM. Plegarlos NO puede ser
     quitarlos, y una prueba que sólo mirase lo visible no lo vería. */
  const campos = await p.evaluate(() => {
    const ids = ["seed","height","srv","pname","room","specs","verif","ajustes","difs","btnPlay","btnRegen","btnJoin"];
    return ids.filter(i => !document.getElementById(i));
  });
  ok("no falta ningún campo ni botón de antes", campos.length === 0,
     campos.length ? "faltan: " + campos.join(", ") : "los 12 siguen ahí");

  const sirve = await p.evaluate(() => {
    const T = window.__T;
    document.getElementById("seed").value = "PRUEBA99";
    T.Menu.ir("dif");
    T.elegirDif("dificil");                    // lee #height, y regenera
    return { semilla: T.G.code, dif: T.G.dif, altura: Math.round(T.G.tower.altura) };
  });
  ok("y siguen mandando en la torre aunque estén plegados",
     sirve.semilla === "PRUEBA99" && sirve.dif === "dificil",
     "semilla " + sirve.semilla + " · " + sirve.dif + " · " + sirve.altura + " m");

  await ctx.close();

  // ═══════════ móvil en horizontal ═══════════
  console.log("\n── en un móvil girado ───────────────────────────────────");
  const ctxM = await b.newContext({ viewport:{width:740,height:360},
    hasTouch:true, isMobile:true, deviceScaleFactor:2 });
  const pm = await ctxM.newPage();
  pm.on("pageerror", e => { errores.push(e.message); console.log("!! " + e.message); });
  await pm.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await pm.waitForFunction(() => !!window.__T, null, { timeout:20000 });
  await pm.waitForTimeout(400);

  const m = await pm.evaluate(() => {
    const j = document.getElementById("btnIrDif").getBoundingClientRect();
    const h = document.querySelector("#mPortada h1").getBoundingClientRect();
    document.getElementById("dControles").open = true;
    return { jugarAbajo: j.bottom, alto: innerHeight, titulo: h.height,
             ctrl: document.getElementById("controles").innerText };
  });
  /* La primera versión de esto comprobaba que el botón JUGAR cupiera en
     pantalla... y ya cabía ANTES de apretar nada, así que pasaba igual con
     el apretado quitado: no medía lo que yo decía. Lo que de verdad se
     comía el móvil girado era el TÍTULO a tamaño de escritorio. */
  ok("el título no se come la pantalla en horizontal", m.titulo <= m.alto * 0.16,
     Math.round(m.titulo) + " px de " + m.alto + " (" + Math.round(m.titulo/m.alto*100) + "%)");
  ok("y JUGAR queda a la vista", m.jugarAbajo <= m.alto,
     "el botón acaba en y=" + Math.round(m.jugarAbajo) + " de " + m.alto);
  ok("los controles hablan de dedos, no de teclas",
     /pulgar/i.test(m.ctrl) && !/ESPACIO|W A S D/.test(m.ctrl),
     m.ctrl.split("\n")[0] || "(vacío)");

  await ctxM.close();
  console.log("");
  ok("sin errores de página", errores.length === 0, errores.slice(0,2).join(" | "));
  console.log(fallos === 0 ? "\nTODO OK" : "\n" + fallos + " FALLOS");
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
