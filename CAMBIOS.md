# Cambios — 23 de septiembre de 2026 (vigesimocuarto lote): papelería en MEDIA y DIFÍCIL

Cuatro piezas nuevas de un modelo CC0 de papelería, ya probadas en el
laboratorio y ahora colocadas por el generador. Y un fallo de fondo que
llevaba escondido desde que existen los objetos.

## Las cuatro piezas

| | modelo real | escala | queda en | papel |
|---|---|---|---|---|
| cubilete | 8,4 cm | ×25 | 2,09 × 2,09 × 2,09 | escalón |
| goma | 4,5 × 1 × 1,9 cm | ×28,6 | 1,27 × 0,30 × 0,53 | adorno |
| lápiz corto | 9,4 cm | ×70,5 | 6,63 m de largo | escalón |
| lápiz | 19,4 cm | ×69,5 | 13,47 m de largo | escalón |

Ninguna escala se eligió a ojo: el cubilete y la goma por la ALTURA a la
que quedan, los lápices por el GROSOR, que es lo que decide si se puede
andar por encima. Texturas: 1.799 KB de JPG → **71 KB** en WebP de 512.

### El cubilete es un sitio donde caerse

Es la pieza con mecánica propia. Anillo de doce sectores más un fondo de
tres cajas: saltas, caes dentro, y para salir hay que subirse al bordillo
—y desde el bordillo sales más alto, que es para lo que sirve.

La escala la manda esa mecánica y no el parecido con un bidón. El hueco
tiene **1,90 m de hondo y un salto simple sube 2,20**. A escala 28 el hueco
se quedaría en 2,12 y sería una ratonera; a 25 se sale de un salto.

Medido saltando desde el fondo en 8 direcciones y 13 empujes: con un empuje
suave (15-20% de la carrera) se acierta el bordillo en el **100% de las
direcciones**. Pasarse de empuje no te encierra, te deja fuera — ojo, que
en la torre «fuera» es el vacío.

### Los objetos se colocan CORRIDOS respecto a su apoyo

Esto es nuevo y hacía falta. Antes el objeto se centraba en el apoyo; ahora
puede correrse en la dirección por la que llega el jugador:

- el **cubilete** se corre 0,94 para que el apoyo caiga en el bordillo y no
  sobre el agujero. Al que salta bien no se le castiga; al que se pasa, se
  le mete dentro.
- los **lápices** se corren casi media pieza para que el apoyo caiga cerca
  de su punta y el cuerpo quede POR DELANTE. Si el apoyo fuera el centro,
  media pieza quedaría debajo de la trayectoria de llegada y `arcoLibre` la
  rechazaría una y otra vez. Además van alineados con la dirección de
  llegada: aterrizas en la punta y andas hacia delante por el lomo.

Y van **solos**, sin plataformas en los extremos, como pediste.

## El fallo que llevaba meses escondido

`colisProp` decidía los colisionadores así:

```js
tipo === "bidon" ? (…lo del bidón…) : (…lo de la SILLA…)
```

Con dos objetos funcionaba. Al entrar la papelería, eso significó que **el
cubilete, la goma y los dos lápices se colocaban con el asiento, el
respaldo y las cuatro patas de una silla**, en el sitio del lápiz. El
objeto se veía donde tocaba y no había nada sólido debajo: el jugador lo
atravesaba y se caía 160 m.

Ahora se resuelve por la FORMA de la entrada en `PROPS`, no por una lista
de nombres.

### Y lo caro no fue el fallo, fue lo que me hizo creer

Antes de encontrarlo pasé por esto, y lo dejo escrito porque es la parte
que enseña algo:

1. Medí el coste de cada pieza por separado. Salió que **la goma
   multiplicaba los rescates por cuatro** (de 12 a 84 por 30 torres)
   mientras el cubilete y los lápices no movían la aguja.
2. Los contadores decían que el culpable era `rech.dentro`, la guardia de
   enterramiento del lote 22. Le añadí la regla de penetración mínima que
   le faltaba de verdad — un arreglo bueno, y los rechazos cayeron de 373 a
   12.
3. Pero el rechazo se mudó a `aire`, de 2 a 353. Instrumenté para ver qué
   sólido estorbaba y salió: **una pata de silla de 7 cm**. 174 de 175.
4. Patas de silla en mitad de la torre, en apoyos donde no había ninguna
   silla. Ahí estaba el fallo de verdad.

Así que decidí apartar la goma con una medición **bien hecha y aun así
falsa**: medía un juego que tenía otro fallo debajo. Con los colisionadores
correctos, la goma no cuesta nada.

El arreglo de `sepultado` se queda: hacía falta igualmente, y ahora está
escrito por qué. Atravesar no es enterrar — contra una pata de 7 cm el
motor te aparta tres centímetros y sigues a tu altura.

## Cuánto salen y cuánto cuestan

| | MEDIA | DIFÍCIL |
|---|---|---|
| objetos por torre | 21 | 23 |
| variantes distintas | 7 de 7 | 7 de 7 |
| la más repetida | 28% | 26% |
| separación mediana | 68 m | 73 m |
| llamadas de dibujo | **7** (eran 3) | 7 |

Pesos de escalón: bidón de pie 26, bidón tumbado 19, silla 20, cubilete 12,
lápiz corto 7, lápiz largo 4. La goma sólo de adorno.

## Lo que esto cuesta, y que no se va a disimular

Los arcos cortados en MEDIA suben. Medido con 40 semillas:

| | línea base | con papelería |
|---|---|---|
| arcos cortados, MEDIA | 4 de 40 torres | **6 de 40** |
| arcos cortados, DIFÍCIL | 2 | 3 |
| rescates, MEDIA (60 semillas) | 16 | 24 |

`generador.js` pasa con sus 25 semillas de siempre, pero con 40 la MEDIA se
queda en 6 contra un umbral de 5. No lo tapo bajando pesos: lo probé
—cubilete 9, corto 5, largo 3— y salió **peor** (8 de 40), que es la señal
de que los pesos no son la palanca.

Y sé qué los corta, porque lo medí: **los pretiles de las plataformas**,
piezas de 6 cm de grueso y 1 m de alto que ya estaban. Los objetos nuevos
no cortan ningún arco; lo que hacen es cambiar el trazado de la torre y
destapar más pretiles de los que ya había. La línea base misma está en 4
contra un umbral de 5, o sea que el problema ya estaba ahí y este lote lo
empuja por encima de la raya.

**Eso es un lote propio**, y queda apuntado como tal.

## Pruebas

- `test/papeleria.js` (nuevo): las medidas grabadas, estar de pie a lo
  largo del lápiz corto de punta a punta, caer dentro del cubilete sin
  colarse por ningún hueco, salir de un salto y estar de pie en el
  bordillo.
- `test/props.js`: al día con las siete variantes. El detector de
  escalones-objeto ya no adivina por coincidencia de (x,z) —dejó de valer
  con las piezas corridas—, ahora **lo apunta el generador** en el apoyo.
  Y el cubilete admite dos finales buenos: bordillo o fondo.
- `48 de 48` escalones-objeto aguantan al jugador con la física del juego.

Regresión: generador, cámara, personaje, gestos, instanciado, lote 23 y
objetos, todo en verde.

## Archivos tocados

- `index.html` — catálogo de objetos, colocación corrida, `colisProp`,
  `sepultado`, estaciones 10-15 del laboratorio
- `modelos/papeleria/` — modelo CC0 de Poly Haven con las texturas en WebP

---

# Cambios — 23 de septiembre de 2026 (vigesimotercer lote): sonido, ajustes, récords y la torre del día

Te pasé una lista de recomendaciones y me dijiste que las hiciera todas menos
el healthcheck de Coolify y el ancho del robot. Aquí están, más lo que aprendí
por el camino y una que decidí **no** mandarte.

---

## 1 · El juego tenía cero sonido. Ahora no

Ni una referencia a audio en 207 KB. Se jugaba en mudo.

Todo está **sintetizado con la Web Audio API**: ruido filtrado para el viento
y los pasos, osciladores con envolvente para los golpes. Cero archivos, cero
KB de descarga, cero licencias que revisar, y cada sonido se afina cambiando
un número.

| | qué suena |
|---|---|
| viento | arrecia con la altura, y mucho más al caer |
| salto | barrido de 230 a 430 Hz |
| doble salto | más agudo a propósito: se reconoce sin mirar el HUD |
| aterrizaje | golpe grave, **pesa según la velocidad con la que llegas** |
| pasos | por DISTANCIA recorrida, no por tiempo — el ritmo cuadra solo con la velocidad |
| caída al vacío | barrido hacia abajo |
| cima | cuatro notas |

Tres cosas que este módulo tenía que respetar y respeta:

- El navegador **no deja crear audio sin un gesto del jugador**, así que el
  contexto nace en la primera tecla o clic, no al cargar.
- Si el audio falla, el juego sigue. Hay una prueba que **borra
  `AudioContext` del navegador** y comprueba que se puede jugar igual.
- El bucle llama al viento 60 veces por segundo: es un único grafo permanente
  al que sólo se le mueven dos valores. No se crea nada por fotograma.

**M silencia**, en partida y en pausa. Se recuerda entre visitas.

## 2 · Ajustes de calidad — la cura que faltaba

En el lote 21 le pusimos a tu amigo un medidor de fps para diagnosticar los
tirones. Le dimos el diagnóstico **y ningún mando que tocar**. Esto es el mando.

Tres niveles, en el menú **y en la pantalla de pausa** — porque los tirones se
sufren jugando, y mandar al jugador al menú es perderle la partida:

| | BAJA | MEDIA | ALTA |
|---|---|---|---|
| resolución | 60 % | 85 % | 100 % |
| nubes | 1 | 2 | 3 |
| el robot pasa a cilindro a | 26 m | 42 m | 55 m |
| suavizado de bordes | no | sí | sí |

Al arrancar **mide tres segundos** con el menú en marcha —que dibuja la torre
entera, así que es carga real— y propone un nivel. Si el jugador elige alguna
vez, su decisión manda para siempre y la detección no vuelve a tocarla. Hay
una prueba para eso.

El suavizado de bordes es la excepción y la interfaz lo dice en voz alta: es
una opción **del constructor** del renderizador, no se puede cambiar sin
rehacerlo entero, y rehacerlo se llevaría por delante el bloqueo del puntero.
Se lee al arrancar y se aplica al recargar.

Lo que **no** se toca: la niebla y el plano lejano. Ahorran poco —la torre es
alta y estrecha, no hay mundo lejano que recortar— y cambian el aspecto del
juego. Un ajuste de rendimiento no debería cambiar el arte.

## 3 · El récord ya no se pierde

Esto me sorprendió al mirarlo: en `localStorage` sólo vivía el nombre.
`G.best` se ponía a cero en cada partida, así que quien llegaba a 1.400 m y
cerraba la pestaña **no dejaba rastro**.

Ahora se guarda la mejor altura por dificultad, y el mejor tiempo **sólo si se
llegó arriba** (un tiempo de una partida a medias no se puede comparar con
nada). Se ve en cada botón de dificultad, en la pausa y al coronar.

Se anota al pausar, al volver al menú, al caerse al vacío, al ganar, y además
en `pagehide` y al ocultar la pestaña: cerrar el navegador a media subida no
puede costarte el récord.

## 4 · La torre del día

Tu mejor activo es que **la generación es determinista**, y no lo estaba
aprovechando nadie. Una semilla derivada de la fecha basta para que todo el
mundo suba exactamente la misma torre: sin servidor, sin cuentas, sin base de
datos.

Botón propio junto a las dificultades, con su semilla (`DIA-20260923`), su
fecha a la vista y **su récord aparte**.

La fecha se toma en **UTC**, y no es un detalle: con hora local, tú en
Venezuela y tu amigo en España estarías seis horas al día subiendo torres
distintas y comparando tiempos de dos mapas diferentes sin enteraros.

## 5 · El color, ahora en sRGB

Este era el cambio arriesgado y **quiero que lo mires antes de darlo por bueno**.

El renderizador dibujaba con el encoding por defecto de three, que es lineal.
Un color escrito como `#8A4A2B` —un número pensado para una pantalla— se
mandaba tal cual sin la curva que le toca. El juego entero salía más apagado
de lo que pedía su propia paleta, y **había tres apaños en el archivo que
existían sólo por eso**: uno para el robot, uno para las texturas del bidón y
la silla, y un comentario explicando por qué la paleta no se convertía.

Los tres han desaparecido. Ahora hay una sola regla sin excepciones: lo que se
escribe a mano se convierte a lineal, las texturas de color se marcan sRGB, y
lo que viene de un glTF ya es lineal y no se toca.

### Cómo se reajustó, que aquí está lo interesante

Con el cambio puesto, la imagen salía más clara. Para saber **qué** bajar medí
la luminancia de tres encuadres fijos, por zonas, contra las mismas capturas
de antes. Tres hipótesis, dos muertas:

1. **«Sobra luz.»** Bajé las cuatro luces un 40 %. El error medio pasó de
   5,4 % a 5,2 %. Nada.
2. **«Es la niebla, que ahora se mezcla en lineal.»** Barrí la densidad de 1,0
   a 0,5: 0.3728, 0.3720, 0.3724, 0.3723. Idéntico. Tampoco.
