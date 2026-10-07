# 11 - Selector de jocs a la pantalla inicial

**Estat:** implemented
**Depèn de:** SPEC 05, SPEC 08, SPEC 09
**Data:** 2026-10-07

**Objectiu:** Afegir una pantalla inicial de selecció de joc (Arkanoid o un joc «Properament» en una pàgina separada), accessible també des de la pausa i des de la pantalla final mitjançant un botó dibuixat al canvas.

## Abast

**Dins de l'abast:**

- Nou estat `gameState = 'selectGame'`, que passa a ser l'**estat inicial** en carregar `index.html`, abans de `'selectPlayer'`/`'enterName'`. El joc queda congelat al fons amb l'overlay fosc (com `'selectPlayer'`).
- Pantalla `'selectGame'` dibuixada al canvas: títol («Tria un joc»), llista de jocs i línia d'ajuda («↑↓ per triar · Enter per jugar»). Jocs de la llista, en aquest ordre:
  1. **Arkanoid** — el joc actual.
  2. **Properament** — joc placeholder en una pàgina separada.
- La fila seleccionada es ressalta. En entrar a l'estat, la selecció inicial és sempre la primera fila (Arkanoid).
- Controls a `'selectGame'` (mateix model que la llista de jugadors de SPEC 09):
  - `ArrowUp` / `ArrowDown`: mou la selecció de manera cíclica (amb `preventDefault()`).
  - `Enter`: confirma la fila seleccionada.
  - Moviment del ratolí sobre una fila: la selecciona (hover). No mou la pala.
  - Clic sobre una fila: la selecciona i la confirma. Clic fora de les files no fa res.
  - Qualsevol altra tecla s'ignora, incloses `M`, `P`, `Escape` i `Espai`.
- Confirmar **Arkanoid**: crida `promptForPlayer()` (va a `'selectPlayer'` si hi ha rànquing, o a `'enterName'` si és buit). A partir d'aquí el flux és el de SPEC 08/09.
- Confirmar **Properament**: navega a `games/properament/index.html` (`window.location.href`).
- **Pàgina placeholder** `games/properament/index.html`: HTML estàtic independent (sense canvas ni `js/game.js`), amb el mateix fons fosc que `index.html`, el text «Properament» i un enllaç «Tornar als jocs» a `../../index.html`, que torna a mostrar el selector.
- **Botó «Jocs» dibuixat al canvas** a les pantalles `'paused'`, `'won'` i `'lost'`:
  - Rectangle amb el text «Jocs» a la cantonada superior dreta del canvas (mateixa posició als tres estats), ressaltat quan el ratolí hi passa per sobre.
  - **Només ratolí**: clic sobre el botó → torna al selector. Cap tecla l'activa.
  - Tornar al selector fa `createInitialState()` (partida nova des de zero) i `gameState = 'selectGame'` amb la selecció a Arkanoid.
  - Des de `'paused'`: la partida en curs **s'abandona i es descarta**, no es desa al rànquing.
  - Des de `'won'`/`'lost'`: el rànquing ja s'ha desat en acabar la partida; no es desa res més.
  - En tornar a triar Arkanoid es passa de nou per la selecció de jugador (`promptForPlayer()`), de manera que es pot canviar de jugador sense recarregar.
- Els controls de teclat existents a `'paused'`, `'won'` i `'lost'` (Espai/Enter per continuar o reiniciar) no canvien.

**Fora de l'abast (specs futures):**

- Implementar el joc real que substituirà «Properament» (tindrà la seva pròpia spec, que el renombrarà a la llista).
- Botó «Jocs» a `'levelComplete'`, `'quiz'`, `'selectPlayer'`, `'enterName'` o durant `'playing'`.
- Activar el botó «Jocs» amb teclat.
- Recordar entre sessions l'últim joc triat (cap clau nova a `localStorage`).
- Paràmetres a la URL per saltar el selector (p. ex. `index.html#arkanoid`).
- Rànquing compartit entre jocs o específic del placeholder.
- Confirmació («Segur que vols abandonar la partida?») abans de sortir des de la pausa.
- Sons o animacions nous al selector.

## Model de dades

Sense canvis a `localStorage` (clau `arkanoid:ranking:v1` intacta).

Amplia l'estat global de `js/game.js`:

```js
// Valors possibles de gameState: 'selectGame' (nou), 'selectPlayer', 'enterName',
// 'playing', 'paused', 'quiz', 'levelComplete', 'won', 'lost'

let selectedGameIndex = 0;       // índex dins GAMES; 0 = Arkanoid
let gamesButtonHovered = false;  // hover del botó «Jocs» a 'paused'/'won'/'lost'
```

Constants noves (junt a les constants de `js/game.js`):

```js
const GAMES = [
  { id: 'arkanoid', label: 'Arkanoid', url: null },
  { id: 'properament', label: 'Properament', url: 'games/properament/index.html' }
];
const GAME_LIST_ROW_HEIGHT = 40;
const GAME_LIST_TOP = 220;         // y de la primera fila
const GAME_LIST_WIDTH = 300;       // fila centrada horitzontalment
const GAMES_BUTTON = { x: 664, y: 16, width: 120, height: 36, label: 'Jocs' };
```

