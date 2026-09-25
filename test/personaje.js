/* El personaje del laboratorio, comprobado contra el juego en marcha.
 *
 * Nada de esto se mide con un modelo mío: se abre el lab de verdad, se
 * mueve al jugador con la física de verdad y se pregunta al propio three.js
 * dónde ha quedado cada vértice. Medir con mi propia maqueta es medir mi
 * maqueta, y en este proyecto eso ya ha dado números falsos varias veces.
 *
 * Lo que más me importa que falle si se rompe: que al SALIR del lab la caja
 * del jugador vuelva a 0,70 × 1,70 × 0,70. Si se quedara estirada, las
 * torres de verdad se jugarían con un jugador de otro tamaño y el fallo
 * aparecería lejísimos de aquí.
 */
const { chromium } = require("playwright");
const EXE  = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 3231;

let fallos = 0;
const ok = (n, c, extra = "") => {
  if (!c) fallos++;
  console.log((c ? "  OK  " : "  FALLA") + "  " + n + (extra ? "   " + extra : ""));
};

/* Mide el personaje TAL Y COMO ESTÁ AHORA en la escena del juego, pasando
   cada vértice por sus huesos. Box3.setFromObject miente con las mallas con
   esqueleto: una vez me dijo que un personaje de 1,80 m medía 1,8 cm. */
