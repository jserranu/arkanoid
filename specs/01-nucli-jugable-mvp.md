# 01 - Nucli jugable MVP

**Estat:** Draft
**Depèn de:** (cap)
**Data:** 2026-09-16

**Objectiu:** Crear una partida d'Arkanoid completament jugable amb un sol nivell fix de blocs, pala i pilota amb física de rebot bàsica, i estats de victòria/derrota, sense power-ups, puntuació ni múltiples nivells.

## Abast

**Dins de l'abast:**

- Pantalla de joc amb canvas HTML5 a mida fixa.
- Pala controlable amb teclat (fletxes esquerra/dreta o A/D) i amb ratolí (segueix la posició horitzontal del punter dins del canvas).
- Pilota amb moviment continu i rebot físic contra les parets laterals, la paret superior i la pala (l'angle de rebot depèn del punt d'impacte sobre la pala).
- Un únic nivell de blocs fix, en graella de files de colors (p. ex. 5 files x 8 columnes), cada fila amb un color de `SPRITES.blocks` (gray, red, yellow, cyan, magenta, hotpink, green), definit com a array/estructura fixa al codi.
- Detecció de col·lisió pilota-bloc: en col·lidir, el bloc desapareix i la pilota rebota.
- Estat de **victòria**: quan es destrueixen tots els blocs, es mostra un missatge overlay de victòria.
- Estat de **derrota**: una sola vida — si la pilota supera la pala i surt per la part inferior del canvas, es mostra un missatge overlay de "Game Over" immediatament (sense sistema de vides).
- Reinici de la partida des de qualsevol estat final (victòria o derrota) prement una tecla (p. ex. Espai o Enter), sense recarregar la pàgina — reinicia l'estat complet del joc (blocs, posició de pala i pilota).
- Renderitzat de pala, pilota i blocs mitjançant els sprites existents a `assets/spritesheet.js` (`SPRITES.paddle`, `SPRITES.ball`, `SPRITES.blocks.<color>`), carregats de forma asíncrona amb `loadSpritesheet(cb)` abans d'iniciar el bucle de joc.
- Bucle de joc amb `requestAnimationFrame`.

**Fora de l'abast (specs futures):**

- Power-ups.
- Múltiples nivells / progressió entre nivells.
- Sistema de puntuació i de vides múltiples.
- Efectes de so (`assets/sounds/*.mp3`) — queda fora d'aquest MVP tot i que els assets ja existeixen.
- Animacions d'explosió en trencar un bloc (`EXPLOSION_FRAMES`) — el bloc simplement desapareix.
- Menú principal, pantalla de selecció de nivell o pausa.

## Model de dades

No es persisteix cap dada entre sessions. L'estat de joc viu només en memòria durant l'execució, en variables/objectes JS del bucle de joc:

- `paddle`: `{ x, y, width, height }` — posició i mida de la pala (mida segons `SPRITES.paddle`: 162x14).
- `ball`: `{ x, y, radius, dx, dy }` — posició i vector de velocitat de la pilota (mida segons `SPRITES.ball`: 16x16).
- `blocks`: array d'objectes `{ x, y, width, height, color, alive }` — un element per bloc de la graella (mida segons `SPRITES.blocks[color]`: 32x16 cadascun).
- `gameState`: cadena amb els valors `'playing'`, `'won'`, `'lost'`.

## Pla d'implementació

