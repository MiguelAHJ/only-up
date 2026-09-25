/* ¿ES EL TAMAÑO DE LA PLATAFORMA DE LLEGADA?
 *
 * En la torre, un escalón de 3,9 m de subida y 7,0 m de distancia sale
 * 0 de 120. En el banco, el MISMO salto con losas de 6 m de ancho sale
 * 75 de 120. La única diferencia es la losa. Esto lo prueba o lo tumba:
 * se repite el salto de la torre variando sólo el ancho de la losa de
 * llegada.
 *
 * Si al estrechar la losa el margen se desploma hasta cero, el culpable
 * es que el generador mide la distancia de CENTRO A CENTRO y no descuenta
 * lo que mide la plataforma: se permite el 98% del alcance máximo, así que
 * pasarse 80 cm te tira, y a esa distancia pasarse 80 cm es lo normal.
 */
const { chromium } = require("playwright");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const p = await (await b.newContext({ viewport:{width:900,height:600} })).newPage();
  p.on("pageerror", e => console.log("!! " + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });

  const r = await p.evaluate(() => {
    const T = window.__T, G = T.G, AV = T.AV;
    const HY = T.caja().hy;

    /* Los tres escalones imposibles de la torre real, tal cual salieron. */
    const CASOS = [
      { nombre:"DIFÍCIL 1137 m", dy:3.90, d:6.99 },
      { nombre:"DIFÍCIL  144 m", dy:3.70, d:6.86 },
      { nombre:"MEDIA    742 m", dy:2.46, d:7.54 },
      { nombre:"MEDIA   1123 m", dy:2.64, d:7.93 }
    ];
    const ANCHOS = [0.7, 1.0, 1.4, 2.1, 3.0, 4.2, 6.0];   // SEMIancho de la losa

    const probar = (d, dy, hw) => {
      const s = [ T.box(0, -1.0, 0, 3, 1, 3, 0, "suelo"),
                  T.box(d, dy - 0.5, 0, hw, 0.5, hw, 0, "suelo") ];
      G.tower = { solids:s, visuals:[], apoyos:[], altura:60, informe:{},
                  summit:{x:0,y:9999,z:0} };
      T.indexarTorre(G.tower);
      let n = 0, total = 0, masCerca = 1e9;
      for (const anda of [false, true])
      for (const tj1 of [0, 0.10, 0.20, 0.32])
      for (const dj2 of [0.18, 0.30, 0.40, 0.50, 0.60])
      for (const fr of [99, 0.35, 0.70]){
        total++;
        G.px = -2.2; G.py = HY + 0.02; G.pz = 0;
        G.vx = G.vy = G.vz = 0; G.grounded = true; G.coyote = 0.12;
        G.jumpsLeft = AV.maxJumpCount; G.yaw = Math.atan2(-1, 0);
        G.keys = Object.create(null); G.keys["KeyW"] = true;
        if (anda) G.keys["ShiftLeft"] = true;
        let t = 0, j1 = false, j2 = false, f = false, bien = false, alto = false;
        while (t < 3.0){
          if (!j1 && t >= tj1){ T.doJump(); j1 = true; delete G.keys["ShiftLeft"]; }
          if (j1 && !j2 && t >= tj1 + dj2){ T.doJump(); j2 = true; }
          if (j1 && !f && t >= tj1 + fr){ G.keys["ShiftLeft"] = true; f = true; }
          T.physicsStep(1/120); t += 1/120;
          const pie = G.py - HY;
          /* ¿Llegó a estar por encima de la losa en algún momento? Eso
             separa "no alcanza" de "alcanza pero no acierta". */
          if (pie > dy - 0.05) alto = true;
          if (alto && pie > dy - 0.05){
            const fuera = Math.abs(G.px - d) - hw;
            if (fuera < masCerca) masCerca = fuera;
          }
          if (G.grounded && t > tj1 + 0.12){
            if (Math.abs(pie - dy) < 0.3) bien = true;
            break;
          }
          if (pie < -9) break;
        }
        if (bien) n++;
      }
      return { n, total, masCerca:+masCerca.toFixed(2) };
    };

    return CASOS.map(c => ({ ...c,
      filas: ANCHOS.map(hw => ({ hw, ...probar(c.d, c.dy, hw) })),
      maxGap: +T.JumpMath.maxGap(T.JumpMath.compute(), c.dy, T.MARGEN).toFixed(2) }));
  });

  console.log("\nEl generador mide la distancia de CENTRO a CENTRO de las plataformas.");
  console.log("Aquí se repite cada salto imposible de la torre variando SÓLO el");
  console.log("semiancho de la losa de llegada (de 120 formas de ejecutarlo).\n");
  console.log("                      semiancho de la losa de llegada");
  console.log("caso                   0.7  1.0  1.4  2.1  3.0  4.2  6.0 │ tope fórmula · uso");
  console.log("─".repeat(84));
  for (const c of r){
    const uso = (c.d / c.maxGap * 100).toFixed(0);
    console.log(c.nombre.padEnd(16) + "   " +
      c.filas.map(f => String(f.n).padStart(5)).join("") +
      " │ " + c.maxGap.toFixed(2) + " m · " + uso + "%");
  }
  console.log("\n(subida/distancia de cada uno: " +
    r.map(c => c.dy.toFixed(2) + "/" + c.d.toFixed(2)).join("  ·  ") + ")");
  console.log("\n'uso' = qué porcentaje del alcance máximo teórico gasta ese salto.");
  console.log("\nLo más cerca que se pasa del borde de la losa yendo ya a su altura");
  console.log("(negativo = estaba encima de ella; positivo = se pasó de largo):");
  for (const c of r)
    console.log("  " + c.nombre.padEnd(16) + c.filas.map(f =>
      (f.masCerca > 1e8 ? "  —  " : (f.masCerca>0?"+":"") + f.masCerca.toFixed(1)).padStart(6)).join(""));
  await b.close();
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
