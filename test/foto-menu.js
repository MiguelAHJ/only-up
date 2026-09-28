const { chromium } = require("playwright");
(async()=>{
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  // escritorio
  const p = await (await b.newContext({viewport:{width:1100,height:860}})).newPage();
  await p.goto("http://127.0.0.1:3231/#debug",{waitUntil:"load"});
  await p.waitForFunction(()=>!!window.__T,null,{timeout:20000});
  await p.waitForTimeout(600);
  await p.screenshot({path:"m1-portada.png"});
  await p.evaluate(()=>document.getElementById("dControles").open=true);
  await p.evaluate(()=>document.getElementById("dAvanzado").open=true);
  await p.waitForTimeout(200);
  await p.screenshot({path:"m2-pliegues.png", fullPage:false});
  await p.click("#btnIrDif"); await p.waitForTimeout(300);
  await p.screenshot({path:"m3-dificultad.png"});
  await p.click(".volver"); await p.click("#btnIrAmigos"); await p.waitForTimeout(200);
  await p.screenshot({path:"m4-amigos.png"});
  // móvil en horizontal
  const pm = await (await b.newContext({viewport:{width:740,height:360},hasTouch:true,isMobile:true,deviceScaleFactor:2})).newPage();
  await pm.goto("http://127.0.0.1:3231/#debug",{waitUntil:"load"});
  await pm.waitForFunction(()=>!!window.__T,null,{timeout:20000});
  await pm.waitForTimeout(600);
  await pm.screenshot({path:"m5-movil.png"});
  await pm.evaluate(()=>document.getElementById("dControles").open=true);
  await pm.waitForTimeout(200);
  await pm.screenshot({path:"m6-movil-controles.png"});
  await b.close();
})().catch(e=>{console.error("FALLO:",e.message);process.exit(1)});
