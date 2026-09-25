/* EL BANCO DE DOS PLATAFORMAS.
 *
 * Dos losas anchas, una a distancia D y altura DY de la otra, y el motor
 * de verdad. Se barren las dos medidas y para cada casilla se prueban 120
 * formas humanas de ejecutar el salto. Sale un mapa de CUÁNTO MARGEN hay,
 * no de si "se puede".
 *
 * Por qué un banco y no la torre: en la torre no sé si dos apoyos
 * consecutivos son de verdad un escalón del recorrido, y midiendo así me
 * salían "imposibles" que eran apoyos bajo un techo o puntos que no se
 * pisan. Aquí la geometría la pongo yo y la sé. La pregunta —cuánta
 * ventana deja un salto de tanta subida y tanta distancia— es de física,
 * no de diseño de nivel, así que el banco la contesta mejor.
 *
 * Losas ANCHAS a propósito (3 m de semiancho): así se mide el salto, no la
 * puntería al aterrizar. Una plataforma estrecha sólo puede ser más
 * difícil, nunca más fácil, así que esto es la cota optimista: lo que no
 * pasa aquí no pasa en el juego.
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

    const montar = (d, dy) => {
      const s = [];
      s.push(T.box(0, -1.0, 0, 3, 1, 3, 0, "suelo"));          // cara arriba en y=0
      s.push(T.box(d, dy - 1.0, 0, 3, 1, 3, 0, "suelo"));      // cara arriba en y=dy
      G.tower = { solids:s, visuals:[], apoyos:[], altura:60, informe:{},
                  summit:{x:0,y:9999,z:0} };   // fuera de alcance: no queremos que gane
      T.indexarTorre(G.tower);
    };

    /* Las 120 formas: cuándo sales corriendo antes de saltar, cuándo
       pulsas el segundo salto, si frenas con Shift en el aire para no
       pasarte, y si sales andando. */
    const TJ1   = [0, 0.10, 0.20, 0.32];
    const DJ2   = [0.18, 0.30, 0.40, 0.50, 0.60];
    const FRENA = [99, 0.35, 0.70];
    const ANDA  = [false, true];

    const probar = (d, dy) => {
      montar(d, dy);
      let n = 0, total = 0;
      for (const anda of ANDA) for (const tj1 of TJ1) for (const dj2 of DJ2) for (const fr of FRENA){
        total++;
        G.px = -2.2; G.py = HY + 0.02; G.pz = 0;
        G.vx = G.vy = G.vz = 0; G.grounded = true; G.coyote = 0.12;
        G.jumpsLeft = AV.maxJumpCount;
        G.yaw = Math.atan2(-1, 0);              // mirando hacia +x
        G.keys = Object.create(null); G.keys["KeyW"] = true;
        if (anda) G.keys["ShiftLeft"] = true;
        let t = 0, j1 = false, j2 = false, f = false, bien = false;
        while (t < 3.0){
          if (!j1 && t >= tj1){ T.doJump(); j1 = true; delete G.keys["ShiftLeft"]; }
          if (j1 && !j2 && t >= tj1 + dj2){ T.doJump(); j2 = true; }
          if (j1 && !f && t >= tj1 + fr){ G.keys["ShiftLeft"] = true; f = true; }
          T.physicsStep(1/120); t += 1/120;
          const pie = G.py - HY;
          if (G.grounded && t > tj1 + 0.12){
            if (Math.abs(pie - dy) < 0.3 && G.px > d - 3.2) bien = true;
            break;
          }
          if (pie < -9) break;
        }
        if (bien) n++;
      }
      return { n, total };
    };

    /* CONTROL. Un escalón ridículo tiene que salir casi siempre, y uno
       absurdo nunca. Si el control falla, el mapa de abajo no vale nada. */
    const facil    = probar(3.0, 1.0);
    const absurdo  = probar(6.0, 6.0);

    const DYS = []; for (let v = 1.0; v <= 4.4001; v += 0.25) DYS.push(+v.toFixed(2));
    const DS  = []; for (let v = 2.0; v <= 9.0001; v += 0.70) DS.push(+v.toFixed(2));
    const mapa = [];
    for (const dy of DYS){
      const fila = [];
      for (const d of DS) fila.push(probar(d, dy).n);
      mapa.push({ dy, fila });
    }
    const c = T.JumpMath.compute();
    const frontera = DYS.map(dy => ({ dy,
      maxGap: +T.JumpMath.maxGap(c, dy, T.MARGEN).toFixed(2) }));
    return { mapa, DS, DYS, frontera, total: facil.total,
             ctrlFacil: facil.n, ctrlAbsurdo: absurdo.n,
             maxRise: +T.JumpMath.maxRise(c, T.MARGEN).toFixed(2) };
  });

  console.log("\nCONTROLES");
  console.log("  escalón fácil  (1,0 m / 3,0 m): " + r.ctrlFacil + "/" + r.total +
              (r.ctrlFacil > r.total*0.5 ? "  ✔" : "  ✘ el banco no vale"));
  console.log("  escalón absurdo (6,0 m / 6,0 m): " + r.ctrlAbsurdo + "/" + r.total +
              (r.ctrlAbsurdo === 0 ? "  ✔" : "  ✘ el banco no vale"));

  console.log("\nMARGEN (de " + r.total + " formas de ejecutarlo, cuántas funcionan)");
  console.log("el generador coloca subidas de hasta " + r.maxRise + " m\n");
  const cab = "subida │ " + r.DS.map(d => String(d.toFixed(1)).padStart(4)).join(" ") + "  │ tope de la fórmula";
  console.log(cab);
  console.log("─".repeat(cab.length));
  for (let i = 0; i < r.mapa.length; i++){
    const f = r.mapa[i];
    const cel = f.fila.map((n, j) => {
      const dentro = r.DS[j] <= r.frontera[i].maxGap;
      const s = String(n).padStart(4);
      return dentro ? s : " ·" + s.trim().padStart(2);
    }).join(" ");
    console.log(f.dy.toFixed(2).padStart(5) + "m │ " + cel + "  │ " +
      (r.frontera[i].maxGap < 0 ? "  (imposible)" : r.frontera[i].maxGap.toFixed(2) + " m") +
      (f.dy > r.maxRise ? "   ← el generador no llega aquí" : ""));
  }
  console.log("\nlas casillas con · están FUERA de lo que el generador permite (la fórmula ya las rechaza)");
  console.log("las de dentro son las que el juego SÍ genera: ahí es donde importa el número");
  await b.close();
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
