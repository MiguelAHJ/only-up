/* LA FRONTERA REAL: hasta dónde se puede saltar Y ATERRIZAR.
 *
 * El generador permite una distancia = velocidad × tiempo_total_de_vuelo
 * × 0,90, donde tiempo_total_de_vuelo es el arco entero: subir al pico y
 * volver a bajar hasta la altura de llegada. El problema medido en la
 * torre es que a esa distancia el jugador llega a la altura buena
 * TODAVÍA SUBIENDO, la sobrevuela y se va de largo.
 *
 * Esto busca, para cada subida, la distancia máxima a la que el salto
 * todavía tiene margen de verdad sobre una losa ESTRECHA (semiancho 1 m,
 * que es lo que hay en la torre: el tablón del caso de 1137 m mide 0,56 m
 * de ancho). Y de paso anota si en el mejor aterrizaje el jugador venía
 * bajando, que es la regla que queremos imponer.
 *
 * Umbral: 24 de 120 (20%). Por debajo de eso es "hay que bordarlo", que
 * es exactamente lo que Miguel describió.
 */
const { chromium } = require("playwright");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;
const HW  = +(process.env.HW || 1.0);
const UMBRAL = +(process.env.UMBRAL || 29);   // ~20% de 144

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const p = await (await b.newContext({ viewport:{width:900,height:600} })).newPage();
  p.on("pageerror", e => console.log("!! " + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });

  const r = await p.evaluate(([HW, UMBRAL]) => {
    const T = window.__T, G = T.G, AV = T.AV;
    const HY = T.caja().hy;

    const probar = (d, dy) => {
      const s = [ T.box(0, -1.0, 0, 3, 1, 3, 0, "suelo"),
                  T.box(d, dy - 0.5, 0, HW, 0.5, 3, 0, "suelo") ];
      G.tower = { solids:s, visuals:[], apoyos:[], altura:60, informe:{},
                  summit:{x:0,y:9999,z:0} };
      T.indexarTorre(G.tower);
      let n = 0, total = 0, bajando = 0;
      for (const anda of [false, true])
      for (const tj1 of [0, 0.10, 0.20, 0.32])
      /* 99 = NO doblar. Sin esta opción la rejilla obligaba a salto doble
         siempre, y entonces los saltos cortos se pasan de largo: el control
         "escalón fácil" salía 18/120 y no era culpa del escalón. */
      for (const dj2 of [99, 0.18, 0.30, 0.40, 0.50, 0.60])
      for (const fr of [99, 0.35, 0.70]){
        total++;
        G.px = -2.2; G.py = HY + 0.02; G.pz = 0;
        G.vx = G.vy = G.vz = 0; G.grounded = true; G.coyote = 0.12;
        G.jumpsLeft = AV.maxJumpCount; G.yaw = Math.atan2(-1, 0);
        G.keys = Object.create(null); G.keys["KeyW"] = true;
        if (anda) G.keys["ShiftLeft"] = true;
        let t = 0, j1 = false, j2 = false, f = false, vyAntes = 0;
        while (t < 3.0){
          if (!j1 && t >= tj1){ T.doJump(); j1 = true; delete G.keys["ShiftLeft"]; }
          if (j1 && !j2 && dj2 < 90 && t >= tj1 + dj2){ T.doJump(); j2 = true; }
          if (j1 && !f && t >= tj1 + fr){ G.keys["ShiftLeft"] = true; f = true; }
          vyAntes = G.vy;
          T.physicsStep(1/120); t += 1/120;
          const pie = G.py - HY;
          if (G.grounded && t > tj1 + 0.12){
            if (Math.abs(pie - dy) < 0.3){ n++; if (vyAntes < 0) bajando++; }
            break;
          }
          if (pie < -9) break;
        }
      }
      return { n, total, bajando };
    };

    /* CONTROL DE VERDAD esta vez: un escalón que cualquiera pasa. Subida
       de 1 m a 3 m de distancia, sobre la misma losa estrecha. Si esto no
       sale holgado, el banco está mal montado y lo de abajo no vale. */
    const ctrl = probar(3.0, 1.0);
    /* Y uno que nadie pasa: más alto que el salto doble real (4,365 m). */
    const ctrlNo = probar(4.0, 5.2);

    const DYS = []; for (let v = 1.0; v <= 4.0001; v += 0.25) DYS.push(+v.toFixed(2));
    const c = T.JumpMath.compute();
    const sal = [];
    for (const dy of DYS){
      let maxOK = null, detalle = [];
      for (let d = 2.0; d <= 9.01; d += 0.25){
        const q = probar(+d.toFixed(2), dy);
        detalle.push({ d:+d.toFixed(2), n:q.n, baj:q.bajando });
        if (q.n >= UMBRAL) maxOK = +d.toFixed(2);
      }
      sal.push({ dy, maxOK, formula:+T.JumpMath.maxGap(c, dy, T.MARGEN).toFixed(2),
                 sinMargen:+T.JumpMath.maxGap(c, dy, 1.0).toFixed(2), detalle });
    }
    return { sal, ctrl, ctrlNo, total:ctrl.total };
  }, [HW, UMBRAL]);

  console.log("\nCONTROLES (losa de llegada de " + HW + " m de semiancho)");
  console.log("  escalón fácil  (1,0 m subida / 3,0 m):  " + r.ctrl.n + "/" + r.total +
              (r.ctrl.n >= r.total*0.6 ? "  ✔" : "  ✘ EL BANCO NO VALE"));
  console.log("  fuera de alcance (5,2 m subida):        " + r.ctrlNo.n + "/" + r.total +
              (r.ctrlNo.n === 0 ? "  ✔" : "  ✘ EL BANCO NO VALE"));

  console.log("\nFRONTERA: distancia máxima con al menos " + UMBRAL + "/" + r.total + " formas válidas\n");
  console.log("subida │ fórmula sin  │ el generador │ medido de   │ sobra  │ factor");
  console.log("       │ margen       │ permite (90%)│ verdad      │        │ real");
  console.log("───────┼──────────────┼──────────────┼─────────────┼────────┼───────");
  const factores = [];
  for (const f of r.sal){
    const ok = f.maxOK;
    const fac = ok === null ? null : ok / f.sinMargen;
    if (fac !== null) factores.push({ dy:f.dy, fac });
    console.log(
      f.dy.toFixed(2).padStart(6) + "m│ " + f.sinMargen.toFixed(2).padStart(9) + " m  │ " +
      f.formula.toFixed(2).padStart(9) + " m  │ " +
      (ok === null ? "   ninguna " : (ok.toFixed(2) + " m").padStart(10)) + "  │ " +
      (ok === null ? "  —   " : ((ok - f.formula) >= 0 ? "+" : "") + (ok - f.formula).toFixed(2)).padStart(6) +
      " │ " + (fac === null ? "  — " : fac.toFixed(3)));
  }
  const peor = factores.reduce((m, x) => x.fac < m.fac ? x : m, factores[0]);
  const media = factores.reduce((s,x)=>s+x.fac,0)/factores.length;
  console.log("\nfactor real = distancia que de verdad aguanta ÷ alcance teórico sin margen");
  console.log("  el generador usa 0,900 fijo");
  console.log("  medido: media " + media.toFixed(3) + " · el peor " + peor.fac.toFixed(3) +
              " (en subidas de " + peor.dy.toFixed(2) + " m)");

  console.log("\ndónde se desploma cada subida (n de 120 por distancia):");
  for (const f of r.sal){
    if (f.dy < 2.5) continue;
    const s = f.detalle.filter(x => x.d >= 4).map(x =>
      (x.d % 1 === 0 ? String(x.d) : "") + (x.n >= 24 ? "▓" : x.n > 0 ? "░" : "·")).join("");
    console.log("  " + f.dy.toFixed(2) + "m  4m " + s + " 9m");
  }
  console.log("  (▓ = holgado, ░ = hay que bordarlo, · = imposible)");
  await b.close();
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
