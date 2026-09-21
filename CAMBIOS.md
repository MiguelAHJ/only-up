# Cambios — 21 de septiembre de 2026 (octavo lote): dificultad DIFÍCIL

1800 m. Todo lo de media, más apretado, más dos cosas nuevas: **steppers**
(las cornisas, pero de 4 a 6 repisas) y **trampolines**.

## Lo primero, otra vez: los saltos no se pueden alargar

Pediste plataformas "lo más alejadas posible". Ya lo están. El doble salto
real alcanza 3,93 m de los 4,4 teóricos, el generador usa margen 0,90 y
media ya coloca al 98% de ese máximo. Y hay un matiz que conviene ver:
**`maxGap` ya asume el doble salto ejecutado en el ápice**, así que los
saltos máximos de media YA exigen guardar el segundo salto y darle en el
momento justo. Eso que querías ya estaba; lo que no se notaba era el
castigo al fallar.

Por eso DIFÍCIL aprieta el blanco, no la distancia:

| | MEDIA | DIFÍCIL |
|---|---|---|
| altura | 1500 m | **1800 m** |
| ancho de pieza | 0,45 – 2,40 m | **0,38 – 1,60 m** |
| dificultad (inicio → fin) | 0,70 → 1,00 | **0,88 → 1,00** |
| pasos entre descansos | 16 | **22** |
| giro por paso | 24–80° | **26–88°** |
| bidones | tamaño normal | **×0,55** |
| senderos | 0,34–0,46 m | **0,22–0,32 m** |
| repisas por cornisa | 2–3 | **4–6 (steppers)** |

## Trampolines — la única forma de alargar de verdad

Un rebote mete energía que el avatar no tiene, así que aquí sí se pueden
hacer tramos largos sin tocar `AV`. Es lo único de este lote que toca la
física (`resolverCaja`), y con dos decisiones deliberadas:

- **Impulso fijo: 4,0 m.** Caigas de donde caigas sales igual. Eso es lo que
  permite *aprenderse* un camino en dos intentos, y lo que me deja
  garantizar por diseño que cada rebote llega.
- **El rebote NO devuelve los saltos, y los pone a cero.** Una vez pisas la
  cadena, el rebote es todo lo que tienes hasta suelo firme. El control
  aéreo sigue, así que es cálculo y pilotaje.

Una cadena son 3–5 plataformas de rebote separadas 3,9–4,8 m, a veces con un
**bidón pequeño a mitad** (aterrizar en él es aterrizaje normal: te devuelve
los saltos, es el respiro), y termina en una plataforma firme.

### El detalle que hace la mecánica

En el aire **soltar W no frena**: el rozamiento solo actúa en suelo. Para no
pasarte de largo hay que pulsar **S**. Un rebote a velocidad de carrera
avanza 8,3 m; los tramos están a 4 m. O sea que el juego no es llegar, es
**no pasarse**. Eso es literalmente "calcular el rebote".

## Equivocaciones del camino (dos, y las dos mías)

1. El primer bot mantenía W pulsado todo el vuelo y se pasaba 3 m en cada
   rebote: **0,7% de aciertos**. No era el diseño, era que no frenaba.
2. El segundo simulaba los bidones intermedios como si rebotaras en ellos,
   cuando en un bidón aterrizas normal. Eso solo bajó el número.
3. El tercero frenaba de más y llegaba corto. Lo cambié por barrer
   **velocidades de crucero** (v* = distancia / tiempo de vuelo), que es lo
   que acaba encontrando un jugador a base de intentos.

## Verificación

Torres completas de 1800 m, 6 semillas, física real del juego:

| | resultado |
|---|---|
| saltos normales imposibles por distancia | **0** |
| **steppers superados** | **1.251 / 1.251 = 100%** |
| rebotes superados | 1.134 / 1.168 = **97,1%** |
| senderos recorridos andando | 264 / 271 = **97,4%** |
| generar 1800 m | 2 – 6 ms |
| piezas por torre | ~2.100 |

Los steppers de 4–6 repisas salen **mejor** que las cornisas de 2–3 de
media (99,1%): la plataforma de salida y la campana de aire reservada, que
se añadieron para media, resuelven el problema de raíz.

## ⚠ Lo que queda abierto

**Un 3% de rebotes que mi bot no completa.** Distancias de 4,0–4,8 m, sin
patrón claro. Mi piloto mantiene una velocidad *constante* todo el vuelo; un
jugador la va corrigiendo, así que probablemente pase varios de esos. Y
fallar un rebote no te deja encerrado: te caes, como en cualquier otro salto
del juego.

Sigue abierto también **1 cornisa de cada 100 en MEDIA** (ver lote sexto).

