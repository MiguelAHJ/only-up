const { chromium } = require("playwright");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:["--no-sandbox","--use-gl=swiftshader"]});
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const p=await ctx.newPage();
  p.on("pageerror",e=>console.log("!! error:",e.message));
  await p.goto("http://127.0.0.1:3207/#debug",{waitUntil:"load"});
  await p.waitForFunction(()=>!!window.__T,null,{timeout:20000});
  /* El menú ahora tiene dos pasos: los campos de sala viven detrás de
     JUGAR CON AMIGOS. Se va allí antes de tocarlos. */
  await p.evaluate(()=>window.__T.Menu && window.__T.Menu.ir("amigos"));

  const v1=await p.evaluate(()=>({val:document.getElementById("pname").value,
                                  ph:document.getElementById("pname").placeholder}));
  console.log("1. propuesto al cargar:", JSON.stringify(v1.val), "| placeholder:", JSON.stringify(v1.ph));

  // ¿dos pestañas distintas proponen nombres distintos?
  const nombres=new Set();
  for(let i=0;i<6;i++){
    const q=await (await b.newContext()).newPage();
    await q.goto("http://127.0.0.1:3207/",{waitUntil:"load"});
    await q.waitForFunction(()=>!!document.getElementById("pname").value,null,{timeout:15000});
    nombres.add(await q.evaluate(()=>document.getElementById("pname").value));
    await q.close();
  }
  console.log("2. 6 navegadores nuevos →", nombres.size, "nombres distintos:", [...nombres].join(", "));

  // entrar con la casilla VACÍA no debe dar "escalador"
  await p.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await p.fill("#pname","");
  await p.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await p.fill("#room","NOMB");
  await p.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await p.click("#btnJoin");
  await p.waitForTimeout(1500);
  const v2=await p.evaluate(()=>({name:__T.G.name, enCaja:document.getElementById("pname").value,
                                  guardado:localStorage.getItem("tv:nombre")}));
  console.log("3. entrando en blanco → G.name:", JSON.stringify(v2.name),
              "| casilla:", JSON.stringify(v2.enCaja), "| guardado:", JSON.stringify(v2.guardado));

  // recargar: ¿recuerda el nombre?
  await p.goto("http://127.0.0.1:3207/",{waitUntil:"load"});
  await p.waitForFunction(()=>!!document.getElementById("pname").value,null,{timeout:15000});
  const v3=await p.evaluate(()=>document.getElementById("pname").value);
  console.log("4. tras recargar:", JSON.stringify(v3), v3===v2.name?"— lo recuerda ✓":"— NO lo recuerda ✗");

  // clic en la casilla selecciona todo
  await p.evaluate(()=>window.__T.Menu&&window.__T.Menu.ir("amigos"));
  await p.click("#pname");
  const sel=await p.evaluate(()=>{const e=document.getElementById("pname");
    return e.selectionStart===0 && e.selectionEnd===e.value.length;});
  console.log("5. al hacer clic se selecciona entero:", sel?"sí ✓":"no ✗");
  await b.close();
})().catch(e=>{console.error("FALLÓ:",e.message);process.exit(1);});
