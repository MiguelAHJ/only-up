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
