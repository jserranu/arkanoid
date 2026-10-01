# CLAUDE.md

Aquest fitxer proporciona indicacions a Claude Code (claude.ai/code) quan treballa amb codi en aquest repositori.

## Idioma

Respon sempre en català, tant a la conversa com als comentaris del codi i als missatges de commit.

## Estat del projecte

Joc d'Arkanoid/Breakout jugable, amb quatre specs implementades (vegeu `specs/`). Punt d'entrada: `index.html`, lògica de joc a `js/game.js`.

## Specs implementades

Totes les specs de `specs/` estan en estat `Implemented`:

1. **`01-nucli-jugable-mvp.md`** — nucli jugable: canvas 800x600, pala (teclat i ratolí), pilota amb rebot físic, un nivell fix de blocs (5x8), puntuació (10 punts/bloc), 3 vides, victòria/derrota, reinici amb Espai/Enter.
2. **`02-animacio-explosio-blocs.md`** — animació d'explosió de 4 frames (`EXPLOSION_FRAMES`, 150 ms) en destruir un bloc, purament visual, no bloqueja cap mecànica.
3. **`03-sons-i-sistema-de-nivells.md`** — sons de rebot i de trencament de bloc (tecla M per silenciar), 5 nivells amb graelles generades proceduralment (colors aleatoris per fila), blocs resistents (2 impactes) en nombre creixent per nivell (0/3/6/9/12), puntuació i vides acumulades entre nivells.
4. **`04-powerup-estrella-doble-pilota.md`** — 3 blocs per nivell porten un power-up ocult; en destruir-los cau una estrella groga que, si la pala la captura, activa una segona pilota; amb 2 pilotes actives els blocs valen el doble de punts; perdre una de les dues pilotes no descompta vida.

Millores posteriors (canvi directe, sense spec): la pilota s'accelera ×1.1 cada 30 s a partir dels 60 s de cada nivell (`updateLevelTimer`, comptador `levelFrames`; en perdre una vida la pilota torna a la velocitat base del nivell), i en superar un nivell s'atorga un bonus de temps de 200 punts menys 20 per cada 20 s (`calculateTimeBonus`), mostrat a la pantalla de nivell superat.

Estrella blava (canvi directe, sense spec): 1 bloc per nivell la porta; en capturar-la durant 30 s la pilota va ×1.5 més ràpida i s'enganxa al centre de la pala en lloc de rebotar; Espai o clic de ratolí la dispara en línia recta cap amunt (`magnetModeActive`, `launchStuckBalls`). En perdre una vida o canviar de nivell l'efecte es cancel·la.

Per a properes funcionalitats, seguir el mateix flux: `/spec` per definir la spec a `specs/NN-slug.md`, marcar-la `Approved` manualment i després `/spec-impl NN-slug`.

## Stack

HTML5 Canvas + JavaScript pur (sense eines de build, sense framework, sense `package.json`). El renderitzat es basa en sprites, a partir d'un spritesheet compartit.

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