1. Crear `index.html` a l'arrel: element `<canvas>`, inclusió de `assets/spritesheet.js` i `js/game.js`. En carregar, cridar `loadSpritesheet(cb)` i, dins el callback, iniciar el joc. El sistema ha de mostrar un canvas buit fins que l'spritesheet estigui carregat.
2. Crear `js/game.js` amb la inicialització de l'estat (`paddle`, `ball`, `blocks` generats en graella, `gameState = 'playing'`) i el bucle de joc bàsic amb `requestAnimationFrame` que neteja i redibuixa el canvas cada frame (encara sense moviment). El sistema ha de mostrar la pala, la pilota i tots els blocs en les seves posicions inicials.
3. Afegir control de la pala per teclat (fletxes/A-D) i per ratolí (moviment sobre el canvas), limitant-ne la posició als límits del canvas. El sistema ha de permetre moure la pala horitzontalment amb ambdós mètodes.
4. Afegir moviment de la pilota i rebot contra parets laterals i paret superior. El sistema ha de mostrar la pilota movent-se i rebotant contra els límits del canvas (excepte la part inferior).
5. Afegir col·lisió pilota-pala amb angle de rebot depenent del punt d'impacte. El sistema ha de permetre que el jugador mantingui la pilota en joc rebotant-la amb la pala.
6. Afegir col·lisió pilota-bloc: en impacte, marcar el bloc com a no viu (deixa de dibuixar-se i de comptar per a col·lisions) i fer rebotar la pilota. El sistema ha de mostrar com els blocs desapareixen en ser tocats i la pilota rebota correctament.
7. Afegir detecció de victòria (tots els blocs `alive: false`) i de derrota (pilota supera el límit inferior), canviant `gameState` i aturant el moviment. El sistema ha de mostrar un overlay de "Has guanyat!" o "Game Over" segons el cas.
8. Afegir reinici de partida (tecla Espai/Enter en estat `'won'` o `'lost'`) que regenera tot l'estat inicial i torna a `gameState = 'playing'`. El sistema ha de permetre jugar una nova partida sense recarregar la pàgina.

## Criteris d'acceptació

- [ ] Obrir `index.html` al navegador mostra el canvas amb la pala, la pilota i la graella de blocs de colors, un cop l'spritesheet s'ha carregat.
- [ ] La pala es mou horitzontalment amb les fletxes esquerra/dreta (o A/D) sense sortir dels límits del canvas.
- [ ] La pala es mou horitzontalment seguint el ratolí quan aquest es mou sobre el canvas.
- [ ] La pilota es mou de forma contínua i rebota contra les parets laterals i la paret superior.
- [ ] La pilota rebota contra la pala amb un angle que depèn del punt d'impacte.
- [ ] En col·lidir amb un bloc, el bloc desapareix del canvas i la pilota rebota.
- [ ] Quan es destrueixen tots els blocs, apareix un missatge de victòria i la pilota deixa de moure's.
- [ ] Quan la pilota supera la pala i surt per la part inferior, apareix un missatge de "Game Over" i la pilota deixa de moure's.
- [ ] Des de l'estat de victòria o derrota, prement Espai o Enter la partida es reinicia completament (blocs, pala i pilota tornen a l'estat inicial) sense recarregar la pàgina.
- [ ] No hi ha cap so, puntuació, vides múltiples, power-up ni segon nivell implementats en aquest MVP.

## Decisions preses i descartades

- **Controls duals (teclat + ratolí):** s'implementen ambdós des del principi perquè el cost afegit és baix i millora la jugabilitat de seguida.
- **Una sola vida:** es descarta un sistema de vides múltiples per mantenir l'MVP mínim; queda per a una spec futura de puntuació/vides.
- **Sense so en l'MVP:** tot i que `assets/sounds/*.mp3` ja existeix, s'ha decidit deixar la integració de so per a una spec posterior, per mantenir l'abast centrat en la jugabilitat.
- **Sense animació d'explosió:** `EXPLOSION_FRAMES` existeix als assets però no s'utilitza en aquest MVP; el bloc simplement desapareix en ser destruït.
- **Reinici sense recarregar la pàgina:** es prefereix gestionar l'estat en JS i oferir una tecla de reinici, en lloc d'obligar a recarregar el navegador, per a una millor experiència de joc.
- **Un sol fitxer de lògica (`js/game.js`):** es descarta separar en múltiples mòduls (pala, pilota, blocs) perquè l'abast del MVP és prou reduït per mantenir-ho tot en un sol fitxer sense perdre claredat.

## Riscos identificats

- **Física de rebot simplista:** un càlcul d'angle de rebot mal ajustat a la pala pot fer que la pilota es comporti de manera poc predictible (rebots massa plans o massa verticals). Cal ajustar la fórmula empíricament durant la implementació.
- **Doble control (teclat + ratolí) simultani:** cal decidir quin input té prioritat si l'usuari usa tots dos alhora; es resoldrà donant prioritat a l'últim input rebut.
