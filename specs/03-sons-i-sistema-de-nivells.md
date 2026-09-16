# 03 - Sons i sistema de nivells

**Estat:** Implemented
**Depèn de:** SPEC 01, SPEC 02
**Data:** 2026-09-16

**Objectiu:** Afegir efectes de so (rebot de la pilota i trencament de bloc, amb tecla de silenci), un sistema de 5 nivells amb graelles de blocs generades proceduralment, i blocs resistents (2 impactes) en quantitat creixent per nivell, mantenint puntuació i vides acumulades entre nivells.

## Abast

**Dins de l'abast:**

- So `assets/sounds/ball-bounce.mp3` en tot rebot de la pilota contra les parets laterals, la paret superior i la pala. **No** sona en col·lidir amb un bloc.
- So `assets/sounds/break-sound.mp3` en trencar un bloc (independent del so de rebot).
- Diverses reproduccions del mateix so poden solapar-se (p. ex. diversos blocs trencats gairebé alhora produeixen diverses instàncies simultànies de `break-sound.mp3`).
- Tecla de silenci (M) que activa/desactiva tots els sons durant la partida. L'estat de silenci no es reinicia en prémer Espai/Enter per reiniciar partida (és una preferència del jugador, no un valor de partida).
- Sistema de 5 nivells (`TOTAL_LEVELS = 5`). Cada nivell manté la mateixa graella 5x8 que a SPEC 01, però amb el color de cada fila assignat aleatòriament (entre els 7 colors disponibles a `SPRITES.blocks`: gray, red, yellow, cyan, magenta, hotpink, green) en generar-se el nivell.
- En destruir tots els blocs d'un nivell que no és l'últim: es mostra un overlay "Nivell X superat!" i el joc queda en pausa (pilota i pala no es mouen) fins que el jugador prem Espai o Enter, moment en què es carrega el nivell següent (nova graella generada, pala i pilota reposicionades al centre) mantenint puntuació i vides acumulades.
- En destruir tots els blocs de l'últim nivell (nivell 5): es mostra l'overlay de victòria final "Has guanyat el joc!" (missatge diferent del de SPEC 01).
- El nivell actual es mostra a la interfície (HUD), a prop de la puntuació (p. ex. "Nivell 2/5").
- Reiniciar la partida (Espai/Enter des de `'won'` o `'lost'`) torna sempre al nivell 1 amb una graella generada de nou, puntuació a 0 i vides a 3.
- **Blocs resistents (2 impactes):** a partir del nivell 2, un nombre creixent de blocs de la graella necessiten dos impactes de la pilota per destruir-se del tot, en lloc d'un. El nivell 1 no en té cap; el nivell 2 en té 3; cada nivell següent n'afegeix 3 més (nivell 3: 6, nivell 4: 9, nivell 5: 12). Es poden triar de qualsevol color de fila; es distingeixen visualment amb un contorn (stroke) blanc gruixut dibuixat a sobre del sprite del bloc mentre els queda més d'un impacte. En rebre el primer impacte, la pilota rebota igual que amb qualsevol bloc, **no** se sumen punts ni desapareix, però perd el contorn (queda com un bloc normal de cara al segon impacte). En rebre el segon impacte, es destrueix igual que un bloc normal (explosió, +10 punts, desapareix).

**Fora de l'abast (specs futures):**

