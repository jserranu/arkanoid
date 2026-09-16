# 02 - Animació d'explosió en destruir blocs

**Estat:** Implemented 
**Depèn de:** SPEC 01
**Data:** 2026-09-16

**Objectiu:** Quan un bloc es destrueix, mostrar una animació d'explosió de 4 frames a la seva posició (usant `EXPLOSION_FRAMES` i `EXPLOSION_DURATION` de `assets/spritesheet.js`) en lloc de fer-lo desaparèixer de cop.

## Abast

**Dins de l'abast:**

- En destruir un bloc (col·lisió pilota-bloc), en lloc de desaparèixer instantàniament, es mostra al seu lloc una animació dels 4 frames de `EXPLOSION_FRAMES[color]` durant `EXPLOSION_DURATION` (150 ms), i després desapareix del tot.
- La destrucció lògica del bloc (deixa de bloquejar la pilota, la pilota rebota, se sumen els punts) continua succeint a l'instant de l'impacte, exactament com ara. L'animació és purament visual i no bloqueja ni retarda cap altra mecànica.
- Diverses explosions poden estar actives simultàniament (p. ex. si es reinicia ràpid o hi ha diversos impactes propers en el temps).
- L'overlay de victòria ("Has guanyat!") apareix a l'instant en destruir l'últim bloc, encara que quedin explosions animant-se; aquestes es continuen dibuixant per sobre fins que acaben.
- Si es reinicia la partida (Espai/Enter des de `'won'` o `'lost'`) mentre hi ha explosions actives, aquestes es descarten junt amb la resta de l'estat.

**Fora de l'abast (specs futures):**

- So de trencament de bloc (`assets/sounds/*.mp3`).
- Blocs que requereixen més d'un impacte per destruir-se (blocs resistents).
- Qualsevol altra mecànica de destrucció (power-ups, blocs especials, etc.).

## Model de dades

Amplia el model de l'SPEC 01 amb una nova estructura d'estat:

```js
// explosions: array d'objectes, una entrada per explosió activa
{
  x, y, width, height, // posició i mida iguals a les del bloc destruït
  color,                // color del bloc, per triar EXPLOSION_FRAMES[color]
  startTime,            // timestamp (performance.now()) de l'inici de l'explosió
}
```

`explosions` és un array nou a l'estat global del joc (com `blocks`, `score`, etc.), inicialitzat buit a `createInitialState()`. El frame a dibuixar en cada moment es calcula a partir de `performance.now() - startTime` i `EXPLOSION_DURATION / 4`, sense necessitat de guardar `frameIndex` a l'objecte.

## Pla d'implementació

1. Afegir la variable d'estat `explosions` (array) i inicialitzar-la buida a `createInitialState()`. El sistema continua funcional i visualment idèntic.
2. A `checkBlockCollisions()`, en destruir un bloc, afegir-hi una entrada a `explosions` amb la posició, mida i color del bloc, i `startTime = performance.now()`. El sistema continua funcional i visualment idèntic (encara no es dibuixa res nou).
3. Afegir la funció `updateExplosions()`, cridada des de `update()`, que elimina de `explosions` les entrades amb `performance.now() - startTime >= EXPLOSION_DURATION`. El sistema continua funcional i visualment idèntic.
4. Afegir la funció `drawExplosions()`, cridada des de `gameLoop()` després de `drawBlocks()`, que per cada explosió activa calcula el frame (0 a 3) segons el temps transcorregut i el dibuixa amb `drawFrame( ctx, EXPLOSION_FRAMES[color][frame], x, y, width, height )`. El sistema ha de mostrar l'animació d'explosió en destruir un bloc.

## Criteris d'acceptació

- [x] En destruir un bloc, apareix a la seva posició una animació de 4 frames que dura aproximadament 150 ms i després desapareix.
- [x] La pilota rebota i la puntuació s'incrementa a l'instant de l'impacte, sense esperar que acabi l'animació.
- [x] Diverses explosions poden veure's animant-se alhora si es destrueixen diversos blocs en un interval curt.
- [x] En destruir l'últim bloc, l'overlay de "Has guanyat!" apareix immediatament, encara que quedi alguna explosió acabant-se de dibuixar per sobre.
- [x] Reiniciar la partida (Espai/Enter) des de victòria o derrota neteja qualsevol explosió activa junt amb la resta de l'estat.
- [x] No hi ha cap so ni cap bloc de múltiples impactes implementats en aquesta spec.

## Decisions preses i descartades

- **Animació purament visual i no bloquejant:** la destrucció lògica (rebot, punts, victòria) passa a l'instant de l'impacte; l'explosió només afecta el dibuix. Es descarta fer que el bloc continuï bloquejant la pilota durant l'animació per no complicar la física ja implementada a l'SPEC 01.
- **Temporització basada en `performance.now()`:** com que la física del joc (moviment de pala/pilota) és per frame i no per delta de temps, l'explosió usa el seu propi rellotge independent (`performance.now()`) en lloc d'intentar encaixar-la amb el bucle de física. Manté el càlcul del frame simple i decoupled.
- **Overlay de victòria immediat, sense esperar animacions:** es prioritza la resposta ràpida al jugador per sobre de la puleça visual d'esperar que acabin totes les explosions.
- **So i blocs resistents fora d'abast:** queden per a specs futures, per mantenir aquesta spec centrada exclusivament en l'animació visual d'explosió.
