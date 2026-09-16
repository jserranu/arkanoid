# 04 - Power-up d'estrella: segona pilota i punts dobles

**Estat:** Implemented
**Depèn de:** SPEC 01, SPEC 02, SPEC 03
**Data:** 2026-09-16

**Objectiu:** En destruir un de 3 blocs aleatoris per nivell, cau una estrella groga que, si la pala la captura, posa en joc una segona pilota; mentre hi hagi dues pilotes actives els blocs valen el doble de punts, i en perdre'n una es continua amb l'altra sense perdre cap vida i els punts tornen al valor normal.

## Abast

**Dins de l'abast:**

- En generar cada nivell (`generateBlocksForLevel()`), es marquen `POWERUP_BLOCKS_PER_LEVEL` (= 3) blocs a l'atzar amb `hasPowerUp: true`, de forma independent de la selecció de blocs resistents (SPEC 03) — un mateix bloc pot ser alhora resistent i portar l'estrella. Els blocs amb `hasPowerUp` **no** es distingeixen visualment dels normals; el jugador no sap quins són fins que en destrueix un.
- Quan un bloc amb `hasPowerUp: true` es destrueix del tot (el seu `hitsRemaining` arriba a `0` — no en un impacte parcial d'un bloc resistent), apareix una estrella groga que cau en línia recta cap avall des de la posició del bloc, a velocitat constant (`STAR_FALL_SPEED`).
- L'estrella es dibuixa com una forma de 5 puntes (path de Canvas, sense sprite nou) en color groc.
- Si l'estrella arriba a tocar la pala (mateixa àrea de col·lisió que la pilota), es "captura": desapareix i, si en aquell moment només hi ha una pilota en joc, se n'activa una segona.
- Si l'estrella arriba a la part inferior del canvas sense ser capturada, desapareix sense cap efecte (ni positiu ni negatiu).
- Poden caure diverses estrelles alhora si es destrueixen diversos blocs amb `hasPowerUp` en un interval curt.
- La segona pilota apareix al costat de la pilota ja existent: mateixa posició, mateix radi i mateixa velocitat (mòdul), amb `dx` invertit respecte de la pilota original i el mateix `dy`, de manera que les dues trajectòries es distingeixen des del primer instant.
- Mentre hi ha exactament 2 pilotes actives, destruir un bloc dona el doble de punts (`POINTS_PER_BLOCK × 2`) en lloc del valor normal.
- Si es captura una estrella quan ja hi ha 2 pilotes actives, no té cap efecte addicional (el màxim de pilotes simultànies és 2).
- Quan una de les dues pilotes surt per la part inferior del canvas, **no** es descompta cap vida: simplement desapareix i es continua jugant amb l'altra pilota, i els punts tornen al valor normal (1 pilota = punts normals).
- Si l'última pilota en joc surt per la part inferior (era l'única, o era la segona i ja s'havia perdut l'altra), es manté el comportament actual: es descompta una vida i, si en queden, es torna a l'estat inicial d'una sola pilota (`resetPaddleAndBall()`); si no en queden, `gameState = 'lost'`.
- Mentre hi ha 2 pilotes actives, al costat de la puntuació (`drawScore()`) es mostra la mateixa forma d'estrella groga com a indicador de "punts x2". L'indicador desapareix en tornar a quedar una sola pilota.
- Els power-ups es regeneren a cada nivell (nova selecció aleatòria de 3 blocs en carregar cada nivell) i en reiniciar la partida.

**Fora de l'abast (specs futures):**

- Més de 2 pilotes simultànies o altres tipus de power-up (allargar pala, alentir pilota, etc.).
- Qualsevol penalització per no capturar l'estrella o per deixar-la caure.
- So específic en capturar l'estrella o en activar-se la segona pilota (només s'usen els sons ja existents de rebot/trencament de bloc; no se n'afegeix cap de nou).
- Persistència de l'estat de power-up entre sessions (recàrrega de pàgina) — no aplica, ja que cap estat del joc es persisteix actualment.
- Indicador visual de quins blocs porten l'estrella abans de destruir-los (queda explícitament ocult, és una sorpresa).

## Model de dades

Amplia el model de SPEC 01/02/03:

- La variable global `ball` (objecte únic) es converteix en `balls`: array d'objectes `{ x, y, radius, dx, dy }`, amb un sol element en el cas normal (una pilota). `resetPaddleAndBall()` inicialitza `balls` amb un únic element, exactament com abans.
- Cada element de `blocks` amplia la seva estructura (SPEC 03: `{ x, y, width, height, color, alive, hitsRemaining }`) amb un nou camp `hasPowerUp`: booleà, `true` només als `POWERUP_BLOCKS_PER_LEVEL` blocs triats a l'atzar en generar el nivell.
- `stars`: nou array a l'estat global (com `explosions`), inicialitzat buit a `createInitialState()` i `advanceToNextLevel()`. Cada element: `{ x, y, dy }` (posició del centre i velocitat de caiguda; la mida és la constant `STAR_SIZE`).
- `POWERUP_BLOCKS_PER_LEVEL`: constant = `3`.
- `STAR_FALL_SPEED`: constant = `2` (píxels/frame).
- `STAR_SIZE`: constant = `16` (mida del costat de la caixa que conté l'estrella, per a dibuix i col·lisió amb la pala).
- `DOUBLE_POINTS_MULTIPLIER`: constant = `2`.

## Pla d'implementació

1. Refactoritzar la variable `ball` a `balls` (array). `resetPaddleAndBall()` assigna `balls = [ { x, y, radius, dx, dy } ]` amb els mateixos valors d'abans. Adaptar `drawBall()` a `drawBalls()` (itera `balls` i dibuixa cadascuna), `ballOverlapsBlock(ball, block)`, `checkPaddleCollision(ball)` i `updateBall()` a `updateBalls()` (itera sobre una còpia de `balls`, aplicant a cada pilota la lògica de rebot amb parets/pala/blocs que ara ja existia). El sistema ha de continuar funcionant exactament igual amb una sola pilota (sense canvis visibles).
2. Afegir el camp `hasPowerUp` (per defecte `false`) als blocs generats a `generateBlocksForLevel()`. Després de generar la graella (i la selecció de blocs resistents), triar `POWERUP_BLOCKS_PER_LEVEL` blocs a l'atzar (barreja d'índexs independent de la dels resistents, igual que a SPEC 03) i marcar-los `hasPowerUp: true`. Sense canvis visibles (el camp no es dibuixa).
3. Afegir l'array `stars`, buidat a `createInitialState()` i `advanceToNextLevel()`. A `checkBlockCollisions()` (ara operant per pilota), quan un bloc amb `hasPowerUp: true` arriba a `hitsRemaining <= 0` (destrucció completa), afegir a `stars` un objecte `{ x: block.x + block.width / 2, y: block.y + block.height / 2, dy: STAR_FALL_SPEED }`. Encara sense dibuix ni moviment visible.
4. Afegir `updateStars()` (cridada des de `update()`): per cada estrella, incrementar `y` en `dy`; si supera `CANVAS_HEIGHT`, eliminar-la sense efecte; si se superposa amb el rectangle de la pala, eliminar-la i, si `balls.length === 1`, afegir una nova pilota a `balls` mirallada respecte de `balls[0]` (mateixa `x`, `y`, `radius`; `dx: -balls[0].dx`; `dy: balls[0].dy`) — si `balls.length === 2`, no fer res més. Afegir `drawStars()` (cridada des de `gameLoop()` després de `drawExplosions()`), que dibuixa cada estrella activa com una forma de 5 puntes groga (path de Canvas) centrada a `(x, y)` amb mida `STAR_SIZE`. El sistema ha de mostrar les estrelles caient i permetre capturar-les amb la pala per activar una segona pilota.
5. A `checkBlockCollisions()`, en destruir un bloc del tot, calcular els punts com `POINTS_PER_BLOCK * ( balls.length === 2 ? DOUBLE_POINTS_MULTIPLIER : 1 )` en lloc del valor fix `POINTS_PER_BLOCK`. El sistema ha de sumar el doble de punts per bloc destruït mentre hi ha 2 pilotes actives.
6. A `updateBalls()`, quan una pilota surt per la part inferior del canvas, eliminar-la de `balls` en lloc de descomptar vida immediatament. Després de processar totes les pilotes del frame, si `balls.length === 0`: descomptar `lives`; si `lives <= 0`, `gameState = 'lost'`; si no, cridar `resetPaddleAndBall()` (crea de nou `balls` amb una sola pilota). Si `balls.length` és `1` després d'eliminar-ne una, no fer res més (es continua jugant, sense descomptar vida). El sistema ha de permetre perdre una de les dues pilotes sense penalització i continuar amb l'altra.
7. A `drawScore()`, dibuixar la mateixa forma d'estrella (reutilitzant la funció de dibuix d'`drawStars()`) al costat de la puntuació quan `balls.length === 2`, com a indicador de punts dobles. El sistema ha de mostrar aquest indicador només mentre hi ha 2 pilotes actives.

## Criteris d'acceptació