> Si tocas `TRAMPOLIN_ALTO`, `TRAMPO_PASO_*` o `TRAMPO_LADO`, vuelve a pasar
> `verifica-dificil.js`. Con el lado a 1,75 en vez de 2,05 los rebotes caían
> al 93,8%, y con los tramos a 5,6 m al 95,8%.

---

# Cambios — 21 de septiembre de 2026 (séptimo lote): el nombre del jugador

El placeholder de la casilla del nombre decía **"miguel"**, y la gente lo
leía como un nombre ya puesto: entraban sin escribir nada.

Y el problema de fondo era peor que el placeholder. El respaldo era una
cadena fija:

```js
return ($("pname").value.trim().slice(0,14)) || "escalador";
```

Tres amigos entrando en blanco salían **los tres como "escalador"**, sin
poder distinguirse ni en la lista de la izquierda ni en las etiquetas de la
torre.

Ahora:

- El placeholder pasa a **"escribe tu nombre"**, que no se puede confundir
  con un valor.
- Al cargar, la casilla viene con un nombre **propuesto y ya escrito**
  (valor, no placeholder), del tema de la torre: `TUERCA-38`, `GRÚA-71`,
  `SOLDADOR-12`… Igual que ya se hacía con el código de sala.
- Al hacer clic en la casilla **se selecciona entero**, así que cambiarlo es
  un solo gesto.
- Se **recuerda entre partidas** en `localStorage` (envuelto en try/catch:
  en modo privado falla y no debe llevarse por delante el arranque).
- Si aun así entras con la casilla vacía, se genera uno al azar en ese
  momento y **se escribe en la casilla** para que veas con qué has entrado.
  Ya no hay forma de que dos jugadores compartan nombre por defecto.

Como el color del avatar sale de `hashStr(nombre)`, nombres distintos dan
también colores distintos.

Comprobado con navegadores reales: 6 pestañas nuevas → 6 nombres distintos;
entrar en blanco da nombre propio y se guarda; al recargar lo recuerda; y el
clic selecciona todo.

> La lista de palabras está en la constante `NOMBRES`, justo encima de
> `leerNombre()`. Cambiarla es una línea.

---

# Cambios — 21 de septiembre de 2026 (sexto lote): dificultades

La torre de siempre pasa a llamarse **FÁCIL** y se añade **MEDIA**: 1500 m,
piezas más pequeñas, y dos mecánicas nuevas.

Se elige en el menú (bloque DIFICULTAD, arriba del todo), la altura por
defecto va con ella, y **viaja con la sala**: el primero que entra la fija
igual que la semilla, el servidor la guarda y se la manda a los demás en el
`init`. Si no, cada uno subiría una torre distinta.

## Lo primero: los saltos NO se pueden alargar

Pediste saltos más difíciles. No se puede, y conviene que sepas por qué.
El doble salto **real** alcanza 3,93 m medidos frente a 4,4 m teóricos
(0,89), y el generador ya usa un margen de 0,90. O sea: **los saltos de
FÁCIL ya están rozando el límite físico del avatar.** Pedir más distancia no
es más difícil, es generar saltos imposibles.

Así que MEDIA aprieta por otro lado:

| | FÁCIL | MEDIA |
|---|---|---|
| altura por defecto | 800 m | **1500 m** |
| ancho de pieza | 0,70 – 4,20 m | **0,45 – 2,40 m** |
| dificultad (inicio → fin) | 0,42 → 0,93 | **0,70 → 1,00** |
| pasos entre descansos | 11 | **16** |
| giro por paso | 18–62° | **24–80°** |
| probabilidad de pieza grande | 16% | **5%** |
| salto más duro (medido) | 94% del máximo | **98%** |

El blanco al aterrizar es mucho más pequeño y descansas mucho menos. Eso es
lo que se siente, no la distancia.

## Cornisas — el salto hacia fuera y luego hacia arriba

Lo que pediste: repisas que sobresalen cada vez más sobre un machón. Desde
la de abajo **no puedes subir en vertical** porque la de arriba te tapa: hay
que salir al vacío con el primer salto y volver con el segundo. Van 2 o 3
niveles.

El voladizo tiene un **techo duro que no es de puntería, es de reglas**:

```
voladizo_máx = runSpeed × coyote = 6,4 × 0,12 = 0,77 m
```

Si saltas estando aún debajo de la repisa, el primer salto lo gastas dándote
en la cabeza (medido en traza: la velocidad vertical pasa de 6,0 a 0 en
seco). Así que hay que salir del voladizo **antes** de saltar — pero al
pisar el vacío solo conservas los dos saltos durante el *coyote time*. Con
0,78 fallaba el 4,5% de las cornisas y ninguna se salvaba probando **14.880
ejecuciones distintas**. Está puesto en **0,35–0,60** (22% de margen), con
alturas de 3,15–3,60 m.

