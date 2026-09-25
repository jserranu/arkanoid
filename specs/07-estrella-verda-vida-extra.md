# 07 - Estrella verda: vida extra

**Estat:** Approved
**Depèn de:** SPEC 01, SPEC 03, SPEC 04, SPEC 06
**Data:** 2026-09-23

**Objectiu:** En destruir un de 2 blocs aleatoris nous per nivell, cau una estrella verda que, si la pala la captura, suma 1 vida.

## Abast

**Dins de l'abast:**

- En generar cada nivell (`generateBlocksForLevel()`), es marquen `LIFE_POWERUP_BLOCKS_PER_LEVEL` (= 2) blocs a l'atzar amb `hasLifePowerUp: true`, en una selecció independent dels blocs resistents (SPEC 03), dels blocs amb `hasPowerUp` de l'estrella groga (SPEC 04) i dels blocs amb `hasFirePowerUp` de l'estrella vermella (SPEC 06) — un mateix bloc pot portar simultàniament qualsevol combinació d'aquests atributs. Els blocs amb `hasLifePowerUp` no es distingeixen visualment dels normals fins que es destrueixen.
- Quan un bloc amb `hasLifePowerUp: true` es destrueix del tot, apareix una estrella verda que cau des de la posició del bloc, a la mateixa velocitat vertical de caiguda que les altres estrelles (`STAR_FALL_SPEED`), dibuixada amb la mateixa forma de 5 puntes però en color verd. A diferència de les altres estrelles, la seva posició horitzontal no és fixa: oscil·la en zig-zag al voltant de la `x` inicial del bloc seguint una ona sinusoidal contínua mentre cau.
- Cada estrella verda rep, en crear-se, una amplitud de zig-zag pròpia triada a l'atzar entre 20 i 50 píxels (uniformement), de manera que unes oscil·len més que altres.
- Si l'estrella verda arriba a tocar la pala, es captura (desapareix) i suma immediatament 1 vida (`lives += 1`), sense cap límit màxim.
- Si l'estrella verda arriba a baix sense ser capturada, desapareix sense cap efecte.
- Poden caure diverses estrelles verdes alhora, igual que amb les altres estrelles.
- No s'afegeix cap so ni indicador nou en capturar-la: es reutilitza el comptador de vides ja existent al HUD (`drawLives()`/equivalent), que simplement mostrarà una icona de vida més.
- Els blocs amb `hasLifePowerUp` es regeneren a cada nivell (nova selecció aleatòria de 2 blocs en carregar cada nivell) i en reiniciar la partida; qualsevol estrella verda caient es reinicia (buidada) en passar de nivell o en reiniciar la partida.

**Fora de l'abast (specs futures):**

- Qualsevol límit màxim de vides acumulables.
- Penalització per no capturar l'estrella verda o per deixar-la caure.
- So o indicador visual nou en capturar l'estrella verda (només es reutilitza el HUD de vides existent).
- Indicador visual de quins blocs porten l'estrella verda abans de destruir-los (igual que amb les altres estrelles, ha de ser una sorpresa).
- Interacció especial entre l'estrella verda i el mode foc (SPEC 06) o la segona pilota (SPEC 04) més enllà de sumar la vida amb normalitat.

## Model de dades

Amplia el model de SPEC 01/03/04/06:

