/* ¿CUÁNTO SE PUEDE SUBIR DE VERDAD DE UN SALTO DOBLE?
 *
 * El generador usa la fórmula: doubleRise = jumpHeight × 2 = 4,40 m, y
 * coloca escalones de hasta el 90% de eso (3,96 m). Pero esos 4,40 m sólo
 * salen si el segundo salto se pulsa EXACTAMENTE en el punto más alto del
 * primero. Un poco antes y te comes la velocidad que te quedaba; un poco
 * después y ya vienes cayendo.
 *
 * Y hay un agujero en las pruebas: los apoyos normales se registran sin
 * `tipo` y el comentario del generador dice "lo verifica la fórmula". El
 * piloto sólo pilota cornisas, senderos y trampolines. O sea que el
 * escalón más común del juego nunca se ha jugado en una prueba.
 *
 * Esto lo pilota: para cada escalón se prueban N formas distintas de
 * ejecutarlo (cuándo saltas, cuándo pulsas el segundo salto, corriendo o
 * andando) y se cuenta cuántas funcionan. Cero = imposible. Una o dos =
 * hay que bordarlo, que es lo que Miguel describió: "lo pasé de
 * casualidad" y luego "no lo conseguí nunca".
 */
const { chromium } = require("playwright");
const EXE  = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;
const SEM  = process.env.SEM || "20260918";
const DIFS = (process.env.DIFS || "media,dificil").split(",");
const DYMIN = +(process.env.DYMIN || 2.2);

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const p = await (await b.newContext({ viewport:{width:900,height:600} })).newPage();
  p.on("pageerror", e => console.log("!! " + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });

  const teoria = await p.evaluate(() => {
    const T = window.__T, c = T.JumpMath.compute();
    return { single:c.singleRise, doble:c.doubleRise, tUp:c.tUp, v0:c.v0,
             gUp:c.gUp, gDown:c.gDown, maxRise:T.JumpMath.maxRise(c, 0.90) };
  });
  console.log("\nLA FÓRMULA DICE:");
  console.log("  salto simple sube      " + teoria.single.toFixed(2) + " m");
  console.log("  salto doble sube       " + teoria.doble.toFixed(2) + " m  (si el 2º se pulsa en el pico exacto)");
  console.log("  el generador coloca    hasta " + teoria.maxRise.toFixed(2) + " m  (90% de eso)");
  console.log("  tiempo hasta el pico   " + teoria.tUp.toFixed(3) + " s");

  for (const dif of DIFS){
    console.log("\n═══════════════════ " + dif.toUpperCase() + " · semilla " + SEM + " ═══════════════════");
    const r = await p.evaluate(async ([dif, sem, DYMIN]) => {
      const T = window.__T, G = T.G, AV = T.AV;
      G.tower = T.buildTower(sem, T.DIFS[dif].altura, dif);
      const HY = T.caja().hy;
      const ap = G.tower.apoyos;

      const paso = () => T.physicsStep(1/120);

      /* EL CONTROL QUE LE FALTABA A ESTO.
         Un apoyo es un punto (x,y,z) que el generador apunta como "aquí se
         pisa". Pero no todos son un sitio donde un jugador pueda PLANTARSE:
         el apoyo de un cubilete cae en su agujero, y el de un lápiz en la
         punta. Sin comprobarlo, un escalón sale "imposible" cuando lo
         imposible es el sitio desde el que lo intento, y así salían
         "peor 0" hasta en escalones de 2,00 m, que un salto simple cubre.
         Se comprueba soltando al jugador ahí quieto medio segundo. */
      const sePuedePisar = (q) => {
        G.px = q.x; G.py = q.y + HY + 0.02; G.pz = q.z;
        G.vx = G.vy = G.vz = 0; G.grounded = false;
        G.keys = Object.create(null);
        for (let i = 0; i < 60; i++) T.physicsStep(1/120);
        return G.grounded && Math.abs((G.py - HY) - q.y) < 0.35;
      };

      /* Un escalón se ejecuta así: caes en el apoyo de abajo, corres hacia
         el de arriba, saltas, y en el aire pulsas el segundo salto. Las
         tres cosas que un jugador varía son cuándo sale, cuándo salta y
         cuándo dobla — y si va corriendo o andando. */
      /* LO QUE LE FALTABA A LA REJILLA: SOLTAR.
         La primera versión mantenía la W pulsada todo el vuelo, y con eso
         un salto alto y largo SE PASA DE LARGO: llegas por encima de la
         plataforma y caes al otro lado. Un jugador suelta el mando a mitad
         de arco. Sin esa entrada salían "imposibles" escalones que sólo
         necesitaban dejar de empujar. */
      const TJ1    = [0, 0.14, 0.28];
      const DJ2    = [0.16, 0.28, 0.40, 0.52, 0.62];
      const SUELTA = [99, 0.25, 0.50, 0.80];     // relativo al primer salto
      const probar = (a, bb) => {
        const dx = bb.x - a.x, dz = bb.z - a.z;
        const yaw = Math.atan2(-dx, -dz);
        let n = 0, total = 0;
        for (const anda of [false, true])
        for (const tj1 of TJ1)
        for (const dj2 of DJ2)
        for (const ds of SUELTA){
          total++;
          G.px = a.x; G.py = a.y + HY + 0.02; G.pz = a.z;
          G.vx = G.vy = G.vz = 0; G.grounded = true; G.coyote = 0.12;
          G.jumpsLeft = AV.maxJumpCount; G.yaw = yaw;
          G.keys = Object.create(null); G.keys["KeyW"] = true;
          if (anda) G.keys["ShiftLeft"] = true;
          let t = 0, j1 = false, j2 = false, sl = false, bien = false;
          const medio = Math.hypot(dx, dz) * 0.45;
          while (t < 3.2){
            if (!j1 && t >= tj1){ T.doJump(); j1 = true; delete G.keys["ShiftLeft"]; }
            if (j1 && !j2 && t >= tj1 + dj2){ T.doJump(); j2 = true; }
            if (j1 && !sl && t >= tj1 + ds){ delete G.keys["KeyW"]; sl = true; }
            paso(); t += 1/120;
            const pie = G.py - HY;
            if (G.grounded && Math.abs(pie - bb.y) < 0.5 &&
                Math.hypot(G.px - a.x, G.pz - a.z) > medio){ bien = true; break; }
            if (pie < a.y - 9) break;
          }
          if (bien) n++;
        }
        return { n, total };
      };

      const filas = [];
      let normales = 0, hist = {}, fueraA = 0, fueraB = 0;
      for (let i = 1; i < ap.length; i++){
        const a = ap[i-1], bb = ap[i];
        /* AMBOS tienen que ser apoyos normales. Antes bastaba con que lo
           fuera el de llegada, y así se colaban pares cuyo punto de salida
           era la repisa de una cornisa o el final de un sendero: sitios
           desde los que el recorrido real NO sigue por ahí. De ahí salían
           "imposibles" con picos de 0,69 m (un salto simple sube 2,20),
           que es la firma de estar saltando bajo un techo. */
        if (bb.tipo || a.tipo) continue;
        normales++;
        const dy = bb.y - a.y;
        const k = (Math.floor(dy*2)/2).toFixed(1);
        hist[k] = (hist[k] || 0) + 1;
        if (dy < DYMIN) continue;
        if (!sePuedePisar(a)){ fueraA++; continue; }
        if (!sePuedePisar(bb)){ fueraB++; continue; }
        const { n, total } = probar(a, bb);
        filas.push({ y:+bb.y.toFixed(0), dy:+dy.toFixed(2),
                     d:+Math.hypot(bb.x-a.x, bb.z-a.z).toFixed(2), n, total,
                     aireA:+T.aireSobre(G.tower.solids, 0, a.x, a.y, a.z, 9).toFixed(2),
                     aireB:+T.aireSobre(G.tower.solids, 0, bb.x, bb.y, bb.z, 9).toFixed(2) });
      }
      return { filas, normales, hist, fueraA, fueraB, total: ap.length };
    }, [dif, SEM, DYMIN]);

    console.log("apoyos normales (sin tipo): " + r.normales + " de " + r.total + " apoyos");
    console.log("\nreparto de subidas:");
    const claves = Object.keys(r.hist).map(Number).sort((x,y)=>x-y);
    for (const k of claves){
      const n = r.hist[k.toFixed(1)];
      console.log("  " + k.toFixed(1) + "–" + (k+0.5).toFixed(1) + " m  " +
        "█".repeat(Math.max(1, Math.round(n/2))).padEnd(30) + " " + n);
    }

    const probados = r.filas;
    if (!probados.length){ console.log("\n(ningún escalón por encima de " + DYMIN + " m)"); continue; }
    const tot = probados[0].total;
    const imposibles = probados.filter(f => f.n === 0);
    const alfilo     = probados.filter(f => f.n > 0 && f.n <= Math.round(tot*0.035));
    const justos     = probados.filter(f => f.n > Math.round(tot*0.035) && f.n <= Math.round(tot*0.10));

    console.log("\ndescartados por no ser sitio donde plantarse: " + r.fueraA + " de salida · " + r.fueraB + " de llegada");
    console.log("pilotados (subida ≥ " + DYMIN + " m): " + probados.length +
                " escalones × " + tot + " formas de ejecutarlos");
    console.log("  IMPOSIBLES (0 de " + tot + "):            " + imposibles.length);
    console.log("  AL FILO    (1–" + Math.round(tot*0.035) + " de " + tot + "):         " + alfilo.length);
    console.log("  justos     (–" + Math.round(tot*0.10) + " de " + tot + "):           " + justos.length);

    const malos = probados.filter(f => f.n <= Math.round(tot*0.10)).sort((x,y)=>x.n-y.n || y.dy-x.dy);
    if (malos.length){
      console.log("\n  altura   subida   distancia   formas que funcionan");
      for (const f of malos.slice(0, 18))
        console.log("  " + (f.y+" m").padStart(7) + "   " + f.dy.toFixed(2) + " m" +
          "   " + f.d.toFixed(2).padStart(6) + " m   " +
          String(f.n).padStart(3) + "/" + tot + "   aire " + f.aireA.toFixed(2) + "/" + f.aireB.toFixed(2) + "  " + (f.n===0?"← IMPOSIBLE":"█".repeat(Math.max(1,Math.round(f.n/2)))));
    }

    /* La curva que de verdad importa: cuánto margen queda según la subida. */
    console.log("\n  margen medio según la subida:");
    const buck = {};
    for (const f of probados){ const k=(Math.floor(f.dy*4)/4).toFixed(2);
      (buck[k] = buck[k] || []).push(f.n); }
    for (const k of Object.keys(buck).map(Number).sort((x,y)=>x-y)){
      const v = buck[k.toFixed(2)];
      const med = v.reduce((s,x)=>s+x,0)/v.length;
      console.log("    " + k.toFixed(2) + " m  n=" + String(v.length).padStart(3) +
        "   media " + med.toFixed(1).padStart(5) + "/" + tot +
        "   peor " + String(Math.min(...v)).padStart(3) +
        "   " + "▓".repeat(Math.round(med/4)));
    }
  }
  await b.close();
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