> Por debajo de 2,9 m de alto no se pasa NINGUNA a ningún voladizo: el
> jugador mide 1,70 y se queda encajado bajo la repisa sin sitio para saltar.

### El bug que costó encontrar

Con los márgenes ya bien, seguía fallando un 5,5%. No era el voladizo: era
que **la torre construía su siguiente pieza encima de la cornisa**. Al
rematar el movimiento acabas con la cabeza 1,70 m por encima de la repisa
alta; si hay una losa ahí, no cabes y la cornisa es imposible. En la traza se
veían **dos** golpes de cabeza: uno contra la repisa y otro contra la losa de
arriba, y el jugador se quedaba en 2,55 m de los 3,54 que necesitaba.

Dos arreglos:

1. **Cada cornisa se lleva su propia plataforma de salida**, a 4,2 m y por
   encima, y la torre sigue desde ahí. El aire sobre la cornisa queda libre
   por construcción. Esto solo ya subió de 94,5% a **98,9%**.
2. **Campana de aire reservada.** Con giros de hasta 80° la torre puede
   volver sobre sus pasos. Ahora, cuando una pieza se coloca, se comprueba
   si alguna de sus cajas invade el cilindro de aire sobre una cornisa
   reciente (radio 1,05 m, de +0,15 a +1,95); si invade, se deshace y se
   recoloca girada. No basta con mirar dónde cae su apoyo: una pasarela mide
   14 m y el centro puede estar lejos con la caja justo encima.

## Senderos — el camino fino en zigzag

Tramos de 7 a 14 tablas de **0,34–0,46 m de ancho** que serpentean con
curvas de 26–52°. Sin muros: te vas de lado y te caes.

Medido con un piloto de reflejos humanos:

| | zigzag 26° | 40° | 52° |
|---|---|---|---|
| **andando** (Shift, corrige cada 150 ms, ±8°) | 100% | 100% | 100% |
| corriendo pero atento (150 ms, ±8°) | 18% | 0% | 0% |
| corriendo a lo loco (300 ms, ±16°) | 0% | 0% | 0% |

Exactamente la mecánica que pediste: **andando siempre pasas, corriendo
nunca.** Ojo a un detalle que no se ve: el jugador mide 0,70 de ancho y el
resolutor lo sostiene mientras haya solape, así que un camino de 0,40 se
anda como si midiera 1,10. El número que se siente es `ancho + 0,70`.

### Los senderos van LLANOS, y no es pereza

La primera versión subía 0,12 m por tramo y era **intransitable**. El motor
no tiene subida de escalón —la resolución por penetración mínima empuja en
horizontal mientras el solape vertical sea mayor—, así que cada junta era un
muro de 12 cm: el jugador se clavaba, resbalaba de lado y se caía. En la
traza, `x` se atascaba en 0,7 mientras `z` oscilaba hasta salirse.
**Cualquier subida > 0 bloquea.** El sendero es un tramo horizontal de
tensión; la altura se gana antes y después.

> Si algún día quieres senderos que suban, hay que meter *step-up* en la
> física (subir escalones de hasta ~0,3 m). Es tocar el núcleo que ya te
> gusta, así que no lo he hecho sin preguntarte.

## Verificación

Torres completas de 1500 m, 6 semillas, con la física real del juego:

| | resultado |
|---|---|
| saltos normales imposibles por distancia | **0** de 3.049 |
| cornisas superadas por el bot | **524 / 529 = 99,1%** |
| senderos recorridos andando | **251 / 259 = 96,9%** |
| margen de ejecución de una cornisa | ~102 de 420 formas probadas (24%) |
| tiempo de generar 1500 m | 1,5 – 5 ms |
| piezas por torre | ~1.850 (FÁCIL: ~950) |

La verificación del menú ahora cuenta las piezas especiales aparte y **lo
dice**: la fórmula de distancia no las describe, van con márgenes calibrados.

## ⚠ Lo que queda abierto

**Una cornisa de cada 100 sigue sin pasarse** (unas 5 por cada 6 torres, ~1
por torre). No he conseguido aislar la causa: no es el voladizo, no es la
altura, y no se salvan con rejilla densa. Las dos campanas de aire quitaron
casi todo pero no el resto. Una cornisa techada es un callejón sin salida de
verdad, así que si te topas con una, dime la semilla y la altura y voy a por
ella con la traza.

Si molesta antes de eso, el apaño rápido es bajar `probCornisa` de 0.15 a
0.08 en `DIFS.media.gen`: menos cornisas, misma probabilidad por cornisa.