Funcions noves (noms orientatius):

- `enterSelectGame()`: `selectedGameIndex = 0` i `gameState = 'selectGame'`.
- `drawSelectGameScreen()`: dibuixa la pantalla del selector.
- `getGameListRowAt(x, y)`: índex de la fila de `GAMES` sota les coordenades del canvas, o `-1`.
- `confirmGameSelection()`: Arkanoid → `promptForPlayer()`; altrament → `window.location.href = GAMES[i].url`.
- `handleSelectGameInput(e)`: gestor de teclat de `'selectGame'`.
- `drawGamesButton()`: dibuixa el botó «Jocs» (ressaltat si `gamesButtonHovered`).
- `isOverGamesButton(x, y)`: `true` si les coordenades són dins de `GAMES_BUTTON`.
- `returnToGameSelector()`: `createInitialState()` + `enterSelectGame()`.

Fitxer nou: `games/properament/index.html`.

## Pla d'implementació

1. [x] Afegir a `js/game.js` les constants `GAMES`, `GAME_LIST_*`, `GAMES_BUTTON` i les variables `selectedGameIndex`, `gamesButtonHovered`, i les funcions `enterSelectGame()`, `getGameListRowAt()` i `isOverGamesButton()`. Sense canvis de comportament encara.
2. [x] Crear `games/properament/index.html` (UTF-8, `lang="ca"`) amb el text «Properament» i l'enllaç «Tornar als jocs» a `../../index.html`. Es pot obrir directament i l'enllaç porta a `index.html`.
3. [x] Implementar `drawSelectGameScreen()` i cridar-la des de `drawOverlay()` per a `gameState === 'selectGame'`, afegint `'selectGame'` a la condició `darkOverlay`.
4. [x] Implementar `confirmGameSelection()` i `handleSelectGameInput()`, i afegir a l'inici del `keydown` de `setupInput()` una branca prioritària per a `'selectGame'` (abans de `'selectPlayer'`, de `keysPressed` i de `M`).
5. [x] A `initGame()`, substituir la crida `promptForPlayer()` per `enterSelectGame()`. En obrir el joc es veu el selector; Enter sobre Arkanoid porta a la selecció de jugador com abans.
6. [x] Ampliar el `mousemove` del canvas: a `'selectGame'`, actualitzar `selectedGameIndex` amb `getGameListRowAt()` i no moure la pala. Ampliar el `click`: a `'selectGame'`, sobre una fila vàlida, seleccionar-la i cridar `confirmGameSelection()`.
7. [x] Implementar `drawGamesButton()` i cridar-la al final de `drawOverlay()` per als estats `'paused'`, `'won'` i `'lost'`. Verificar que no se solapa amb el títol de la pantalla final ni amb el text «PAUSA».
8. [x] Implementar `returnToGameSelector()`. Al `mousemove`, a `'paused'`/`'won'`/`'lost'`, actualitzar `gamesButtonHovered` amb `isOverGamesButton()`; al `click`, en aquests estats i sobre el botó, cridar `returnToGameSelector()`. En sortir d'aquests estats, `gamesButtonHovered = false`.
9. [x] Revisió final: carregar `index.html` (selector), triar Arkanoid amb rànquing buit i ple, triar Properament i tornar, pausar i sortir amb el botó (comprovar que el rànquing no canvia), acabar una partida i sortir amb el botó, i tornar a jugar canviant de jugador.

## Criteris d'acceptació

- [x] En obrir `index.html` es veu la pantalla «Tria un joc» amb les files «Arkanoid» i «Properament», amb Arkanoid ressaltat i la pilota aturada.
- [x] `ArrowUp`/`ArrowDown` mouen la selecció de manera cíclica i la pàgina no fa scroll.
- [x] Passar el ratolí sobre una fila la selecciona sense moure la pala; clicar-hi la confirma; clicar fora de les files no fa res.
- [x] A `'selectGame'`, `M`, `P`, `Escape` i `Espai` no silencien, pausen ni inicien res.
- [ ] Confirmar Arkanoid amb rànquing no buit mostra `'selectPlayer'`; amb rànquing buit (o `localStorage` bloquejat) mostra `'enterName'`, sense errors a la consola.
- [x] Confirmar Properament obre `games/properament/index.html`, que mostra «Properament» i un enllaç «Tornar als jocs» que torna al selector d'`index.html`.
- [x] A `'paused'`, `'won'` i `'lost'` es veu el botó «Jocs» a la cantonada superior dreta, ressaltat en passar-hi el ratolí, sense solapar-se amb cap text.
- [x] Clicar el botó «Jocs» des de la pausa porta al selector i la puntuació de la partida abandonada **no** apareix al rànquing.
- [x] Clicar el botó «Jocs» des de `'won'`/`'lost'` porta al selector i el rànquing conté només l'entrada de la partida acabada (cap duplicat).
- [x] Després de tornar al selector i triar Arkanoid, la partida comença des de zero (nivell 1, 0 punts, 3 vides, sense efectes actius) i es pot triar un jugador diferent.
- [x] Cap tecla activa el botó «Jocs»; Espai/Enter a `'paused'`, `'won'` i `'lost'` es comporten igual que abans.
- [x] El botó «Jocs» no apareix a `'playing'`, `'levelComplete'`, `'quiz'`, `'selectPlayer'` ni `'enterName'`.
- [ ] Un cop començada, la partida d'Arkanoid es comporta igual que amb les SPEC 01-10.

