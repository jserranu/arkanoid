# 15 - Jugadors compartits entre jocs

**Estat:** tancat
**Depèn de:** SPEC 09, SPEC 12, SPEC 13, SPEC 14
**Data:** 2026-11-12

**Objectiu:** Fer que la llista de jugadors de la selecció de jugador sigui comuna a tots els jocs, desada en una clau pròpia de `localStorage` (`players:v1`) independent dels rànquings.

## Abast

**Dins de l'abast:**

- **Mòdul nou `shared/players.js`** (script clàssic, objecte global `window.Players`, IIFE, sense res específic de cap joc): llista de jugadors persistent a `localStorage` amb la clau `players:v1`.
  - Cada jugador és `{ name, lastPlayed }`. La llista es manté ordenada per `lastPlayed` descendent (qui ha jugat més recentment, a qualsevol joc, primer).
  - **Sense límit** de jugadors i **sense esborrar-ne**.
  - Els noms es comparen **sense distingir majúscules** (`toLocaleLowerCase( 'ca' )`): «joan» i «Joan» són el mateix jugador.
  - `register( name )`: si ja existeix un jugador amb el mateix nom (sense distingir majúscules), n'actualitza `lastPlayed` i **retorna la grafia ja registrada**; si no, l'afegeix amb `lastPlayed = Date.now()` i retorna `name`. Desa sempre a `localStorage`.
  - **Importació al primer ús:** si la clau `players:v1` no existeix (`getItem` retorna `null`), la llista s'omple amb els noms de les entrades de tots els rànquings indicats (`importFrom`: llista de configuracions de rànquing). Per a cada nom (sense distingir majúscules) es pren l'entrada de `date` més gran: la seva grafia és la registrada i la seva `date` és el `lastPlayed`. El resultat es desa immediatament (encara que sigui buit), de manera que la importació només passa una vegada.
  - Tolerant a errors com `shared/ranking.js`: JSON invàlid o elements mal formats → es descarten; `localStorage` no disponible → la llista funciona només en memòria.
- **`shared/player-select.js`** rep un paràmetre nou `players` (instància de `Players`) i en treu la llista de jugadors en lloc de `ranking.playerNames()`. El rànquing (`ranking.drawTable`) es continua dibuixant a l'esquerra com fins ara, amb el rànquing del joc.
  - `start()`: si `players` és buit → entrada del nom; si no → llista. En obrir la llista, la selecció és el primer element (el jugador més recent).
  - A l'entrada del nom, `Escape` torna a la llista si `players` no és buit (abans: si el rànquing no era buit).
  - En confirmar un jugador (de la llista o escrit, inclòs `defaultName` `ANÒNIM`), es crida `players.register( name )` i es passa a `onPlayerChosen` **el nom que retorna** (la grafia registrada). És a dir, es registra en triar-lo, abans de començar la partida.
  - **Llista amb desplaçament:** es mostren com a màxim `LIST_VISIBLE_ROWS = 11` files (jugadors + «Nou jugador», que continua sent l'últim element). Amb ↑↓ la finestra es desplaça per mantenir visible la selecció (el cicle continua: de l'últim al primer i al revés). Indicadors `▲`/`▼` sobre/sota la llista quan hi ha files amagades per dalt/baix. La roda del ratolí desplaça la finestra una fila per pas sense canviar la selecció. El hover i el clic tenen en compte el desplaçament.
  - Nou mètode públic `handleWheel( deltaY )`: retorna `true` si l'ha consumit (pantalla de llista).
- **Jocs (`games/arkanoid/`, `games/starship/`)**:
  - `index.html` carrega també `../../shared/games.js` i `../../shared/players.js` (abans del codi del joc).
  - `js/game.js` crea `const players = Players.create( { storageKey: 'players:v1', importFrom: GAMES.map( ( game ) => game.ranking ) } )`, el carrega a `initGame()` i el passa a `PlayerSelect.create( { …, players } )`.
  - Listener `wheel` al canvas que, mentre `gameState === 'choosePlayer'`, delega a `playerSelect.handleWheel( e.deltaY )` i fa `preventDefault()` si l'ha consumit (listener amb `{ passive: false }`).
- Actualitzar `CLAUDE.md` (secció `shared/`: `players.js`, nou paràmetre `players` i `handleWheel` de `PlayerSelect`, els jocs ara carreguen `games.js`) i `README.md` (els jugadors són comuns a tots els jocs).

**Fora de l'abast (specs futures):**

