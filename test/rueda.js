/* LA RUEDA DE GESTOS Y EL SCROLL DE LA PAUSA.
 *
 * Dos cosas distintas en una prueba porque las dos son "la interfaz no me
 * deja", y las dos se rompen en silencio: no lanzan ningún error, sólo
 * dejan de responder. Lo que tiene que saltar si se rompe:
 *
 *   · que la T abra la rueda y que soltarla dispare lo apuntado
 *   · que el ÁNGULO al que empujas elija el sector correcto (si esto se
 *     desfasa medio sector, eliges siempre el de al lado)
 *   · que con la rueda abierta el ratón NO gire la cámara y las teclas NO
 *     muevan al muñeco — si se mueve, el gesto no sale y parece un fallo
 *     del gesto cuando es un fallo de la rueda
 *   · que las cifras del 1 al 9 sigan funcionando como siempre
 *   · que el menú de pausa SE PUEDA DESPLAZAR en un móvil en horizontal.
 *     Este es el que motivó todo: a 740×360 el menú mide más que la
 *     pantalla y antes no había forma de llegar a "REANUDAR".
 */
const { chromium } = require("playwright");
const EXE  = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;

let fallos = 0;
const ok = (n, c, extra = "") => {
  if (!c) fallos++;
  console.log((c ? "  OK  " : "  FALLA") + "  " + n + (extra ? "   " + extra : ""));
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });

  // ══════════════ 1ª parte: la rueda, en el laboratorio ══════════════
  const ctx = await b.newContext({ viewport:{width:1100,height:680} });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", e => { errores.push(e.message); console.log("!! pageerror:", e.message); });
  /* Las fuentes de Google están bloqueadas en este contenedor y el proxy
     devuelve un certificado que el navegador rechaza. Eso es del entorno de
     pruebas, no del juego, así que no cuenta como error de página. */
  const delJuego = t => !/Failed to load resource|ERR_CERT|net::ERR_/.test(t);
  p.on("console", m => { if (m.type() === "error" && delJuego(m.text())) errores.push(m.text()); });

  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });
  await p.evaluate(() => window.__T.abrirLab());
  await p.waitForFunction(() => window.__T.G.lab && window.__T.PERSONA.raiz,
    null, { timeout:25000 });

  /* Plantado en el suelo y quieto: es la única situación en la que un
     gesto puede salir, así que medir en otra mediría el guardia de
     iniciarGesto y no la rueda. */
  const posar = () => p.evaluate(() => {
    const T = window.__T, G = T.G;
    G.px = 24; G.pz = 0; G.py = 3; G.vx = G.vy = G.vz = 0;
    G.grounded = false;
    for (let i = 0; i < 900 && !G.grounded; i++) T.physicsStep(1/240);
    T.pararGesto(); T.Rueda.cerrar();
    for (let i = 0; i < 30; i++) T.actualizarPersona(1/60);
  });
  const estado = () => p.evaluate(() => {
    const R = window.__T.Rueda;
    return { abierta:R.abierta, fija:R.fija, sel:R.sel,
             oculta: document.getElementById("rueda").hidden,
             gesto: window.__T.PERSONA.gesto ? window.__T.PERSONA.gesto.nombre : null };
  });
  /* El ratón se simula con el mismo camino que usa el juego: deltas de
     movimiento. No se mueve el ratón de verdad porque jugando hay bloqueo
     de puntero y entonces no hay cursor que mover. */
  const empujar = (dx, dy) => p.evaluate(([dx,dy]) => {
    window.__T.Rueda.ax = 0; window.__T.Rueda.ay = 0;
    window.__T.Rueda.mover(dx, dy);
  }, [dx,dy]);

  await posar();

  console.log("\n── abrir y cerrar ───────────────────────────────────────");
  ok("empieza cerrada y oculta", (await estado()).abierta === false && (await estado()).oculta === true);

  await p.keyboard.down("t");
  let e1 = await estado();
  ok("la T la abre", e1.abierta === true && e1.oculta === false);

  const pintada = await p.evaluate(() => {
    const svg = document.querySelector("#rueda svg");
    if (!svg) return null;
    return { sectores: svg.querySelectorAll(".sec").length,
             etiquetas: [...svg.querySelectorAll(".eti")].map(t => t.textContent),
             numeros:   [...svg.querySelectorAll(".num")].map(t => t.textContent) };
  });
  const nombres = await p.evaluate(() => window.__T.GESTOS.map(g => g.nombre.toUpperCase()));
  ok("dibuja un sector por gesto", pintada && pintada.sectores === nombres.length,
     pintada ? pintada.sectores + " sectores / " + nombres.length + " gestos" : "sin svg");
  ok("cada sector lleva su nombre", pintada && JSON.stringify(pintada.etiquetas) === JSON.stringify(nombres));
  ok("y su número de atajo", pintada && pintada.numeros.join(",") === nombres.map((_,i)=>i+1).join(","),
     pintada ? pintada.numeros.join(",") : "");

  console.log("\n── a qué sector apunta cada dirección ───────────────────");
  /* El sector 0 está arriba y van en el sentido del reloj. En pantalla la
     Y crece hacia abajo, así que "arriba" es dy negativo. Se comprueban
     los nueve centros: si el reparto se desfasa, esto lo caza entero. */
  const paso = 2*Math.PI / nombres.length;
  let malos = [];
  for (let i = 0; i < nombres.length; i++){
    const a = i*paso - Math.PI/2;
    await empujar(Math.cos(a)*90, Math.sin(a)*90);
    const s = (await estado()).sel;
    if (s !== i) malos.push(i + "→" + s);
  }
  ok("los " + nombres.length + " centros eligen su sector", malos.length === 0, malos.join(" "));

  /* Y el borde entre dos sectores: medio paso más allá del centro del 0
     tiene que caer ya en el 1, no seguir en el 0. */
  const aBorde = (0.5*paso) - Math.PI/2 + 0.04;
  await empujar(Math.cos(aBorde)*90, Math.sin(aBorde)*90);
  ok("justo pasado el borde cambia de sector", (await estado()).sel === 1,
     "sel=" + (await estado()).sel);

  console.log("\n── la zona muerta del centro ────────────────────────────");
  const zona = await p.evaluate(() => window.__T.RUE.zonaRaton);
  await empujar(0, -(zona - 6));
  ok("dentro de la zona muerta no hay selección", (await estado()).sel === -1, "a " + (zona-6) + " px");
  await empujar(0, -(zona + 20));
  ok("fuera de ella sí", (await estado()).sel === 0, "a " + (zona+20) + " px");

  console.log("\n── la rueda congela cámara y movimiento ─────────────────");
  /* OJO CON CÓMO SE MIDE ESTO. La primera versión movía el ratón y
     comprobaba que el yaw no cambiaba... sin bloqueo de puntero ni arrastre,
     y en ese caso el manejador de mirada se retira en su primera línea. O
     sea que el yaw no cambiaba NUNCA, con rueda y sin ella: la prueba pasaba
     igual de verde con el congelado quitado. Se descubrió mutando.
     Ahora hay un CONTROL: primero se comprueba que sin rueda el mismo gesto
     SÍ gira la cámara. Si el control no gira, es que el camino no se está
     recorriendo y la comprobación de abajo no mediría nada — y entonces
     falla el control, que es justo lo que tiene que pasar. */
  /* Y OJO TAMBIÉN CON ESTO: la primera versión de este ayudante movía el
     ratón a tres coordenadas ABSOLUTAS fijas. Llamarlo dos veces dejaba el
     cursor donde ya estaba, o sea desplazamiento neto CERO en la segunda
     llamada, y la comprobación daba cero pasara lo que pasara. Se mueve por
     incrementos y siempre hacia el mismo lado. */
  let cx = 200, cy = 300;
  const girar = async () => {
    const y0 = await p.evaluate(() => window.__T.G.yaw);
    for (let k = 0; k < 3; k++){ cx += 120; cy -= 18; await p.mouse.move(cx, cy); }
    const y1 = await p.evaluate(() => window.__T.G.yaw);
    return Math.abs(y1 - y0);
  };
  /* La T lleva pulsada desde el principio de la prueba. Hay que SOLTARLA
     antes, porque el manejador ignora los keydown repetidos (mirando
     G.keys) y un segundo down con la tecla ya hundida no abre nada: la
     rueda se quedaba cerrada y la comprobación medía una cámara que nadie
     había congelado. */
  await p.evaluate(() => window.__T.Rueda.cerrar());
  await p.keyboard.up("t");
  await p.mouse.move(cx, cy);
  await p.mouse.down();                       // arrastre: así el manejador sí lee deltas
  const control = await girar();
  ok("CONTROL · sin rueda, el ratón sí gira la cámara", control > 1e-4,
     "yaw se movió " + control.toFixed(5) + " rad");

  await p.keyboard.down("t");
  if (cx > 900){ cx = 200; cy = 300; await p.mouse.move(cx, cy); }
  const conRueda = await girar();
  ok("el ratón no gira la cámara con la rueda abierta", conRueda < 1e-9,
     "yaw se movió " + conRueda.toFixed(7) + " rad");
  await p.mouse.up();
  await p.evaluate(() => window.__T.Rueda.cerrar());
  await posar();
  await p.keyboard.up("t");
  await p.keyboard.down("t");

  const anduvo = await p.evaluate(() => {
    const T = window.__T, G = T.G;
    const x0 = G.px, z0 = G.pz;
    G.keys["KeyW"] = true;
    for (let i = 0; i < 120; i++) T.physicsStep(1/120);
    G.keys["KeyW"] = false;
    return Math.hypot(G.px - x0, G.pz - z0);
  });
  ok("con W pulsada el muñeco no se mueve", anduvo < 0.01, anduvo.toFixed(4) + " m en 1 s");

  console.log("\n── soltar la T dispara lo apuntado ──────────────────────");
  await empujar(0, -90);                       // sector 0 = el primer gesto
  await p.keyboard.up("t");
  const e2 = await estado();
  ok("sale el gesto apuntado", e2.gesto === nombres[0].toLowerCase(), "gesto=" + e2.gesto);
  ok("y la rueda se cierra", e2.abierta === false && e2.oculta === true);

  console.log("\n── el toque seco la deja fija ───────────────────────────");
  await posar();
  await p.keyboard.down("t");
  await dormir(40);                            // por debajo de RUE.toque
  await p.keyboard.up("t");
  const e3 = await estado();
  ok("un toque corto sin empujar la deja abierta", e3.abierta === true && e3.fija === true);
  await p.keyboard.press("t");
  ok("y la T vuelve a cerrarla", (await estado()).abierta === false);

  console.log("\n── las cifras siguen mandando ───────────────────────────");
  await posar();
  await p.keyboard.press("Digit5");
  ok("la cifra 5 hace su gesto sin rueda", (await estado()).gesto === nombres[4].toLowerCase(),
     "gesto=" + (await estado()).gesto);
  await posar();
  await p.keyboard.down("t");
  await p.keyboard.press("Digit3");
  const e4 = await estado();
  ok("con la rueda abierta la cifra dispara y cierra",
     e4.gesto === nombres[2].toLowerCase() && e4.abierta === false, "gesto=" + e4.gesto);
  await p.keyboard.up("t");

  console.log("\n── Esc cierra la rueda, no pausa ────────────────────────");
  await posar();
  await p.keyboard.down("t"); await dormir(40); await p.keyboard.up("t");
  await p.keyboard.press("Escape");
  const e5 = await p.evaluate(() => ({ abierta: window.__T.Rueda.abierta, modo: window.__T.G.mode }));
  ok("Esc con la rueda abierta la cierra y sigue en partida",
     e5.abierta === false && e5.modo === "play", "modo=" + e5.modo);

  await ctx.close();

  // ══════════ 2ª parte: el scroll de la pausa en horizontal ══════════
  console.log("\n── el menú de pausa en un móvil en horizontal ───────────");
  /* 740×360 es un móvil corriente girado. El menú de pausa mide más que
     eso desde que lleva los ajustes de calidad, así que si no se puede
     desplazar no se llega a "REANUDAR" y la partida queda secuestrada. */
  const ctxM = await b.newContext({ viewport:{width:740,height:360},
    hasTouch:true, isMobile:true, deviceScaleFactor:2 });
  const pm = await ctxM.newPage();
  pm.on("pageerror", e => { errores.push(e.message); console.log("!! pageerror:", e.message); });
  await pm.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await pm.waitForFunction(() => !!window.__T, null, { timeout:20000 });
  await pm.evaluate(() => { window.__T.G.mode = "play"; window.__T.pause && window.__T.pause(); });
  /* pause() puede no estar exportado; se abre el overlay a mano si hace
     falta, que es exactamente lo que ve el jugador. */
  await pm.evaluate(() => { document.getElementById("pause").hidden = false; });
  await dormir(120);

  const med = await pm.evaluate(() => {
    const ov = document.getElementById("pause");
    const cs = getComputedStyle(ov);
    const caja = ov.firstElementChild;
    const botones = [...ov.querySelectorAll("button")];
    const ultimo = botones[botones.length - 1];
    ov.scrollTop = 0;
    const arribaSinScroll = caja.getBoundingClientRect().top;
    ov.scrollTop = ov.scrollHeight;                 // hasta el fondo
    const usado = ov.scrollTop;
    const fondo = ultimo ? ultimo.getBoundingClientRect().bottom : 0;
    return { overflowY: cs.overflowY, align: cs.alignItems,
             alto: ov.clientHeight, contenido: ov.scrollHeight,
             desborda: ov.scrollHeight > ov.clientHeight + 1,
             usado, arribaSinScroll, fondo, nBotones: botones.length,
             textos: botones.map(x => x.textContent.trim().slice(0,14)) };
  });

  ok("el overlay declara scroll vertical", med.overflowY === "auto" || med.overflowY === "scroll",
     "overflow-y: " + med.overflowY);
  ok("a 740×360 el menú desborda de verdad (si no, esta prueba no mide nada)",
     med.desborda, med.contenido + " px de contenido en " + med.alto + " px de pantalla");
  ok("y se puede desplazar hasta el fondo", med.usado > 1,
     "scrollTop llegó a " + Math.round(med.usado) + " px");
  ok("nada queda recortado por ARRIBA sin desplazar", med.arribaSinScroll >= -1,
     "borde superior del menú en y=" + Math.round(med.arribaSinScroll));
  ok("el último botón queda dentro de la pantalla al bajar del todo",
     med.fondo <= med.alto + 1, "fondo en y=" + Math.round(med.fondo) + " de " + med.alto);
  ok("hay botones que alcanzar", med.nBotones > 0, med.textos.join(" · "));

  await ctxM.close();

  console.log("");
  ok("sin errores de página", errores.length === 0, errores.slice(0,3).join(" | "));
  console.log(fallos === 0 ? "\nTODO OK" : "\n" + fallos + " FALLOS");
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