3. **«Son las nubes.»** Sí. Tres planos grandes y transparentes que cubren
   toda la parte baja del encuadre. A media opacidad, el error medio cae de
   7,5 % a 5,4 % y la peor zona de +24 % a +12 %.

Los dos mandos que no movían una medida **no se quedaron en el código**. Un
ajuste que no cambia nada es decoración.

El 12 % que sigue arriba es el cambio real de tubería, no un fallo tapado. Si
al verlo en movimiento prefieres el aspecto de antes, se revierte: es un
bloque acotado.

## 6 · Lo que NO te mando: fusionar las mallas del robot

Lo intenté y lo paré. Lo que se midió:

- un robot cuesta **exactamente 19 llamadas de dibujo** (36 con él, 17 sin él)
- son **4 mallas con esqueleto** (las manos) y **15 mallas normales colgadas
  de huesos**
- sólo hay 3 materiales: Main, Grey y Black
- las 4 con esqueleto traen 4 objetos `Skeleton` distintos pero con
  exactamente la misma lista de huesos

O sea que el premio está en las 15 normales: fusionando sólo las otras se
pasaría de 19 a **18**. Y convertir una malla colgada de un hueso en vértices
con peso 1 obliga a reescribir cada vértice contra la pose de enlace, y ahí
three aplica la escala dos veces — **el mismo problema que ya nos mordió
midiendo la altura del personaje**, cuando me dijo que medía 1,8 cm.

Se puede hacer, es un lote propio con sus pruebas, y el beneficio sólo se nota
con varios amigos en la sala. Queda medido y sin tocar, que es más útil que
medio hecho.

---

## Las pruebas

`test/lote23.js`: 26 comprobaciones sobre sonido, ajustes, récords y torre del
día. Y como siempre, lo que le da valor no es que esté verde: **se rompió el
juego a propósito cuatro veces y se puso roja las cuatro**.

| se rompió | saltó |
|---|---|
| el viento deja de subir con la altura | «el viento arrecia con la altura» |
| el récord se pisa siempre | «una partida peor no borra el récord» |
| la calidad no toca la resolución | «bajar la calidad baja la resolución de verdad» |
| el doble salto suena como el primero | «el segundo suena a doble» |

Dos veces la prueba estuvo mal y el juego bien, y las dos merece la pena
contarlas porque son trampas que repito:

- Medía el viento leyendo `gain.value` justo después de pedirlo.
  `setTargetAtTime` **persigue** el valor en el hilo de audio, así que leía el
  de antes: daba 0.005 a 50 m y 0.005 a 1.150 m. Se partió la regla en una
  función pura (`calcViento`) y ahora se comprueba la regla, no la
  interpolación.
- Guardaba cuatro «fotos» del récord… que eran **cuatro referencias al mismo
  objeto**, mutado en el sitio. Las cuatro mostraban el estado final y la
  prueba comprobaba aire.

Y una prueba anterior hubo que ponerla al día: `gestos.js` comparaba el color
del material contra el hex de la paleta. Con sRGB el material guarda el color
en **lineal** (`#FF6B2C` vive dentro como `ff2506`), así que ahora se compara
lo que se VE, con 2 de margen por canal porque la ida y vuelta en 8 bits no es
exacta (`#FF6B2C` vuelve como `#FE6B2C`).

## Que nada se rompió

| | resultado |
|---|---|
| generador (20 semillas × 3 dificultades) | todo en orden |
| cornisas | 539/539 = 100 % |
| steppers | 1332/1332 = 100 % |
| senderos MEDIA / DIFÍCIL | 98,5 % / 97,0 % |
| rebotes DIFÍCIL | 97,7 % |
| saltos imposibles | 0 |
| objetos (bidón y silla) | todo en orden |
| cámara, personaje, gestos, instanciado | todo en orden |

Las mismas cifras que antes del lote, sin una décima de diferencia.

## Archivos tocados

- `index.html` — sonido, ajustes de calidad, récords, torre del día, sRGB

Nada más. `server.js`, `Dockerfile` y `package.json` siguen igual.

---

# Cambios — 23 de septiembre de 2026 (vigesimosegundo lote): el bidón y la silla en la torre

Miguel: «en media y difícil añade también el barril y la silla que ya teníamos
previstos, que salgan cada tanto, que no sean tan repetitivos tampoco».

Hechos. Y de paso salió un fallo del generador que no sabíamos que estaba.

## Qué aparece y cada cuánto

| | FÁCIL | MEDIA | DIFÍCIL |
|---|---|---|---|
| objetos por torre | **0** | 20,8 | 23,1 |
| haciendo de escalón | — | 49 % | 50 % |
| de adorno | — | 51 % | 50 % |
| separación mediana entre uno y otro | — | **69 m** | **71 m** |
| el par más cercano de toda la tanda | — | 19,8 m | 14,9 m |

FÁCIL se queda limpia a propósito: es donde se aprende a saltar y no conviene
meter ruido.

Hay tres piezas, sorteadas: **bidón de pie** (42 %), **bidón tumbado** (28 %)
y **silla** (30 %). El bidón tumbado cambia bastante cómo se salta encima, por
eso está. La silla tumbada no existe: no tendría dónde pisarse.

Mitad escalón y mitad adorno, y eso es deliberado. Si un bidón fuera siempre
escalón acabaría siendo un cartel de «aquí se salta» y dejaría de sorprender;
si fuera siempre atrezo, no serviría de nada. Nunca salen en los descansos ni
en los monumentos, que están justamente para respirar.

«Que no sean tan repetitivos» se acabó ajustando **por resultado, no por
fórmula**: el contador no baja en los pasos de cornisa ni de sendero (esos
`continue`), así que el número que se escribe en la configuración no es el que
sale. Con 25 pedidos salían 9-12 por torre. Está puesto en 15 (MEDIA) y 9
(DIFÍCIL) porque es lo que da los ~21 y ~23 de la tabla.

## Lo que cuesta dibujarlos

22 objetos en una torre de DIFÍCIL → **3 llamadas de dibujo**. Van por
`InstancedMesh`, uno por geometría (bidón de pie, bidón tumbado, silla), igual
que el resto de la torre.

Las texturas venían a **3.016 KB**. Convertidas a WebP de 512 px: **324 KB**,
un 89 % menos, y en pantalla no se distingue. Los `.gltf` llevan reescritas
las rutas y los tipos.

## El fallo que apareció por el camino

La prueba con la física del juego —dejar caer al jugador sobre el objeto y
mirar dónde se queda de pie— daba **47 de 48**. Uno no: MEDIA, semilla
20261005, bidón tumbado. Esperaba los pies a 411,72 y quedaban a **413,03**,
1,31 m más arriba.

No era la física. El bidón estaba **enterrado dentro de una losa** de
7,5 × 8,2 m que iba de 410,45 a 413,03. El escalón se anotaba en la tapa del
bidón, pero la superficie de verdad era la de la losa. El objeto ni se veía.

Y esto destapa un agujero del lote 20. Allí se añadió `aireSobre`, que busca
**la primera cara de abajo** que quede por encima de los pies. Si una pieza
gruesa **contiene** el apoyo —cara de abajo por debajo de los pies, cara de
arriba por encima— no tiene ninguna cara que ofrecer, y el punto pasa como
despejado. **Techar y sepultar son cosas distintas.** Faltaba la segunda.

### Dos intentos que costaron más de lo que arreglaban

No lo cuento por adorno, lo cuento porque las cifras mandan:

1. **Rechazar que la caja del jugador tocase nada.** Rechazaba el 3 % de los
   apoyos; los rescates pasaron de 13 a **104** y los arcos cortados de 0 a
   **11** en DIFÍCIL. Al instrumentarlo, los 512 rechazos de 6 torres eran
   **todos** postes y cantos de la propia plataforma —piezas de 0,26 × 0,88 m
   con la base justo a la altura de los pies—. Contra uno de ésos no te
   entierras: te apartas 10 cm.

2. **Rechazar toda intersección de verdad.** 227 apoyos tocados en 16 torres,
   de los que el motor sólo rompía **79**. Coste: rescates de 7 a **168** y
   arcos cortados de 1 a **30**. Se pagaba tres veces por lo que valía una.

La diferencia entre los que rompen y los que no la decide `resolverCaja`, que
empuja por la **cara más cercana**: si la salida barata es de lado, el jugador
se aparta y se queda a su altura; si es hacia arriba, aparece encima de la
pieza —mediana medida: **1,25 m** más alto— y el salto que el generador había
dado por bueno deja de valer. Ése es el criterio que se usa ahora, y es el del
motor, no uno inventado para la ocasión.

### Lo que quedó puesto

Dos comprobaciones, en los dos sentidos del tiempo:

- **`sepultado`** — al colocar un apoyo, que no se meta dentro de materia que
  ya estaba. Salta 11 veces en 75 torres (23.765 llamadas). Poco, pero no
  cero, así que se queda.
- **`haTechado`, rama nueva** — al colocar una pieza, que no entierre un
  apoyo ya ganado. Aquí el apoyo estaba y la materia llega después, que es
  justo el caso del bidón.

Acotada a los **escalones-objeto**, por el coste medido de arriba. En un bidón
el rechazo es barato: la pieza es pequeña y siempre hay otro sitio. Y esos
apoyos **no caducan** a los 48 como los demás: la losa que enterraba el de la
semilla 20261005 se coloca mucho más tarde, y con el plazo normal el fallo
seguía ahí (sólo bajaba de 1,31 m a 0,90 m, que era otra losa).

También me equivoqué a mitad de camino dejando pasar el enterramiento «si
desde el apoyo anterior aún se llega». Sonaba razonable y era falso: un bidón
metido dentro de una plataforma **no se ve**, y que la torre siga siendo
subible no lo arregla. Esa escapatoria está quitada.

Resultado: **48 de 48**.

## Que nada de lo anterior se rompió

| | antes | después |
|---|---|---|
| apoyos sin sitio para estar de pie | 0 de 47.442 | **0 de 47.442** |
| saltos imposibles por distancia | 0 | **0** |
| arcos cortados (MEDIA, 25 torres) | 1 | **2** |
| arcos cortados (DIFÍCIL, 25 torres) | 0 | **0** |
| rescates (MEDIA / DIFÍCIL, 25 torres) | 7 / 14 | **12 / 14** |
| cornisas superadas | 539/539 | **539/539** |
| steppers superados | 1332/1332 | **1332/1332** |
| senderos recorridos (MEDIA / DIFÍCIL) | 98,5 % / 97,0 % | **98,5 % / 97,0 %** |
| generar una torre de DIFÍCIL | 69 ms | **69 ms** |

La cima se sigue alcanzando con la física del juego en las tres dificultades,
y la misma semilla sigue dando la misma torre.

## Dos pruebas que había que poner al día

- **`instancias.js`** se puso roja por 22 piezas de diferencia. No era el
  juego: es una prueba anterior a los objetos, que compara matrices
  `position/rotation/scale` y los objetos no se transforman así (su geometría
  ya viene girada y bajada a base y=0). Ahora los deja fuera **y comprueba que
  el número cuadre**, para que un objeto colado por la rama de cajas se note.
- **`props.js`** tenía un agujero: en una foto cenital un bidón tumbado no se
  distingue de uno de pie. Se mide la geometría preparada: **0,563 × 0,563 ×
  0,88 con la base en y=0**, o sea el eje largo en horizontal y de alto el
  diámetro, que es lo que promete `PROP_PISA.bidonTumbado`.

## Lo que NO está arreglado

Hay que decirlo con todas las letras: **los apoyos normales siguen pudiendo
quedar dentro de una losa colocada después.** Medido sin la guardia son **79
de 15.014 apoyos en 16 torres** —unos 5 por torre— y el motor deja al jugador
una mediana de 1,25 m más arriba. Casi todos se suben y se sigue jugando, y
aplicarles la guardia cuesta lo que cuenta el apartado de arriba. Queda
apuntado como pendiente, no fingido como resuelto.

Sigue pendiente de antes: ~2,3 % de los rebotes de DIFÍCIL que el piloto de
velocidad constante no completa, el `outputEncoding` en sRGB para todo el
juego, y que el robot mide 1,18 m de ancho contra los 0,70 del colisionador.

## Archivos tocados

- `index.html` — objetos en MEDIA y DIFÍCIL, `sepultado`, rama de
  enterramiento en `haTechado`
- `modelos/` — bidón y silla con las texturas en WebP de 512

---

# Cambios — 23 de septiembre de 2026 (vigesimoprimer lote): el giro de cámara que te tiraba

Miguel: «de vez en cuando, saltando, la cámara hace un giro inesperado, como
si la vista apuntara a otro lado, y eso hace que los jugadores se caigan».

Reproducido, medido y parado.

## Qué pasaba

El manejador del ratón no tenía **ningún** límite:

```js
G.yaw -= e.movementX*0.0022;
```

Con esa sensibilidad, **un solo evento con un delta grande gira la cámara
media vuelta**. Medido contra el manejador de verdad, no en teoría:

| un evento de | gira |
|---|---|
| 400 px | 50° |
| 1.200 px | **151°** |
| 3.000 px | 378° |