- [ ] En carregar o reiniciar un nivell, exactament 3 blocs (o menys si el nivell no en té prou) porten `hasPowerUp: true`, sense cap marca visual diferenciadora.
- [ ] En destruir del tot un bloc amb `hasPowerUp`, cau una estrella groga (forma de 5 puntes) des de la seva posició cap avall a velocitat constant.
- [ ] Un bloc resistent amb `hasPowerUp` no deixa caure l'estrella en l'impacte parcial (primer cop), només quan es destrueix del tot (segon cop).
- [ ] Si l'estrella toca la pala i només hi havia una pilota en joc, apareix una segona pilota amb la mateixa velocitat, des de la mateixa posició, amb `dx` invertit respecte de la primera.
- [ ] Si l'estrella toca la pala quan ja hi ha 2 pilotes actives, desapareix sense afegir cap pilota nova.
- [ ] Si l'estrella arriba a baix de tot sense ser capturada, desapareix sense cap efecte.
- [ ] Es poden veure diverses estrelles caient alhora si es trenquen diversos blocs amb power-up en un interval curt.
- [ ] Mentre hi ha 2 pilotes actives, cada bloc destruït suma el doble de punts (20 en lloc de 10) respecte del valor base.
- [ ] Quan una de les 2 pilotes surt per la part inferior del canvas, no es descompta cap vida, es continua jugant amb l'altra pilota, i els punts tornen al valor normal (10 per bloc).
- [ ] Quan l'última pilota en joc surt per la part inferior del canvas, es descompta una vida i, si en queden, es reinicia amb una sola pilota nova (comportament igual que abans d'aquesta spec); si no en queden, `gameState = 'lost'`.
- [ ] Mentre hi ha 2 pilotes actives, apareix un indicador d'estrella al costat de la puntuació; desapareix en tornar a quedar-ne 1.
- [ ] Amb una sola pilota en joc (comportament sense cap power-up capturat), tot el joc es comporta exactament igual que a SPEC 01/02/03 (rebots, trencament de blocs, vides, nivells, sons).

## Decisions preses i descartades

- **Selecció dels 3 blocs amb power-up en generar el nivell (no per probabilitat en trencar-se):** coherent amb el patró ja establert per als blocs resistents a SPEC 03; resultat determinista i fàcil de verificar (sempre 3 per nivell).
- **Blocs amb `hasPowerUp` visualment indistingibles dels normals:** decisió explícita de l'usuari — a diferència dels blocs resistents (que sí porten un contorn), l'estrella ha de ser una sorpresa en destruir el bloc.
- **`hasPowerUp` i bloc resistent poden coincidir (seleccions independents):** l'estrella només cau quan el bloc queda totalment destruït (`hitsRemaining` a `0`), mai en l'impacte parcial d'un bloc resistent.
- **Estrella dibuixada amb un path de Canvas, sense sprite nou:** manté la restricció del projecte de no afegir eines de build ni assets nous; la mateixa funció de dibuix es reutilitza per a l'indicador de punts x2 al HUD.
- **Màxim de 2 pilotes simultànies:** capturar una estrella addicional quan ja n'hi ha 2 no té cap efecte, en línia amb la descripció original ("una nova pilota", en singular) en lloc de permetre acumular-ne més.
- **La segona pilota apareix mirallada respecte de la primera (mateixa posició, `dx` invertit) en lloc de reaparèixer com a l'inici de partida:** evita que totes dues pilotes quedin apilades al punt de llançament inicial i els dona trajectòries diferenciades des del primer frame.
- **Perdre una de les dues pilotes no costa cap vida; només es descompta quan es perd l'última:** decisió explícita de l'usuari — és el valor central d'aquest power-up (una "segona oportunitat" temporal).
- **Velocitat de caiguda fixa i moderada (`STAR_FALL_SPEED = 2`), sense penalització per no atrapar-la:** manté el power-up com un element purament beneficiós, sense introduir cap mecànica de càstig.

## Riscos identificats

- **Refactorització de `ball` a `balls`:** toca la majoria de funcions relacionades amb la pilota (`drawBall`, `checkPaddleCollision`, `checkBlockCollisions`, `updateBall`, `ballOverlapsBlock`); cal verificar que el comportament amb una sola pilota es manté idèntic al de SPEC 01-03 després del canvi.
- **Iterar i eliminar elements de `balls` dins del mateix frame en què es detecten col·lisions:** cal iterar sobre una còpia (o en sentit invers) per evitar saltar-se una pilota o corrompre l'array mentre es recorre.
- **Selecció independent de blocs resistents i amb power-up sobre el mateix conjunt de blocs:** en nivells amb pocs blocs (p. ex. el patró `pyramid` al nivell 1), `POWERUP_BLOCKS_PER_LEVEL` (3) podria superar el nombre total de blocs; cal limitar la selecció a `Math.min(POWERUP_BLOCKS_PER_LEVEL, generatedBlocks.length)`, igual que ja es fa amb els blocs resistents.
