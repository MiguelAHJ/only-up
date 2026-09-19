# Poner la sala en línea

Esta carpeta es todo lo que hace falta. Dos archivos:

- `main.ts` — el servidor: sirve el juego y retransmite las posiciones
- `index.html` — el juego (copia de `torre-preview.html`)

Al terminar tendrás **una sola URL** que les pasas a tus amigos. Ellos la abren,
escriben el mismo código de sala, y os veis subiendo.

---

## Por qué hacía falta esto

Tu conexión directa entre navegadores nunca iba a funcionar, y ahora sé por qué.
Lo medí desde tu propia red: tu dirección pública es del rango `45.83.x.x`, que
es de VPN, no residencial. Las VPN aplican **NAT simétrico**, y con eso el
intercambio de direcciones entre navegadores no sirve — tu dirección cambia
según con quién hables. Probé también un servidor TURN público gratuito para
sortearlo y ya no funciona; esos servicios han desaparecido casi todos.

Un WebSocket resuelve el problema de raíz porque es una conexión **saliente** a
un puerto normal, como cargar una página web. No atraviesa NAT, no necesita
descubrir tu dirección pública, no le importa la VPN. Funciona siempre.

El precio es que las posiciones pasan por un servidor en vez de ir directas.
Para ver a tus amigos subiendo, eso es irrelevante.

---

## Desplegar en Deno Deploy (gratis)

El plan gratuito da 1 millón de peticiones al mes y 20 GiB de tráfico. Para un
grupo de amigos sobra de largo.

1. **Sube esta carpeta a GitHub.** Crea un repositorio nuevo (puede ser privado)
   y mete dentro `main.ts` e `index.html`.

2. Entra en **dash.deno.com** e inicia sesión con tu cuenta de GitHub.

3. **New Project** → elige el repositorio → como *entry point* pon `main.ts`.

4. Deno Deploy te da una URL del tipo `https://loquesea.deno.dev`.

Y ya está. Esa URL sirve el juego y hace de sala al mismo tiempo.

### Probarlo antes en local

Si tienes Deno instalado:

```
deno run -A main.ts
```

Abre `http://localhost:8000` en dos ventanas, pon el mismo código en las dos y
comprueba que os veis.

---

## Cómo jugáis

Les pasas la URL. Cada uno:

1. Escribe su nombre.
2. Escribe **el mismo código de sala** (4 letras).
3. Pulsa ENTRAR A LA SALA.

El primero que entra fija la torre; a los demás el servidor les manda esa misma
semilla y su torre se reconstruye sola. Subís el mismo edificio.

**Atajo:** la sala se puede meter en el enlace. Si les mandas

```
https://loquesea.deno.dev/#sala=ABCD
```

el código ya les aparece escrito y solo tienen que pulsar el botón.

---

## Lo que verás mientras subís

- El **avatar de cada uno** con su nombre flotando encima, en su color.
- **Marcas de colores en el altímetro** de la derecha: a qué altura va cada cual.
- **Lista abajo a la izquierda**, ordenada de mayor a menor altura.
- En la barra inferior, cuántos estáis en la torre.

---

## Detalles del servidor

- Reparte el estado **15 veces por segundo** a cada sala.
- Máximo **16 jugadores por sala** y 200 salas simultáneas.
- Una sala se crea sola cuando entra el primero y **se destruye al salir el
  último**. No guarda nada entre sesiones.
- `GET /salas` devuelve en JSON qué salas hay abiertas ahora mismo, por si
  quieres mirar.
- Los nombres y colores que llegan se recortan y validan antes de reenviarse:
  un cliente manipulado no puede inyectar nada raro en la pantalla de los demás.

---

## Si actualizas el juego

`index.html` es una copia de `torre-preview.html`. Si cambio algo en el juego,
hay que **copiar el archivo otra vez** sobre `index.html` y volver a subirlo a
GitHub. Deno Deploy redespliega solo al detectar el cambio.

---

## Probado

El protocolo está verificado de extremo a extremo con dos navegadores reales
contra un servidor equivalente: ambos entran a la misma sala, cada uno ve al
otro por su nombre, el movimiento se propaga (un jugador a 250 m aparece en el
otro navegador a 249 m), los dos generan la misma torre de 803 m, y al
desconectarse uno se limpian su avatar, su marca y su fila sin dejar rastro.

Lo que **no** pude probar es `main.ts` corriendo sobre Deno: el dominio de Deno
está bloqueado desde donde yo ejecuto código, así que validé el protocolo con un
equivalente en Node. El archivo de Deno usa solo `Deno.serve` y
`Deno.upgradeWebSocket`, que son las dos APIs estándar de la plataforma. Si al
desplegar diera algún error, mándame lo que ponga en los logs.