- Esborrar o reanomenar jugadors.
- Recordar o preseleccionar l'últim jugador més enllà de l'ordre per `lastPlayed`; saltar-se la selecció.
- Límit del nombre de jugadors.
- Canvis a `shared/ranking.js`: `Ranking.add` continua comparant noms exactes (la grafia registrada evita duplicats nous) i `playerNames()` es manté encara que deixi de fer-se servir.
- Fusionar o netejar entrades duplicades per majúscules que ja existeixin als rànquings.
- Mostrar els jugadors a la pàgina de puntuacions (`scores/index.html` no canvia).
- Perfils de jugador (avatar, estadístiques, preferències).

## Model de dades

Nova clau a `localStorage`: **`players:v1`**.

```js
// players:v1 — ordenat per lastPlayed descendent
[
  { name: 'Joan', lastPlayed: 1794500000000 },
  { name: 'ANÒNIM', lastPlayed: 1794400000000 }
]
```

Validació d'un element: objecte amb `name` string no buit i `lastPlayed` finit. Si dos elements vàlids coincideixen sense distingir majúscules (dades manipulades), es queda el de `lastPlayed` més gran.

Interfície de `shared/players.js`:

```js
window.Players = ( () => {
  function create( { storageKey, importFrom = [] } ) {
    // importFrom: [ { storageKey, ... } ] — configuracions de rànquing (les de GAMES)
    return {
      load,                 // llegeix storageKey; si no existeix, importa de importFrom i desa
      register( name ),     // → grafia registrada; actualitza lastPlayed i desa
      isEmpty: () => …,
      get names() { … }     // noms ordenats per lastPlayed descendent (còpia)
    };
  }
  return { create };
} )();
```

La importació llegeix directament les claus de `importFrom[i].storageKey` (`JSON.parse` + validació mínima: `name` string i `date` finit), sense dependre de `shared/ranking.js`.

`shared/player-select.js`: nou estat intern `scrollOffset` (índex de la primera fila visible) i constant `LIST_VISIBLE_ROWS = 11`.

Estructura resultant:

```
shared/
  games.js                ← sense canvis (ara també el carreguen els jocs)
  players.js              ← nou
  player-select.js        ← paràmetre players, desplaçament, handleWheel
  ranking.js              ← sense canvis
games/arkanoid/index.html, js/game.js   ← carreguen games.js/players.js, creen Players, listener wheel
games/starship/index.html, js/game.js   ← ídem
```

## Pla d'implementació

1. [x] Crear `shared/players.js` amb `create`, `load` (amb importació des de `importFrom` quan la clau no existeix), `register`, `isEmpty` i `names`. Carregar-lo (amb `shared/games.js`) als dos `index.html` dels jocs i crear-ne la instància a cada `game.js`, sense fer-la servir encara. Verificar: els jocs funcionen igual i, després d'obrir-ne un, `players:v1` existeix amb els noms importats.
2. [x] `shared/player-select.js`: paràmetre `players`; la llista, `start()` i l'`Escape` de l'entrada del nom en depenen; en confirmar es crida `players.register()` i es passa la grafia registrada a `onPlayerChosen`. Passar `players` des dels dos jocs. Verificar: un jugador creat a l'Arkanoid apareix a la selecció de Starship (a dalt de tot), i escriure «joan» amb «Joan» registrat juga com «Joan».
3. [x] Desplaçament de la llista: `LIST_VISIBLE_ROWS`, `scrollOffset`, seguiment de la selecció amb ↑↓ (inclòs el cicle), indicadors `▲`/`▼`, hover/clic amb desplaçament i `handleWheel`. Listener `wheel` als dos jocs. Verificar amb més d'11 jugadors.
4. [x] Actualitzar `CLAUDE.md` i `README.md`.

## Criteris d'acceptació