## Herramientas de medida

En `#debug` el gancho expone ahora `buildTower(semilla, altura, "media")`,
`indexarTorre`, `colocarCornisa`, `colocarSendero`, `doJump` y `DIFS`. Los
scripts de calibración (bot de física, barridos de voladizo y de ancho de
sendero, trazas) son lo que produjo todos los números de arriba.

---

# Cambios — 21 de septiembre de 2026 (quinto lote): pasillos de verdad

Dos cosas sobre las **pasarelas**: sus muros ahora **colisionan**, y el
pasillo pasa de ~2,14 m de hueco a **0,84-0,90 m**.

Los muros laterales se atravesaban. Eran decorado puro:

```js
// antes, en placePiece(), rama "Pasarela"
addBox(x+px*c, y+0.5, z-px*s, 0.06,1,largo, yaw, "oscuro", false);
//                                                          ↑ no colisiona
```

Ahora colisionan. Son los únicos muros del juego, y van marcados con
`kind:"muro"` para poder medirlos aparte; la altura está en la constante
`MURO_ALTO` (1,0 m) junto a `GEN`.

## Por qué no bastaba con cambiar el `false` por `true`

Porque la torre garantiza que **todos los saltos son alcanzables**, y esa
verificación solo mide distancias entre apoyos: no sabe nada de muros. Un
muro de 1 m tapando una salida sería un salto imposible que el informe
seguiría dando por bueno. Había que comprobarlo.

## Una medición mía que estaba mal

Primero escribí un comprobador que trazaba la parábola de apoyo a apoyo y
miraba si chocaba con un muro. Dio **6,3% de salidas tapadas** (130 de 2.063
saltos en 6 semillas) y casi me lo creo.

Era falso. Mi modelo de trayectoria era una aproximación mía —usaba
`v0 × 2` para el doble salto, que manda al jugador a 8,8 m de altura en vez
de 4,4— y lo que detectaba no era un bloqueo: era la cápsula del jugador
rozando su propio muro en los primeros 8 cm de movimiento.

**La lección es la de siempre en este proyecto: si mides con tu propio modelo
en vez de con el motor del juego, estás midiendo tu modelo.**

## La medición buena: un bot con la física real

Un bot que usa `physicsStep` y `resolveCollisions` del juego, apoyo por
apoyo, probando 4 tiempos del segundo salto × 5 correcciones de puntería.
Se corre dos veces sobre la misma torre, con los muros sólidos y sin ellos:

| | saltos logrados |
|---|---|
| **sin muros** | 1.418 / 2.063 = **68,7%** |
| **con muros** | 1.422 / 2.063 = **68,9%** |

Diferencia: **+0,2 puntos**, o sea ruido. Los muros no quitan ni un salto.

(El 31% que falla no son los muros: es que mi bot salta regular. Falla
exactamente igual en las dos corridas, y por eso la comparación vale.)

## Los pasillos, además, eran anchísimos

Al medir el hueco salió esto, sobre 249 pasarelas de 6 semillas:
**mínimo 0,84 m, mediana 2,14 m, máximo 2,14 m**. O sea que *casi todas*
estaban en el tope. Con un jugador de 0,70 m de ancho, un hueco de 2,14 m no
es un pasillo: es una plaza con dos vallas lejanas.

Venía de `const w = clamp(ancho, 0.9, 2.2)`, y `ancho` casi siempre supera
2,2. Ahora el hueco es lo que se fija, no lo que sobra:

```js
const PASILLO_MIN = 0.84, PASILLO_MAX = 0.90;   // hueco LIBRE
const hueco = PASILLO_MIN + (PASILLO_MAX-PASILLO_MIN)*(clamp(ancho,0.9,2.2)-0.9)/1.3;
const w = hueco + MURO_GRUESO*2;                 // el tablón, hasta la cara de fuera
```

Comprobado: hueco entre **0,84 y 0,90 m** en todas las semillas. Con 0,70 de
jugador, entre **7 y 10 cm por lado**.

> **No se llama a `rnd()` en esa línea, y es a propósito.** El ancho se
> reescala del `ancho` que ya venía calculado, así que la secuencia del PRNG
> no se mueve y **cada semilla sigue dando la misma torre de siempre**, solo
> que con las pasarelas estrechas. Si metes un `rnd()` ahí, todas las torres
> conocidas cambian de golpe. (Verificado: los recorridos "sin muros" dan
> 200/249 antes y después del cambio de ancho — la torre es la misma.)

## ¿Estrecharlos rompe algo?

La duda razonable: la pasarela también es sitio donde **aterrizar**, y acabo
de hacer el blanco mucho más pequeño. El bot con física real dice que no:

| | saltos logrados |
|---|---|
| pasarelas anchas (2,14) | 1.422 / 2.063 = 68,9% |
| **pasarelas estrechas (0,9)** | 1.423 / 2.063 = **69,0%** |

Ni un salto. Tiene sentido: **llegas a la pasarela por su eje largo**, no de
costado. El yaw de la pieza se calcula desde el mismo `rumbo` con el que se
avanzó hasta ella, así que entras por la boca del pasillo; lo que te tiene
que atrapar son los 6-14 m de largo, no los 90 cm de ancho.

Lo que sí baja un poco es recorrerlos andando de punta a punta:

| | pasarelas recorridas |
|---|---|
| anchas, sin muros | 200 / 249 = 80,3% |
| anchas, con muros | 202 / 249 = 81,1% |
| **estrechas, con muros** | 194 / 249 = **77,9%** |

Unas 8 pasarelas más por cada 249 en las que el bot no llega al otro extremo.
No es el muro en sí: son **otras piezas metidas dentro del pasillo** (bidones,
vigas, torres de monumento), que antes se esquivaban por los lados y ahora no.
Ese solape ya existía —el 19% de fallos estaba ahí con los pasillos anchos y
sin muros— pero estrecharlos lo destapa más. Si te molesta al jugar, se ataca
aparte: haciendo que el generador no coloque piezas dentro del volumen de una
pasarela.

## Si tocas estas constantes

`MURO_ALTO`, `PASILLO_MIN` y `PASILLO_MAX` están juntas encima de
`buildTower`. Después de cambiarlas, vuelve a pasar `bot.js` (saltos
logrados, con y sin muros) y `ancho.js` (hueco y recorridos). A 1 m de alto
el salto supera el muro de sobra —con un solo salto ya estás a 1,11 m cuando
llevas 1 m de avance horizontal—; a partir de 2 m eso deja de ser cierto.

## De paso

El gancho de depuración (`#debug` en la URL) ahora expone también
`regenerate`, `buildTower`, `indexarTorre`, `doJump`, `JumpMath` y
`MURO_ALTO`. Sin eso no se puede construir una torre alternativa desde fuera
para compararla, que es justo lo que hacen estas pruebas.

---

# Cambios — 21 de septiembre de 2026 (cuarto lote): consumo

Preguntaste qué te cuesta que un amigo deje la pestaña abierta. Lo medí y la
respuesta era fea: **un AFK gastaba el 91% de lo que gasta uno jugando**,
porque el servidor reparte el estado 15 veces por segundo se mueva alguien o
no. Y crece al cuadrado: cada uno de los N recibe un mensaje con los N.

Egress medido **antes** de este lote, sala entera AFK un mes:

| En la sala | KB/s | MB/hora | GB/mes |
|---|---|---|---|
| 1 | 1,6 | 6 | 4,3 |
| 2 | 5,9 | 22 | 15,7 |
| 4 | 22,4 | 82 | 59,3 |
| 8 | 86,7 | 320 | 230,2 |
| 16 | 342,8 | 1.264 | 910,0 |

Con **1 TB/mes incluido en Ashburn**, una sala de 16 olvidada se come el cupo
entero. CPU y RAM daban igual (200 conexiones = 6% de un núcleo, 65 MB).

## 1. El servidor no reparte si nadie se movió

El cliente redondea la posición a 2 decimales, así que un jugador quieto
produce siempre el mismo mensaje byte a byte. Ahora se compara con el
anterior: si es idéntico, se salta el reparto, con un suelo de **1 por
segundo** para que nadie se dé por desaparecido. En cuanto alguien se mueve el
mensaje cambia y vuelve a 15 Hz en el tick siguiente.

Egress **después**, mismo escenario:

| En la sala | GB/mes antes | GB/mes ahora |
|---|---|---|
| 4 | 59,3 | **3,9** |
| 8 | 230,2 | **15,4** |
| 16 | 910,0 | **60,7** |

**Y jugando no cambia nada.** Comprobado con clientes que se mueven de verdad:
**14,8 estados por segundo** por jugador, igual que antes. El ahorro sale
entero de los que están quietos.

> Cuidado al medir esto: mi primera prueba mandaba siempre la misma posición
> para los "activos", así que el filtro también los frenaba y salía un ahorro
> falso del 94% en todo. Los clientes de prueba tienen que moverse.

## 2. Modo siesta — una pestaña olvidada acaba costando cero

A los **10 minutos sin tocar teclado ni ratón**, el cliente se sale solo de la
sala y deja de reconectar. El HUD lo dice: `EN REPOSO · PULSA UNA TECLA PARA
VOLVER A LA SALA`, y el contador junto al código de sala pasa a `EN REPOSO`.
Con cualquier tecla, clic o movimiento de ratón vuelve a entrar en un segundo.

