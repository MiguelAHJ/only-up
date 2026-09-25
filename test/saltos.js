/* LOS ESCALONES NORMALES, PILOTADOS.
 *
 * Hasta el lote 31 nadie los había jugado nunca en una prueba: se
 * registran sin `tipo` y el comentario del generador decía "lo verifica la
 * fórmula". vm/vd sólo pilotan cornisas, senderos y trampolines. El fallo
 * que encontró Miguel vivía justo ahí.
 *
 * Lo que vigila:
 *   · que el techo de subida de la cima siga bajado (si alguien devuelve
 *     bajaCima a 0, esto tiene que ponerse rojo)
 *   · que los escalones normales imposibles no vuelvan a dispararse
 *
 * Un "imposible" aquí es un escalón que ninguna de 144 formas humanas de
 * ejecutarlo consigue pasar: cuándo sales, cuándo saltas, si doblas y
 * cuándo, si frenas con Shift en el aire, y si vas andando o corriendo.
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
  const p = await (await b.newContext({ viewport:{width:900,height:600} })).newPage();
  const errores = [];
  p.on("pageerror", e => { errores.push(e.message); console.log("!! " + e.message); });
  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });

  // ── lo que la física da de sí, medido, no supuesto ──────────────────
  console.log("\n── el techo de verdad del salto doble ───────────────────");
  const fis = await p.evaluate(() => {
    const T = window.__T, G = T.G;
    const HY = T.caja().hy;
    T.abrirLab();
    const posar = () => { G.px = 24; G.pz = 0; G.py = 4; G.vx = G.vy = G.vz = 0;
      G.grounded = false; G.keys = Object.create(null);
      for (let i = 0; i < 900 && !G.grounded; i++) T.physicsStep(1/240); };
    const salto = (d) => { posar(); const y0 = G.py - HY; T.doJump();
      let t = 0, pico = 0, doble = false;
      while (t < 2.4){
        if (!doble && d >= 0 && t >= d){ T.doJump(); doble = true; }
        T.physicsStep(1/240); t += 1/240;
        const h = (G.py - HY) - y0; if (h > pico) pico = h;
        if (t > 0.2 && G.grounded) break;
      } return pico; };
    let mejor = 0; for (let d = 0.30; d <= 0.80; d += 0.02) mejor = Math.max(mejor, salto(d));
    const c = T.JumpMath.compute();
    T.salirLab();
    return { real:+mejor.toFixed(3), formula:+c.doubleRise.toFixed(3) };
  });
  /* La fórmula del generador promete doubleRise. Si algún día la física
     se aparta de eso más de 10 cm, todos los topes calculados con ella
     dejan de valer y hay que revisarlos. */
  ok("el salto doble real llega a lo que promete la fórmula",
     fis.formula - fis.real < 0.10 && fis.real > 0,
     "real " + fis.real + " m · fórmula " + fis.formula + " m");

  // ── las torres ───────────────────────────────────────────────────────
  for (const dif of ["media", "dificil"]){
    console.log("\n── " + dif.toUpperCase() + " · semilla 20260918 ──────────────────────");
    const r = await p.evaluate((dif) => {
      const T = window.__T, G = T.G, AV = T.AV;
      G.tower = T.buildTower("20260918", T.DIFS[dif].altura, dif);
      const HY = T.caja().hy, ap = G.tower.apoyos;

      /* Control: un apoyo es un punto que el generador marca como "aquí se
         pisa", pero no todos son sitio donde plantarse (el de un cubilete
         cae en su agujero). Sin esto salían "imposibles" que eran apoyos
         imposibles de origen. */
      const pisable = (q) => {
        G.px = q.x; G.py = q.y + HY + 0.02; G.pz = q.z;
        G.vx = G.vy = G.vz = 0; G.grounded = false; G.keys = Object.create(null);
        for (let i = 0; i < 60; i++) T.physicsStep(1/120);
        return G.grounded && Math.abs((G.py - HY) - q.y) < 0.35;
      };

      let imposibles = 0, probados = 0, maxDy = 0;
      const peores = [];
      for (let i = 1; i < ap.length; i++){
        const a = ap[i-1], bb = ap[i];
        /* AMBOS normales: si el de salida es una cornisa o el final de un
           sendero, el recorrido real no sigue por ahí y no es un escalón. */
        if (a.tipo || bb.tipo) continue;
        const dy = bb.y - a.y;
        if (dy > maxDy) maxDy = dy;
        if (dy < 2.2) continue;
        if (!pisable(a) || !pisable(bb)) continue;
        probados++;
        const dx = bb.x - a.x, dz = bb.z - a.z;
        const yaw = Math.atan2(-dx, -dz), medio = Math.hypot(dx, dz) * 0.45;
        let n = 0;
        for (const anda of [false, true])
        for (const tj1 of [0, 0.10, 0.20, 0.32])
        for (const dj2 of [99, 0.18, 0.30, 0.40, 0.50, 0.60])   // 99 = no doblar
        for (const fr of [99, 0.35, 0.70]){                     // 99 = no frenar
          G.px = a.x; G.py = a.y + HY + 0.02; G.pz = a.z;
          G.vx = G.vy = G.vz = 0; G.grounded = true; G.coyote = 0.12;
          G.jumpsLeft = AV.maxJumpCount; G.yaw = yaw;
          G.keys = Object.create(null); G.keys["KeyW"] = true;
          if (anda) G.keys["ShiftLeft"] = true;
          let t = 0, j1 = false, j2 = false, f = false;
          while (t < 3.2){
            if (!j1 && t >= tj1){ T.doJump(); j1 = true; delete G.keys["ShiftLeft"]; }
            if (j1 && !j2 && dj2 < 90 && t >= tj1 + dj2){ T.doJump(); j2 = true; }
            if (j1 && !f && t >= tj1 + fr){ G.keys["ShiftLeft"] = true; f = true; }
            T.physicsStep(1/120); t += 1/120;
            const pie = G.py - HY;
            if (G.grounded && Math.abs(pie - bb.y) < 0.5 &&
                Math.hypot(G.px - a.x, G.pz - a.z) > medio){ n++; break; }
            if (pie < a.y - 9) break;
          }
        }
        if (n === 0){ imposibles++;
          peores.push(+bb.y.toFixed(0) + " m · sube " + dy.toFixed(2) +
                      " · cruza " + Math.hypot(dx,dz).toFixed(2)); }
      }
      return { imposibles, probados, maxDy:+maxDy.toFixed(2),
               peores: peores.slice(0, 5), apoyos: ap.length };
    }, dif);

    /* El techo bajado es la mitad del arreglo. Antes la cima llegaba a
       3,96 m; ahora no pasa de ~2,96. Si alguien devuelve bajaCima a 0,
       esta línea es la primera en avisar. */
    /* Medido tras el arreglo: 3,09–3,14 m según semilla. 3,25 deja aire
       para que el generador respire sin dejar volver a los 3,9 de antes. */
    ok(dif + ": el escalón más alto está bajado", r.maxDy <= 3.25,
       "el mayor sube " + r.maxDy + " m (antes del arreglo: 3,9)");

    /* Siete y siete en esta semilla tras el arreglo (3–12 según semilla,
       medido en cinco). Catorce deja sitio para que el generador se mueva
       sin que esto salte por cualquier cosa, y cierra el paso a volver a
       los 16–20 de antes. */
    ok(dif + ": los escalones normales imposibles siguen contenidos",
       r.imposibles <= 14,
       r.imposibles + " de " + r.probados + " pilotados (antes del arreglo: " +
       (dif === "media" ? "20" : "16") + ")");

    if (r.peores.length) console.log("        los que quedan: " + r.peores.join(" | "));
  }

  console.log("");
  ok("sin errores de página", errores.length === 0, errores.slice(0,2).join(" | "));
  console.log(fallos === 0 ? "\nTODO OK" : "\n" + fallos + " FALLOS");
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