Si eso te pilla en el aire, te cambia la dirección de la carrera a mitad de
salto. Y te caes.

## De dónde salen esos deltas

No de un sitio, de varios — y por eso el arreglo no intenta quitar el origen,
sino aguantar el golpe:

**La ventana del bloqueo, que está en nuestro código.** En `mousedown` se
pone `dragging = true` y se pide `lock()`, que es **asíncrono**. Entre esas
dos cosas hay unos fotogramas leyendo deltas SIN bloqueo del puntero, justo
mientras el navegador desplaza el cursor para bloquearlo. Ese desplazamiento
llega como un `movementX` enorme.

**Ratones y controladores que sueltan valores absurdos.** Está documentado en
juegos web: un hilo de PlayCanvas con exactamente este síntoma terminó siendo
el ratón del usuario soltando deltas disparatados — con otro ratón
desaparecía, y en Firefox no pasaba. Eso no se arregla desde el juego; sólo
se puede aguantar.

## El arreglo

Dos filtros, y los dos con un número razonado detrás:

- **260 px por evento.** Un giro humano muy rápido —media vuelta en 150 ms a
  125 Hz de sondeo— son unos 75 px por evento. 260 es más de tres veces eso,
  y equivale a 33 grados de un tirón, que ninguna mano produce en un solo
  evento. Lo que pasa de ahí se descarta entero.
- **120 ms de gracia tras conseguir el bloqueo**, que es cuando llega el
  desplazamiento del cursor.

Y lo que **no** se ha tocado: la sensibilidad, el tope del cabeceo, y que
perder el puntero siga pausando la partida. Un giro brusco de verdad —20
eventos de 75 px, 189 grados— pasa exactamente igual que antes.

### El contador, que es la mitad del arreglo

Los descartes se cuentan y salen en el HUD como **CÁMARA n**, y sólo aparece
si ha pasado algo: un contador siempre a cero es ruido.

Esto importa porque **no pude reproducir tu caso concreto desde aquí**. Puedo
demostrar que el juego ya aguanta cualquier delta absurdo, pero no de dónde
salía el tuyo. Con el contador, la próxima vez hay dato en vez de impresión:

- si vuelve a pasar y **CÁMARA sube**, era esto y ahora está parado;
- si vuelve a pasar y **CÁMARA sigue a cero**, era otra cosa y hay que buscar
  en otro sitio, no aquí;
- y si CÁMARA sube **jugando normal**, sin ningún tirón raro, entonces el
  límite de 260 px se queda corto para tu ratón y hay que subirlo.

## El camino táctil se queda como está

Se miró y no hace falta: ahí el delta es movimiento real del dedo, `touchmove`
va a ~60 Hz independientemente de los fotogramas, y la posición anterior se
actualiza en cada evento. Un delta de 400 px exigiría mover el dedo 400 px en
16 ms. La mano no da para tanto.

## Cómo se ha comprobado

`test/camara.js`: 14 comprobaciones contra el manejador real, despachando
eventos de ratón de verdad en `document`.

Rompiendo el arreglo a propósito:

| lo que se rompió | fallos |
|---|---|
| quitar el límite por evento | 4 |
| bajar el límite a 50 px (se come un giro brusco real) | 1 |
| quitar la gracia tras bloquear | 1 |

Esa última no fallaba al principio, y es la lección del lote otra vez: la
comprobación usaba un delta de 900 px, que el límite de 260 caza igual, así
que no distinguía las dos cosas. **Quité la gracia y la prueba siguió verde.**
Ahora hay una comprobación con 200 px —por debajo del límite— que sólo puede
parar la gracia. Es el mismo error que con los guardias del generador en el
lote anterior: si no la has visto fallar, no sabes si sirve.

## Archivos tocados

- `index.html` — el filtro del ratón, el contador y su indicador en el HUD

---

# Cambios — 23 de septiembre de 2026 (vigésimo lote): la torre se podía cortar, y la cima era inalcanzable

Miguel reportó dos semillas donde había que rendirse: un stepper debajo de
una losa gigante, y un salto a una plataforma con un piso encima. Buscando
eso apareció algo más grande.

## Lo que había: una demostración plana

El generador demostraba que una torre era subible con dos números —el hueco
horizontal y la subida— y los dos son **planos**. Ninguno mira lo que hay
ENCIMA de donde aterrizas, ni por dónde pasa el salto.

### La cima era inalcanzable en la práctica totalidad de las torres

```js
y += 2.4;
addBox(cx, y-0.7, cz, 10,1.4,10, 0, "pintado", true);
```

La losa de la cima, 10×10 y 1,4 m de grueso, se plantaba **justo encima de
la última plataforma**, en el mismo (x,z). Eso deja **exactamente 1,00 m de
aire** sobre ella —medido en 40 semillas, siempre 1,00— cuando hacen falta
1,70 sólo para estar de pie.

No es una deducción: plantando al jugador ahí, `resolverCaja` **lo expulsa
70 cm hacia abajo**, atravesando el suelo (pies a 800,03 en vez de 800,73).
Y para subirse había que salir de una sombra de 5 m en todas direcciones
estando aplastado contra el techo.

| | cimas alcanzables (40 semillas) |
|---|---|
| FÁCIL | **0 de 40** |
| MEDIA | 4 de 40 |
| DIFÍCIL | 4 de 40 |

Probando con el motor —12 apoyos × 16 rumbos × 4 tiempos de doble salto— no
se llegaba en ninguna de las tres. **Nadie había terminado una torre nunca.**

### Y a media torre, plataformas donde no cabes

Apoyos sin un solo sitio donde ponerse de pie (no el centro: **ninguno** de
la plataforma): 1 de cada 560 en MEDIA, 1 de cada 883 en DIFÍCIL. Eso es una
o dos por torre. Es exactamente la captura de Miguel.

La causa: existía un mecanismo de "no techar", pero sólo protegía cornisas,
sólo recordaba las 10 últimas y —lo peor— al tercer intento se rendía:

```js
if (!choca || intento === 2){ colocada = true; break; }
```

## Lo que se ha hecho

Tres comprobaciones nuevas, en `2b · ESPACIO LIBRE`:

- **`aireSobre`** — cuánto aire libre hay sobre un punto, con la caja del
  jugador y la misma convención de giro que `resolverCaja`.
- **`alturaArco`** — la altura del salto en el instante *t*, en tres formas
  de cruzar un hueco: dejarse caer, un salto, o los dos. El segundo salto se
  modela en el vértice del primero, que es la trayectoria **más plana** que
  gana esa altura: la que menos se da en la cabeza.
- **`arcoLibre`** — si alguna de las tres trayectorias pasa sin chocar. Basta
  con que UNA esté libre: el jugador elige, y rechazar un salto porque una de
  las tres choca sería rechazar saltos perfectamente posibles.

Con eso, el guardia del bucle pasa de proteger cornisas a proteger **todo**:
los últimos 48 apoyos y los últimos 10 saltos. Una losa colocada después ya
no puede techar un apoyo de hace tres pasos ni partir por la mitad un salto
que ya se había dado por bueno.

Y cuando no hay sitio: ocho intentos girando (y a partir del quinto, también
más cerca y más bajo), luego una losa pequeña en un hueco despejado. Nunca
más "coloca igual aunque choque".

La cima se coloca ahora **como cualquier otro paso**: apartada, con subida y
hueco que pasan las mismas comprobaciones, y verificando que el arco pasa por
encima del borde de su propia losa en vez de estamparse contra el canto.

## Los números, antes y después

| | antes | ahora |
|---|---|---|
| apoyos sin sitio para estar de pie | 1 de cada 560 (MEDIA) | **0 de 90.000** |
| torres con al menos uno | 100% | **0%** |
| cimas alcanzables (FÁCIL) | 0 de 40 | **40 de 40** |
| llegar a la cima con la física | no, en ninguna dificultad | **sí, en las tres** |
| saltos imposibles por distancia | 0 | 0 |
| generar una torre DIFÍCIL | ~60 ms | 71 ms |

Y lo que no se rompió: cornisas superadas 99,6 %, **steppers 1222/1222 =
100 %**, senderos 96,7 % (MEDIA) y 98,1 % (DIFÍCIL), rebotes 98,4 %. Las
mecánicas especiales siguen apareciendo en la misma cantidad.

El precio: el generador rescata con una losa pequeña 7 veces cada 25 torres
en MEDIA y 11 en DIFÍCIL. Piezas forzadas rectas hacia arriba: **0**.

**Todas las semillas dan ahora torres distintas.** No hay forma de arreglar
esto sin cambiar la geometría, y las de antes no se podían terminar.

## Una comprobación que resultó ser adorno

Puse tres guardias en la colocación normal: que no techara a nadie, que en el
apoyo nuevo cupiera de pie, y que el arco del salto nuevo estuviera libre.
Después quité los dos últimos a propósito para ver la prueba en rojo… **y no
se puso roja**.

Así que los instrumenté y conté cuántas veces rechaza cada uno, en 40
semillas por dificultad:

| | techa un apoyo | campana de cornisa | corta un salto | sin aire arriba | arco nuevo |
|---|---|---|---|---|---|
| FÁCIL | 785 | 0 | 0 | **0** | **0** |
| MEDIA | 536 | 76 | 0 | **0** | **0** |
| DIFÍCIL | 355 | 375 | 32 | **0** | **0** |

Los dos últimos no disparan nunca, y la razón es buena: **la torre sólo
sube**. Un apoyo nuevo no puede aparecer debajo de algo ya construido. Lo que
trabaja es el guardia de lo que YA está: las piezas nuevas tapando lo viejo.

Se quedan puestos —son baratos y son la red si algún día el generador baja o
se ensancha— pero ahora está escrito, y el contador lo demuestra en vez de
que alguien se lo crea. Y la columna "corta un salto" se gana el sitio sola:
los 32 rechazos de DIFÍCIL son los que bajan los arcos cortados de 27 a 2 por
cada 40 torres.

## Un 100% que no era verdad

El primer detector decía que el **100 %** de las torres tenía apoyos
techados, en las tres dificultades. Era falso: un monumento levanta 2 a 4
columnas de 4 a 13 m **sobre su propia plataforma**, y el punto de apoyo está
en el centro. Estaba contando una columna como si fuera un techo.

El jugador no necesita pisar el centro: le vale cualquier sitio de la
plataforma. El detector bueno tiene dos fases —el punto exacto como filtro
barato, y una rejilla de 0,25 m por toda la plataforma como veredicto— y el
informe de la torre usa el mismo criterio. Sin eso, el número que sale es
alarmante y no significa nada.

## Cómo se ha comprobado

`test/generador.js`: 24 comprobaciones. Que ningún apoyo se quede sin sitio,
que no haya saltos imposibles, que la cima se coloque bien, que casi ningún
arco quede cortado, que no haga falta forzar piezas — y la cima probada **con
el motor del juego**: que no te expulse de la última plataforma y que se
llegue arriba de verdad. Más determinismo: la misma semilla sigue dando la
misma torre.

Rompiendo el generador a propósito: devolver la cima a su sitio de antes →
**9 fallos** (los tres techados, y el motor expulsando al jugador en las tres
dificultades).

`verifica-media.js` y `verifica-dificil.js` siguen pasando, y las suites del
personaje, los gestos, la red, el laboratorio, la minitorre, el cielo, el
instanciado y el despliegue también.

## Archivos tocados

- `index.html` — las tres comprobaciones nuevas, el guardia ampliado, la
  colocación con reintentos de verdad, la cima, y el informe de la torre

---

# Cambios — 22 de septiembre de 2026 (decimonoveno lote): los amigos se ven los gestos

Para que un gesto lo vea otro hacían falta dos cosas que no había: que el
estado de animación viajara por la red, y que el avatar del amigo dejara de
ser un cilindro. Están las dos. **El robot sale ahora en la partida normal**,
no sólo en el laboratorio.

## El protocolo: un entero, y ni un mensaje más

Todo el estado de animación viaja en **un solo número** colgado del paquete
de posición que ya se mandaba:

```
  bits  0-3   velocidad, en 16 escalones de 0 a correr
  bits  4-5   aire: 0 suelo · 1 salto · 2 doble salto · 3 cayendo
  bits  6-9   gesto: 0 ninguno, 1-9
  bits 10-13  contador de gesto
```

**Nueve bytes de JSON por jugador y por paquete.** Medido exacto:

| sala | antes | ahora | a 15 Hz |
|---|---|---|---|
| 2 jugadores | 229 B | 247 B | 3,4 → 3,6 KB/s |
| 4 | 439 B | 475 B | 6,4 → 7,0 KB/s |
| 16 | 1.699 B | 1.843 B | 24,9 → 27,0 KB/s |

Un 8 % más. A cambio, el otro extremo **no tiene que adivinar nada**.

### Por qué no un mensaje nuevo, y por qué nada de marcas de tiempo

El servidor tiene una optimización que no se podía romper: compara el
mensaje repartido con el anterior byte a byte y, si es igual, baja de 15
repartos por segundo a uno. Eso ahorró ~59 GB al mes en una sala de cuatro
con las pestañas olvidadas.