Vuelve por el camino de **reconexión**, no por el de entrada nueva, así que no
se llama a `play()` ni a `regenerate()`: conservas altura, récord, cronómetro
y torre. Probado: récord 320 → 320, reloj no se reinicia, semilla igual, sigue
en modo `play`, y el amigo lo vuelve a ver.

Contrapartida honesta: mientras duermes desapareces de la torre de tus amigos.
Es lo que hace que cueste cero.

El reloj de la siesta vive en el `setInterval` del latido, no en el bucle de
dibujo, así que también corre con la pestaña en segundo plano — que es
justamente el caso que queríamos cazar.

## Resumen para tu grupo

4 amigos jugando 2 h al día un mes entero: **~5,4 GB**. Los mismos 4 dejándose
las pestañas abiertas el mes entero: antes 59 GB, ahora **cero pasados los 10
minutos**. Con 1 TB incluido, esto deja de ser una preocupación.

> Verifica el tráfico incluido y el precio del TB extra en tu consola de
> Hetzner, no te fíes de este número: ya me equivoqué una vez citando un
> precio de Hetzner de memoria.

---

# Cambios — 21 de septiembre de 2026 (tercer lote)

Las dos cosas que quedaban abiertas del lote anterior, más el código de sala
a la vista.

## 1. El latido — ya no te echan por estar en pausa

`Net.tick()` solo corre con el juego en modo `play`, así que en pausa o con la
pestaña en segundo plano dejabas de mandar nada. Ahora hay un `setInterval`
aparte del bucle de dibujo que manda tu posición cada 5 s si el bucle no lo ha
hecho ya en los últimos 4. Un `setInterval` sigue corriendo en los dos casos;
en segundo plano Chrome lo estrangula a una vez por minuto, que con los 180 s
de inactividad del servidor sobra.

**Medido:** con la inactividad bajada a 6 s, 14 segundos en pausa y sigues
dentro, 0 reintentos, y tu amigo te sigue viendo. Antes te echaba a los 6.

La reconexión automática sigue ahí como red de debajo, para lo que el latido
no cubre: que se caiga el wifi, que suspendas el portátil o que se reinicie el
servidor.

## 2. Red de seguridad en el servidor

```js
process.on("uncaughtException", (e) => { … });
process.on("unhandledRejection", (e) => { … });
```

Esto es un relay: no guarda nada que los navegadores no puedan volver a mandar
en el siguiente paquete, así que un fallo suelto en una sala no tiene por qué
tirar el proceso y con él **todas** las salas. Probado lanzando una excepción
a propósito desde un timer: queda registrada en el log y el servidor sigue en
pie con los jugadores dentro.

> Ojo: esto es una red, no una alfombra. Si ves `[!] excepción no capturada`
> en los logs de Coolify, hay un bug de verdad que arreglar.

## 3. El código de sala, a la vista

Tenías razón: el código solo salía en el menú, así que jugando no sabías qué
dictarle a nadie.

- **Arriba a la derecha, mientras juegas:** `SALA` / **WXYZ** en grande y en
  turquesa, y debajo `2 EN LA TORRE` (o `SIN CONEXIÓN` en rojo si te has
  caído). Solo aparece si estás en una sala.
- **En la pantalla de pausa:** el código en grande, el **enlace de invitación**
  completo (`…/#sala=WXYZ`, que abre el juego y entra solo) y un botón
  **COPIAR ENLACE**. Es el sitio natural para copiarlo, porque jugando el
  ratón está capturado. El botón confirma con `COPIADO ✓`; si el navegador no
  deja usar el portapapeles, te dice que lo copies a mano y el enlace está
  seleccionable de una pasada.
- La barra de estado de abajo también pasó de `SALA · 2 EN LA TORRE` a
  `SALA WXYZ · 2 EN LA TORRE`.

Probado: el bloque de invitación se mantiene solo desde `pintarRed()`, no
depende de por dónde hayas entrado en pausa, y el portapapeles recibió
`http://…/#sala=WXYZ` correctamente.

---

# Cambios — 21 de septiembre de 2026 (segundo lote)

> El primer lote de hoy (cámara, índice espacial, medidor) está más abajo.

Esto sale de lo que contaste: estabais los dos subiendo en la misma sala, os
fuisteis un rato, y al volver seguíais cada uno a vuestra altura pero **ya no
os veíais**. No era cosa vuestra. Eran tres cosas encadenadas, y por el camino
apareció una cuarta bastante peor.

## 1. Por qué os quedasteis solos