## Decisions preses i descartades

- **Sí: aquesta spec només fa el selector + un placeholder «Properament».** Decisió de l'usuari; el joc nou tindrà la seva pròpia spec. **No:** implementar el segon joc aquí (massa gran per a una sola spec).
- **Sí: cada joc en una pàgina HTML separada (`games/<id>/index.html`).** Decisió de l'usuari; aïlla completament `js/game.js` i evita refactoritzar-lo en mòduls. **No:** compartir canvas i bucle de joc dins `index.html`.
- **Sí: Arkanoid continua a `index.html`** (no es mou a `games/arkanoid/`). Evita canviar rutes d'`assets/` i manté el punt d'entrada actual.
- **Sí: el selector és un estat nou `'selectGame'` previ a `'selectPlayer'`/`'enterName'`.** Decisió de l'usuari. **No:** opció addicional dins de `'selectPlayer'`.
- **Sí: tornar al selector des de la pausa i des de la pantalla final.** Decisió de l'usuari. Modifica explícitament SPEC 09, que deixava fora de l'abast canviar de jugador sense recarregar: ara és possible passant pel selector.
- **Sí: botó dibuixat al canvas, només ratolí.** Decisió de l'usuari; coherent amb la UI tot-canvas i evita conflictes amb Espai/Enter, que ja reprenen o reinicien. **No:** `<button>` HTML fora del canvas, ni tecla dedicada (`J`, `Q`).
- **Sí: la partida abandonada des de la pausa es descarta.** Decisió de l'usuari; només es desen partides acabades (`'won'`/`'lost'`), com fins ara.
- **Sí: tornar a Arkanoid passa per la selecció de jugador.** Decisió de l'usuari; reutilitza `promptForPlayer()`. **No:** partida directa reutilitzant `playerName`.
- **Sí: controls del selector = fletxes + Enter + ratolí.** Decisió de l'usuari; mateix model que SPEC 09.
- **No: persistir l'últim joc triat.** Decisió de l'usuari; cap clau nova a `localStorage` i la selecció inicial és sempre Arkanoid.
- **Sí: botó «Jocs» a la cantonada superior dreta, mateixa posició als tres estats.** Simplifica el càlcul del clic (una sola constant `GAMES_BUTTON`) i no interfereix amb el text centrat de les pantalles existents.

## Decisions preses durant la implementació

- `GAME_LIST_TOP` és la y del **centre** de la primera fila (el text es dibuixa amb `textBaseline = 'middle'`); `getGameListRowAt()` hi resta mitja fila per calcular-ne els límits.
- `GAMES_BUTTON.y` passa de 16 a 44: a y=16 el botó tapava les icones de vida del HUD (`drawLives()`, y=16–32), que es veuen a través de l'overlay de pausa. A y=44 queda just a sota, i continua sense solapar-se amb el títol de la pantalla final (centrat, ~215–585 px d'ample).
- Funció auxiliar `isGamesButtonVisible()` (`'paused'`/`'won'`/`'lost'`) per no repetir la condició al `mousemove` i al `click`. Al `mousemove`, `gamesButtonHovered` es recalcula a cada moviment i queda a `false` fora d'aquests estats; el moviment del ratolí a la pausa continua actualitzant `mouseX` com abans.

## Riscos identificats

| Risc | Mitigació |
| --- | --- |
| El clic/hover no coincideix si el canvas està escalat per CSS | Reutilitzar `getCanvasCoordinates()` (ja usada a SPEC 09). |
| El `mousemove` mou la pala mentre es navega el selector | Retornar abans d'actualitzar `mouseX` a `'selectGame'`, com a `'selectPlayer'`. |
| El clic sobre el botó «Jocs» a `'paused'` es propaga com a `launchStuckBalls()` | El `click` només llança pilotes a `'playing'`; la branca del botó va abans i fa `return`. |
| `returnToGameSelector()` deixa efectes temporals actius (foc, imant, pala doble, qüestionari) | Es crida `createInitialState()`, que ja reinicia tot l'estat de la partida; verificar-ho als criteris d'acceptació. |
| El botó «Jocs» tapa el marcador o les vides del HUD a la pausa | L'overlay de pausa ja enfosqueix el HUD; verificar visualment i ajustar `GAMES_BUTTON` si cal sense canviar l'abast. |
| Obrir `index.html` amb `file://` i navegar a `games/properament/index.html` | Rutes relatives en tots dos sentits; no depèn de cap servidor. |