Cualquier campo que cambie cada fotograma —una marca de tiempo, el segundo
exacto de la animación— la mata entera, y nadie se enteraría hasta la
factura. Este entero **no cambia estando quieto**: velocidad 0, sin aire, sin
gesto. Ni estando sentado sin moverse. Medido con dos navegadores de verdad:
parados, **6 mensajes en 4 segundos**; moviéndose, **62**.

El contador de gesto es lo que permite repetir el MISMO gesto dos veces
seguidas. Sin él, darle otra vez a la tecla 1 no se notaría al otro lado
porque el paquete diría exactamente lo mismo. Y sólo cambia al empezar un
gesto, unas pocas veces por minuto.

### Un detalle que descubrí rompiéndolo

Intenté matar la deduplicación metiendo `Date.now()` en el paquete del
cliente… y no pasó nada. El servidor **sólo reparte los campos que él
elige** (`id, name, color, x, y, z, ry, best, a`): lo que mande el cliente de
más ni se guarda ni se reenvía. Esa lista blanca es lo que protege la
optimización de futuros despistes. Para matarla de verdad hay que tocar el
servidor — y entonces la prueba salta: 62 mensajes en vez de 6.

## El rendimiento: pagar por lo que se ve

Un robot son **19 llamadas de dibujo** (son 19 mallas sueltas) más 43 huesos
que recalcular. Dieciséis serían +304, cuando la torre entera, ya
instanciada, se dibuja en 33.

Pero **un gesto a 60 m no se distingue de un tropiezo**, y en una torre de
1.800 m lo normal es tener cero o un amigo a menos de 55. Así que cerca se
dibuja el robot y lejos el cilindro de tres mallas, con su mezclador sin
tocar. Con histéresis (entra a 55 m, sale a 64) para que uno justo en el
límite no encienda y apague el robot doce veces por segundo.

Medido en una torre DIFÍCIL de 2.373 piezas:

| amigos | llamadas | triángulos | animar+mezclar |
|---|---|---|---|
| 0 | 33 | 35.527 | — |
| 1 | 53 | 38.766 | 0,028 ms |
| 4 | 113 | 48.483 | 0,055 ms |
| 16 **cerca** | 352 | 87.349 | 0,21 ms |
| 16 **a 120 m** | **53** | 37.057 | **0,003 ms** |

La última fila es la que importa: **el coste dejó de depender de cuánta gente
hay en la sala y pasa a depender de cuánta ves**. Y el caso malo (352) exige
dieciséis amigos a menos de 55 m a la vez, que en esta torre no pasa.

La CPU no preocupa en ningún caso: 0,21 ms sobre un presupuesto de 16.

**Lo que queda por hacer si algún día hiciera falta:** fusionar las 19 mallas
del robot por material bajaría a ~3 llamadas por personaje (sólo tiene tres
materiales). Es trabajo de Blender o un horneado al cargar, y con los números
de arriba no hace falta todavía.

## Clonar un personaje con esqueleto

`Object3D.clone()` **no vale**. Sí duplica los huesos —son Object3D como
cualquier otro—, pero las mallas CON PIEL del clon se quedan apuntando al
esqueleto del original. En este robot son 4 de 19 mallas (las manos): el resto
son piezas rígidas colgadas de un hueso y se mueven bien igualmente.

O sea que el fallo sería **sutil**: a un amigo le bailarían las manos con las
tuyas y todo lo demás iría perfecto. Hace falta `SkeletonUtils.clone()`, que
se carga del mismo CDN que el `GLTFLoader`. Si esa línea faltara, los amigos
se quedan de cilindros y el juego sigue en pie.

Los materiales también se comparten al clonar, así que cada personaje
individualiza los suyos: 7 objetos, y sin eso teñir a uno los tiñe a los ocho.

## Lo que se ve

Cada amigo con su color (el que le toca por su nombre), su etiqueta, y
corriendo, andando, saltando, con doble salto, cayendo o haciendo cualquiera
de los nueve gestos. Tu personaje y el suyo pasan por **la misma función**: no
es elegancia, es que cualquier fallo lo ves en tu propia pantalla en vez de
que lo sufra el otro sin que te enteres.

## El interruptor — queda en TRUE

```js
const ROBOT_EN_JUEGO = true;
```

**El robot sale en la partida normal**, para ti y para tus amigos, y los
nueve gestos se ven entre vosotros. (Estuvo un rato en `false` mientras se
decidía; volver a apagarlo es esa misma línea.)

Lo que trae encendido, y conviene tenerlo presente: el robot mide **1,18 m de ancho** y la caja de
colisión **0,70**, así que en las cornisas estrechas se le ven los hombros
volando por fuera del borde. Es el mismo problema que el bidón, y aquí no
tiene arreglo por colisionadores: es el modelo, que es rechoncho. Un personaje
humano y estrecho —el pack de Quaternius, por ejemplo— lo quitaría casi
entero.

**El protocolo no depende del interruptor.** El entero de animación se sigue
mandando y el servidor lo sigue repartiendo, estén los robots encendidos o no.
Son ~9 bytes por jugador y paquete que ahora mismo no lee nadie, y a cambio
volver a encenderlo es exactamente esa línea y nada más: no hay que volver a
tocar el servidor, ni el paquete, ni depurar nada.

Las pruebas **leen el interruptor en vez de suponerlo**, así que valen en las
dos posiciones y de paso comprueban que hace lo que dice. Comprobado en las
dos: con `true` salen robots y los gestos cruzan; con `false` salen cilindros,
el entero sigue llegando al otro lado (`a=63` → 6,40 m/s) y la deduplicación
del servidor sigue viva (7 mensajes en 4 s con los dos parados).

Esa comprobación ya cambió de signo tres veces. Escrita así no vuelve a
cambiar: da igual dónde esté el interruptor.

### Una prueba inestable, cazada al encenderlo

Al volver a poner el interruptor en `true`, la comprobación «B lo ve saludar»
falló con el peso en **0,57** en vez de pasar de 0,8 — y en la pasada
anterior había ido bien. Nada estaba roto: esperaba **500 ms de reloj**, y
estos Chrome sin tarjeta gráfica van a ~5 fotogramas por segundo con dos
partidas abiertas, así que a veces B sólo alcanzaba a mezclar UN fotograma.
1 − e^(−0,1/0,12) = 0,565, que es clavado lo que salió.

Se espera al hecho y no al reloj: a que el peso suba al otro lado, y a que el
contador de gesto cambie. Tres pasadas seguidas en verde.

Es la misma lección que ya está escrita dos veces en este archivo, y me
volvió a pasar. Cada vez que una prueba dice «espera medio segundo», está
midiendo la máquina en la que corre.

## Cómo se ha comprobado

`test/red-gestos.js`: **28 comprobaciones con dos Chrome de verdad** en la
misma sala y el servidor real en medio. Nada de simular el otro extremo: el
otro extremo es otro navegador.

Se comprueba que el gesto cruza, que repetir el mismo se nota, que corriendo,
andando, saltando, con doble salto y cayendo se ven bien al otro lado, que
cerca sale robot y lejos cilindro, que el mezclador del que está lejos no
avanza, que la deduplicación del servidor sigue viva, y que el entero
sobrevive al viaje de ida y vuelta.

Rompiendo el código a propósito:

| lo que se rompió | fallos |
|---|---|
| no mandar el entero | 7 |
| que el servidor no lo reparta | 7 |
| quitar el contador de gesto | 1 |
| quitar el nivel de detalle | 2 |
| meter un valor cambiante en el reparto del servidor | 1 |
| usar `clone()` en vez de `SkeletonUtils.clone()` | 1 |

Esa última no fallaba al principio, y ahí está la lección del lote.

### Cuatro veces que medí mi banco en vez del juego

**Poner `G.vx` a mano no mueve a nadie.** El bucle de física corre cada
fotograma y, sin ninguna tecla pulsada, frena al jugador a cero antes de que
salga el siguiente paquete. El otro extremo recibía "quieto" y la prueba
culpaba a la red.

**Correr contra un muro no es estar quieto.** Con las teclas de verdad, A se
clavaba contra la columna central: el motor corrige la posición pero **no
anula la velocidad**, así que su paquete decía "corriendo" mientras no se
movía, el mensaje salía idéntico y el servidor deduplicaba con toda la razón.
La prueba volvía a acusar a la red de un choque. (De paso: en el juego, un
amigo empujando contra una pared se verá corriendo en el sitio.)

**Estos Chrome van a 5 fotogramas por segundo.** Sin tarjeta gráfica y con dos
partidas abiertas, el cliente manda a 5 Hz y el servidor no tiene nada nuevo
que repartir las otras diez veces. Estaba midiendo el renderizador por
software, no el reparto. Ahora se manda con un temporizador propio a 30 Hz.

**Y la peor: una comprobación que no comprobaba nada.** La de los esqueletos
miraba banderas (`estado`, `gesto`) y posiciones de huesos. Con `clone()` a
secas las banderas siguen perfectas y los huesos también se duplican, así que
pasaba. Sólo salta mirando la estructura: todo hueso del esqueleto de una
malla del clon tiene que ser un hueso **del clon**. Con `clone()`: 172 de 172
huesos prestados. Con `SkeletonUtils`: 0.

## Archivos tocados

- `index.html` — el protocolo, la fábrica de personajes, los robots remotos
  con nivel de detalle, el robot en la partida normal
- `server.js` — reparte un campo más, `a`

`SkeletonUtils.js` se carga del CDN, igual que el `GLTFLoader`: no entra en el
repositorio y el `Dockerfile` no cambia.

---

# Cambios — 22 de septiembre de 2026 (decimoctavo lote): color de jugador y nueve gestos

El robot del laboratorio lleva ahora **el color que le toca a cada jugador**, y
con las cifras `1`–`9` hace nueve gestos que ya venían dentro del archivo y
que no usaba nadie.

## El color: tres materiales y ninguna textura

Abriendo el modelo por dentro sale una estructura que no podía venir mejor:

| material | color de fábrica | dónde |
|---|---|---|
| `Main` | `#964a09` | **12 mallas**: torso, brazos, piernas, casco |
| `Grey` | `#5f5e55` | 6 mallas: pies, placas, remaches |
| `Black` | `#0b0b0b` | 1 malla: **los ojos** |

Así que el color del jugador es cambiar **uno de los tres**. Sin texturas,
sin UV, sin editar imágenes. Los ojos y el metal se quedan como están, que es
justo lo que se quiere: si se tiñera todo, el robot sería una mancha de un
solo color con dos agujeros del mismo color.

Y la fontanería ya estaba puesta desde hace lotes: `PALETA` tiene ocho
colores y a cada jugador se le asigna uno con el hash de su nombre. Ahora
`colorJugador()` tiñe el cilindro **y** el robot, así que cada amigo llevaría
el suyo sin decidir nada nuevo. En el lab, `Q` rueda por los ocho.

### Un detalle de color que parece contradictorio y no lo es

El color que trae el modelo **sí** se convierte (`convertLinearToSRGB`) y el
hex de la paleta **no**. No es un descuido:

- glTF guarda `baseColorFactor` en **lineal**, y este juego escribe el
  framebuffer sin corregir, así que ese número hay que pasarlo a sRGB o el
  robot sale apagado. Es el mismo problema que dejó el bidón negro, por otra
  puerta.
- El hex de la paleta ya **es** sRGB: se escribe tal cual y sale exactamente
  el color que elegiste.

### Clonar comparte los materiales

three.js **comparte los materiales al clonar una escena**. El día que haya un
robot por cada amigo, teñir a uno los teñiría a los ocho. Por eso el modelo
individualiza sus materiales nada más cargar: cuesta 7 objetos por personaje.

Esto no es una precaución teórica. Hay una prueba que hace justo lo que no se
debe —clonar y teñir sin individualizar— y **exige que el original se
contagie**. Si algún día three.js cambiara ese comportamiento, la prueba se
pondría roja y el aviso del código se podría borrar. Quien clone este modelo
en el futuro tiene que volver a individualizar.

## Los nueve gestos

Estaban dentro del `.glb` desde el principio. **No añaden un byte** a la
descarga.

| tecla | gesto | cómo termina |
|---|---|---|
| `1` | saludar | solo |
| `2` | pulgar arriba | solo |
| `3` | sí | solo |
| `4` | no | solo |
| `5` | baile | se repite hasta que te muevas |
| `6` | puñetazo | solo |
| `7` | sentarse | se queda sentado |
| `8` | levantarse | solo |
| `9` | tumbarse | se queda tumbado |

Tres maneras de terminar porque no todos los gestos son iguales: el baile se
repite, sentarse se queda en el último fotograma (sigues sentado hasta que
decides levantarte) y los demás se reproducen y devuelven el control.

`8 · levantarse` dura 0,42 s y suelto no dice nada —ya estás de pie—, pero es
la pareja de `7` y estando sentado es lo que toca.

### Reglas, y por qué

**Sólo con los pies en el suelo y parado.** En el aire o corriendo pelearía
con la animación de locomoción y se vería como un espasmo. Más importante:
este es un juego de saltos finos y ninguna tecla puede robarte el control a
media caída.

**Se corta solo en cuanto te mueves o saltas.** No hay que cancelar nada a
mano: echas a andar y el gesto desaparece.

