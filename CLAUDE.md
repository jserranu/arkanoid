# CLAUDE.md

Aquest fitxer proporciona indicacions a Claude Code (claude.ai/code) quan treballa amb codi en aquest repositori.

## Idioma

Respon sempre en català, tant a la conversa com als comentaris del codi i als missatges de commit.

## Estat del projecte

Col·lecció de jocs HTML5. Punt d'entrada: `index.html` (menú de jocs). Jocs: l'Arkanoid a `games/arkanoid/` (`index.html`, lògica a `games/arkanoid/js/game.js`) i Starship a `games/starship/` (SPEC 13, lògica a `games/starship/js/game.js`). Codi comú a `shared/` (SPEC 12). Les specs antigues (01-11) citen rutes d'abans de la reorganització (`index.html`, `js/game.js`, `assets/`): són històriques.

## Estructura i com afegir un joc

- `index.html` — menú HTML/CSS (sense canvas). La llista surt de l'array `GAMES` definit a la mateixa pàgina; cada entrada enllaça a `games/<id>/index.html`.
- `games/<id>/` — cada joc autocontingut, amb els seus assets i rutes relatives al seu `index.html`. Per tornar al menú: `../../index.html` (constant `GAME_MENU_URL` a cada joc).
- `shared/` — scripts clàssics (no ES modules, perquè ha de funcionar amb `file://`) que només exposen un objecte global i encapsulen la resta en una IIFE. No poden contenir res específic d'un joc: tot arriba per paràmetre.
  - `ranking.js` → `Ranking.create({ storageKey, maxEntries, extraField, extraLabel })`: `load`, `add({ name, score, extra })`, `playerNames`, `isEmpty`, `entries`, `drawTable(ctx, left, top, highlightEntry)`. Clau per joc: `<id>:ranking:v1` (`arkanoid:ranking:v1` i `starship:ranking:v1`, tots dos amb `extraField: 'level'`).
  - `player-select.js` → `PlayerSelect.create({ ctx, width, height, title, ranking, nameMaxLength, defaultName, onPlayerChosen })`: `start`, `draw`, `handleKey`, `handleMouseMove` (retorna si ha consumit l'event), `handleClick`. Els jocs hi deleguen mentre `gameState === 'choosePlayer'`.
- El botó «Jocs», la pausa i el bucle de joc no són a `shared/`: Starship en té una còpia pròpia de l'Arkanoid (decisió de SPEC 13).
- Afegir un joc: crear `games/<id>/index.html` (carregant `../../shared/*.js` abans del seu codi si els fa servir) i afegir-ne l'entrada a `GAMES` d'`index.html`.

## Specs implementades

Totes les specs de `specs/` (01-09) estan en estat `Implemented`:

1. **`01-nucli-jugable-mvp.md`** — nucli jugable: canvas 800x600, pala (teclat i ratolí), pilota amb rebot físic, un nivell fix de blocs (5x8), puntuació (10 punts/bloc), 3 vides, victòria/derrota, reinici amb Espai/Enter.
2. **`02-animacio-explosio-blocs.md`** — animació d'explosió de 4 frames (`EXPLOSION_FRAMES`, 150 ms) en destruir un bloc, purament visual, no bloqueja cap mecànica.
3. **`03-sons-i-sistema-de-nivells.md`** — sons de rebot i de trencament de bloc (tecla M per silenciar), 5 nivells amb graelles generades proceduralment (colors aleatoris per fila), blocs resistents (2 impactes) en nombre creixent per nivell (0/3/6/9/12), puntuació i vides acumulades entre nivells.
4. **`04-powerup-estrella-doble-pilota.md`** — 3 blocs per nivell porten un power-up ocult; en destruir-los cau una estrella groga que, si la pala la captura, activa una segona pilota; amb 2 pilotes actives els blocs valen el doble de punts; perdre una de les dues pilotes no descompta vida.
5. **`05-pausa-i-velocitat-pilota.md`** — velocitat inicial de la pilota reduïda a 3.2 (`BASE_BALL_SPEED_X/Y`); pausa amb P o Escape (`gameState = 'paused'`, overlay "PAUSA") i represa amb Espai o Enter.
6. **`06-estrella-vermella-pilota-de-foc.md`** — 3 blocs per nivell porten una estrella vermella; en capturar-la durant 15 s les pilotes són de foc: destrueixen qualsevol bloc d'un sol cop sense rebotar i deixen una estela vermella (`FIRE_DURATION_FRAMES`).
7. **`07-estrella-verda-vida-extra.md`** — 1 bloc per nivell porta una estrella verda (cau fent zigzag) que, capturada, suma 1 vida (`LIFE_POWERUP_BLOCKS_PER_LEVEL`).
8. **`08-nom-jugador-i-ranquing.md`** — pantalla inicial `enterName` per escriure el nom del jugador (màx. 10 caràcters, per defecte `ANÒNIM`) i rànquing Top 10 persistent a `localStorage` (`arkanoid:ranking:v1`), desat i mostrat en acabar la partida (victòria o derrota).
9. **`09-ranquing-inicial-i-seleccio-jugador.md`** — la pantalla inicial (`selectPlayer`) mostra la taula de puntuacions i permet triar un jugador existent (fletxes amunt/avall + Enter, o ratolí) o crear-ne un de nou; Escape a `enterName` torna a la selecció.

Millores posteriors (canvi directe, sense spec): la pilota s'accelera ×1.1 cada 30 s a partir dels 60 s de cada nivell (`updateLevelTimer`, comptador `levelFrames`; en perdre una vida la pilota torna a la velocitat base del nivell), i en superar un nivell s'atorga un bonus de temps de 200 punts menys 20 per cada 20 s (`calculateTimeBonus`), mostrat a la pantalla de nivell superat.

Ampliació a 10 nivells (canvi directe, sense spec): `TOTAL_LEVELS = 11`, amb 5 patrons nous a `LEVEL_PATTERNS` (`invertedPyramid`, `frame`, `columns`, `zigzag`, `cross`) per als nivells 6-10 i el nivell 11 amb la forma "67" (`sixtySeven`, mapa de bits `SIXTY_SEVEN_BITMAP`); els blocs resistents continuen creixent 3 per nivell.

Estrella blava (canvi directe, sense spec): 1 bloc per nivell la porta; en capturar-la durant 30 s la pilota va ×1.5 més ràpida i s'enganxa al centre de la pala en lloc de rebotar; Espai o clic de ratolí la dispara en línia recta cap amunt (`magnetModeActive`, `launchStuckBalls`). En perdre una vida o canviar de nivell l'efecte es cancel·la.

**Starship** (`13-joc-starship.md`, substitueix el placeholder «Properament»): nau en 2D (fletxes/WASD per `e.code`, taula `MOVE_KEYS`) que dispara mantenint Espai (`FIRE_COOLDOWN_FRAMES`) contra asteroides que cauen en vertical o en diagonal (rebot lateral) i es divideixen gran → 2 mitjans → 2 petits (20/50/100 punts, `ASTEROID_SIZES`). 3 vides (xoc amb la nau, 2 s d'invulnerabilitat), 5 nivells de 60 s amb dificultat a `LEVELS`, pausa i botó «Jocs» com a l'Arkanoid. Gràfics amb paths del canvas, sense assets ni sons. `endGame()` és l'únic punt que desa al rànquing.

Per a properes funcionalitats, seguir el mateix flux: `/spec` per definir la spec a `specs/NN-slug.md`, marcar-la `Approved` manualment i després `/spec-impl NN-slug`.

## Stack

HTML5 Canvas + JavaScript pur (sense eines de build, sense framework, sense `package.json`). Starship ho dibuixa tot amb paths del canvas. El renderitzat de l'Arkanoid es basa en sprites, a partir d'un spritesheet propi del joc (rutes relatives a `games/arkanoid/`).

- `assets/spritesheet-breakout.png` — l'atles de sprites.
- `assets/spritesheet.js` — la taula de coordenades dels sprites (`SPRITES`, `EXPLOSION_FRAMES`) i les funcions auxiliars de càrrega/dibuix (`loadSpritesheet`, `drawSprite`, `drawFrame`). Cal carregar l'spritesheet de forma asíncrona amb `loadSpritesheet(cb)` abans de dibuixar res.
- `assets/sounds/*.mp3` — efectes de so (rebot de la pilota, trencament de bloc).

Convenció de noms dels sprites: els sprites de bloc es consulten com `block_<color>` (p. ex. `block_red`), que `drawSprite` resol contra `SPRITES.blocks[color]`. Colors de bloc/explosió disponibles: gray, red, yellow, cyan, magenta, hotpink, green.

## Flux de treball: desenvolupament basat en specs

Aquest repositori utilitza un flux de treball d'specs en dos passos (skills importades de `Klerith/fernando-skills`, registrades a `skills-lock.json`, definides a `.agents/skills/`):

1. **`/spec <descripció de la funcionalitat>`** — defineix una spec de forma interactiva mitjançant preguntes aclaridores, i després l'escriu a `specs/NN-slug.md` en estat `Draft`. Mai escriu codi.
2. **`/spec-impl <NN-slug>`** — implementa una spec que s'ha marcat manualment com `Approved`. Crea una branca de git `spec-NN-slug`, i després implementa el pla pas a pas, aturant-se per revisió després de cada pas. Mai fa commit automàticament.

Quan es demani construir una nova funcionalitat per al joc, cal prioritzar l'ús de `/spec` primer en lloc d'implementar directament, tret que l'usuari demani explícitament un canvi ràpid/directe.

El comportament de creació de branques de `/spec-impl` es controla amb `specs/.spec-config.yml` (`AutoCreateBranch`, per defecte `true`) — aquest fitxer es genera automàticament amb `/spec` la primera vegada que s'utilitza i no s'hauria d'editar manualment sense necessitat.

## Notes

- El repositori ja està inicialitzat amb git; cada spec s'ha implementat en la seva pròpia branca `spec-NN-slug` seguint el flux `/spec-impl`.
