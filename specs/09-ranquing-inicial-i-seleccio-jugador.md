# 09 - Rànquing a la pantalla inicial i selecció de jugador

**Estat:** Implemented
**Depèn de:** SPEC 08
**Data:** 2026-10-01

**Objectiu:** Mostrar la taula de puntuacions a la pantalla inicial i permetre triar un jugador del rànquing (amb fletxes, Enter o ratolí) en comptes d'haver d'escriure sempre el nom.

## Abast

**Dins de l'abast:**

- Nou estat `gameState = 'selectPlayer'`. Passa a ser l'estat inicial en carregar la pàgina **si el rànquing carregat de `localStorage` té almenys una entrada**. Si el rànquing és buit, l'estat inicial continua sent `'enterName'` (SPEC 08), sense passar per la selecció.
- Pantalla `'selectPlayer'` dibuixada al canvas amb el títol del joc i dues zones:
  - **Esquerra:** la taula Top 10 del rànquing (posició, nom, puntuació, nivell), només lectura, amb el mateix format de `drawRankingScreen()` però sense la línia "Puntuació" ni cap fila ressaltada com a partida actual.
  - **Dreta:** la llista "Jugadors", seleccionable, amb els **noms únics** presents al rànquing actual (primera aparició en l'ordre del rànquing, és a dir, ordenats per la seva millor puntuació) i, com a última fila, l'opció **"Nou jugador"**.
- La comparació de noms per deduplicar és exacta (sensible a majúscules i accents): `JORDI` i `Jordi` són jugadors diferents.
- La fila seleccionada de la llista es ressalta (color diferent). En entrar a l'estat, la selecció inicial és la primera fila (el jugador amb la millor puntuació).
- Controls a `'selectPlayer'`:
  - `ArrowUp` / `ArrowDown`: mou la selecció (cíclic: des de la primera fila amunt va a l'última, i a l'inrevés).
  - `Enter`: confirma la fila seleccionada.
  - Moviment del ratolí sobre una fila de la llista: la selecciona (hover).
  - Clic del ratolí sobre una fila de la llista: la selecciona i la confirma.
  - Qualsevol altra tecla s'ignora, incloses les dreceres `M`, `P`, `Escape` i `Espai`.
- Confirmar un jugador existent: `playerName` = nom triat, `nameInput` queda buit i `gameState = 'playing'` (la partida comença en aquell moment).
- Confirmar "Nou jugador": `gameState = 'enterName'` amb `nameInput = ''`; a partir d'aquí el flux és exactament el de SPEC 08 (escriure, `Backspace`, `Enter`, `ANÒNIM` si és buit).
- Excepció a SPEC 08 a l'estat `'enterName'`: la tecla `Escape` torna a `'selectPlayer'` (descartant `nameInput`) **només si el rànquing no és buit**; si és buit, `Escape` s'ignora com fins ara. A la pantalla de nom es mostra una línia d'ajuda addicional "Esc per tornar" només quan l'`Escape` està actiu.
- Si el jugador escriu un nom nou que coincideix exactament amb un nom ja present al rànquing, es tracta com a aquell jugador (no cal cap avís ni validació; el rànquing ja admet noms repetits).
- Reiniciar després de `'won'`/`'lost'` no canvia: es reutilitza `playerName` i es torna directament a `'playing'` (SPEC 08).

**Fora de l'abast (specs futures):**

- Canviar de jugador sense recarregar la pàgina (tornar a la selecció des de la partida o des de la pantalla final).
- Accedir a la pantalla de rànquing des del joc (pausa) o des de la pantalla final com a pantalla independent.
- Llista de jugadors persistent independent del Top 10 (un jugador que surt del Top 10 deixa de ser triable; cal escriure el nom de nou com a "Nou jugador").
- Esborrar jugadors o el rànquing, o editar-ne noms.
- Selecció de jugador amb tecla tàctil o teclat virtual.
- Paginació o desplaçament de la llista (màxim 10 noms únics + "Nou jugador" = 11 files).
- Rànquing compartit entre dispositius, filtres o rànquing per nivell.
- Sons o animacions nous a la pantalla de selecció.

## Model de dades

Sense canvis de format a `localStorage` (clau `arkanoid:ranking:v1` i estructura d'entrada de SPEC 08 intactes).

Amplia l'estat global de SPEC 08:

```js
// Valors possibles de gameState: 'selectPlayer' (nou), 'enterName',
// 'playing', 'paused', 'levelComplete', 'won', 'lost'

let playerOptions = [];    // noms únics del rànquing; es recalcula en entrar a 'selectPlayer'
let selectedPlayerIndex = 0; // 0..playerOptions.length; el valor playerOptions.length = "Nou jugador"
```

Constants noves (junt a les constants de `js/game.js`):

- `PLAYER_LIST_ROW_HEIGHT = 30`: alçada de cada fila de la llista (també s'usa per al càlcul del clic).
- `NEW_PLAYER_LABEL = 'Nou jugador'`.

Funcions noves (noms orientatius):

- `getPlayerOptions()`: retorna els noms únics de `ranking` en ordre de primera aparició.
- `getPlayerListRowAt(x, y)`: retorna l'índex de la fila de la llista sota les coordenades del canvas, o `-1` si no n'hi ha cap.
- `confirmPlayerSelection()`: aplica la confirmació descrita a l'abast.

## Pla d'implementació

1. Afegir `playerOptions`, `selectedPlayerIndex`, `PLAYER_LIST_ROW_HEIGHT` i `NEW_PLAYER_LABEL` a `js/game.js`, i implementar `getPlayerOptions()`. Sense canvis de comportament encara.
2. Refactoritzar `drawRankingScreen()` de manera que la dibuixa de la taula (capçalera + files) quedi en una funció reutilitzable (p. ex. `drawRankingTable(left, top)`) cridable des de la pantalla final i des de la nova pantalla. La pantalla `'won'`/`'lost'` ha de quedar visualment idèntica a l'actual.
3. Implementar `drawSelectPlayerScreen()`: títol, taula Top 10 a l'esquerra, llista "Jugadors" a la dreta amb la fila `selectedPlayerIndex` ressaltada i l'opció "Nou jugador" al final, i una línia d'ajuda ("↑↓ per triar · Enter per jugar"). Cridar-la des de `drawOverlay()` per a `gameState === 'selectPlayer'` (overlay fosc, com `'enterName'`). Verificar que tot cap als 800x600 px amb 10 noms + "Nou jugador".
4. A `initGame()`, després de `loadRanking()` i `createInitialState()`, posar `gameState` a `'selectPlayer'` (recalculant `playerOptions` i `selectedPlayerIndex = 0`) si `ranking.length > 0`, o a `'enterName'` altrament. El sistema ha de mostrar la selecció en obrir el joc amb rànquing existent, amb el joc congelat al fons.
5. Al gestor de `keydown` de `setupInput()`, afegir una branca prioritària per a `'selectPlayer'` (abans de registrar `keysPressed` i abans de `M`): processa `ArrowUp`, `ArrowDown` (amb `preventDefault()` per evitar scroll) i `Enter` (`confirmPlayerSelection()`), i ignora la resta. Verificar que `M`, `P`, `Espai` i `Escape` no tenen cap efecte en aquest estat.
6. Implementar `confirmPlayerSelection()`: si `selectedPlayerIndex < playerOptions.length`, assigna `playerName`, `nameInput = ''` i `gameState = 'playing'`; si és l'última fila, `nameInput = ''` i `gameState = 'enterName'`.
7. Afegir els gestors de ratolí al canvas: ampliar `mousemove` (o afegir-ne un de nou) perquè, a `'selectPlayer'`, actualitzi `selectedPlayerIndex` amb `getPlayerListRowAt()`; i afegir un `click` que, a `'selectPlayer'` i sobre una fila vàlida, selecciona i crida `confirmPlayerSelection()`. Les coordenades es converteixen amb `getBoundingClientRect()` (com el `mousemove` actual). El moviment del ratolí a `'selectPlayer'` no ha d'afectar la pala.
8. A `handleNameInput()`, afegir la branca d'`Escape`: si `ranking.length > 0`, recalcular `playerOptions`, posar `selectedPlayerIndex = 0`, `nameInput = ''` i `gameState = 'selectPlayer'`; altrament, ignorar. Afegir a `drawNameScreen()` la línia "Esc per tornar" només quan `ranking.length > 0`.
9. Revisió final: recarregar amb rànquing buit (ha d'anar a `'enterName'`), amb rànquing ple (ha d'anar a `'selectPlayer'`), amb `localStorage` bloquejat (rànquing buit → `'enterName'`, sense errors) i comprovar que la partida i la pantalla final es comporten com a SPEC 08.

## Criteris d'acceptació

- [ ] En obrir `index.html` amb almenys una entrada al rànquing, es veu la pantalla de selecció amb el Top 10 a l'esquerra i la llista "Jugadors" a la dreta, i la pilota no es mou.
- [ ] En obrir `index.html` amb el rànquing buit (o amb `localStorage` bloquejat), es veu directament la pantalla de nom de SPEC 08, sense errors a la consola.
- [ ] La llista "Jugadors" conté cada nom del rànquing una sola vegada, en ordre de millor puntuació, més l'opció "Nou jugador" al final.
- [ ] `ArrowUp`/`ArrowDown` mouen la selecció de manera cíclica i la fila seleccionada es veu ressaltada; la pàgina no fa scroll.
- [ ] `Enter` sobre un jugador existent comença la partida amb aquell `playerName`; en acabar, l'entrada nova es desa amb aquest nom.
- [ ] Passar el ratolí sobre una fila la selecciona, i fer-hi clic la confirma (comença la partida o obre l'entrada de nom si és "Nou jugador").
- [ ] Moure el ratolí a la pantalla de selecció no mou la pala, i fer clic fora de les files no fa res.
- [ ] `Enter` sobre "Nou jugador" mostra la pantalla de nom de SPEC 08 amb el camp buit, i el flux d'escriptura, `Backspace`, `Enter` i `ANÒNIM` funciona igual que a SPEC 08.
- [ ] A `'enterName'`, amb rànquing no buit, `Escape` torna a la selecció sense desar res; amb rànquing buit, `Escape` s'ignora; la línia "Esc per tornar" només es veu en el primer cas.
- [ ] A `'selectPlayer'`, `M`, `P`, `Escape` i `Espai` no silencien, pausen ni inicien res.
- [ ] Amb 10 noms únics + "Nou jugador" tot cap dins dels 800x600 px del canvas sense solapar-se amb la taula.
- [ ] La pantalla final de `'won'`/`'lost'` es veu i es comporta igual que a SPEC 08 (taula, ressaltat de la fila actual, reinici amb Espai/Enter reutilitzant el nom).
- [ ] El comportament de la partida (rebots, blocs, power-ups, nivells, pausa, sons) és idèntic al de SPEC 01-08 un cop començada.

## Decisions preses i descartades

- **Sí: una sola pantalla amb el Top 10 i la llista de jugadors (estat `'selectPlayer'`).** Decisió de l'usuari; evita un menú addicional i un estat `'ranking'` independent. **No:** menú Jugar/Rànquing, ni pantalla dividida amb el camp de nom sempre visible.
- **Sí: control amb fletxes + Enter i ratolí.** Decisió de l'usuari; coherent amb el joc, que ja admet teclat i ratolí per a la pala. **No:** només teclat o només ratolí.
- **Sí: jugadors triables = noms únics del Top 10 actual.** Decisió de l'usuari; no afegeix cap clau nova a `localStorage` ni migra dades. **Contrapartida acceptada:** un jugador que surt del Top 10 deixa de ser triable. **No:** llista de jugadors persistent apart (més robusta però amb més dades i una spec pròpia).
- **Sí: "Nou jugador" com a última fila de la llista.** Decisió de l'usuari; manté separades les dues interaccions (navegar vs. escriure) i evita conflictes amb dreceres. **No:** escriure directament sobre la llista.
- **Sí: rànquing buit → directament `'enterName'`.** No té sentit mostrar una llista sense jugadors; el flux del primer ús queda igual que a SPEC 08.
- **Sí: dues zones (taula a l'esquerra, llista a la dreta) en lloc de fer seleccionables les files de la taula.** La taula pot repetir noms (una fila per partida) i seleccionar-ne una per partida seria confús; la llista deduplicada fa clara la intenció de "triar un jugador". Aquesta distribució es verificarà visualment; si no cap, es pot reduir la tipografia sense canviar l'abast.
- **Sí: comparació exacta de noms.** Simple i predictible; `JORDI` i `Jordi` seran dos jugadors, igual que ja ho són al rànquing actual.
- **Sí: `Escape` a `'enterName'` torna a la selecció (només amb rànquing no buit).** Evita que triar "Nou jugador" per error obligui a escriure un nom. Modifica explícitament la regla de SPEC 08 que ignorava `Escape` en aquell estat.
- **Sí: selecció inicial = primer jugador del rànquing.** Permet començar una partida amb un sol `Enter` i el jugador amb millor puntuació és el candidat més probable.
- **No: canvi de jugador durant la sessió.** Mantingut fora de l'abast com a SPEC 08; per canviar de jugador cal recarregar la pàgina.
- **Sí: no canviar el format de `localStorage`.** Permet que aquesta spec no necessiti migració i conservi les dades existents de SPEC 08.

## Riscos identificats

| Risc                                                                     | Mitigació                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| El clic/hover no coincideix amb la fila si el canvas està escalat per CSS | Convertir les coordenades amb `getBoundingClientRect()` i la relació `canvas.width / rect.width`; verificar amb la finestra redimensionada. |
| Taula i llista no caben en 800x600 amb 10 noms + "Nou jugador"           | Càlcul de posicions amb constants; verificar amb 10 jugadors diferents i amb `WWWWWWWWWW`.                          |
| El `mousemove` existent mou la pala mentre es navega la llista            | Condicionar l'actualització de `mouseX` al fet que `gameState` no sigui `'selectPlayer'`.                           |
| Les fletxes fan scroll de la pàgina                                      | `e.preventDefault()` a la branca de `'selectPlayer'`.                                                                |
| Rànquing amb dades invàlides                                              | Ja cobert per `loadRanking()` de SPEC 08 (es descarta i s'usa `[]`, per tant `'enterName'`).                        |
| El jugador triat ja no apareix al Top 10 en la partida següent            | Comportament acceptat i documentat; es pot tornar a escriure el nom com a "Nou jugador".                            |

## El que **no** hi ha en aquesta spec

- Canvi de jugador a mig joc o des de la pantalla final.
- Pantalla de rànquing accessible des del joc.
- Llista de jugadors persistent fora del Top 10.
- Esborrat o edició de jugadors i rànquing.
- Rànquing en línia, filtres o rànquing per nivell.
- Suport tàctil o teclat virtual.
- Sons o animacions nous.