1. Al hacer Alt+Tab el navegador suelta el ratón, y hay un manejador que en
   cuanto eso pasa llama a `pause()`.
2. El bucle solo llama a `Net.tick()` cuando el modo es `play`. En pausa
   **dejas de mandar tu posición**: para el servidor te has quedado mudo.
3. El servidor echaba a los mudos al minuto. Y si os echa a los dos, la sala
   se queda vacía y **se cierra entera**, con su semilla.
4. El cliente no reintentaba nada. `onclose` apagaba la bandera, vaciaba la
   lista de amigos, escribía un aviso en el menú (que jugando no ves) y ahí
   se acababa.

Y como tu posición es **100 % local** —la red solo sirve para dibujar a los
demás—, el juego seguía funcionando perfecto. Por eso conservabais la altura y
por eso no os disteis cuenta.

## 2. El bug gordo: el servidor se caía entero

Esto apareció montando la prueba, no lo sabíamos. En `server.js`:

```js
if (!sala.timer) sala.timer = setInterval(() => repartir(sala), 1000 / HZ);
```

`sala` es la variable **de esa conexión**, y al desconectarse se ejecuta
`salir()`, que hace `sala = null`. El temporizador cierra sobre la variable,
no sobre el valor. Resultado: **en cuanto el que había creado la sala se iba
quedándose los demás dentro**, el temporizador empezaba a llamar a
`repartir(null)` → excepción sin capturar dentro de un timer → **el proceso de
Node se muere y se lleva por delante todas las salas del servidor**.

Medido: con el código de ayer, tres jugadores en una sala y que se vaya el
primero → el servidor cae. Con el arreglo (`const s = sala`) aguanta las tres
salidas y la sala se cierra una sola vez, no tres.

Esto explica el mismo síntoma **sin necesidad de estar AFK**, así que es muy
probable que os haya pasado también por aquí.

## 3. Lo que se ha hecho

- **`server.js` — el temporizador cierra sobre la sala, no sobre la variable.**
  Una línea. Es el arreglo de verdad.
- **`server.js` — `repartir()` se protege** de que le llegue una sala nula, y
  **`cerrarSala()` es idempotente** (antes escribía "sala cerrada" tres veces
  seguidas porque la llamaban tres sitios distintos).
- **`server.js` — la inactividad pasa de 60 s a 180 s.** Un minuto era muy
  poco: irte al baño bastaba. Más de tres minutos solo dejaría fantasmas.
- **`index.html` — reconexión automática.** Si se cae la conexión, se vuelve a
  entrar solo: 0,8 s, 1,6 s, 3,2 s… hasta un tope de 15 s entre intentos,
  indefinidamente, hasta que vuelvas o te vayas al menú.
- **`index.html` — al reconectar NO se llama a `play()` ni a `regenerate()`.**
  Esto era la trampa: `play()` te habría devuelto al suelo con el cronómetro a
  cero, y `regenerate()` te habría cambiado la torre bajo los pies. Vuelves
  exactamente donde estabas, incluso estando en pausa.
- **`index.html` — ahora te enteras.** Un cartel rojo parpadeante arriba en el
  centro (`SIN CONEXIÓN CON LA SALA · RECONECTANDO`), la misma línea en la
  pantalla de pausa (que es lo que ves al volver de estar AFK), y en la barra
  de estado se distingue `SOLO` (nunca entraste a una sala) de `SIN CONEXIÓN`
  en rojo (te echaron de una). Al volver, un `DE VUELTA EN LA SALA` en verde
  durante 2,6 s.

## 4. Probado, no supuesto

Dos navegadores de verdad contra el servidor de verdad, con la inactividad
bajada a 5 s para no esperar:

```
1. los dos entran a la sala ABCD      → SALA ABCD · 2 EN LA TORRE, misma semilla
2. suben a 137,5 m y se van a pausa
4. el servidor los echa por mudos     → a los 6,2 s; /salas devuelve []
5. sin tocar nada, ¿vuelven solos?    → sí, en 1,2 s, y se vuelven a ver
6. ¿se perdió algo?
   altura  137,5 → 137,5   IGUAL
   récord  140   → 140     IGUAL
   reloj   5,8   → 5,8     no se reinició
   modo    pause → pause   no le hizo play()
   semilla igual           no regeneró la torre
8. salir al menú no reconecta         → correcto
```

Y la prueba del creador que se va, con tres jugadores: el servidor sigue vivo,
los otros dos se siguen viendo, y la sala se cierra una sola vez.

## 5. Lo que quedaba sin cubrir

Quedaban dos huecos: el latido (la pestaña en segundo plano seguía dejándote
mudo) y la falta de una red de seguridad global en el servidor. **Los dos
están resueltos en el tercer lote, arriba.**

