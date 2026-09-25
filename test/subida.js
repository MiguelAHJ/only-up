/* LA FÍSICA PURA: ¿cuánto sube de verdad un salto doble?
 *
 * Sin torres, sin plataformas, sin nada que pueda mentir por el camino:
 * el jugador en el suelo llano del laboratorio, salta, y a los N
 * milisegundos pulsa el segundo salto. Se anota a qué altura llega.
 *
 * Lo que se busca: el generador da por bueno que un salto doble sube
 * jumpHeight × 2 = 4,40 m y coloca escalones de hasta 3,96 m. Eso sólo es
 * cierto si el segundo salto cae en el pico exacto del primero. La
 * pregunta es cuánto se pierde al no bordarlo, y sobre todo CUÁNTA
 * VENTANA hay para cada altura.
 */
const { chromium } = require("playwright");
const EXE  = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const p = await (await b.newContext({ viewport:{width:900,height:600} })).newPage();
  p.on("pageerror", e => console.log("!! " + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });
  await p.evaluate(() => window.__T.abrirLab());
  await p.waitForFunction(() => window.__T.G.lab, null, { timeout:25000 });

  const r = await p.evaluate(() => {
    const T = window.__T, G = T.G, AV = T.AV;
    const HY = T.caja().hy;
    const c = T.JumpMath.compute();

    /* Sitio llano y despejado del banco del laboratorio. Se comprueba que
       se aterriza ahí antes de medir nada: si el suelo no está donde creo,
       todo lo de abajo mide otra cosa. */
    const posar = () => {
      G.px = 24; G.pz = 0; G.py = 4; G.vx = G.vy = G.vz = 0; G.grounded = false;
      G.keys = Object.create(null);
      for (let i = 0; i < 900 && !G.grounded; i++) T.physicsStep(1/240);
      return G.grounded ? G.py - HY : null;
    };
    const suelo = posar();

    /* Un salto: se pulsa el segundo a los `d` segundos del primero. Se
       devuelve la altura máxima alcanzada por los PIES sobre el suelo. */
    const salto = (d, corriendo) => {
      posar();
      if (corriendo){ G.keys["KeyW"] = true;
        for (let i = 0; i < 60; i++) T.physicsStep(1/120); }   // media carrera
      const y0 = G.py - HY;
      T.doJump();
      let t = 0, pico = 0, doble = false;
      while (t < 2.4){
        if (!doble && d >= 0 && t >= d){ T.doJump(); doble = true; }
        T.physicsStep(1/240); t += 1/240;
        const h = (G.py - HY) - y0;
        if (h > pico) pico = h;
        if (t > 0.2 && G.grounded) break;
      }
      G.keys = Object.create(null);
      return pico;
    };

    const simple = salto(-1, false);
    const filas = [];
    for (let d = 0.00; d <= 0.90001; d += 0.02) filas.push({ d:+d.toFixed(2), h:+salto(d,false).toFixed(3) });
    const conCarrera = [];
    for (let d = 0.00; d <= 0.90001; d += 0.05) conCarrera.push({ d:+d.toFixed(2), h:+salto(d,true).toFixed(3) });

    return { suelo, simple, filas, conCarrera, tUp:c.tUp,
             doble:c.doubleRise, maxGen: T.JumpMath.maxRise(c, 0.90) };
  });

  console.log("\nsuelo del banco a " + r.suelo.toFixed(3) + " m (control: si esto es null, nada de abajo vale)");
  console.log("la fórmula dice: simple " + (r.doble/2).toFixed(2) + " · doble " + r.doble.toFixed(2) +
              " · el generador coloca hasta " + r.maxGen.toFixed(2) + " m");
  console.log("pico del primer salto a los " + r.tUp.toFixed(3) + " s\n");
  console.log("MEDIDO · salto simple sube " + r.simple.toFixed(3) + " m\n");

  console.log("2º salto a los…   sube…     (parado)");
  let mejor = { d:null, h:-1 };
  for (const f of r.filas){
    if (f.h > mejor.h) mejor = f;
    console.log("   " + f.d.toFixed(2) + " s        " + f.h.toFixed(3) + " m   " +
      "█".repeat(Math.round(f.h*9)));
  }
  console.log("\nMÁXIMO REAL: " + mejor.h.toFixed(3) + " m, pulsando a los " + mejor.d.toFixed(2) + " s");
  console.log("la fórmula prometía " + r.doble.toFixed(2) + " m  →  se pierde " +
              (r.doble - mejor.h).toFixed(3) + " m");

  console.log("\nVENTANA: cuántos ms de margen hay para cada altura objetivo");
  console.log("(de los " + r.filas.length + " tiempos probados, cada uno 20 ms aparte)");
  console.log("  altura   tiempos que llegan   ventana");
  for (let h = 2.4; h <= 4.4001; h += 0.1){
    const n = r.filas.filter(f => f.h >= h).length;
    const ms = n * 20;
    const marca = ms === 0 ? "← IMPOSIBLE" : ms <= 60 ? "← hay que bordarlo" : ms <= 140 ? "← justo" : "";
    console.log("  " + h.toFixed(2) + " m    " + String(n).padStart(3) + " de " + r.filas.length +
                "         " + String(ms).padStart(4) + " ms  " + marca);
  }

  console.log("\ncon carrera (por si el impulso horizontal cambia algo):");
  let mejorC = { d:null, h:-1 };
  for (const f of r.conCarrera) if (f.h > mejorC.h) mejorC = f;
  console.log("  máximo " + mejorC.h.toFixed(3) + " m a los " + mejorC.d.toFixed(2) + " s" +
              "   (parado: " + mejor.h.toFixed(3) + " m)");

  await b.close();
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