const MEDIR = `(function(){
  const T = window.__T, P = T.PERSONA;
  if (!P || !P.raiz) return null;
  const caja = new THREE.Box3(), v = new THREE.Vector3();
  P.raiz.updateMatrixWorld(true);
  P.raiz.traverse(function(o){
    if (!o.isMesh || !o.visible) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++){
      if (o.isSkinnedMesh && o.skeleton) o.boneTransform(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(o.matrixWorld); caja.expandByPoint(v);
    }
  });
  const t = new THREE.Vector3(); caja.getSize(t);
  return { ancho:+t.x.toFixed(3), alto:+t.y.toFixed(3), fondo:+t.z.toFixed(3),
           pieY:+caja.min.y.toFixed(3), cabezaY:+caja.max.y.toFixed(3) };
})()`;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const p = await (await b.newContext({ viewport:{width:1100,height:680} })).newPage();
  const errores = [];
  p.on("pageerror", e => { errores.push(e.message); console.log("!! pageerror:", e.message); });
  p.on("console", m => { if (m.type() === "error") errores.push(m.text()); });

  await p.goto(`http://127.0.0.1:${PORT}/#debug`, { waitUntil:"load" });
  await p.waitForFunction(() => !!window.__T, null, { timeout:20000 });

  // ── el lab arranca y el personaje entra ──────────────────────────────
  console.log("\n── carga ────────────────────────────────────────────────");
  await p.evaluate(() => window.__T.abrirLab());
  await p.waitForFunction(() => window.__T.G.lab && window.__T.PERSONA.raiz,
    null, { timeout:25000 }).catch(() => {});

  const est = await p.evaluate(() => ({
    lab: window.__T.G.lab,
    hay: !!window.__T.PERSONA.raiz,
    fallo: window.__T.PERSONA.fallo,
    activo: window.__T.PERSONA.activo,
    visible: window.__T.PERSONA.raiz ? window.__T.PERSONA.raiz.visible : false,
    cilindro: window.__T.W.player.visible,
    clips: Object.keys(window.__T.PERSONA.acc || {})
      .filter(k => window.__T.PERSONA.acc[k]),
  }));
  ok("el modelo carga desde modelos/robot/", est.hay && !est.fallo, est.fallo || "");
  ok("y sustituye al cilindro", est.activo && est.visible && !est.cilindro,
     "robot=" + est.visible + " cilindro=" + est.cilindro);
  ok("con los seis estados enganchados a un clip", est.clips.length === 6,
     est.clips.join(", "));

  // ── talla ─────────────────────────────────────────────────────────────
  console.log("\n── talla y apoyo ────────────────────────────────────────");
  /* Se recorre el ciclo de Idle entero: la altura cambia a lo largo del
     ciclo, así que medir un solo instante mide la suerte de ese instante.
     Lo que tiene que cumplirse es que PARADO nunca sobresalga por arriba. */
  /* OJO: hay que MOVER la máquina de estados, no sólo adelantar el reloj
     del mezclador. Nada más cargar, todas las acciones están a peso 0 y lo
     que se mide entonces es la pose de ENLACE — una postura de taller que
     no se ve en el juego jamás. Midiendo así me salía 1,63 y creí que el
     escalado estaba mal; con Idle sonando de verdad son 1,70. */
  /* Antes de medir hay que POSARLO. El punto de aparición del lab está al
     pie de la minitorre, fuera de la losa del banco, así que el jugador
     entra cayendo: una pasada medía los pies a 0,000 y la siguiente a
     0,088, y el margen que había puesto tapaba la diferencia. Una prueba
     que falla a veces enseña a ignorar los fallos. Se le planta sobre la
     losa y se deja caer hasta que el motor diga que toca suelo. */
  await p.evaluate(async () => {
    const T = window.__T, G = T.G;
    G.px = 24; G.pz = 0; G.py = 3; G.vx = G.vy = G.vz = 0;
    /* grounded a false ANTES: si viene en true del fotograma anterior el
       bucle no da ni un paso y se mide a alguien flotando a 3 m. */
    G.grounded = false;
    for (let i = 0; i < 600 && !G.grounded; i++) T.physicsStep(1/240);
  });
  const posado = await p.evaluate(() => window.__T.G.grounded);
  ok("el jugador se posa en la losa antes de medir", posado === true);

  const alturas = await p.evaluate((MED) => {
    const T = window.__T;
    T.G.vx = T.G.vz = 0;
    for (let i = 0; i < 60; i++) T.actualizarPersona(1/60);   // asentar en "quieto"
    const out = [];
    for (let i = 0; i <= 12; i++){
      for (let k = 0; k < 17; k++) T.actualizarPersona(1/60); // ~0,28 s del ciclo
      T.PERSONA.raiz.updateMatrixWorld(true);
      out.push(eval(MED).alto);
    }
    return out;
  }, MEDIR);
  const aMax = Math.max(...alturas), aMin = Math.min(...alturas);
  ok("parado, la cabeza nunca pasa del techo de la caja (1,70)",
     aMax <= 1.705, "más alto del ciclo: " + aMax.toFixed(3) + " m");
  ok("y tampoco se queda pequeño flotando bajo el techo",
     aMax > 1.66 && aMin > 1.55,
     "del " + aMin.toFixed(3) + " al " + aMax.toFixed(3) + " m");
  await dormir(200);
  const m = await p.evaluate(MEDIR);
  const caja = await p.evaluate(() => window.__T.caja());
  const py   = await p.evaluate(() => window.__T.G.py);
  ok("y los pies pisan el suelo de la caja, no flotan",
     Math.abs(m.pieY - (py - caja.hy)) < 0.012,
     "pies " + m.pieY + " · suelo de la caja " + (py - caja.hy).toFixed(3) +
     " · diferencia " + Math.abs(m.pieY - (py - caja.hy)).toFixed(4) + " m");
  ok("el robot es MÁS ANCHO que la caja (dato, no fallo)", m.ancho > caja.hx*2,
     m.ancho + " contra " + (caja.hx*2).toFixed(2) + " m");

  // ── máquina de estados ───────────────────────────────────────────────
  console.log("\n── qué animación toca en cada situación ─────────────────");
  async function forzar(estado){
    return p.evaluate(async (e) => {
      const T = window.__T, G = T.G;
      G.vx = G.vy = G.vz = 0;
      if (e === "quieto")   { G.grounded = true;  }
      if (e === "andar")    { G.grounded = true;  G.vx = T.AV.walkSpeed; }
      if (e === "correr")   { G.grounded = true;  G.vx = T.AV.runSpeed; }
      if (e === "salto")    { G.grounded = false; G.vy = 6; G.jumpsLeft = 1; }
      if (e === "doble")    { G.grounded = false; G.vy = 6; G.jumpsLeft = 0; }
      if (e === "caer")     { G.grounded = false; G.vy = -6; G.jumpsLeft = 0; }
      // se deja asentar la mezcla: los pesos van con transición, no de golpe
      for (let i = 0; i < 40; i++) T.actualizarPersona(1/60);
      const A = T.PERSONA.acc, w = {};
      for (const k in A) if (A[k]) w[k] = +A[k].getEffectiveWeight().toFixed(2);
      return { estado: T.PERSONA.estado, pesos: w,
               tsAndar: A.andar ? +A.andar.timeScale.toFixed(2) : 0,
               tsCorrer: A.correr ? +A.correr.timeScale.toFixed(2) : 0 };
    }, estado);
  }
  const casos = [
    ["quieto", "quieto", "parado en el suelo"],
    ["andar",  "andar",  "a velocidad de andar"],
    ["correr", "correr", "a velocidad de correr"],
    ["salto",  "salto",  "subiendo con un salto en la reserva"],
    ["doble",  "doble",  "subiendo sin saltos: es el doble"],
    ["caer",   "caer",   "bajando"],
  ];
  for (const [forzado, esperado, desc] of casos){
    const r = await forzar(forzado);
    const dominante = Object.keys(r.pesos).reduce((a, k) => r.pesos[k] > r.pesos[a] ? k : a,
      Object.keys(r.pesos)[0]);
    ok(desc + " → " + esperado,
       r.estado === esperado && dominante === esperado && r.pesos[esperado] > 0.8,
       "estado=" + r.estado + " pesos " + JSON.stringify(r.pesos));
  }

  // ── la mezcla es continua, no un interruptor ─────────────────────────
  console.log("\n── la mezcla andar↔correr ───────────────────────────────");
  const mezcla = await p.evaluate(() => {
    const T = window.__T, G = T.G, A = T.PERSONA.acc;
    const medio = (T.AV.walkSpeed + T.AV.runSpeed) / 2;
    G.grounded = true; G.vy = 0; G.vz = 0; G.vx = medio;
    for (let i = 0; i < 60; i++) T.actualizarPersona(1/60);
    return { andar:+A.andar.getEffectiveWeight().toFixed(2),
             correr:+A.correr.getEffectiveWeight().toFixed(2) };
  });
  ok("a media velocidad suenan las DOS a la vez",
     mezcla.andar > 0.2 && mezcla.correr > 0.2,
     "andar " + mezcla.andar + " · correr " + mezcla.correr);

  const rAndar = await forzar("andar"), rCorrer = await forzar("correr");
  ok("y los pies se aceleran con la velocidad (no patinan)",
     rCorrer.tsCorrer > 2 && rAndar.tsAndar > 1.5,
     "andar ×" + rAndar.tsAndar + " · correr ×" + rCorrer.tsCorrer);

  const lento = await p.evaluate(() => {
    const T = window.__T, G = T.G, A = T.PERSONA.acc;
    G.grounded = true; G.vy = 0; G.vz = 0; G.vx = T.AV.walkSpeed / 2;
    for (let i = 0; i < 40; i++) T.actualizarPersona(1/60);
    return +A.andar.timeScale.toFixed(2);
  });
  ok("a media marcha el clip va más lento", lento < rAndar.tsAndar - 0.3,
     "×" + lento + " contra ×" + rAndar.tsAndar);

  // ── mira hacia donde corre ───────────────────────────────────────────
  console.log("\n── orientación ──────────────────────────────────────────");
  const giros = await p.evaluate(() => {
    const T = window.__T, G = T.G, out = [];
    for (const [vx, vz, nombre] of [[6,0,"+x"], [0,6,"+z"], [-6,0,"-x"], [0,-6,"-z"]]){
      G.grounded = true; G.vy = 0; G.vx = vx; G.vz = vz;
      for (let i = 0; i < 90; i++) T.actualizarPersona(1/60);
      // hacia dónde apunta el +Z local del personaje, que es su cara
      const d = new THREE.Vector3(0,0,1).applyQuaternion(T.PERSONA.raiz.quaternion);
      const v = new THREE.Vector3(vx,0,vz).normalize();
      out.push({ nombre, coseno:+d.dot(v).toFixed(3) });
    }
    return out;
  });
  for (const g of giros)
    ok("corriendo hacia " + g.nombre + " mira hacia " + g.nombre, g.coseno > 0.97,
       "coseno " + g.coseno);

  /* "Suave" no es un número mágico de radianes por fotograma: es cuántos
     fotogramas tarda en dar media vuelta. Mi primer intento comparaba
     contra un 0,6 inventado y sólo medía mi umbral. */
  const vuelta = await p.evaluate(() => {
    const T = window.__T, G = T.G;
    G.grounded = true; G.vy = 0; G.vx = 6; G.vz = 0;
    for (let i = 0; i < 120; i++) T.actualizarPersona(1/60);
    const obj = Math.atan2(-6, 0);
    G.vx = -6;                                  // media vuelta de golpe
    let n = 0;
    for (; n < 120; n++){
      T.actualizarPersona(1/60);
      let d = obj - T.PERSONA.giro;
      while (d >  Math.PI) d -= 2*Math.PI;
      while (d < -Math.PI) d += 2*Math.PI;
      if (Math.abs(d) < 0.09) break;            // ~5 grados
    }
    return n + 1;
  });
  ok("media vuelta tarda lo suyo: se ve girar, no teletransportarse",
     vuelta >= 5 && vuelta <= 30, vuelta + " fotogramas (" + (vuelta/60*1000|0) + " ms)");

  // ── la caja se puede tocar en vivo ───────────────────────────────────
  console.log("\n── la caja ajustable ────────────────────────────────────");
  async function tecla(code, veces = 1){
    for (let i = 0; i < veces; i++){
      await p.evaluate((c) => dispatchEvent(new KeyboardEvent("keydown", { code:c })), code);
      await p.evaluate((c) => dispatchEvent(new KeyboardEvent("keyup", { code:c })), code);
    }
    return p.evaluate(() => window.__T.caja());
  }
  const c0 = await p.evaluate(() => window.__T.caja());
  const cAncho = await tecla("KeyX", 10);
  ok("X ensancha la caja 1 cm por pulsación",
     Math.abs(cAncho.hx - (c0.hx + 0.10)) < 0.002, c0.hx + " → " + cAncho.hx);
  const cEstrecho = await tecla("KeyZ", 10);
  ok("Z la estrecha otra vez", Math.abs(cEstrecho.hx - c0.hx) < 0.002, "→ " + cEstrecho.hx);
  const cFondo = await tecla("KeyV", 5);
  ok("V da fondo", Math.abs(cFondo.hz - (c0.hz + 0.05)) < 0.002, c0.hz + " → " + cFondo.hz);

  /* Al cambiar el ALTO hay una trampa: la caja se mide desde el centro, así
     que subir el techo también baja el suelo y el jugador se hundiría medio
     cuerpo en la plataforma. Se compensa moviendo el centro. */
  const pies0 = await p.evaluate(() => { const T = window.__T; return +(T.G.py - T.caja().hy).toFixed(4); });
  await tecla("KeyG", 10);
  const pies1 = await p.evaluate(() => { const T = window.__T; return +(T.G.py - T.caja().hy).toFixed(4); });
  ok("subir el alto NO hunde al jugador en el suelo",
     Math.abs(pies1 - pies0) < 0.002, "pies " + pies0 + " → " + pies1);

  /* Era la T. La T ahora abre la rueda de gestos en todas partes, laboratorio
     incluido, así que restaurar la caja se mudó a la Y. */
  const cT = await tecla("KeyY");
  ok("Y devuelve la caja original",
     Math.abs(cT.hx - 0.35) < 1e-6 && Math.abs(cT.hy - 0.85) < 1e-6 && Math.abs(cT.hz - 0.35) < 1e-6,
     JSON.stringify(cT));

  // ── salir del lab lo deshace todo ────────────────────────────────────
  console.log("\n── salir del laboratorio ────────────────────────────────");
  await p.evaluate(() => { window.__T.ajustarCaja(0.3, 0.3, 0.3); });   // se deja descuadrada aposta
  const sucia = await p.evaluate(() => window.__T.caja());
  await p.evaluate(() => window.__T.salirLab());
  await dormir(600);
  const limpia = await p.evaluate(() => ({
    caja: window.__T.caja(),
    lab: window.__T.G.lab,
    cilindro: window.__T.W.player.visible,
    robot: window.__T.PERSONA.raiz ? window.__T.PERSONA.raiz.visible : false,
    activo: window.__T.PERSONA.activo,
  }));
  ok("la caja vuelve a 0,70 × 1,70 × 0,70",
     limpia.caja.hx === 0.35 && limpia.caja.hy === 0.85 && limpia.caja.hz === 0.35,
     "estaba en " + JSON.stringify(sucia) + " y quedó " + JSON.stringify(limpia.caja));
  ok("vuelve el cilindro y se esconde el robot",
     limpia.cilindro && !limpia.robot && !limpia.activo);
  ok("y el juego sale del modo laboratorio", !limpia.lab);

  // ── el juego de verdad sigue igual ───────────────────────────────────
  console.log("\n── el juego de siempre no se ha enterado ────────────────");
  const juego = await p.evaluate(async () => {
    const T = window.__T, G = T.G;
    G.dif = "media"; G.altura = T.DIFS.media.altura; G.code = "20260918";
    G.tower = T.buildTower(G.code, G.altura, "media");
    T.buildMeshes(G.tower); T.play();
    await new Promise(r => setTimeout(r, 300));
    T.respawn();
    G.keys["KeyW"] = true;
    await new Promise(r => setTimeout(r, 1000));
    const v = Math.hypot(G.vx, G.vz);
    G.keys["KeyW"] = false;
    return { v:+v.toFixed(2), correr:T.AV.runSpeed,
             robot: T.PERSONA.raiz ? T.PERSONA.raiz.visible : false,
             cilindro: T.W.player.visible,
             piezas: G.tower.informe.piezas };
  });
  ok("se corre igual que siempre", Math.abs(juego.v - juego.correr) < 1.2,
     "v=" + juego.v + " (correr=" + juego.correr + ")");
  /* Esta comprobación cambió de signo dos veces, así que ahora LEE el
     interruptor en vez de suponerlo: vale igual esté como esté, y de paso
     comprueba que el interruptor hace lo que dice. */
  const enJuego = await p.evaluate(() => window.__T.ROBOT_EN_JUEGO);
  ok(enJuego ? "con el interruptor en true, el robot sale en la partida normal"
             : "con el interruptor en false, la partida normal vuelve al cilindro",
     enJuego ? (juego.robot && !juego.cilindro) : (!juego.robot && juego.cilindro),
     "ROBOT_EN_JUEGO=" + enJuego + " · robot=" + juego.robot + " cilindro=" + juego.cilindro);
  ok("la torre se genera con las mismas piezas de siempre", juego.piezas > 100,
     juego.piezas + " piezas");

  /* Que la caja MANDE en la física. Mi primer intento barría hacia +x a
     3 m de altura dentro del banco... donde no hay nada: hitsSolid decía
     que no en los dos casos y la prueba "pasaba" sin comprobar nada. Aquí
     se monta una torre de UNA caja en un sitio conocido y se barre hacia
     ella: con el jugador más ancho, el contacto tiene que empezar antes,
     y por la diferencia exacta de anchura. */
  console.log("\n── la caja manda en la física ───────────────────────────");
  const choque = await p.evaluate(() => {
    const T = window.__T, G = T.G;
    /* hitsSolid() NO sirve para esto y caí en la trampa: recibe un OBJETO
       {x,y,z}, no tres números, y además usa un margen fijo de 0,30 que no
       tiene nada que ver con la caja del jugador — es un detector de
       proximidad, no la física. La física es resolverCaja, y se prueba
       empujando al jugador DENTRO de una caja y viendo dónde lo escupe. */
    G.tower = T.indexarTorre({
      solids: [{ x:5, y:3, z:0, hw:0.5, hh:0.5, hd:0.5, yaw:0 }],
      visuals: [], apoyos: [], summit:{x:0,y:99999,z:0},
      start:{x:0,z:0,yaw:0}, altura:20, informe:{piezas:1} });
    const prueba = (hx) => {
      T.restaurarCaja(); T.ajustarCaja(hx - T.caja().hx, 0, 0);
      G.px = 4.40; G.py = 3; G.pz = 0; G.vx = G.vy = G.vz = 0;   // metido en la caja
      T.resolveCollisions();
      return +G.px.toFixed(3);
    };
    const estrecha = prueba(0.20), ancha = prueba(0.60);
    T.restaurarCaja();
    return { estrecha, ancha };
  });
  /* La cara -x de la caja está en 4,50: al jugador lo tiene que dejar con
     su propia cara justo ahí, o sea con el centro en 4,50 − hx. */
  ok("con el jugador estrecho lo deja en 4,50 − 0,20 = 4,30",
     Math.abs(choque.estrecha - 4.30) < 0.005, "quedó en " + choque.estrecha);
  ok("y ancho, 40 cm más lejos: 4,50 − 0,60 = 3,90",
     Math.abs(choque.ancha - 3.90) < 0.005, "quedó en " + choque.ancha);
  await p.evaluate(() => window.__T.regenerate());
  await dormir(300);
  const tras = await p.evaluate(() => window.__T.caja());
  ok("y la caja sigue en su sitio después de trastear",
     tras.hx === 0.35 && tras.hy === 0.85 && tras.hz === 0.35, JSON.stringify(tras));

  /* Las tipografías de Google no se pueden cargar en este contenedor (el
     proxy firma con su propia CA). Es ruido del banco, no del juego: si se
     contara, la prueba estaría siempre en rojo y se aprendería a ignorarla. */
  const reales = errores.filter(e => !/ERR_CERT_AUTHORITY_INVALID|fonts\.(googleapis|gstatic)/.test(e));
  console.log("\nerrores de página: " + (reales.length || "ninguno") +
    (errores.length - reales.length ? "  (" + (errores.length - reales.length) +
     " de tipografías bloqueadas por el proxy, esperado aquí)" : ""));
  for (const e of reales) console.log("   · " + e);
  if (reales.length) fallos += reales.length;
  console.log(fallos ? "\n" + fallos + " FALLOS" : "\ntodo en orden");
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error("FALLÓ:", e.message, "\n", e.stack); process.exit(1); });
