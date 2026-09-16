# CLAUDE.md

Aquest fitxer proporciona indicacions a Claude Code (claude.ai/code) quan treballa amb codi en aquest repositori.

## Idioma

Respon sempre en català, tant a la conversa com als comentaris del codi i als missatges de commit.

## Estat del projecte

Aquest és un joc estil Arkanoid/Breakout, actualment en un estat inicial (scaffold). Només existeixen els assets i el flux de treball d'specs — encara no hi ha codi de joc (ni punt d'entrada HTML/JS, ni carpeta `specs/`). El primer treball de funcionalitat hauria de passar per `/spec` per crear `specs/01-...md` abans d'escriure cap codi.

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

- Actualment no és un repositori git — caldrà fer `git init` abans que el pas de creació de branques del flux d'specs (`/spec-impl`) pugui funcionar.
