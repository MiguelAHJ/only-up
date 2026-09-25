/* LA TRAZA: qué le pasa exactamente al jugador en un escalón imposible.
 *
 * Mismo salto, misma rejilla, pero en la torre de verdad y contándolo
 * paso a paso. En el banco aislado ese salto sale 18-25 veces de 120; en
 * la torre, 0. La diferencia tiene que estar en lo que hay alrededor, y
 * esto lo saca a la luz en vez de suponerlo.
 */
const { chromium } = require("playwright");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;
const DIF = process.env.DIF || "dificil";
const OBJ = +(process.env.OBJ || 1137);

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const p = await (await b.newContext({ viewport:{width:900,height:600} })).newPage();
  p.on("pageerror", e => console.log("!! " + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });

  const r = await p.evaluate(([dif, OBJ]) => {
    const T = window.__T, G = T.G, AV = T.AV;
    G.tower = T.buildTower("20260918", T.DIFS[dif].altura, dif);
    const HY = T.caja().hy, HX = T.caja().hx;
    const ap = G.tower.apoyos;

    let par = null;
    for (let i = 1; i < ap.length; i++){
      const a = ap[i-1], bb = ap[i];
      if (a.tipo || bb.tipo) continue;
      if (bb.y - a.y < 2.2) continue;
      if (Math.abs(bb.y - OBJ) < 3){ par = { a, bb, i }; break; }
    }
    if (!par) return { error:"no encontrado cerca de " + OBJ };
    const { a, bb } = par;

    /* ¿Qué sólidos hay alrededor del apoyo de salida y del de llegada?
       Se listan los que tocan la vertical de cada uno, con su tamaño: así
       se ve si la plataforma de salida es un tablón de palmo y medio. */
    const cerca = (q, rad) => G.tower.solids.filter(s =>
      Math.abs(s.y - q.y) < 6 && Math.hypot(s.x - q.x, s.z - q.z) < rad)
      .map(s => ({ dx:+(s.x-q.x).toFixed(2), dy:+(s.y+s.hh-q.y).toFixed(2),
                   dz:+(s.z-q.z).toFixed(2),
                   tam:[+s.hw.toFixed(2), +s.hh.toFixed(2), +s.hd.toFixed(2)] }))
      .sort((m,n) => Math.abs(m.dy) - Math.abs(n.dy)).slice(0, 6);

    const dx = bb.x - a.x, dz = bb.z - a.z;
    const dist = Math.hypot(dx, dz), yaw = Math.atan2(-dx, -dz);

    let mejor = null;
    for (const anda of [false, true])
    for (const tj1 of [0, 0.10, 0.20, 0.32])
    for (const dj2 of [0.18, 0.30, 0.40, 0.50, 0.60])
    for (const fr of [99, 0.35, 0.70]){
      G.px = a.x; G.py = a.y + HY + 0.02; G.pz = a.z;
      G.vx = G.vy = G.vz = 0; G.grounded = true; G.coyote = 0.12;
      G.jumpsLeft = AV.maxJumpCount; G.yaw = yaw;
      G.keys = Object.create(null); G.keys["KeyW"] = true;
      if (anda) G.keys["ShiftLeft"] = true;
      let t = 0, j1 = false, j2 = false, f = false;
      let pico = -99, saltos = [], fin = "tiempo", avanceEnPico = 0;
      const traza = [];
      while (t < 3.0){
        if (!j1 && t >= tj1){ const antes = G.jumpsLeft; T.doJump(); j1 = true;
          delete G.keys["ShiftLeft"]; saltos.push("s1@"+t.toFixed(2)+(G.jumpsLeft<antes?"":" NO SALTÓ")); }
        if (j1 && !j2 && t >= tj1 + dj2){ const antes = G.jumpsLeft; T.doJump(); j2 = true;
          saltos.push("s2@"+t.toFixed(2)+(G.jumpsLeft<antes?"":" NO SALTÓ")); }
        if (j1 && !f && t >= tj1 + fr){ G.keys["ShiftLeft"] = true; f = true; }
        T.physicsStep(1/120); t += 1/120;
        const pie = G.py - HY, av = Math.hypot(G.px-a.x, G.pz-a.z);
        if (pie - a.y > pico){ pico = pie - a.y; avanceEnPico = av; }
        if (traza.length < 40 && Math.round(t*120) % 12 === 0)
          traza.push({ t:+t.toFixed(2), av:+av.toFixed(2), h:+(pie-a.y).toFixed(2),
                       v:+Math.hypot(G.vx,G.vz).toFixed(2), sue:G.grounded?1:0 });
        if (G.grounded && t > tj1 + 0.14){
          fin = "aterriza a " + (pie-a.y).toFixed(2) + " m (hacía falta " + (bb.y-a.y).toFixed(2) +
                ") tras avanzar " + av.toFixed(2) + " de " + dist.toFixed(2); break; }
        if (pie < a.y - 9){ fin = "se cae tras avanzar " + av.toFixed(2) + " de " + dist.toFixed(2); break; }
      }
      const nota = pico*10 + avanceEnPico;
      if (!mejor || nota > mejor.nota) mejor = { nota, pico:+pico.toFixed(2),
        avanceEnPico:+avanceEnPico.toFixed(2), saltos, fin, traza, tj1, dj2, fr, anda };
    }
    return { y:+bb.y.toFixed(1), dy:+(bb.y-a.y).toFixed(2), dist:+dist.toFixed(2),
             mejor, solA:cerca(a, 6), solB:cerca(bb, 6),
             maxGap:+T.JumpMath.maxGap(T.JumpMath.compute(), bb.y-a.y, T.MARGEN).toFixed(2) };
  }, [DIF, OBJ]);

  if (r.error){ console.log(r.error); await b.close(); return; }
  console.log("\n" + DIF.toUpperCase() + " · escalón a " + r.y + " m · subida " + r.dy +
              " m · distancia " + r.dist + " m (tope fórmula " + r.maxGap + " m)");
  console.log("\nsólidos junto al apoyo de SALIDA (dy = cara superior respecto al apoyo):");
  for (const s of r.solA) console.log("   dy " + (s.dy>0?"+":"") + s.dy + "   a " +
    Math.hypot(s.dx,s.dz).toFixed(2) + " m   tamaño " + s.tam.join(" × "));
  console.log("\nsólidos junto al apoyo de LLEGADA:");
  for (const s of r.solB) console.log("   dy " + (s.dy>0?"+":"") + s.dy + "   a " +
    Math.hypot(s.dx,s.dz).toFixed(2) + " m   tamaño " + s.tam.join(" × "));
  const m = r.mejor;
  console.log("\nMEJOR DE LAS 120 EJECUCIONES  (salir a " + m.tj1 + "s, doblar +" + m.dj2 +
              "s, frenar +" + (m.fr>90?"nunca":m.fr+"s") + (m.anda?", andando":"") + ")");
  console.log("   saltos: " + m.saltos.join(" · "));
  console.log("   sube hasta " + m.pico + " m (hacía falta " + r.dy + ") habiendo avanzado " + m.avanceEnPico);
  console.log("   final: " + m.fin);
  console.log("\n    t      avance    altura   veloc   suelo");
  for (const q of m.traza)
    console.log("  " + q.t.toFixed(2) + "   " + q.av.toFixed(2).padStart(7) + "   " +
      q.h.toFixed(2).padStart(7) + "   " + q.v.toFixed(2).padStart(5) + "     " + (q.sue?"sí":"—"));
  await b.close();
})().catch(e => { console.error("FALLO:", e.message); process.exit(1); });