- [x] Amb rànquings existents i sense la clau `players:v1`, en obrir qualsevol joc es crea `players:v1` amb els noms de tots dos rànquings, sense duplicats per majúscules, ordenats per la data de la seva entrada més recent.
- [x] Si `players:v1` ja existeix (encara que sigui `[]`), no es torna a importar.
- [x] Un jugador nou creat a un joc apareix el primer a la selecció de l'altre joc, encara que no hagi acabat cap partida.
- [x] Triar un jugador el mou al principi de la llista a tots els jocs.
- [x] Escriure un nom que ja existeix amb altres majúscules no crea cap jugador nou i la partida (i l'entrada al rànquing) usa la grafia registrada.
- [x] Sense cap jugador registrat, el joc obre directament l'entrada del nom i `Escape` no fa res; amb jugadors, `Escape` torna a la llista encara que el rànquing del joc sigui buit.
- [x] Amb més d'11 files, la llista mostra 11 files, ↑↓ desplacen la finestra mantenint la selecció visible (inclòs el salt cíclic primer ↔ «Nou jugador»), apareixen `▲`/`▼` quan hi ha files amagades, la roda desplaça la llista sense desplaçar la pàgina, i el clic a una fila tria el jugador que s'hi veu.
- [x] Amb 11 files o menys, la llista es veu i es comporta com abans (sense indicadors).
- [x] Amb `players:v1` amb JSON invàlid, el joc no peta i la llista es comporta com si fos buida.
- [x] Les taules de rànquing (selecció de jugador, final de partida, `scores/index.html`) es veuen igual que abans.
- [x] Cap error a la consola obrint els jocs amb `file://`.

## Decisions preses i descartades

- **Sí: clau pròpia `players:v1`, independent dels rànquings.** Decisió de l'usuari; un jugador no desapareix per sortir del top 10. **No:** llista com a unió dels noms dels rànquings.
- **Sí: importar els noms dels rànquings quan `players:v1` no existeix.** Decisió de l'usuari; ningú no perd el seu jugador. La importació passa una sola vegada perquè es desa encara que sigui buida.
- **Sí: `importFrom` amb les configuracions de `GAMES` (`shared/games.js`).** Decisió de la spec: la llista de rànquings a importar és comuna i no es duplica a cada joc; per això els jocs passen a carregar `shared/games.js`. `shared/players.js` no llegeix `GAMES` directament (no pot contenir res específic dels jocs; tot arriba per paràmetre).
- **Sí: registrar el jugador en triar-lo.** Decisió de l'usuari. **No:** en acabar la partida.
- **Sí: sense límit i sense esborrar.** Decisió de l'usuari. Esborrar queda per a una spec futura.
- **Sí: ordre per última partida.** Decisió de l'usuari. **No:** alfabètic.
- **No: preseleccionar l'últim jugador** ni entrar directament. Decisió de l'usuari (en la pràctica, la selecció inicial és el primer de la llista, que és el més recent).
- **Sí: noms sense distingir majúscules, guanya la grafia ja registrada.** Decisió de l'usuari; evita duplicats nous al rànquing sense tocar `shared/ranking.js`. A la importació guanya la grafia de l'entrada més recent.
- **Sí: finestra de 11 files amb desplaçament (teclat i roda) i indicadors `▲`/`▼`, «Nou jugador» al final.** Decisió de l'usuari. **No:** «Nou jugador» fix fora de la finestra.

## Riscos identificats

| Risc | Mitigació |
| --- | --- |
| Amb `file://`, alguns navegadors aïllen `localStorage` per fitxer o carpeta i els jocs no comparteixen `players:v1` | Verificar-ho als criteris d'acceptació amb el navegador habitual; si passa, es documenta a `README.md` (servir-ho amb un servidor estàtic), com a SPEC 14. |
| Rànquings existents amb el mateix jugador en grafies diferents continuen mostrant dues files | Fora de l'abast (no es toquen els rànquings); a partir d'ara la grafia registrada evita duplicats nous. |
| Un joc nou s'afegeix a `GAMES` però no es carrega `shared/games.js` al seu `index.html` | Documentar a `CLAUDE.md` que tot joc que faci servir `PlayerSelect` ha de carregar `games.js` i `players.js`. |
| Llista molt llarga amb el ratolí: el hover canvia la selecció en desplaçar amb la roda | La roda només canvia `scrollOffset`; la selecció la canvia el moviment del ratolí, com fins ara. |

## Decisions preses durant la implementació

- La clau `players:v1` és una constant `PLAYERS_STORAGE_KEY` a cada `game.js`, com `RANKING_STORAGE_KEY`, en lloc del literal dins de `Players.create()`.
- Si `localStorage.getItem` llança una excepció (emmagatzematge bloquejat), no s'importa res i la llista comença buida en memòria: sense lectura no es pot saber si la clau existeix.
- Indicadors de desplaçament: `▲` a la línia de la capçalera «Jugadors», alineat a la dreta de la llista; `▼` a la fila següent a l'última visible (y = 510), per sobre de la línia d'ajuda.
- Si la roda deixa la selecció fora de la finestra, la tecla ↑↓ següent la torna a fer visible (`ensureSelectionVisible`); el ratolí no desplaça mai la llista en passar-hi per sobre.
