# 06 - Estrella vermella: pilota de foc que travessa els blocs

**Estat:** Implemented
**Depèn de:** SPEC 01, SPEC 03, SPEC 04, SPEC 05
**Data:** 2026-09-23

**Objectiu:** En destruir un de 3 blocs aleatoris nous per nivell, cau una estrella vermella que, si la pala la captura, converteix durant 15 segons totes les pilotes actives en pilotes de foc: destrueixen qualsevol bloc que toquin d'un sol cop sense rebotar-hi, deixant una estela vermella visible.

## Abast

**Dins de l'abast:**

- En generar cada nivell (`generateBlocksForLevel()`), es marquen `FIRE_POWERUP_BLOCKS_PER_LEVEL` (= 3) blocs a l'atzar amb `hasFirePowerUp: true`, en una selecció independent dels blocs resistents (SPEC 03) i dels blocs amb `hasPowerUp` de l'estrella groga (SPEC 04) — un mateix bloc pot portar simultàniament qualsevol combinació d'aquests atributs. Els blocs amb `hasFirePowerUp` no es distingeixen visualment dels normals fins que es destrueixen.
- Quan un bloc amb `hasFirePowerUp: true` es destrueix del tot, apareix una estrella vermella que cau en línia recta cap avall des de la posició del bloc, a la mateixa velocitat de caiguda que l'estrella groga (`STAR_FALL_SPEED`), dibuixada amb la mateixa forma de 5 puntes però en color vermell.
- Si l'estrella vermella arriba a tocar la pala, es captura (desapareix) i s'activa el "mode foc": totes les pilotes actives en aquell moment (una o dues) passen a ser pilotes de foc durant 15 segons. Si l'estrella arriba a baix sense ser capturada, desapareix sense cap efecte.
- Poden caure diverses estrelles vermelles alhora, igual que amb l'estrella groga.
- Si es captura una estrella vermella mentre el mode foc ja està actiu, els 15 segons es sumen als que quedin (no es reinicia el comptador ni té un màxim).
- Mentre el mode foc està actiu, qualsevol pilota (incloent-hi una segona pilota que aparegui durant l'efecte, per exemple en capturar una estrella groga) és també una pilota de foc: el mode foc és un estat global, no una propietat individual de cada pilota.
- Una pilota de foc continua rebotant amb normalitat a les parets laterals/superior i a la pala (SPEC 01); només canvia la seva interacció amb els blocs.
- En tocar un bloc, una pilota de foc el destrueix directament (com si `hitsRemaining` arribés a `0` d'un sol cop, independentment de si el bloc és normal o resistent) i **no rebota**: continua exactament amb la mateixa `dx`/`dy` que portava, travessant la posició del bloc.
- La destrucció d'un bloc amb una pilota de foc suma els mateixos punts que una destrucció normal (`POINTS_PER_BLOCK`, doblats a `POINTS_PER_BLOCK × 2` només si hi ha 2 pilotes actives, exactament com a SPEC 04); el mode foc no afegeix cap multiplicador de puntuació propi.
- Si el bloc destruït per una pilota de foc portava `hasPowerUp` o `hasFirePowerUp`, cau la seva estrella corresponent (groga o vermella) amb normalitat, igual que en una destrucció normal.
- Es reprodueix el so de trencament de bloc (`breakSoundAudio`) en cada bloc destruït per una pilota de foc, igual que en una destrucció normal; no s'afegeix cap so nou.
- Visualment, mentre el mode foc està actiu: totes les pilotes es dibuixen d'un color vermell distintiu (en lloc del sprite normal) i deixen una estela vermella semitransparent darrere seu que s'esvaeix amb la distància.
- Mentre el mode foc està actiu, apareix un indicador al costat de la puntuació (`drawScore()`, al costat de l'indicador de punts dobles si també hi és) amb la mateixa forma d'estrella en vermell, mostrant el nombre de segons restants arrodonit a l'alça. L'indicador desapareix en acabar l'efecte.
- El mode foc es congela mentre el joc està en pausa (SPEC 05): el comptador de segons restants no avança mentre `gameState === 'paused'`, ja que el temporitzador es descompta dins d'`update()`, que ja no s'executa en pausa.
- Els blocs amb `hasFirePowerUp` es regeneren a cada nivell (nova selecció aleatòria de 3 blocs en carregar cada nivell) i en reiniciar la partida; el mode foc actiu i qualsevol estrella vermella caient es reinicien (desactivats/buidats) en passar de nivell o en reiniciar la partida.

**Fora de l'abast (specs futures):**

- Qualsevol límit màxim acumulable de segons de mode foc (es poden acumular sense límit sumant captures successives).
- Penalització per no capturar l'estrella vermella o per deixar-la caure.
- So específic en capturar l'estrella vermella o en activar/desactivar el mode foc (només s'usen els sons ja existents).
- Interacció especial entre el mode foc i el power-up de punts dobles més enllà de mantenir les regles de puntuació ja existents de SPEC 04 sense canvis.
- Persistència del mode foc entre sessions (recàrrega de pàgina) — no aplica, cap estat del joc es persisteix actualment.
- Indicador visual de quins blocs porten l'estrella vermella abans de destruir-los (igual que amb l'estrella groga, ha de ser una sorpresa).

## Model de dades

Amplia el model de SPEC 01/03/04:

- Cada element de `blocks` amplia la seva estructura amb un nou camp `hasFirePowerUp`: booleà, `true` només als `FIRE_POWERUP_BLOCKS_PER_LEVEL` blocs triats a l'atzar en generar el nivell (selecció independent de `hasPowerUp` i dels blocs resistents).
- `fireStars`: nou array a l'estat global (mateixa forma que `stars`, SPEC 04), inicialitzat buit a `createInitialState()` i `advanceToNextLevel()`. Cada element: `{ x, y, dy }`.
- `fireModeActive`: booleà global, `false` per defecte, inicialitzat a `createInitialState()` i `advanceToNextLevel()`.
- `fireModeFramesRemaining`: número global (frames restants d'`update()` amb `fireModeActive === true`), `0` per defecte, inicialitzat a `createInitialState()` i `advanceToNextLevel()`.
- Cada element de `balls` amplia la seva estructura (SPEC 04: `{ x, y, radius, dx, dy }`) amb un nou camp `trail`: array de `{ x, y }` amb com a màxim `FIRE_TRAIL_LENGTH` elements, usat només per dibuixar l'estela mentre `fireModeActive` és `true`. S'inicialitza a `[]` a totes les pilotes creades (a `resetPaddleAndBall()` i en crear la segona pilota a `updateStars()`).
- `FIRE_POWERUP_BLOCKS_PER_LEVEL`: constant = `3`.
- `FIRE_DURATION_FRAMES`: constant = `900` (15 segons a 60 fps, ritme d'`update()` via `requestAnimationFrame`).
- `FIRE_STAR_COLOR`: constant = `'#e53935'` (vermell).
- `FIRE_BALL_COLOR`: constant = `'#e53935'` (mateix vermell, reutilitzat per a la pilota i l'estela).
- `FIRE_TRAIL_LENGTH`: constant = `8` (nombre de posicions anteriors recordades per pilota per dibuixar l'estela).

## Pla d'implementació

1. Afegir les constants noves (`FIRE_POWERUP_BLOCKS_PER_LEVEL`, `FIRE_DURATION_FRAMES`, `FIRE_STAR_COLOR`, `FIRE_BALL_COLOR`, `FIRE_TRAIL_LENGTH`) al costat de les constants `STAR_*` existents (js/game.js, prop de la línia 19-23). Sense canvis de comportament encara.
2. A `generateBlocksForLevel()`, afegir el camp `hasFirePowerUp: false` per defecte a cada bloc generat (al costat de `hasPowerUp: false`). Després de la selecció existent de blocs amb `hasPowerUp`, afegir una segona selecció aleatòria independent de `Math.min(FIRE_POWERUP_BLOCKS_PER_LEVEL, generatedBlocks.length)` blocs i marcar-los `hasFirePowerUp: true`. El sistema ha de generar cada nivell amb fins a 3 blocs marcats amb foc, sense cap marca visual.
3. Afegir `fireStars = []`, `fireModeActive = false` i `fireModeFramesRemaining = 0` a `createInitialState()` i `advanceToNextLevel()`. Afegir `trail: []` a la creació de la pilota inicial a `resetPaddleAndBall()`.
4. Modificar `drawStarShape(cx, cy, size)` perquè accepti un quart paràmetre `color` (per defecte `STAR_COLOR`) i l'usi a `ctx.fillStyle` en lloc de la constant fixa. Afegir `drawFireStars()`, anàloga a `drawStars()`, que itera `fireStars` cridant `drawStarShape(star.x, star.y, STAR_SIZE, FIRE_STAR_COLOR)`. Cridar-la des de `gameLoop()` just després de `drawStars()`. El sistema ha de mostrar les estrelles vermelles caient amb el mateix aspecte que les grogues però en vermell.
5. Afegir `fireStarOverlapsPaddle(star)` (idèntica lògica que `starOverlapsPaddle`, reutilitzable si es generalitza amb un paràmetre de mida, o duplicada per simplicitat) i `updateFireStars()`, anàloga a `updateStars()`: per cada estrella vermella, incrementar `y` en `dy`; si supera `CANVAS_HEIGHT`, eliminar-la; si se superposa amb la pala, eliminar-la i activar el mode foc: si `fireModeActive` és `false`, posar-lo a `true` i `fireModeFramesRemaining = FIRE_DURATION_FRAMES`; si ja és `true`, sumar `fireModeFramesRemaining += FIRE_DURATION_FRAMES`. Cridar `updateFireStars()` des d'`update()`, al costat d'`updateStars()`. El sistema ha de permetre capturar l'estrella vermella i activar (o allargar) el mode foc.
6. A `update()`, després de cridar `updateFireStars()`, si `fireModeActive` és `true`: decrementar `fireModeFramesRemaining` en `1`; si arriba a `0`, posar `fireModeActive = false` i buidar el `trail` de totes les pilotes (`balls.forEach(ball => ball.trail = [])`). Com que aquest bloc de codi només s'executa dins d'`update()`, que ja té la guarda `if (gameState !== 'playing') return`, el comptador queda congelat automàticament mentre el joc està en pausa (SPEC 05). El sistema ha de desactivar el mode foc exactament 15 segons (900 frames) després de l'última captura, excepte mentre el joc estigui en pausa.
7. A `checkBlockCollisions(ball)`, separar la lògica actual en dos camins segons `fireModeActive`: si és `true`, quan hi ha col·lisió amb un bloc viu, destruir-lo directament (`block.alive = false`), sumar els punts amb la mateixa fórmula existent (`POINTS_PER_BLOCK * (balls.length === 2 ? DOUBLE_POINTS_MULTIPLIER : 1)`), afegir l'explosió, reproduir `breakSoundAudio`, fer caure `stars`/`fireStars` si el bloc tenia `hasPowerUp`/`hasFirePowerUp`, i **ometre completament el bloc de codi que inverteix `ball.dx`/`ball.dy`** (la pilota continua recta). Si `fireModeActive` és `false`, mantenir el comportament exacte actual (decrement de `hitsRemaining`, rebot inclòs). El sistema ha de fer que una pilota de foc destrueixi qualsevol bloc que toqui en un sol pas i continuï recta.
8. A `updateBalls()`, després d'actualitzar la posició de cada pilota (`ball.x += ball.dx; ball.y += ball.dy;`), si `fireModeActive` és `true`: afegir `{ x: ball.x, y: ball.y }` al final de `ball.trail` i retallar-lo a `FIRE_TRAIL_LENGTH` elements (`ball.trail.push(...); if (ball.trail.length > FIRE_TRAIL_LENGTH) ball.trail.shift();`). Afegir també `trail: []` a l'objecte de la segona pilota creada a `updateStars()` (SPEC 04). El sistema ha d'anar acumulant l'estela mentre el mode foc estigui actiu.
9. Modificar `drawBalls()`: per cada pilota, si `fireModeActive` és `true`, dibuixar primer l'estela (recórrer `ball.trail` de més antiga a més recent, dibuixant un cercle ple de `FIRE_BALL_COLOR` a cada posició amb `ctx.globalAlpha` creixent segons la posició a l'array, p. ex. `(i + 1) / trail.length * 0.5`) i després la pilota mateixa com un cercle ple de `FIRE_BALL_COLOR` (`ctx.arc` + `ctx.fill`, radi `ball.radius`) en lloc del sprite habitual; restaurar `ctx.globalAlpha = 1` en acabar. Si `fireModeActive` és `false`, mantenir el dibuix amb `drawSprite` exactament igual que ara. El sistema ha de mostrar les pilotes en vermell amb estela mentre dura l'efecte, i amb l'sprite normal la resta del temps.
10. A `drawScore()`, després de l'indicador existent de punts dobles, si `fireModeActive` és `true`, dibuixar la forma d'estrella en `FIRE_STAR_COLOR` seguida del text `Math.ceil(fireModeFramesRemaining / 60)` (segons restants arrodonits a l'alça). El sistema ha de mostrar un compte enrere visible del mode foc mentre estigui actiu.

## Criteris d'acceptació

- [ ] En carregar o reiniciar un nivell, exactament 3 blocs (o menys si el nivell no en té prou) porten `hasFirePowerUp: true`, sense cap marca visual diferenciadora, de forma independent dels blocs amb `hasPowerUp`.
- [ ] En destruir del tot un bloc amb `hasFirePowerUp`, cau una estrella vermella (mateixa forma que la groga) des de la seva posició cap avall a velocitat constant.
- [ ] Si l'estrella vermella toca la pala i el mode foc no estava actiu, s'activa durant 15 segons i totes les pilotes actives passen a ser de foc immediatament.
- [ ] Si l'estrella vermella toca la pala mentre el mode foc ja està actiu, els 15 segons se sumen als que quedaven (el comptador del HUD augmenta en lloc de reiniciar-se a 15).
- [ ] Si l'estrella vermella arriba a baix de tot sense ser capturada, desapareix sense cap efecte.
- [ ] Mentre el mode foc està actiu, una pilota que toca un bloc (normal o resistent) el destrueix immediatament en un sol impacte i continua movent-se en línia recta, sense invertir `dx`/`dy`.
- [ ] Mentre el mode foc està actiu, les pilotes continuen rebotant amb normalitat a les parets i a la pala.
- [ ] Si es captura una estrella groga (segona pilota, SPEC 04) mentre el mode foc ja està actiu, la nova pilota també és una pilota de foc des del primer frame.
- [ ] La puntuació obtinguda en destruir blocs mentre el mode foc està actiu és idèntica a la que s'obtindria sense mode foc en les mateixes condicions (normal amb 1 pilota, doble amb 2 pilotes) — el mode foc no afegeix cap multiplicador propi.
- [ ] Un bloc destruït per una pilota de foc que portava `hasPowerUp` o `hasFirePowerUp` fa caure la seva estrella corresponent amb normalitat.
- [ ] Mentre el mode foc està actiu, totes les pilotes es dibuixen en vermell amb una estela vermella semitransparent darrere seu; en desactivar-se, tornen a l'sprite normal sense estela.
- [ ] Mentre el mode foc està actiu, apareix al costat de la puntuació un indicador d'estrella vermella amb el compte enrere de segons restants (arrodonit a l'alça); desapareix en desactivar-se l'efecte.
- [ ] Posant el joc en pausa (SPEC 05) durant el mode foc, el compte enrere deixa d'avançar; en reprendre, continua exactament des d'on estava.
- [ ] En passar de nivell o en reiniciar la partida, el mode foc es desactiva, `fireStars` queda buit i cap pilota conserva estela.
- [ ] Sense capturar mai una estrella vermella, tot el comportament del joc (rebots, blocs, power-up de segona pilota, nivells, sons, pausa) es manté exactament igual que a SPEC 01-05.

## Decisions preses i descartades

- **Grup de blocs (`hasFirePowerUp`) independent dels de l'estrella groga i dels resistents:** decisió explícita de l'usuari; un mateix bloc pot combinar qualsevol atribut, seguint el mateix patró de selecció aleatòria ja establert a SPEC 03/04.
- **Una pilota de foc destrueix qualsevol bloc d'un sol impacte, ignorant `hitsRemaining`:** decisió explícita de l'usuari; evita haver de gestionar solapaments parcials en frames consecutius quan la pilota travessa un bloc resistent sense rebotar-hi, i és coherent amb "trencarà tot el que es trobi".
- **El mode foc és un estat global (no una propietat per pilota):** decisió explícita de l'usuari; si hi ha 2 pilotes actives, totes dues es tornen de foc alhora, i qualsevol pilota nova que aparegui mentre l'efecte estigui actiu (p. ex. per l'estrella groga) l'hereta automàticament en comprovar `fireModeActive` en lloc d'un flag individual.
- **Capturar una nova estrella vermella mentre el mode foc ja està actiu suma 15 segons als que quedin, sense límit màxim:** decisió explícita de l'usuari.
- **El mode foc no altera la puntuació per bloc:** decisió explícita de l'usuari; els multiplicadors de punts continuen depenent únicament del nombre de pilotes actives (SPEC 04), no del mode foc.
- **Comptador de 15 segons implementat en frames (`FIRE_DURATION_FRAMES = 900` a 60 fps) i decrementat dins d'`update()`, en lloc d'una marca de temps absoluta (`performance.now()`):** com `update()` ja no s'executa mentre `gameState === 'paused'` (SPEC 05), aquest disseny congela el compte enrere automàticament durant la pausa sense cap lògica addicional; un disseny basat en `performance.now()` (com les explosions) avançaria igualment durant la pausa i requeriria comptabilitat extra.
- **Pilota i estela dibuixades com a cercle ple de Canvas (`ctx.arc`) en lloc del sprite habitual mentre dura l'efecte:** manté la restricció del projecte de no afegir eines de build ni assets nous (no existeix cap sprite de "pilota de foc"); coherent amb el precedent de SPEC 04, que ja dibuixa l'estrella amb un path de Canvas en lloc d'un sprite.
- **Estela implementada com un array `trail` de fins a `FIRE_TRAIL_LENGTH` (8) posicions anteriors per pilota, dibuixades amb opacitat creixent:** solució senzilla sense dependències noves; es buida en desactivar-se el mode foc perquè l'estela desaparegui a l'instant en lloc d'esvair-se progressivament durant uns frames.
- **`hasFirePowerUp`, mode foc actiu i `fireStars` es reinicien a cada nivell i en reiniciar partida:** coherent amb el tractament ja existent dels power-ups de SPEC 04 ("Els power-ups es regeneren a cada nivell").

## Riscos identificats

- **Doble camí a `checkBlockCollisions()` segons `fireModeActive`:** cal assegurar que el camí "normal" (sense mode foc) queda exactament igual que abans (SPEC 01-04), sense alterar per error el comportament dels blocs resistents fora del mode foc.
- **`trail` ha d'inicialitzar-se a totes les pilotes noves:** hi ha dos punts de creació de pilotes (`resetPaddleAndBall()` i la segona pilota dins `updateStars()`, SPEC 04); oblidar-ne un provocaria un error en accedir a `ball.trail` dins `drawBalls()`/`updateBalls()`.
- **Interacció pausa + temporitzador de foc:** cal verificar que congelar el comptador dins d'`update()` (guarda ja existent de SPEC 05) és suficient i que no hi ha cap altre punt del codi que faci avançar `fireModeFramesRemaining` fora d'`update()`.