**No queda peso suelto.** Los gestos que no suenan se apagan siempre, también
mientras corres. Sin eso, el peso que le quedó a uno se queda sumándose para
siempre y el robot acaba corriendo con el brazo levantado el resto de la
partida. Hay una prueba que corre 90 fotogramas después de cortar un gesto y
exige que no quede ni un 2 % de peso en ninguno de los nueve.

**Mantener la tecla no reinicia.** El navegador repite el `keydown` mientras
la tienes apretada; sin guardia, el saludo se reiniciaría sesenta veces por
segundo y se vería como un tic.

**Al salir del lab se corta.** Salir bailando dejaba el gesto puesto en
memoria y al volver a entrar el robot seguía bailando sin tocar una tecla.

## Lo que cuesta

Nueve acciones más en el mezclador: **0,032 ms por fotograma**, o sea 0,51 ms
con dieciséis jugadores. No se nota. Las llamadas de dibujo no cambian: son
las mismas mallas moviéndose de otra forma.

## Un error mío, y quién lo pilló

Los tres bancos posaban al jugador así:

```js
G.py = 3;
for (let i = 0; i < 900 && !G.grounded; i++) physicsStep(1/240);
```

Si `grounded` venía en **true** del fotograma anterior —y venía—, el bucle no
daba **ni un paso**: el jugador se quedaba a 3 m de altura y todo lo que se
midiera después medía a alguien flotando, con `grounded` diciendo que sí. La
comprobación «se posa en la losa» pasaba, porque preguntaba por la misma
bandera obsoleta.

No lo pilló ninguna prueba: lo pilló **una captura de pantalla**, donde el
robot se veía claramente en el aire con su sombra medio metro por debajo. Se
arregla poniendo `grounded = false` antes del bucle.

La otra: la prueba de los gestos muestreaba a los 30 fotogramas (medio
segundo) y `levantarse` dura 0,42 s — ya se había acabado y estaba a mitad de
fundido de vuelta. Medía el final, no el gesto. Ahora muestrea a 18.

## Cómo se ha comprobado

`test/gestos.js`: 33 comprobaciones — el color inicial, que teñir no toca los
ojos, que `Q` da la vuelta a los ocho sin repetir, los nueve gestos con su
peso, las tres formas de terminar, que moverse y saltar cortan, que en el
aire y corriendo no se puede empezar, que no queda peso suelto, que la tecla
mantenida no reinicia, el coste, y que salir del lab lo limpia todo.

Rompiendo el juego a propósito seis veces:

| lo que se rompió | fallos |
|---|---|
| teñir todo, también los ojos | 1 |
| que moverse no corte el gesto | 3 |
| no limpiar el gesto al salir del lab | 2 |
| dejar de apagar los gestos que no suenan | 1 |
| quitar el guardia de tecla mantenida | 1 |
| permitir gestos en el aire y corriendo | 2 |

`personaje.js`, `lab.js`, `minitorre.js` y `despliegue.js` siguen en verde.

## Lo que NO se ha hecho

- **Los gestos sólo están en el laboratorio**, porque el robot sólo está ahí.
- **Tus amigos no los verían.** El protocolo manda `x, y, z, ry` y nada más:
  aunque el robot estuviera en el juego, saludar no llegaría al otro lado.
  Es el mismo byte de estado que falta para animarlos, y para un gesto —que
  existe precisamente para que lo vea otro— importa más todavía.
- **Las tres expresiones de la cara** (`Angry`, `Surprised`, `Sad`) siguen sin
  usarse. Están ahí como morph targets, listas.

## Archivos tocados

- `index.html` — el teñido, los nueve gestos y sus reglas, el rótulo del lab

---

# Cambios — 22 de septiembre de 2026 (decimoséptimo lote): un personaje de verdad en el laboratorio

El muñeco del juego es un cilindro con una esfera encima y se desliza sin
mover una pierna. En el laboratorio ahora hay un personaje con esqueleto que
anda, corre, salta, hace el doble salto y cae, con su caja de colisión
dibujada encima y estirable en vivo. **El juego de verdad no ha cambiado**:
fuera del lab sigue el cilindro de siempre.

## Qué modelo, y por qué ese

Se midieron tres candidatos **con el mismo three.js que usa el juego (r128)**,
escalados todos a 1,70 m:

| | Robot | Soldier | Xbot |
|---|---|---|---|
| peso | **453 KB** | 2.110 KB | 2.861 KB |
| triángulos | **3.237** | 11.376 | 49.112 |
| huesos | 43 | 49 | 67 |
| licencia | **CC0 1.0**, con autor escrito | Mixamo, sin archivo | Mixamo, sin archivo |
| clips | Idle · Walking · Running · **Jump** · **WalkJump** (14) | Idle · Walk · Run | idle · walk · run |
| ancho quieto | 1,18 m | 0,75 m | 0,58 m |
| fondo corriendo | 1,70 m | 1,30 m | 1,16 m |

Gana **RobotExpressive**, de Tomás Laulhé (Quaternius), con retoques de Don
McCurdy — el mismo que escribió el `GLTFLoader` de three.js. Tres motivos, y
ninguno es estético:

1. **CC0 1.0 con README que nombra al autor.** Los otros dos vienen de Mixamo
   y no traen archivo de licencia. Este repositorio es público.
2. **Es el único con clips de salto.** A Soldier y a Xbot habría que buscarles
   uno aparte en Mixamo y pasarlo por Blender. Aquí vienen dos: `Jump` y
   `WalkJump`, que van justo a salto y doble salto.
3. **453 KB.** La silla pesa 2,4 MB.

Lo que se está probando no es el robot: es la maquinaria. Cambiar de modelo
después es cambiar una ruta y cinco nombres de clip.

## El dato incómodo: ninguna figura encaja con alguien corriendo

Mira la última fila de la tabla. Quieto, un humanoide ocupa 0,58–0,75 m.
**Corriendo, las piernas se abren a 1,16–1,30 m de punta a punta** — y el
robot, que es rechoncho, a 1,70. La caja del jugador mide 0,70.

Da igual qué forma se elija —caja, cilindro o cápsula—: al correr, los pies
asoman por el borde de la plataforma. No es un defecto de este motor. Por eso
todos los juegos ponen una cápsula lisa debajo y se comen la diferencia.

Lo que sí se puede hacer, y es lo que hay ahora en el lab, es **verlo y
medirlo** en vez de discutirlo.

## Cómo se escaló, y un número que estuvo mal

El robot mide 4,50 m en su escala nativa. Se escala ×0,378 para que **parado**
mida 1,70, exactamente el alto de la caja.

Y "parado" es literal, no la pose de enlace. La pose de enlace es una postura
de taller que no se ve nunca; escalando por ella el robot quedaba en 1,63 m
dentro de una caja de 1,70 y le sobraban 7 cm de aire sobre la cabeza. Se
recorre el ciclo de `Idle` entero y se escala por el instante más alto, así
que parado no sobresale jamás por arriba (medido: de 1,672 a 1,699 m).

Para medir un personaje con esqueleto **no vale `Box3.setFromObject()`**: mide
la geometría en su pose de enlace por la matriz del nodo y, con modelos
exportados en centímetros, aplica la escala dos veces. Midiendo así me dijo
que Xbot, que mide 1,80 m, medía **1,8 centímetros**. Hay que pasar cada
vértice por sus huesos con `boneTransform()`, que es lo que hace la tarjeta
gráfica al dibujar.

## La máquina de estados

Sale entera del estado que el juego ya llevaba. No hizo falta inventar ni una
bandera: `G.grounded`, `G.vy`, `hypot(G.vx,G.vz)` y `G.jumpsLeft` bastan.

- en suelo → mezcla **continua** quieto → andar → correr según la velocidad
- subiendo con un salto en la reserva → `Jump`
- subiendo sin saltos → `WalkJump` (el doble)
- bajando → `Jump` congelado al 58 %, que es donde lleva las piernas recogidas

La mezcla continua importa más de lo que parece: **el joystick del móvil es
analógico**, así que la velocidad es un número y no un interruptor, y la
animación puede seguirlo. A media velocidad suenan las dos a la vez, medido
0,5 y 0,5.

### Contra el patinaje de pies

El clip de andar del robot avanza **1,51 m/s** y el de correr **2,41 m/s** a
escala 1,70. El juego anda a 3,2 y corre a 6,4. Si se reproducen tal cual, los
pies resbalan como sobre hielo.

Se mide la velocidad del clip en serio: durante el apoyo, el pie está quieto
en el suelo, así que **retrocede respecto al cuerpo justo a la velocidad de
avance**. Esa es la velocidad del clip. Con ella, el clip se acelera ×2,12 al
andar y ×2,66 al correr.

Sale acelerado, sí. 6,4 m/s son 23 km/h y este robot tiene las piernas cortas.
Patinar se ve peor.

## La caja, estirable en vivo

Con el personaje delante y el alambre encima, en el laboratorio:

| tecla | qué hace |
|---|---|
| `Z` `X` | ancho − / + |
| `C` `V` | fondo − / + |
| `F` `G` | alto − / + |
| `T` | volver a 0,70 × 1,70 × 0,70 |
| `P` | cambiar entre robot y cilindro |
| `K` | alambres sí / no |

Paso de 1 cm, que es la precisión que importa aquí (medimos en su día que un
escalón de 2 cm te para en seco). Dejando la tecla pulsada, crece sola.

Dos cuidados que no se ven pero están:

- **Subir el alto no te hunde.** La caja se mide desde el centro, así que
  subir el techo baja también el suelo y el jugador se metería medio cuerpo en
  la plataforma. Se compensa moviendo el centro; comprobado que los pies no se
  mueven ni un milímetro.
- **Al salir del lab se restaura todo.** Si la caja se quedara estirada, las
  torres de verdad se jugarían con un jugador de otro tamaño y el fallo
  aparecería lejísimos de aquí. Hay una prueba que la deja descuadrada a
  propósito antes de salir.

`HX`/`HY`/`HZ` pasaron de `const` a `let` sólo por esto. Conviene saber que
`JumpMath` **no** las usa —sus cuentas sólo tienen velocidad y gravedad—, así
que tocar la caja no descuadra la generación de la torre. Lo que sí contó con
ellas fue el ancho de los pasillos del generador, así que cambiarlas de verdad
obligaría a volver a verificar las torres.

## Lo que cuesta

| | |
|---|---|
| llamadas de dibujo | **+19 por personaje** |
| triángulos | +3.237 |
| animar y mezclar | 0,043 ms por fotograma |

El número feo es el primero, y merece explicación: el robot son **19 mallas
separadas** con 7 materiales. Una malla con esqueleto **no se puede instanciar**
con el truco que usa la torre, así que cada personaje va por su cuenta. Con 16
jugadores serían +304 llamadas, y la torre entera, después de instanciarla, se
dibuja en 10–18. Fusionar esas 19 mallas por material (en Blender, o al
cargar) bajaría a ~7 por personaje. Queda anotado para cuando esto salga del
laboratorio.

La CPU no preocupa: 0,68 ms para 16 personajes, sobre un presupuesto de 16 ms.

## Errores propios de este lote

**Una acción para dos estados.** `mixer.clipAction(clip)` devuelve **la misma**
acción para el mismo clip. Pedí `Jump` dos veces —una para saltar y otra
congelada para caer— y me devolvió un único objeto: los dos estados se
peleaban por su peso y ninguno pasaba de 0,47. Hay que clonar el clip.

**Medí la pose de enlace creyendo que medía al personaje.** La prueba de
altura adelantaba el reloj del mezclador pero no movía la máquina de estados,
y con todas las acciones a peso 0 lo que se mide es la postura de taller. Daba
1,63 y pensé que el escalado estaba mal; estaba bien y daba 1,70.

**Probé la función equivocada.** Para comprobar que la caja manda en la
física usé `hitsSolid()`. Recibe un OBJETO `{x,y,z}` y no tres números, y
además usa un margen fijo de 0,30 que no tiene nada que ver con el jugador:
es un detector de proximidad, no la física. La física es `resolverCaja`. Y
como mi barrido no encontraba nada en ninguno de los dos casos, la prueba
"pasaba" sin comprobar absolutamente nada.

**Una prueba inestable.** La de los pies daba 0,000 en una pasada y 0,088 en
la siguiente, y el margen que le había puesto tapaba la diferencia: el punto
de aparición del lab está fuera de la losa y el jugador entra cayendo. Ahora
se le planta encima y se espera a que el motor diga que toca suelo. El margen
bajó de 5 cm a 1,2 cm.

## Cómo se ha comprobado

`test/personaje.js`: 36 comprobaciones contra el juego en marcha — carga,
talla, apoyo, los seis estados, la mezcla, la aceleración de los pies, las
cuatro orientaciones, el giro suave, las seis teclas, y que al salir todo
vuelve a su sitio. Tres pasadas seguidas en verde.

Y como una prueba que nunca has visto fallar no sirve de nada, se rompió el
juego a propósito cinco veces:

| lo que se rompió | fallos |
|---|---|
| no restaurar la caja al salir del lab | 1 |
| quitar la aceleración de los clips | 2 |
| volver al error de la acción compartida | 2 |
| girar de golpe | 1 |
| no compensar el centro al cambiar el alto | 1 |