- Cada element de `blocks` amplia la seva estructura amb un nou camp `hasLifePowerUp`: booleà, `true` només als `LIFE_POWERUP_BLOCKS_PER_LEVEL` blocs triats a l'atzar en generar el nivell (selecció independent de `hasPowerUp`, `hasFirePowerUp` i dels blocs resistents).
- `lifeStars`: nou array a l'estat global, inicialitzat buit a `createInitialState()` i `advanceToNextLevel()`. Cada element: `{ x, y, dy, baseX, amplitude, elapsed }`, on `x`/`y` són la posició actual dibuixada, `dy` la velocitat vertical constant (`STAR_FALL_SPEED`), `baseX` la `x` horitzontal del centre del bloc en el moment de crear-se (centre de l'oscil·lació), `amplitude` el valor aleatori (20-50) triat en crear l'estrella, i `elapsed` un comptador de frames transcorreguts des de la creació, usat per calcular la fase de l'ona.
- `LIFE_POWERUP_BLOCKS_PER_LEVEL`: constant = `2`.
- `LIFE_STAR_COLOR`: constant = `'#43a047'` (verd).
- `LIFE_STAR_ZIGZAG_MIN_AMPLITUDE`: constant = `20`.
- `LIFE_STAR_ZIGZAG_MAX_AMPLITUDE`: constant = `50`.
- `LIFE_STAR_ZIGZAG_SPEED`: constant = `0.05` (radians per frame que avança la fase de l'ona sinusoidal; a 60 fps completa una oscil·lació completa cada ~125 frames, uns 2 segons).

## Pla d'implementació

1. Afegir les constants noves (`LIFE_POWERUP_BLOCKS_PER_LEVEL`, `LIFE_STAR_COLOR`, `LIFE_STAR_ZIGZAG_MIN_AMPLITUDE`, `LIFE_STAR_ZIGZAG_MAX_AMPLITUDE`, `LIFE_STAR_ZIGZAG_SPEED`) al costat de les constants `STAR_*`/`FIRE_*` existents (js/game.js, prop de les línies 19-26). Sense canvis de comportament encara.
2. A `generateBlocksForLevel()`, afegir el camp `hasLifePowerUp: false` per defecte a cada bloc generat (al costat de `hasPowerUp: false` i `hasFirePowerUp: false`). Després de les seleccions existents, afegir una tercera selecció aleatòria independent de `Math.min(LIFE_POWERUP_BLOCKS_PER_LEVEL, generatedBlocks.length)` blocs i marcar-los `hasLifePowerUp: true`. El sistema ha de generar cada nivell amb fins a 2 blocs marcats amb vida extra, sense cap marca visual.
3. Afegir `lifeStars = []` a `createInitialState()` i `advanceToNextLevel()`.
4. A `destroyBlock(block)`, després del bloc `if (block.hasFirePowerUp) { ... }`, afegir un bloc anàleg: si `block.hasLifePowerUp`, calcular `const baseX = block.x + block.width / 2;` i `const amplitude = LIFE_STAR_ZIGZAG_MIN_AMPLITUDE + Math.random() * (LIFE_STAR_ZIGZAG_MAX_AMPLITUDE - LIFE_STAR_ZIGZAG_MIN_AMPLITUDE);`, i fer `lifeStars.push({ x: baseX, y: block.y + block.height / 2, dy: STAR_FALL_SPEED, baseX, amplitude, elapsed: 0 })`. El sistema ha de fer caure l'estrella verda en destruir un bloc marcat, amb una amplitud d'oscil·lació pròpia aleatòria.
5. Afegir `drawLifeStars()`, anàloga a `drawStars()`/`drawFireStars()`, que itera `lifeStars` cridant `drawStarShape(star.x, star.y, STAR_SIZE, LIFE_STAR_COLOR)` (usant la `x` ja actualitzada per `updateLifeStars()`). Cridar-la des de `gameLoop()` just després de `drawFireStars()`. El sistema ha de mostrar les estrelles verdes caient en zig-zag amb el mateix aspecte que les altres però en verd.
6. Afegir `updateLifeStars()`, anàloga a `updateStars()`/`updateFireStars()`: per cada estrella verda, incrementar `y` en `dy`, incrementar `elapsed` en `1`, i recalcular `x = star.baseX + star.amplitude * Math.sin(star.elapsed * LIFE_STAR_ZIGZAG_SPEED)`; si `y` supera `CANVAS_HEIGHT`, eliminar-la; si se superposa amb la pala (reutilitzant `starOverlapsPaddle(star)`, que ja només depèn de `STAR_SIZE` i la `x`/`y` actuals de l'estrella i la posició de la pala), eliminar-la i fer `lives += 1`. Cridar `updateLifeStars()` des d'`update()`, al costat d'`updateStars()`/`updateFireStars()`. El sistema ha de permetre capturar l'estrella verda —tot i el seu moviment lateral— i sumar la vida immediatament.

## Criteris d'acceptació

- [ ] En carregar o reiniciar un nivell, exactament 2 blocs (o menys si el nivell no en té prou) porten `hasLifePowerUp: true`, sense cap marca visual diferenciadora, de forma independent dels blocs amb `hasPowerUp` i `hasFirePowerUp`.
- [ ] En destruir del tot un bloc amb `hasLifePowerUp`, cau una estrella verda (mateixa forma que les altres) des de la seva posició, baixant a velocitat vertical constant mentre oscil·la horitzontalment en zig-zag al voltant de la `x` del bloc.
- [ ] L'amplitud del zig-zag de cada estrella verda és aleatòria entre 20 i 50 píxels, fixada en crear-se i constant durant tota la caiguda d'aquella estrella.
- [ ] Si l'estrella verda toca la pala, desapareix i el comptador de vides augmenta en 1 immediatament, sense límit màxim.
- [ ] Si l'estrella verda arriba a baix de tot sense ser capturada, desapareix sense cap efecte ni penalització.
- [ ] Un bloc destruït per una pilota de foc (SPEC 06) que portava `hasLifePowerUp` també fa caure la seva estrella verda amb normalitat.
- [ ] En passar de nivell o en reiniciar la partida, `lifeStars` queda buit i es regenera una nova selecció aleatòria de blocs amb `hasLifePowerUp` al nivell següent.
- [ ] Sense capturar mai una estrella verda, tot el comportament del joc (rebots, blocs, power-ups existents, nivells, sons, pausa, mode foc) es manté exactament igual que a SPEC 01-06.

## Decisions preses i descartades

- **2 blocs per nivell amb estrella verda (`LIFE_POWERUP_BLOCKS_PER_LEVEL = 2`):** decisió explícita de l'usuari; menys freqüent que les estrelles groga/vermella (3 cadascuna) perquè l'efecte és permanent (vida extra) i no temporal.
- **Sense límit màxim de vides acumulables:** decisió explícita de l'usuari; coherent amb el mode foc de SPEC 06, que tampoc en té.
- **Grup de blocs (`hasLifePowerUp`) independent dels altres power-ups:** decisió explícita de l'usuari; un mateix bloc pot combinar qualsevol atribut, seguint el mateix patró de selecció aleatòria ja establert a SPEC 03/04/06.
- **Cap so ni indicador visual nou en capturar-la:** decisió explícita de l'usuari; es reutilitza el HUD de vides existent, seguint el mateix criteri minimalista de SPEC 04/06.
- **Reutilitzar `starOverlapsPaddle(star)` per a l'estrella verda:** la funció ja depèn únicament de `STAR_SIZE` i la posició (`x`/`y`) de l'estrella i de la pala, no de cap camp específic de l'estrella groga, per la qual cosa és directament reutilitzable sense duplicar-la (a diferència de `fireStarOverlapsPaddle`, que SPEC 06 va duplicar per simplicitat; aquí s'aprofita la funció existent tal com és) — funciona igual encara que `star.x` canviï cada frame per l'oscil·lació.
- **Moviment en zig-zag només per a l'estrella verda, no per a la groga ni la vermella:** decisió explícita de l'usuari; és un tret distintiu propi d'aquesta spec, sense tocar el comportament ja implementat de SPEC 04/06.
- **Oscil·lació horitzontal implementada amb una ona sinusoidal (`x = baseX + amplitude * sin(elapsed * LIFE_STAR_ZIGZAG_SPEED)`) en lloc d'un rebot en zig-zag (inversió de `dx` en tocar límits):** decisió explícita de l'usuari (moviment "d'onada"); produeix un moviment fluid i predictible sense necessitat de gestionar límits ni invertir cap velocitat horitzontal.
- **Amplitud aleatòria entre 20 i 50 píxels, triada per estrella en crear-se i fixa durant tota la seva caiguda:** decisió explícita de l'usuari; cada estrella verda té una "personalitat" de zig-zag diferent, sense variar-la mentre cau per mantenir el moviment predictible dins d'una mateixa caiguda.
- **Velocitat angular de l'ona fixada a `LIFE_STAR_ZIGZAG_SPEED = 0.05` rad/frame (~2 segons per oscil·lació completa a 60 fps):** valor per defecte triat per obtenir un zig-zag visible però prou lent per seguir sent capturable amb la pala; no especificat explícitament per l'usuari, es pot ajustar si en jugar resulta massa ràpid o massa lent.