- Control de volum granular (només hi ha mute/no mute, sense control lliscant de volum).
- Sons per als overlays de victòria, derrota o "nivell superat" (només s'usen els dos sons existents: rebot i trencament de bloc).
- Augment de dificultat entre nivells més enllà dels blocs resistents (velocitat de la pilota, etc.) — només varia el patró de colors i el nombre de blocs resistents.
- Puntuació diferenciada per als blocs resistents (donen els mateixos 10 punts que qualsevol altre bloc).
- Persistència del nivell, puntuació o preferència de silenci entre sessions (recàrrega de pàgina).
- Selecció manual de nivell o pantalla de selecció de nivell.

## Model de dades

Amplia el model de SPEC 01/02 amb:

- `muted`: booleà — indica si el so està silenciat. Inicialitzat a `false` en carregar la pàgina. **No** es reinicia dins `createInitialState()` (sobreviu als reinicis de partida).
- `currentLevel`: número — nivell actual (1 a `TOTAL_LEVELS`). Es reinicialitza a `1` dins `createInitialState()`.
- `TOTAL_LEVELS`: constant = `5`.
- `ALL_BLOCK_COLORS`: constant, array amb els 7 colors disponibles (`['gray', 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green']`), usada per generar el color de cada fila de forma aleatòria.
- `gameState`: amplia els valors existents (`'playing'`, `'won'`, `'lost'`) amb un nou valor `'levelComplete'` — estat intermedi en superar un nivell que no és l'últim.
- Cada element de `blocks` amplia la seva estructura (`{ x, y, width, height, color, alive }` de SPEC 01) amb un nou camp `hitsRemaining`: número, `1` per a un bloc normal i `2` per a un bloc resistent en generar-se el nivell. Es descompta en cada impacte; el bloc només passa a `alive: false` (i genera l'explosió) quan `hitsRemaining` arriba a `0`.
- `RESISTANT_BLOCKS_PER_LEVEL_STEP`: constant = `3` — increment de blocs resistents per nivell (nivell N té `3 × (N - 1)` blocs resistents, per tant 0 al nivell 1).

No calen noves estructures per als sons: es reutilitzen instàncies d'`Audio` clonades (`.cloneNode()`) a partir de dos elements base (un per `ball-bounce.mp3`, un per `break-sound.mp3`), per permetre reproduccions simultànies.

## Pla d'implementació

1. Crear els elements `Audio` base per a `assets/sounds/ball-bounce.mp3` i `assets/sounds/break-sound.mp3`, i la funció `playSound(baseAudio)` que, si `muted` és `false`, en clona una instància (`cloneNode()`) i la reprodueix (`.play()`). El sistema continua funcional i visualment idèntic (encara no se sent res).
2. Cridar `playSound()` amb el so de rebot (`ball-bounce.mp3`) dins `updateBall()` en cada rebot contra les parets laterals i la paret superior, i dins `checkPaddleCollision()` en cada rebot contra la pala. El sistema ha de reproduir el so de rebot en aquests tres casos.
3. Cridar `playSound()` amb el so de trencament (`break-sound.mp3`) dins `checkBlockCollisions()` en destruir un bloc (sense reproduir també el so de rebot en aquest cas). El sistema ha de reproduir el so de trencament en destruir un bloc, i diversos blocs trencats seguits han de sonar de forma solapada.
4. Afegir la variable `muted` (inicialitzada a `false`) i, dins `setupInput()`, gestionar la tecla `m`/`M` al `keydown` per alternar-ne el valor. El sistema ha de deixar de reproduir sons quan `muted` és `true`, independentment de l'estat de la partida.
5. Afegir les constants `TOTAL_LEVELS` i `ALL_BLOCK_COLORS`, i la variable `currentLevel`. Substituir la generació fixa de blocs de `createInitialState()` per una nova funció `generateBlocksForLevel()` que crea la mateixa graella 5x8 però assignant a cada fila un color triat a l'atzar d'`ALL_BLOCK_COLORS`, i inicialitzant `hitsRemaining: 1` a tots els blocs. Inicialitzar `currentLevel = 1` dins `createInitialState()`. El sistema ha de mostrar una graella amb colors per fila (possiblement diferents als d'ara) en carregar o reiniciar la partida.
6. A `updateBall()`, en el punt on ara es posa `gameState = 'won'` en destruir tots els blocs, distingir dos casos: si `currentLevel < TOTAL_LEVELS`, passar a `gameState = 'levelComplete'`; si `currentLevel === TOTAL_LEVELS`, mantenir `gameState = 'won'`. El sistema ha de mostrar l'estat correcte segons si queden nivells o no.
7. Crear la funció `advanceToNextLevel()` que incrementa `currentLevel`, regenera `blocks` amb `generateBlocksForLevel()` (afegint la marca de resistent, vegeu pas 9), buida `explosions`, crida `resetPaddleAndBall()` i torna `gameState` a `'playing'`, sense tocar `score` ni `lives`. Cridar-la des de `setupInput()` quan es premi Espai/Enter i `gameState === 'levelComplete'`. El sistema ha de permetre continuar al nivell següent conservant puntuació i vides.
8. Actualitzar `drawOverlay()` perquè, en `gameState === 'levelComplete'`, mostri "Nivell X superat!" (amb X = `currentLevel`) i el text per continuar; i, en `gameState === 'won'`, mostri "Has guanyat el joc!" en lloc de l'antic "Has guanyat!". El sistema ha de mostrar el missatge adequat a cada estat.
9. Afegir la constant `RESISTANT_BLOCKS_PER_LEVEL_STEP = 3` i, dins `generateBlocksForLevel()`, després de generar la graella, calcular `3 × (currentLevel - 1)` blocs a convertir en resistents triant posicions a l'atzar entre tots els blocs del nivell i posant-hi `hitsRemaining: 2` (sense tocar el seu `color`). El sistema ha de generar 0 blocs resistents al nivell 1, 3 al nivell 2, 6 al nivell 3, etc.
10. Modificar `drawBlocks()` perquè, per a cada bloc viu amb `hitsRemaining > 1`, dibuixi després del sprite un contorn (`ctx.strokeRect`) blanc gruixut al voltant del bloc. El sistema ha de mostrar els blocs resistents visualment diferenciats.
11. Modificar `checkBlockCollisions()`: en cada impacte, decrementar `hitsRemaining` en lloc de posar `alive = false` directament. Si `hitsRemaining` arriba a `0`, aplicar exactament el comportament actual (`alive = false`, `+10` punts, afegir explosió, reproduir `break-sound.mp3`). Si `hitsRemaining` queda per sobre de `0` (impacte parcial d'un bloc resistent), no sumar punts, no marcar-lo com a no viu, no generar explosió, i reproduir `ball-bounce.mp3` en lloc de `break-sound.mp3`; la pilota continua rebotant igual en ambdós casos. El sistema ha de deixar un bloc resistent com a bloc normal (sense contorn) després del primer impacte, i destruir-lo del tot (amb explosió i punts) després del segon.
12. Afegir a la interfície (a prop de `drawScore()`) el text del nivell actual, p. ex. "Nivell 2/5". El sistema ha de mostrar sempre el nivell en curs durant la partida.

## Criteris d'acceptació

- [ ] En rebotar la pilota contra una paret lateral, la paret superior o la pala, se sent el so `ball-bounce.mp3`.
- [ ] En destruir un bloc, se sent el so `break-sound.mp3`, i en cap cas el so de rebot per aquesta mateixa col·lisió.
- [ ] En destruir diversos blocs en un interval molt curt, els sons de trencament es poden sentir solapats (no es tallen entre ells).
- [ ] Prement la tecla M s'activa/desactiva el silenci; amb el silenci actiu no se sent cap so nou (rebot ni trencament).
- [ ] El silenci activat es manté encara que es reiniciï la partida (Espai/Enter des de `'won'` o `'lost'`).
- [ ] En carregar la pàgina, el nivell 1 mostra una graella 5x8 amb un color per fila triat a l'atzar entre els 7 colors disponibles.
- [ ] En destruir tots els blocs d'un nivell que no és el 5è, apareix l'overlay "Nivell X superat!" i la pilota i la pala deixen de moure's.
- [ ] Prement Espai o Enter des de l'estat "Nivell X superat!" es carrega el nivell següent amb una nova graella, pala i pilota reposicionades al centre, i la puntuació i les vides es mantenen igual que abans.
- [ ] En destruir tots els blocs del 5è nivell, apareix l'overlay "Has guanyat el joc!" i la pilota deixa de moure's.
- [ ] El HUD mostra en tot moment el nivell actual (p. ex. "Nivell 3/5").
- [ ] Reiniciar la partida (Espai/Enter des de `'won'` o `'lost'`) torna al nivell 1 amb una graella nova (sense blocs resistents), puntuació a 0 i vides a 3.
- [ ] El nivell 1 no té cap bloc resistent; el nivell 2 en té 3, el nivell 3 en té 6, el nivell 4 en té 9 i el nivell 5 en té 12.
- [ ] Els blocs resistents es distingeixen visualment dels normals (contorn blanc) mentre els queda més d'un impacte.
- [ ] En impactar un bloc resistent per primera vegada, la pilota rebota, sona `ball-bounce.mp3`, el bloc no desapareix ni suma punts, i perd el contorn distintiu.
- [ ] En impactar el mateix bloc (ja sense contorn) una segona vegada, es destrueix igual que un bloc normal: explosió, so `break-sound.mp3` i +10 punts.
- [ ] No hi ha control de volum granular, sons addicionals per victòria/derrota/nivell superat, augment de dificultat més enllà dels blocs resistents, ni puntuació diferenciada per als blocs resistents en aquesta spec.

## Decisions preses i descartades

- **Spec combinada malgrat tocar dues àrees diferents (so i nivells):** l'usuari ha triat explícitament no separar-ho en dues specs, tot i la recomanació inicial de fer-ho. Es documenta aquí perquè quedi constància de la decisió conscient.
- **Sons simultanis via `cloneNode()`:** en lloc de reutilitzar un únic `Audio` per so (que tallaria la reproducció anterior), es clona l'element base a cada reproducció, permetent que sonin diverses instàncies alhora quan es trenquen blocs seguits.
- **Silenci (mute) no es reinicia amb la partida:** és una preferència del jugador durant la sessió, no un valor de l'estat de joc, per la qual cosa sobreviu als reinicis (Espai/Enter) però no es persisteix entre recàrregues de pàgina (sense `localStorage`, seguint la convenció de no persistència d'aquest projecte).
- **Nivells "procedurals" només en el color de la graella:** es manté la mateixa disposició 5x8 i la mateixa velocitat de pilota; només canvia quin color té cada fila, generat a l'atzar en carregar cada nivell. Es descarta variar dificultat (velocitat, blocs resistents) per mantenir l'abast centrat en so i progressió de nivells.
- **5 nivells fixos (`TOTAL_LEVELS`):** en lloc de nivells infinits, es fixa un final clar (victòria del joc) per mantenir un objectiu tancat i verificable.
- **Puntuació i vides acumulades entre nivells:** coherent amb el comportament ja existent de SPEC 01 en perdre una vida (es manté l'estat en curs); només es reinicien en tornar a jugar des de zero (`'won'`/`'lost'`).
- **Blocs resistents amb `hitsRemaining` en lloc d'un booleà:** es descarta un simple flag `resistant: true/false` a favor d'un comptador (`hitsRemaining`), perquè encaixa de forma natural amb la lògica de destrucció existent (`alive = false` quan arriba a 0) sense necessitat d'un camp addicional per saber si ja ha rebut l'impacte parcial.
- **Contorn (stroke) com a marca visual dels blocs resistents:** es descarta afegir sprites nous (no existeixen a l'spritesheet actual) i es descarta l'opció d'opacitat reduïda, perquè un contorn blanc gruixut és més clar i llegible sobre qualsevol color de bloc.
- **So de rebot (no de trencament) en l'impacte parcial d'un bloc resistent:** com que el bloc no es destrueix en el primer impacte, es reprodueix el mateix so que qualsevol altre rebot (`ball-bounce.mp3`), reservant `break-sound.mp3` exclusivament per al moment en què un bloc desapareix del tot.
- **Selecció aleatòria dels blocs resistents, independent del color:** es descarta lligar la resistència a un color de fila concret, per mantenir la variació de colors (pas de nivells) i la resistència com dues dimensions independents.

## Riscos identificats

- **Repetició de patrons aleatoris:** en generar el color de cada fila a l'atzar sense control de distintivitat, dos nivells (o dues files del mateix nivell) podrien acabar amb el mateix color per pura coincidència; s'accepta com a comportament vàlid perquè no afecta la jugabilitat.
- **Acumulació d'elements `Audio` clonats:** reproduir molts sons solapats en poc temps (moltes col·lisions de bloc seguides) crea múltiples instàncies `Audio`; com que cada element es descarta sol quan acaba de sonar (sense referència persistent), no hauria de suposar una fuita de memòria rellevant en partides normals.
- **`break` a `checkBlockCollisions()`:** el bucle actual talla en el primer bloc amb què col·lideix la pilota (`break` després de gestionar-lo); amb blocs resistents cal assegurar que aquest tall es manté igual (un sol bloc gestionat per frame), ja que ja és el comportament existent i no s'ha de duplicar la lògica de rebot per al mateix impacte.