`test/despliegue.js` ya cubre el modelo nuevo solo: lo encuentra en
`index.html` y comprueba que el `Dockerfile` lo mete en la imagen.

## Lo que NO se ha hecho

- **El juego de verdad sigue con el cilindro.** A propósito.
- **Los amigos también.** Los avatares remotos siguen siendo cilindros.
- **Del amigo sólo llegan `x, y, z, ry` a 15 Hz.** Para animarlo hay que
  deducir su velocidad y su contacto con el suelo del propio chorro de
  posiciones, o añadir un byte de estado al protocolo. Lo segundo es más
  barato de depurar que una heurística que falla sólo a veces.
- **Sin IK.** El pie no se apoya en la piedra inclinada, la atraviesa.

## Archivos tocados

- `index.html` — el personaje, la máquina de estados, la caja ajustable
- `modelos/robot/RobotExpressive.glb` (453 KB) y su `LICENCIA.md`

`server.js` y `Dockerfile` no se tocan: `.glb` ya estaba en la lista blanca
del servidor y `COPY modelos ./modelos` ya lo arrastra.

---

# Cambios — 22 de septiembre de 2026 (decimosexto lote): panel privado

Un panel solo para ti: quién está jugando ahora mismo, en qué sala, con qué
nombre se puso, a qué altura va y cuánto lleva dentro. Se abre desde el móvil
o desde el ordenador sin entrar al juego.

## Lo primero: `/salas` estaba abierto de par en par

Antes de añadir nada había que quitar algo. El servidor tenía esto:

```js
  if (ruta === "/salas") { ...códigos de sala, semilla, dificultad, cuántos hay... }
```

Sin contraseña y sin nada. Cualquiera que escribiera esa dirección veía **los
códigos de las salas abiertas**, que son exactamente los códigos que hacen
falta para **entrar** en ellas. Nunca lo usó nadie porque nadie lo sabía, que
es otra forma de decir que no estaba protegido.

Ya no existe. Esos datos viven ahora detrás del panel.

## Cómo está protegido, y qué significa eso de verdad

Una sola cosa: **que nadie conozca su dirección**. Elegiste eso frente a la
contraseña y es tu panel, pero conviene que quede escrito qué cubre y qué no,
porque dentro hay nombres de otras personas.

La dirección **no está en este repositorio**. No puede estarlo: el repositorio
es público, así que una ruta escrita en `server.js` estaría publicada en
GitHub el mismo día y no protegería absolutamente nada. Viene de la variable
de entorno `PANEL_RUTA`, que se pone en Coolify y no sale de ahí.

**Si esa variable no existe, el panel tampoco.** No se sirve, no responde, no
hay nada que encontrar. Esa es la postura por defecto y es la que tiene
cualquiera que se baje este repositorio.

Lo que sí se ha hecho para que la dirección no se escape sola:

- `x-robots-tag: noindex, nofollow, noarchive` — que no acabe en un buscador.
- `referrer-policy: no-referrer` — si desde el panel pinchas un enlace, el
  sitio de destino no ve de dónde venías.
- `cache-control: no-store` — no se queda en ninguna caché por el camino.
- La ruta **no se escribe en los registros**. Al arrancar, el servidor dice si
  el panel está encendido, nunca dónde. Los logs de Coolify se leen desde el
  navegador y se copian y se pegan.
- Una ruta equivocada **no responde 401 ni 403**: devuelve el juego, igual que
  cualquier dirección inventada. Contestar «no autorizado» sería confirmar que
  ahí hay algo, que es justo lo único que protege a este panel.

Y lo que **no** cubre, dicho claro: la dirección queda en tu historial, en el
portapapeles, en el registro de cualquier proxy por el que pase, y en la
pantalla si se la enseñas a alguien. Quien la vea una vez la tiene para
siempre y no se le puede quitar. Ponerle además una contraseña son unas diez
líneas el día que quieras.

## Qué enseña

Por sala: código, dificultad, altura de la torre, semilla y cuánto lleva
abierta. Por jugador: nombre con su color, altura actual, récord de la sesión,
cuánto lleva dentro, y un aviso en ámbar — **sin moverse** — cuando lleva más
de doce segundos sin mandar posición, que es lo que distingue a quien está
jugando de quien dejó la pestaña abierta y se fue.

Se refresca solo cada tres segundos. Con la pestaña de fondo **no pide nada**:
no tiene por qué estar despertando al servidor desde un móvil en el bolsillo.

No guarda nada. Es una foto de la memoria viva del relay; en cuanto alguien
cierra el juego, desaparece del panel y no queda registro en ninguna parte.

## Un detalle que no es un detalle

El nombre lo escribe cada jugador en su navegador y llega aquí tal cual. Si el
panel lo pintara sin más, quien se pusiera `<img src=x onerror=...>` estaría
ejecutando código **en mi propio panel**. Lo mismo con el color, que acaba en
un atributo `style`.

Los dos se comprueban: el nombre se escapa carácter a carácter y el color solo
se acepta si es un color de verdad (`/^#[0-9a-fA-F]{3,8}$/`), y si no, se
sustituye por el de siempre. Hay una prueba con un jugador llamado
`<b>hola</b>` que exige verlo **con sus picoparéntesis y sin negrita**.

## Lo que hay que hacer en Coolify (una vez)

Generas una dirección al azar **en tu máquina** — no la pegues en ningún chat,
igual que el token y la clave SSH:

```powershell
$b=[byte[]]::new(15)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
"panel-" + [Convert]::ToBase64String($b).Replace('+','-').Replace('/','_')
```

(Son 120 bits de azar de verdad — `Get-Random` a secas no sirve para algo que
es la única protección que tiene el panel.)

En Coolify, en la aplicación de Torre Vertical → *Environment Variables* →
añadir `PANEL_RUTA` con ese valor → redesplegar. El panel queda en
`https://tu-dominio/ese-valor`.

Mientras Coolify siga sin dominio propio y vaya por HTTP en claro, esa
dirección **viaja sin cifrar** en cada visita. Para un panel que se protege
solo con su dirección, eso importa más de lo normal.

## Cómo se ha comprobado

`test/panel.js` arranca el servidor de verdad, mete jugadores de verdad por
WebSocket y abre el panel en un navegador de verdad: 51 comprobaciones.

Las peticiones van con un socket a pelo y la ruta escrita a mano en la primera
línea del mensaje. Con `fetch()` o con la URL de Node, `/a/../b` se normaliza
**antes de salir** y la prueba pasa por el motivo equivocado — eso ya pasó con
el guardia de `/modelos/` y no se repite.

Y como una prueba que nunca has visto fallar no sirve de nada, se rompió el
servidor a propósito tres veces:

| lo que se rompió | fallos |
|---|---|
| devolver `/salas` al aire | 1 |
| quitar el escapado de los nombres | 2 |
| contestar `403` en las rutas casi correctas | 7 |

### Dos cosas que medí mal por el camino

**El cuerpo troceado.** Hablando HTTP a mano hay que deshacer a mano lo que el
servidor hace por su cuenta: sin `content-length`, Node responde troceado y el
cuerpo llega como `3c\r\n{...}\r\n0\r\n\r\n`. `JSON.parse` se atragantaba en
el carácter 4 y el error no se parecía en nada a la causa.

**Un 403 que no era una fuga.** La prueba de `/modelos/../<ruta>` fallaba con
403, y por un momento pareció un agujero. No lo era: ese 403 lo da el guardia
de los modelos y lo da **igual** lleve detrás el panel o cualquier tontería. Le
estaba pidiendo a esa ruta que devolviera el juego, algo que nunca hizo. La
prueba correcta no es «devuelve el juego», es **«las dos respuestas son
idénticas»**, que es lo único que de verdad importa.

## Archivos tocados

- `server.js` — el panel entero (página incluida), `/salas` fuera, dos marcas
  de tiempo nuevas en sala y jugador para poder decir «dentro hace 8 min».

La página va dentro de `server.js` en texto, y no en un archivo aparte a
propósito: el `Dockerfile` copia archivo por archivo y ya nos pasó una vez que
una carpeta no entró en la imagen y el fallo salió en producción sin que nada
se quejara aquí. Lo que vive en `server.js` no se puede olvidar de copiar.

`index.html`, `Dockerfile` y `package.json` siguen igual.

---

# Cambios — 22 de septiembre de 2026 (decimoquinto lote): ciclo día / noche

El cielo cambia a lo largo de la subida: **amanecer → día → atardecer →
noche**, y lo mueve la **altura**, no el reloj.

## Por qué la altura y no el tiempo

No es una decisión estética. Es determinista: dos amigos en la misma sala
ven exactamente el mismo cielo **sin que el servidor mande un solo byte de
más**, porque ambos saben a qué altura está cada uno. Con un ciclo por
tiempo habría que sincronizar un reloj entre todos, y un jugador que entra
tarde vería un cielo distinto.

De regalo, el cielo te dice cuánto te queda sin mirar el altímetro.

```js
p = py / altura        // 0 al pie, 1 en la cima
```

Cuatro fases en p = 0,00 · 0,35 · 0,70 · 1,00, interpoladas con suavizado
para que no haya esquinas. El **atardecer conserva exactamente los valores
con los que nació el juego**, así que su aspecto de siempre sigue ahí, solo
que ahora es un momento del recorrido y no el único.

Se mueven los 5 colores del cielo, la dirección del sol, la niebla (color y
densidad), las 4 luces y la opacidad de las nubes.

## La noche oscurece de verdad, y los bordes se siguen leyendo

Los cantos de las plataformas usan `MeshBasicMaterial`, que **no depende de
la luz**. O sea que de noche siguen brillando sin hacer nada. Medido
renderizando y contando píxeles:

| altura | fase | escena | cielo | contraste | cantos |
|---|---|---|---|---|---|
| 0 m | amanecer | 0,302 | 0,389 | 0,087 | 0,683 |
| 630 m | día | 0,662 | 0,599 | 0,064 | 0,669 |
| 1260 m | atardecer | 0,096 | 0,299 | 0,203 | 0,543 |
| 1800 m | **noche** | **0,099** | 0,197 | 0,097 | **0,675** |

La escena de noche es **6,7 veces más oscura** que de día pero sigue
distinguiéndose del cielo, y los cantos brillan **0,675 de noche contra
0,669 de día** — idénticos, como estaban diseñados.

Los valores de la noche no salieron a ojo: la primera versión medía **0,018
de luminancia**, o sea negro, y se subieron hasta que la escena se lee.

## Tres veces me equivoqué midiendo, y las tres eran mi banco

Esta parte vale más que el código:

1. **El cielo medía 0,000 por encima de 1.400 m.** Parecía un fallo gordo
   del juego: la esfera del cielo tiene radio 1.400 y está centrada en el
   origen. Pero el juego **sí** la mueve con la cámara cada fotograma; mi
   prueba llamaba a `render()` a pelo, saltándose esa línea. Medía el
   exterior de la esfera.
2. **"Los cantos no se ven de noche"** — con una cámara fija apuntando al
   eje, a 1.260 m salían 12.814 píxeles de canto y a 630 m ninguno. Estaba
   midiendo el encuadre. Corregido apuntando a un canto real de cada altura.
3. **Las cuatro capturas de las fases salieron idénticas.** El bucle
   recalcula la fase por altura en cada fotograma y pisaba la que yo
   forzaba. En vez de pelearme con eso, a la torre se le da la altura que
   hace que ese punto caiga en la fase buscada — el mismo camino que sigue
   el juego.

## Y una prueba que era una carrera

La batería táctil falló una vez en el doble salto y pasó tres seguidas
después. Esperaba **350 ms de reloj** a que el jugador aterrizara; bajo
carga seguía en el aire y ya había gastado un salto. Ahora espera a que
`G.grounded` sea cierto. Una prueba que falla a veces es peor que no
tenerla: enseña a ignorar los fallos.

---

# Cambios — 22 de septiembre de 2026 (decimocuarto lote): la minitorre

Un nivel pequeño de verdad dentro del laboratorio, **~11 m y 10 estaciones
en espiral**, construido solo con el bidón y la silla. Se entra igual
(`Ctrl+Alt+B` o `#lab`) y ahora arrancas a su pie; el banco de pruebas
sigue existiendo, al este.

## El giro es lo que cambia el salto

`resolverCaja` solo sabe girar por **yaw**, así que nada se puede tumbar en
diagonal. Pero orientar sí cambia por completo cómo se salta encima:

| estación | qué obliga a hacer |
|---|---|
| bidón de pie | peana redonda de 0,56 — el caso fácil |
| bidón tumbado, tangente | una viga de 24 cm a lo largo del camino |
| bidón tumbado, radial | la misma viga **atravesada**: caes de lado |
| silla de frente | aterrizas en el asiento, el respaldo te frena |
| silla de lado | el respaldo pasa a ser muro lateral |
| silla escalón | asiento 0,585 → respaldo 1,264, dos alturas seguidas |

**Los props flotan: no hay peana debajo de ninguno.** Lo único sólido de
cada estación son las cajas del propio objeto, así que el apoyo es el
objeto y nada más.

La primera versión sí llevaba una peana de 0,78 m bajo cada prop. Fuera. Y
al quitarlas, la verificación dio **exactamente los mismos márgenes** —
entre 16% y 42%, tramo por tramo, sin mover un dígito. O sea que las peanas
nunca estaban sosteniendo a nadie: el apoyo real siempre había sido el
objeto. Solo estorbaban a la vista.