---

# Cambios — 21 de septiembre de 2026 (primer lote)

Van dos cosas: **una corrección** del salto de cámara y **un medidor** para
saber de una vez qué le pasa a tu amigo de España, porque con lo que tenemos
hoy no se puede saber, solo suponer.

---

## 1. La cámara ya no pega tirones

Era esto, en la rutina que evita que la cámara se meta dentro del metal:

```js
for (let s=1; s<=8; s++){                 // ocho muestras nada más
  const d = 6.2*(s/8);
  if (hitsSolid(q)) { dist = Math.max(1.7, 6.2*((s-1)/8)); break; }
}
```

La distancia de la cámara solo podía valer **ocho valores**. Si la primera
muestra tocaba una viga, la cámara se iba de 6,2 m a 1,7 m **de golpe**: un
tirón de 4,5 metros. Y al salir de la viga, otro tirón de vuelta. Peor aún,
una viga fina que cayera *entre* dos muestras aparecía y desaparecía fotograma
a fotograma, así que la cámara vibraba mientras subías por andamios.

No te mueve el personaje, pero te cambia el encuadre justo cuando estás
calculando un salto. Y te caes.

Ahora son 24 muestras, la distancia es continua (cualquier valor, no ocho), y
entra rápido pero **sale despacio** (0,05 s para acercarse, 0,28 s para
alejarse), que es lo que quita el parpadeo al pasar junto a una estructura.

## 2. Índice espacial en las colisiones

`resolveCollisions`, `hitsSolid` y `updateShadow` recorrían **las 381 cajas**
de la torre en cada comprobación. Cayendo a velocidad terminal el motor da
unos 100 subpasos por fotograma, o sea ~38.000 comprobaciones por fotograma
solo en colisiones.

Ahora la torre se indexa por altura en cubos de 8 m (102 cubos) y cada
comprobación mira solo 3 cubos. **Medido: 0,1 ms para un fotograma entero de
100 subpasos.** Unas 10 veces menos trabajo.

Honestamente: esto **no era** la causa de tu bug. Lo medí después de
arreglarlo y la física nunca fue el cuello de botella. Lo dejo porque es
trabajo gratis que ya está hecho y da margen cuando metamos más piezas, pero
no quiero venderte como solución algo que no lo es.

## 3. La lista de amigos ya no se rehace 60 veces por segundo

`roster.innerHTML = ...` reconstruía el DOM entero en cada fotograma. Ahora
se reutilizan las filas y solo se toca el texto que cambia.

## 4. Un amigo ya no desaparece por perder un paquete

Si faltaba **un solo** paquete, se destruía su avatar y se volvía a crear —
incluida una textura nueva para su etiqueta con el nombre. Eso son
milisegundos de tirón, y ocurre por red. Ahora hay 1,5 s de margen antes de
quitarlo.

---

## 5. El medidor — esto es lo importante

Abajo en la barra de estado, junto al reloj, sale ahora:

```
45 fps · 120 ms
```

- **fps** — fotogramas por segundo. En blanco va bien, en naranja regular,
  **en rojo por debajo de 30**.
- **ms** — el viaje de ida y vuelta real hasta el servidor (necesita el
  `server.js` nuevo, que responde `pong`).

### Por qué hacía falta

Tú me dijiste algo que no encaja: le pasa **más** al que está **más cerca**
del servidor. Si fuera latencia, sería al revés. Así que mi teoría puede estar
equivocada, y prefiero decírtelo antes que arreglar a ciegas.

Cuando tu amigo de España lo vuelva a sufrir, que mire ese número:

- **fps en rojo (menos de 30)** → es su máquina o su navegador ahogándose.
  El juego avanza a saltos de 100 ms y por eso parece que todo se teletransporta.
  Se arregla bajando calidad, no tocando la red.
- **fps bien pero ms disparados (más de 300, o dando botes)** → es la
  conexión. Curioso estando en Europa, pero entonces sabríamos dónde mirar.
- **los dos bien y aun así salta** → entonces es la cámara, y con el arreglo
  de arriba debería haberse ido. Si no, me lo dices y seguimos.

Pídele una captura de pantalla con el número visible en el momento del fallo.
Eso convierte «parece que salta» en un dato.

---

## Archivos tocados

- `index.html` — cámara, índice espacial, lista de amigos, margen de red, HUD
- `server.js` — responde `ping` con `pong` (hace falta para el milisegundaje)

Nada más. `Dockerfile` y `package.json` siguen igual, así que el despliegue es
el de siempre: `git add -A`, `git commit`, `git push`, y Coolify hace el resto.
