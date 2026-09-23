# 05 - Pausa del joc i reducció de la velocitat de la pilota

**Estat:** Implemented
**Depèn de:** SPEC 01, SPEC 03
**Data:** 2026-09-23

**Objectiu:** Reduir la velocitat inicial de la pilota i permetre posar el joc en pausa amb les tecles P o Escape, mostrant un overlay "PAUSA" i reprenent amb Espai o Enter.

## Abast

**Dins de l'abast:**

- Els valors de `BASE_BALL_SPEED_X` i `BASE_BALL_SPEED_Y` passen de `4` / `-4` a `3.2` / `-3.2`. `LEVEL_SPEED_INCREASE` (`1.1`) i tota la resta de la progressió de velocitat entre nivells (SPEC 03) es mantenen exactament igual.
- Quan `gameState === 'playing'` i el jugador prem `P` o `Escape`, el joc entra en un nou estat `gameState = 'paused'`: el bucle de joc deixa d'actualitzar física (pilotes, paddle, blocs, explosions, stars, temporitzadors), però continua renderitzant el frame congelat cada tick.
- Mentre `gameState === 'paused'`, es dibuixa per sobre del canvas una capa semitransparent fosca que cobreix tot el `CANVAS_WIDTH` × `CANVAS_HEIGHT`, amb el text "PAUSA" centrat i, a sota, una indicació per reprendre (p. ex. "Prem Espai o Enter per continuar").
- Mentre està en pausa, el moviment de la pala (teclat i ratolí) no té cap efecte: els listeners d'input de moviment es continuen rebent però `update()` no els aplica perquè la física està congelada.
- Prement `Espai` o `Enter` mentre `gameState === 'paused'`, es torna a `gameState = 'playing'` i el joc continua exactament des del punt on estava (mateixes posicions, velocitats i cronometratge; no es reinicia res).
- Prement `P` o `Escape` mentre el joc està en pausa, no té cap efecte (no és un toggle; només `Espai`/`Enter` reprenen).
- Prement `P` o `Escape` en qualsevol altre `gameState` (`levelComplete`, `won`, `lost`), no té cap efecte.
- El so (efectes de rebot/trencament) no sona mentre està en pausa, ja que cap col·lisió es processa en congelar la física.

**Fora de l'abast (specs futures):**

- Pausa automàtica en perdre el focus de la finestra/pestanya (`visibilitychange`, `blur`).
- Cronòmetre o comptador de temps en pausa visible al HUD.
- So o música específica en entrar/sortir de pausa.
- Botó de pausa clicable amb el ratolí (només tecles P/Escape/Espai/Enter).
- Persistència de l'estat de pausa entre recàrregues de pàgina.

## Model de dades

No s'introdueix cap estructura de dades nova. S'amplia el conjunt de valors possibles de la variable global `gameState` (ja existent, SPEC 01) amb un nou valor: `'paused'`, afegit als ja existents (`'playing'`, `'levelComplete'`, `'won'`, `'lost'`).

## Pla d'implementació

1. Canviar les constants `BASE_BALL_SPEED_X` de `4` a `3.2` i `BASE_BALL_SPEED_Y` de `-4` a `-3.2` (js/game.js, línies 24-25). Verificar visualment que la pilota surt més lenta a l'inici de cada partida i que la progressió entre nivells (`ballSpeedMultiplier *= LEVEL_SPEED_INCREASE`) segueix aplicant-se igual.
2. Al gestor de `keydown` existent, afegir un cas per `e.key === 'p'`/`'P'` i `e.key === 'Escape'`: si `gameState === 'playing'`, canviar a `gameState = 'paused'`. Afegir un cas per `e.key === ' '`/`'Enter'`: si `gameState === 'paused'`, canviar a `gameState = 'playing'`. El sistema ha de permetre pausar i reprendre sense afectar la resta de dreceres de teclat existents (reinici amb Espai/Enter als altres estats).
3. A la funció principal d'actualització (`update()` o equivalent), afegir una guarda a l'inici perquè, si `gameState !== 'playing'`, no s'executi cap lògica de física (ja existeix una guarda similar per als altres estats no-`'playing'`; `'paused'` s'hi ha d'incloure de la mateixa manera). El sistema ha de deixar de moure pilotes, pala, estrelles i explosions mentre està en pausa.
4. Al bucle de renderitzat (`gameLoop()` o equivalent), després de dibuixar l'estat actual del joc, afegir: si `gameState === 'paused'`, dibuixar un rectangle semitransparent fosc (p. ex. `rgba(0,0,0,0.6)`) sobre tot el canvas i el text "PAUSA" centrat amb una línia addicional indicant com reprendre. El sistema ha de mostrar l'overlay immediatament en pausar i deixar de mostrar-lo en reprendre.

## Criteris d'acceptació

- [x] En començar una partida nova, la pilota es mou visiblement més lenta que abans del canvi (velocitat base 3.2 en lloc de 4).
- [x] La progressió de velocitat entre nivells (multiplicador `1.1` per nivell) continua funcionant igual que a SPEC 03.
- [x] Prement `P` o `Escape` durant la partida (`gameState === 'playing'`), el joc es congela a l'instant (pilota, pala, blocs, explosions, estrelles deixen de moure's) i apareix l'overlay "PAUSA".
- [x] Mentre està en pausa, moure el ratolí o prémer les tecles de moviment de la pala no la desplaça.
- [x] Prement `Espai` o `Enter` mentre està en pausa, el joc reprèn exactament des del punt on estava (mateixa posició i velocitat de la pilota, mateixos blocs restants, mateixa puntuació i vides).
- [x] Prement `P` o `Escape` mentre ja està en pausa, no passa res (no es reprèn ni es tanca l'overlay).
- [x] Prement `P` o `Escape` a les pantalles de `levelComplete`, `won` o `lost`, no passa res.
- [x] Sense entrar mai en pausa, tot el comportament del joc (rebots, blocs, power-ups, nivells, sons) es manté exactament igual que a SPEC 01-04, només amb la pilota més lenta.

## Decisions preses i descartades

- **Reduir la velocitat base a 3.2 (factor ~0.8) mantenint intacte l'increment per nivell (`1.1`):** decisió explícita de l'usuari; només es toca la velocitat inicial, no la corba de dificultat entre nivells.
- **Overlay semitransparent amb text "PAUSA" en lloc de només congelar sense indicació visual:** decisió explícita de l'usuari, per deixar clar en tot moment que el joc no ha penjat sinó que està en pausa.
- **Reprendre només amb Espai/Enter, no amb la mateixa tecla P/Escape (no és un toggle):** decisió explícita de l'usuari; segueix el mateix patró ja usat al joc per a "continuar" (reinici de partida i pas de nivell ja usen Espai/Enter).
- **La pausa només està disponible durant `gameState === 'playing'`:** recomanació acceptada per l'usuari; als altres estats (`levelComplete`, `won`, `lost`) ja hi ha les seves pròpies dreceres amb Espai/Enter i no té sentit superposar-hi una pausa.
- **No es persisteix cap cronòmetre de pausa ni es pausa automàticament en perdre el focus:** fora de l'abast explícit per mantenir el canvi mínim i centrat en el que s'ha demanat.