## Un sitio donde los signos se cuelan seguro

Girar un prop no es girar su malla: hay que girar también el offset de cada
caja de colisión alrededor del origen del prop. El motor define el giro
así — una caja con yaw tiene su eje local +z apuntando a (sen yaw, cos yaw)
— y de ahí sale que un desplazamiento local (lx, lz) cae en el mundo en

```
  dx =  lx·cos + lz·sen        dz = −lx·sen + lz·cos
```

Eso está escrito **una sola vez**, en `deProp`, y todo lo demás lo usa. Es
justo la clase de fórmula que, repetida en cinco sitios, acaba con un signo
cambiado en uno de ellos.

## Verificado subiéndola, no mirándola

`minitorre.js` recorre la ruta tramo a tramo con la física real:

```
  OK  bidón de pie → bidón tumbado      2,77 m  +0,93 m   49/135 (36%)
  OK  bidón tumbado → silla, asiento    2,47 m  +1,27 m   47/135 (35%)
  OK  silla, asiento → bidón de pie     2,95 m  +1,54 m   22/135 (16%)
  ...
  OK  bidón tumbado → meta              2,77 m  +0,69 m   57/135 (42%)

  la minitorre se sube entera
```

Entre el 16% y el 42% de las combinaciones llegan: hay margen, no es un
nivel de precisión imposible.

## Y otra vez el bot fue el problema, no el nivel

El primer intento dio **7 tramos de 10 imposibles**. Antes de tocar el
diseño, tracé uno: el bot pasaba **exactamente por encima** del apoyo
(distancia mínima 0,01 m) pero llegando a 4,6 m de altura con el destino a
1,81. Se pasaba de largo por arriba.

El motivo: las peanas miden 0,78 m — ahí no hay carrerilla, se salta casi
parado — y mi bot barría hasta 0,70 s de carrera y usaba **siempre los dos
saltos a fondo**. Corregido a barrer también cuántos saltos usar y a qué
velocidad de crucero volar, regulando con W/S, los diez tramos pasan.

Es la tercera vez esta sesión que un "imposible" era mi piloto. La regla ya
está clara: cuando el bot dice que no se puede, **trazar antes de rediseñar**.

---

# Cambios — 22 de septiembre de 2026 (decimotercer lote): instanciado

**De 2.307 llamadas de dibujo por fotograma a 18.** Una sola línea de
diagnóstico cambió todo el diagnóstico.

## La primera medición estaba mal y decía lo contrario

Medí llamadas de dibujo con la cámara mirando en horizontal y salió esto:

```
  DIFÍCIL   entre 24 y 63 llamadas · unos 2.000 triángulos
```

Conclusión aparente: no hay nada que optimizar, el descarte por frustum ya
hace el trabajo. **Falso.** Esa cámara es el caso fácil. Un jugador de este
juego mira por el eje de la torre casi todo el rato, y ahí el cono de
visión se traga la columna entera:

```
  DIFÍCIL   2.307 llamadas · 31.574 triángulos   mirando hacia arriba
```

2.307 llamadas con 31.574 triángulos es un problema **puro de llamadas**:
la GPU no está dibujando casi nada, está recibiendo dos mil trescientas
órdenes para hacerlo. En un móvil de gama media eso hunde los fotogramas
sin que el contador de triángulos se inmute.

La lección, otra vez la misma de esta sesión: **una medición que solo mira
el caso cómodo mide la comodidad, no el sistema.**

## El arreglo

`buildMeshes` creaba un `THREE.Mesh` por pieza. Ahora agrupa por (forma,
material) en `InstancedMesh`: una llamada por grupo, con la matriz de cada
copia en un buffer. Diez grupos cubren toda la torre.

| | antes | después |
|---|---|---|
| llamadas de dibujo (peor caso) | **2.307** | **18** |
| triángulos en pantalla | 31.574 | 32.650 |
| objetos en la escena | 2.373 | 10 |
| actualizar matrices | 0,317 ms/fotograma | **0,003 ms** |
| construir las mallas | 25 ms | 3 ms |

Los triángulos suben un poco porque ahora se envían todas las copias
siempre (`frustumCulled = false`): un grupo abarca la torre entera, así que
cularlo no aportaba nada. 32.650 triángulos no los nota ningún dispositivo
de esta década.

La física ya estaba bien y no se tocó: **0,002–0,005 ms por fotograma**
gracias al índice espacial por celdas de 8 m.

## Comprobado que se ve exactamente igual

El instanciado cambia cómo se calcula la transformación de cada pieza, y el
cilindro tumbado (`cylZ`, con orden de Euler YXZ) es justo donde se tuerce
si te equivocas. Prueba nueva, `instancias.js`: reconstruye cada matriz con
el código anterior y la compara con la que entra en el `InstancedMesh`.

```
  OK  facil    948 matrices idénticas · formas {box:875, cylZ:54, cylV:19}
  OK  media   1814 matrices idénticas · formas {box:1732, cylZ:56, cylV:26}
  OK  dificil 2373 matrices idénticas · formas {box:2301, cylZ:28, cylV:44}
```

Con un matiz que también me hizo tropezar: el primer intento dio "FALLA"
con desvíos de 6·10⁻⁵. No era un error de transformación —
`InstancedMesh` guarda las matrices en **float32** y yo las comparaba con
float64 usando un umbral absoluto. Comparaba formatos, no geometría. Con
umbral relativo a 2 ulp de float32, las 2.373 coinciden.

## Lo que esto desbloquea

Con una malla por pieza, meter props con textura en la torre era inviable:
cada prop visible sería otra llamada más sobre las 2.307. Instanciado, un
bidón repetido doscientas veces es **una** llamada. Es el requisito que
faltaba para sacar el laboratorio a la torre de verdad.

---

# Cambios — 22 de septiembre de 2026 (duodécimo lote): colisionadores elegidos

Elegidas las formas definitivas de los dos props, con los números medidos.

## El bidón de pie: tres cajas inscritas, no una cuadrada

Tu queja era exacta: *"me posiciono en lo último de la esquina de la caja
y visualmente ni siquiera estoy tocando el barril"*. Una caja cuadrada
alrededor de un cilindro sobresale **11,7 cm** en las esquinas.

La trampa está en que **los colisionadores se UNEN, no se intersecan**.
Añadir cajas solo puede agrandar el sólido, nunca recortarlo. Así que para
dejar de sobresalir hay que ir por el otro lado: que **cada** caja quepa
dentro del círculo (a² + b² ≤ R²). La unión de varias inscritas sigue
estando dentro, y cubre cada vez más.

Optimizado numéricamente para maximizar el radio mínimo de la unión:

| cajas | semi a · semi b | radio mínimo | error |
|---|---|---|---|
| 1 circunscrita (lo de antes) | 0,281 · 0,281 | sobresale | **+11,7 cm de aire** |
| 1 inscrita | 0,199 · 0,199 | 0,199 m | −8,2 cm |
| 2 | 0,230 · 0,163 | 0,230 m | −5,2 cm |
| **3** | **0,126 · 0,252** | **0,252 m** | **−3,0 cm** |
| 4 | 0,101 · 0,263 | 0,263 m | −1,9 cm |
| 6 | 0,272 · 0,071 | 0,273 m | −0,9 cm |

Elegidas **3, giradas 60° entre sí**. Lo importante no es el tamaño del
error sino que **cambia de signo**: se pasa de flotar sobre aire a hundirse
3 cm en la chapa, y hundirse 3 cm no se ve.

Medido con la física real barriendo una rejilla de 61×61 alrededor de cada
bidón, contando las posiciones donde el jugador queda **apoyado a 0,88 m
sin que su caja llegue a tocar el círculo**:

```
  caja cuadrada      76 de 3481 posiciones · hasta 7,1 cm de aire
  3 cajas inscritas   0 de 2993 posiciones
```

Cero. Y solo se pierde un 14% de superficie pisable, que era justo la
falsa. Si quieres afinar más, 4 o 6 cajas están calculadas arriba.

Tumbado se queda como elegiste: la **losa inscrita** sobre la cresta.

## La silla: asiento + respaldo + una caja por pata

Las patas no salían en el mapa de alturas porque están debajo del asiento
y ningún rayo vertical las ve. Se localizaron agrupando los vértices de la
geometría por debajo de 0,50 m: cuatro grupos, en x ±0,23 (delanteras) y
±0,26 (traseras), y **se abren hacia abajo** — a ras de suelo llegan a
±0,276. La sección de 0,07 cubre ese ensanchado.

Medido: caminando a ras de suelo contra la silla, ahora te paras en
**x=42,34** con la silla en 43. Antes la atravesabas entera.

**Una cosa honesta sobre las patas:** el hueco libre entre una pata
delantera y una trasera es de 0,41 m y el jugador mide 0,70, así que nunca
va a caber entre ellas. Cuatro cajas se comportan igual que una sola caja
bajo el asiento. Se dejan las cuatro porque son fieles al objeto y no
cuestan nada, pero no esperes notar la diferencia.

## El coste

El laboratorio pasó de 14 a **40 cajas de colisión** para 13 props: tres
por bidón de pie y seis por silla. En una torre con doscientos bidones eso
son 600 cajas más sobre las 2.373 piezas actuales. El índice espacial por
celdas de 8 m lo absorbe, pero conviene tenerlo escrito antes de que
sorprenda.

## Dos diagnósticos míos que mintieron

- El agrupado de patas por cercanía usa un centroide que se va desviando
  según añade puntos, y perdió las bases de las patas porque se abren.
- Y mi rebanado decía "no hay vértices por debajo de 0,12", cuando hay
  **100 justo en y=0**. Era la ventana de filtrado de mi propio
  diagnóstico, no el modelo. Se arregló midiendo sobre todos los vértices
  sin ventana de por medio.

---

# Cambios — 22 de septiembre de 2026 (undécimo lote): la silla, y cómo se decide dónde van las cajas

Segundo prop en el laboratorio: `painted_wooden_chair_02`, **1.246
triángulos**, 0,639 × 1,264 × 0,662 m. Y con él, una forma de decidir los
colisionadores que no depende de mirar el modelo y opinar.

## Primero: me tengo que desdecir

En el catálogo de props puse **"sillas (todas)"** en la lista negra, con
este motivo: *"patas, respaldo y asiento a distintas alturas; una caja las
vuelve un cubo invisible"*. Eso es cierto de **una** caja y falso como
veredicto sobre el objeto.

Lo que midió el banco de colisionadores compuestos fue que las cajas
múltiples ganan cuando la forma es **plana a trozos**. Una silla es
exactamente eso: una tabla horizontal y un panel vertical. Con dos cajas no
solo sirve — es mejor prop que el bidón, porque su superficie útil es
plana de verdad y la del bidón es curva.

## Cómo se sacaron los números: rayos, no criterio

En vez de abrir el modelo y estimar, se lanzan rayos hacia abajo sobre una
rejilla de 1 cm y se guarda la **primera** superficie que encuentra cada
uno. Eso da un mapa de alturas visto desde arriba, y las superficies donde
un jugador se puede parar salen como mesetas del mapa:

```
ALTURA DE LA SUPERFICIE DE ARRIBA · área por franja de 2 cm
  1.24 m      170 cm²  ███
  0.92 m      156 cm²  ██
  0.74 m       50 cm²  █
  0.58 m     3086 cm²  ██████████████████████████████████████████████
```

Una meseta se come todo lo demás. Y **el asiento es plano al milímetro**:
del percentil 10 al 90 hay **0,0 cm** de desnivel. El primer informe decía
12 cm de grosor y era mi agrupación de franjas tragándose el borde
delantero; los percentiles lo desmintieron.

De ahí salen las dos cajas, calculadas por la máquina en el mismo sistema
de coordenadas que usa el laboratorio para que yo no tenga que restar nada
a mano:

| | centro | tamaño | techo |
|---|---|---|---|
| asiento | `[0, 0.535, 0.060]` | `[0.570, 0.100, 0.532]` | 0,585 m |
| respaldo | `[0, 0.924, -0.261]` | `[0.629, 0.679, 0.131]` | 1,264 m |

Con **una sola** caja el techo queda en 1,264 y el asiento está en 0,585:
**68 cm de aire**. Eso es lo que hay en la estación 6 para verlo.

## Y aquí la consecuencia que no vi venir

Con el asiento y el respaldo sólidos (estación 7), cayendo al centro de la
silla **no te sientas: te quedas de pie encima del respaldo**, a 1,264 m.

El motivo es el mismo que con el bidón tumbado: la planta del jugador mide
**0,70 m** y el fondo del asiento solo **0,53**. El pie siempre pisa
también el respaldo, y en una colisión por cajas te apoyas en lo más alto
que toques.

Medido, la franja donde sí te sientas va de **z=0,13 a z=0,65 — 52 cm**.
Empieza donde el pie deja de tocar el respaldo y acaba bastante por delante
del borde del asiento, porque media planta puede volar. Yo había calculado
17 cm a ojo; el barrido dijo 52.

Por eso el laboratorio tiene las dos versiones:

- **7 · asiento + respaldo** — honesto, y la silla se comporta como una
  plataforma alta de 1,264 m con una repisa baja a la que solo se llega
  por delante.
- **8 · solo asiento** — el respaldo queda de adorno y se atraviesa. La
  silla pasa a ser lo que interesa en un juego de escalar: una plataforma
  limpia de 0,57 × 0,53 a 0,585 m.
- **9 · dos de esas** separadas 2,6 m, para saltar de asiento a asiento.

Cuál de las dos va a la torre es decisión de diseño, no técnica. Mi voto es
la 8: el respaldo sólido hace que la silla se comporte distinto según por
dónde llegues, y eso en un juego de precisión se siente injusto.

## Peso

La silla son **2,4 MB** de texturas a 1k, casi cuatro veces el bidón
(692 KB). Para el laboratorio da igual; para la torre, no. Cuando llegue el
momento hay que pasar a WebP y bajar a 512 px.

## Otras dos veces que me equivoqué en la prueba

- Conté 12 props y 15 alambres; son 13 y 14.
- El barrido de la franja útil llegaba solo hasta z=0,5 y devolvió "36 cm".
  Ampliado hasta 0,9, la respuesta real es 52 cm. Un barrido que no llega
  al final mide el barrido, no el objeto.

---

# Cambios — 22 de septiembre de 2026 (décimo lote): laboratorio oculto y el primer modelo

Un nivel de pruebas que no sale en ningún menú, con el Barrel_01 de Poly
Haven cargado de verdad. Sirve para sentir si un prop engaña antes de
meterlo en la torre.

**Cómo se entra:** `Ctrl+Alt+B`, o `#lab` en la URL. No se usó `Ctrl` y `+`
porque ese es el zoom del navegador y no se puede robar de forma fiable. El
hash existe porque en el móvil no hay teclado, y el laboratorio también se
abre ahí.

**Qué hay dentro** — cinco estaciones en fila sobre suelo llano:

| | qué prueba |
|---|---|
| 1 · de pie | la caja coincide con el objeto: no se nota nada |
| 2 · tumbado con caja envolvente | **flotas 13,4 cm** a 24 cm del centro |
| 3 · tumbado con losa inscrita | pisas la chapa que ves |
| 4 · pila de tres | aterrizar en lo alto de una torre de bidones |
| 5 · dos separados 3,5 m | un salto real entre props |

`K` (o tocar la leyenda, en móvil) enseña y esconde los alambres de
colisión. Salir con `Ctrl+Alt+B` otra vez, o por el menú de pausa.

**No toca el generador ni la física.** El laboratorio arma a mano una
"torre" con la misma forma de datos que devuelve `buildTower`, así que la
cámara, `resolverCaja` y el HUD funcionan sin enterarse de que esto no es
una torre de verdad. `summit` va a y=99999 para que no se pueda ganar.

## Lo que hubo que tocar en el servidor

`server.js` devolvía `index.html` para **cualquier** URL, así que pedir el
`.gltf` traía el HTML del juego y el cargador se atragantaba sin decir por
qué. Ahora hay una ruta estática bajo `/modelos/` con lista blanca de
extensiones y comprobación de que la ruta resuelta cae dentro de la
carpeta. Probado con peticiones crudas, porque un cliente normal normaliza
los `../` antes de enviarlos y la prueba no probaría nada:

```
  OK   bloquea /modelos/../server.js              HTTP 403
  OK   bloquea /modelos/%2e%2e/server.js          HTTP 403
  OK   bloquea /modelos/barril/../../server.js    HTTP 403
  OK   bloquea /modelos/../package.json           HTTP 403
  OK   extensión no permitida                     HTTP 404
```

El modelo pesa **696 KB** en el repo (1k: gltf + bin + 3 jpg). Se sirve con
`cache-control: max-age=3600`.

## El bidón salía negro, y el motivo importa para el futuro

Cargaba bien, estaba en la escena, se dibujaban sus 2.682 triángulos… y no
se veía. **El juego no configura `outputEncoding`**, así que renderiza con
el valor por defecto, que es lineal, y toda su paleta está ajustada a eso.
GLTFLoader marca la textura de color como sRGB: three la des-gamma al
leerla y no la vuelve a aplicar al escribir. Resultado, oscuro y lavado.

Arreglo para el laboratorio: a la textura de color del modelo se le pone
`LinearEncoding`, y entra en la misma tubería que el resto del juego.

Esto hay que tenerlo presente **antes** de meter props en la torre de
verdad: lo correcto sería poner el renderer en sRGB, pero eso cambia el
aspecto del juego entero —cielo, hormigón, óxido, todo— y es una decisión
aparte, no un detalle técnico.

## Y aun así llegó roto a producción: el Dockerfile

Todo verde en local, desplegado y el laboratorio decía "el modelo no
cargó". El motivo:

```dockerfile
COPY server.js ./
COPY index.html ./
```

**La carpeta `modelos/` nunca entraba en la imagen.** Estaba en el repo,
estaba en el commit, y no estaba en el contenedor: el servidor devolvía 404
y no había forma de que nada lo avisara antes. Añadida
`COPY modelos ./modelos`.

Prueba nueva, `despliegue.js`, sin navegador. Sigue la cadena entera:
qué rutas relativas pide `index.html` en tiempo de ejecución, qué `.bin` y
qué texturas declara cada `.gltf` dentro, y qué copia de verdad el
`Dockerfile`. Comprobado que **falla cuando debe**: quitando esa línea del
Dockerfile, la prueba da 5 fallos y sale con código 1.

Es la clase de fallo que ninguna prueba de navegador iba a ver, porque en
local los archivos están ahí.

## Dos veces me equivoqué en la prueba, no en el código

- Conté 7 bidones y son 8 (1 + 1 + 1 + 3 de la pila + 2 del salto).
- La prueba de travesía de rutas daba 200 y parecía un agujero: era el
  cliente normalizando `../` antes de enviarlo, así que nunca llegaba al
  guardia. Con una petición cruda, los cuatro intentos dan 403.

## Qué queda

- El rendimiento con modelos sigue sin medirse. Ocho bidones son 21.456
  triángulos y 31 llamadas de dibujo; una torre entera con props necesita
  `InstancedMesh`.
- La decisión de sRGB, arriba.
- `GLTFLoader` se carga desde jsdelivr. Si algún día se cae, el juego
  arranca igual: el laboratorio avisa y monta las cajas sin modelo.

---

# Cambios — 22 de septiembre de 2026 (noveno lote): se puede jugar en el móvil

Hasta hoy, abrir el juego en el teléfono era mirar una torre sin poder
hacer absolutamente nada. No era un problema de rendimiento: es que no
había entrada táctil. Dos líneas lo explicaban todo:

```js
if (k["KeyW"]||k["ArrowUp"]) iz+=1;   // moverse = teclado, y solo teclado
if (!el.requestPointerLock) return;    // mirar = pointer lock, que en iOS y Android no existe
```

**No se ha tocado la física.** La capa nueva traduce dedos a exactamente lo
mismo que ya producía el teclado: `G.stick` para moverse y `G.yaw`/`G.pitch`
para mirar. La verificación de DIFÍCIL da los mismos números que antes del
cambio, dígito a dígito: 0 imposibles, 1134/1168 rebotes, 1251/1251
steppers, 264/271 senderos.

## Qué hay

- **Joystick flotante** en la mitad izquierda: nace donde cae el pulgar, no
  en una posición fija. Radio 58 px, zona muerta al 20%.
- **Arrastrar en la mitad derecha** mueve la cámara, 0,0045 rad por píxel.
- **SALTAR** y **pausa**. Con `touchstart`, no con `click`: el click puede
  llegar 300 ms tarde y aquí los milisegundos son el juego.
- **Multitáctil**: correr y mirar a la vez, cada dedo con su identificador.
  Un dedo sobre un botón no cuenta además como arrastre de cámara.
- **Aviso de "gira el móvil"** en vertical, que además pausa la partida.

## Lo bueno que salió sin buscarlo: andar es analógico

Con teclado, andar es un interruptor — Shift o nada. Con el stick es
continuo: inclinarlo poco anda, a fondo corre, e interpola entre medias.

```js
const target = analog >= 0
  ? AV.walkSpeed + (AV.runSpeed - AV.walkSpeed) *
      clamp((analog - STICK_ANDAR) / (STICK_CORRER - STICK_ANDAR), 0, 1)
  : ((k["ShiftLeft"]||k["ShiftRight"]) ? AV.walkSpeed : AV.runSpeed);
```

Esto importa de verdad y no es un adorno: cuando se calibraron las
cornisas, el bot midió que en varias de ellas **salir andando era la única
forma de llegar**. En ese punto concreto el móvil tiene mejor control que
el teclado. Medido: con el stick al 24% la velocidad es 3,39 m/s (andar son
3,2) y al tope 6,40 (correr son 6,4).

`G.stick` es `null` mientras no haya un dedo puesto, así que la rama
analógica no existe para el teclado ni para el bot. Por eso la regresión
sale idéntica.

## Las trampas de Safari, que son las que se comen la tarde

Ninguna es interesante y todas rompen el juego:

- `touch-action:none` — sin esto, el doble toque hace zoom y arrastrar hace
  scroll. Solo mientras se juega (`body.jugando`), porque si no el menú
  deja de poder hacer scroll en pantallas pequeñas.
- `overscroll-behavior:none` — tirar hacia abajo recargaba la página.
- `-webkit-touch-callout:none` — una pulsación larga sacaba el menú de
  copiar encima del juego.
- `100dvh` en lugar de `100%` — en iOS la barra de direcciones aparece y
  desaparece durante la partida, y el lienzo se quedaba de otro tamaño que
  la ventana. Además se escucha `visualViewport.resize`, porque ese cambio
  no dispara `resize`.
- `lock()` sale antes si es táctil: pedir pointer lock en el móvil aborta
  con error.

## El botón que sobraba

La primera versión tenía además un botón "CAER" al lado de SALTAR, que
llamaba a `respawn()`. Mala idea por tres motivos a la vez y lo pregunto
Miguel antes de que lo descubriera nadie a base de perder una partida:

1. `respawn()` no te deja caer un poco: te pone en `G.py = 1.4`, o sea al
   pie de la torre. En DIFÍCIL eso borra 1800 metros de subida.
2. La etiqueta "CAER" sugiere algo suave. Mentía.
3. Estaba a 46 px del botón de saltar, justo donde vive el pulgar.

Quitado. Reiniciar ya existía donde debe estar, en el menú de pausa
("VOLVER AL SUELO · Reinicia la subida"), detrás de un paso más. La tecla R
sigue igual en escritorio, que no se pulsa por accidente.

## La franja oscura (corregido sobre la marcha)

La primera versión que se desplegó dejaba una franja oscura alrededor del
juego en el móvil, y en el menú se veía la torre asomando por los bordes.
Ambas cosas eran lo mismo: **el lienzo y las capas medían menos que la
pantalla y asomaba el fondo del `body`**. Dos causas, las dos mías:

1. `renderer.setSize(innerWidth, innerHeight)`. En un móvil esos dos
   números no son la caja real: hay muesca de cámara, barra de gestos y
   una barra de direcciones que se retrae. Ahora el lienzo se mide del
   **contenedor** con un `ResizeObserver`, que no se puede desincronizar
   porque salta cuando la caja cambia, sea por lo que sea.
2. Todas las capas a pantalla completa eran `position:absolute`, que se
   resuelve contra el bloque contenedor inicial — y en el móvil ese no es
   la pantalla que estás viendo. Ahora son `position:fixed`.

También se quitó el `100dvh` que había añadido en el mismo lote: lo puse
sin poder probarlo en un teléfono de verdad, y con `fixed` +
`ResizeObserver` ya no hace falta.

Prueba nueva, `lienzo.js`: exige que en seis tamaños distintos, y después
de girar, el lienzo y todas las capas visibles midan exactamente lo que la
ventana y arranquen en 0,0. Es la comprobación que no existía y por eso
esto llegó a producción.

## Un fallo que fue mío, no del código

La primera prueba del botón de salto daba `vy=0`. No era el juego: mi test
disparaba el `TouchEvent` sobre `document.body`, y el botón no está en esa
ruta de propagación. Un dedo real lo despacha sobre el botón. Corregido el
test, pasa. Van ya unas cuantas veces esta sesión en que lo que fallaba era
la medición y no lo medido.

## Qué queda

- **Rendimiento sin medir.** Cada pieza de la torre es una malla suelta
  (`buildMeshes` hace un `new THREE.Mesh` por visual) y DIFÍCIL tiene 2.373.
  En escritorio va; en un móvil de gama media, ni idea. Si hace falta, se
  arregla con `InstancedMesh`, que además es justo lo que van a necesitar
  los modelos de Poly Haven.
- **La precisión sigue siendo dura.** Cronometrar el segundo salto en el
  aire y calcular cadenas de trampolines con el pulgar es más difícil que
  con teclado, y el pulgar tapa justo la zona donde vas a caer. DIFÍCIL en
  móvil va a ser durísimo. No es un fallo, es una consecuencia.
- Sin soporte de mando todavía (Gamepad API), que serían unas 40 líneas y
  serviría también en escritorio.

---

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
