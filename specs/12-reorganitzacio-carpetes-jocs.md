# 12 - Reorganització en carpetes per joc i codi comú

**Estat:** approved
**Depèn de:** SPEC 08, SPEC 09, SPEC 11
**Data:** 2026-10-12

**Objectiu:** Moure l'Arkanoid a `games/arkanoid/`, convertir `index.html` de l'arrel en un menú HTML de jocs i extreure a `shared/` el rànquing i les pantalles de selecció de jugador perquè els futurs jocs els puguin reutilitzar, sense canviar el comportament del joc.

## Abast

**Dins de l'abast:**

- **Moure l'Arkanoid** (amb `git mv`, per conservar l'historial):
  - `index.html` → `games/arkanoid/index.html`
  - `js/game.js` → `games/arkanoid/js/game.js`
  - `assets/` (spritesheet, `spritesheet.js`, sons) → `games/arkanoid/assets/`
  - Les rutes relatives internes (`assets/...`, `js/...`) continuen sent vàlides perquè són relatives al document; no cal canviar-les. La carpeta `js/` de l'arrel desapareix.
- **Menú de jocs a `index.html` de l'arrel**: pàgina HTML/CSS independent (sense canvas), mateix fons `#222` i estil que `games/properament/index.html`.
  - Títol «Tria un joc», llista d'enllaços `<a href="games/<id>/index.html">` generada amb JS des d'un array `GAMES` definit a la mateixa pàgina, i línia d'ajuda «↑↓ per triar · Enter per jugar».
  - Ordre: **Arkanoid**, **Properament**.
  - En carregar, el focus és al primer enllaç (Arkanoid). `ArrowUp`/`ArrowDown` mouen el focus de manera cíclica (amb `preventDefault()`); `Enter` obre l'enllaç enfocat (comportament natiu). Ratolí i `Tab` funcionen de manera nativa. L'enllaç enfocat/hover es ressalta (groc `#ffeb3b`, com al selector actual).
- **Arkanoid sense selector intern**: s'elimina l'estat `'selectGame'` de `game.js` (constants `GAMES`, `GAME_LIST_*`, `selectedGameIndex` i les funcions `enterSelectGame`, `getGameListRowAt`, `confirmGameSelection`, `drawSelectGameScreen`, `handleSelectGameInput`). En obrir `games/arkanoid/index.html` es va directament a la selecció de jugador.
- **Botó «Jocs»** (`'paused'`, `'won'`, `'lost'`): es manté igual (posició, hover, només ratolí), però en clicar-lo navega a `../../index.html` (`window.location.href`). La partida abandonada des de la pausa es descarta com fins ara.
- **`shared/ranking.js`** (script clàssic, objecte global `window.Ranking`): lògica del rànquing extreta de `game.js` i parametritzada per joc — càrrega/desat a `localStorage`, validació, alta d'entrada (mateixa regla actual: només substitueix si millora la puntuació; ordre per punts desc. i data asc.; màxim d'entrades), llista de noms de jugador i dibuix de la taula al canvas.
  - Entrada genèrica `{ name, score, date }` més una **columna extra opcional** configurable (camp i títol). L'Arkanoid la configura com a camp `level` / títol «Nivell», de manera que el format desat és idèntic a l'actual.
- **`shared/player-select.js`** (script clàssic, objecte global `window.PlayerSelect`): component amb estat propi que inclou les pantalles «Tria jugador» (taula de rànquing + llista de jugadors + «Nou jugador») i «Escriu el teu nom», amb tots els controls actuals de SPEC 08/09 (fletxes, Enter, ratolí hover/clic, Backspace, Espai, Escape per tornar a la llista si hi ha rànquing, màx. 10 caràcters, `ANÒNIM` per defecte). Títol de la pantalla configurable («ARKANOID»).
- L'Arkanoid carrega `../../shared/ranking.js` i `../../shared/player-select.js` amb `<script>` abans de `js/game.js` i hi delega.
- `games/properament/index.html` no canvia (el seu enllaç `../../index.html` porta al menú nou).
- Actualitzar `README.md` (com s'hi juga i estructura de carpetes) i `CLAUDE.md` (estructura, rutes noves, convenció per afegir un joc).

**Fora de l'abast (specs futures):**

- Partir `game.js` en més fitxers (a part del que surt cap a `shared/`).
- Extreure a `shared/` el so (`playSound`, tecla `M`), el bucle de joc, l'spritesheet o qualsevol altra cosa que no sigui rànquing i selecció de jugador.
- ES modules (`import`/`export`), eines de build o `package.json`.
- Canviar la clau `arkanoid:ranking:v1` o migrar dades de `localStorage`.
- Rànquing global entre jocs o jugador compartit/recordat entre jocs.
- Implementar el joc real que substituirà «Properament».
- Canvis visuals al joc o a les pantalles de jugador (han de quedar idèntiques a 800×600).
- Actualitzar les rutes citades a les specs antigues (01-11): són històriques.

## Model de dades

Sense canvis a `localStorage`: la clau `arkanoid:ranking:v1` i el format de les entrades (`{ name, score, level, date }`) es mantenen.

Estructura de carpetes resultant:

```
index.html                      ← menú de jocs (nou contingut)
shared/
  ranking.js                    ← nou
  player-select.js              ← nou
games/
  arkanoid/
    index.html                  ← abans index.html
    js/game.js                  ← abans js/game.js
    assets/…                    ← abans assets/
  properament/index.html        ← sense canvis
```

`shared/ranking.js` (noms orientatius):

```js
window.Ranking = {
  create( {
    storageKey,          // 'arkanoid:ranking:v1'
    maxEntries = 10,
    extraField = null,   // 'level'
    extraLabel = null    // 'Nivell'
  } ) → ranking
};

ranking.load();                         // tolerant a localStorage bloquejat o JSON invàlid
ranking.entries;                        // array ordenat (només lectura)
ranking.isEmpty();
ranking.add( { name, score, extra } );  // → entrada afegida, o null si no millora
ranking.playerNames();                  // noms únics en ordre de rànquing
ranking.drawTable( ctx, left, top, highlightEntry );
```

`shared/player-select.js` (noms orientatius):

```js
window.PlayerSelect = {
  create( {
    ctx, width, height,           // canvas del joc (posicions calculades a partir de width/height;
                                  //  a 800×600 han de coincidir amb les actuals)
    title,                        // 'ARKANOID'
    ranking,                      // instància de Ranking
    nameMaxLength = 10,
    defaultName = 'ANÒNIM',
    onPlayerChosen( name )        // callback quan es tria o s'escriu un nom
  } ) → playerSelect
};

playerSelect.start();                 // 'list' si hi ha rànquing, 'name' si és buit
playerSelect.draw();
playerSelect.handleKey( e );
playerSelect.handleMouseMove( x, y ); // coordenades de canvas
playerSelect.handleClick( x, y );
```

Canvis a `games/arkanoid/js/game.js`:

- Els dos estats `'selectPlayer'` i `'enterName'` passen a ser un sol estat `'choosePlayer'`, durant el qual teclat, ratolí i dibuix es delegen a `playerSelect`; `onPlayerChosen` fixa `playerName` i passa a `'playing'`.
- `ranking`, `lastRankingEntry`: el primer passa a ser la instància de `Ranking`; `lastRankingEntry` es manté al joc (resultat de `ranking.add()`).
- Surten de `game.js` cap a `shared/`: `isValidRankingEntry`, `loadRanking`, `saveRanking`, la lògica d'`addRankingEntry`, `getPlayerOptions`, `enterSelectPlayer`, `getPlayerListRowAt`, `confirmPlayerSelection`, `drawSelectPlayerScreen`, `drawNameScreen`, `drawRankingTable`, `handleSelectPlayerInput`, `handleNameInput` i les constants `PLAYER_*`, `NEW_PLAYER_LABEL`, `RANKING_MAX_ENTRIES`.
- Es queden a `game.js`: `RANKING_STORAGE_KEY`, `GAMES_BUTTON`, `drawGamesButton`, `isOverGamesButton`, `isGamesButtonVisible`, `drawRankingScreen` (que crida `ranking.drawTable`), `getCanvasCoordinates`.

## Pla d'implementació

1. [x] Moure amb `git mv` `index.html`, `js/` i `assets/` a `games/arkanoid/`. Ajustar la `url` de «Properament» a `GAMES` de `game.js` a `../properament/index.html`. Crear el nou `index.html` de l'arrel amb el menú HTML (array `GAMES`, enllaços, focus inicial, fletxes cícliques). Verificar: el menú obre l'Arkanoid i Properament, i l'Arkanoid funciona des de la nova ruta (sprites i sons carregats).
2. [x] Treure el selector intern de l'Arkanoid: eliminar `'selectGame'` i tot el que en depèn; `initGame()` va directament a la selecció de jugador; `returnToGameSelector()` navega a `../../index.html`. Verificar el botó «Jocs» des de pausa, victòria i derrota.
3. [x] Crear `shared/ranking.js` i fer que `game.js` el faci servir (càrrega, alta, llista de jugadors, taula a `'won'`/`'lost'` i a la selecció de jugador). Afegir el `<script>` a `games/arkanoid/index.html`. Verificar que el rànquing existent es veu igual i que les noves partides s'hi desen igual.
4. [x] Crear `shared/player-select.js` amb les pantalles «Tria jugador» i «Escriu el teu nom»; substituir a `game.js` els estats `'selectPlayer'`/`'enterName'` per `'choosePlayer'` delegat. Afegir el `<script>`. Verificar tots els controls de SPEC 08/09.
5. [x] Actualitzar `README.md` i `CLAUDE.md` amb la nova estructura i com afegir un joc (`games/<id>/index.html` + entrada a `GAMES` del menú; opcionalment `shared/`).
6. [ ] Revisió final: obrir `index.html` amb `file://`, recórrer el menú amb teclat i ratolí, jugar una partida completa d'Arkanoid (rànquing buit i ple, jugador existent i nou), sortir amb el botó «Jocs» des de pausa i des de la pantalla final, i comprovar que no hi ha errors a la consola.

## Criteris d'acceptació

- [ ] A l'arrel només queden `index.html`, `shared/`, `games/`, `specs/` i fitxers de configuració/documentació; no hi ha `js/` ni `assets/` a l'arrel.
- [ ] `git log --follow games/arkanoid/js/game.js` mostra l'historial anterior al moviment.
- [ ] Obrir `index.html` mostra «Tria un joc» amb «Arkanoid» enfocat i ressaltat, i «Properament».
- [ ] `ArrowUp`/`ArrowDown` mouen el focus de manera cíclica sense fer scroll; `Enter` i el clic obren el joc corresponent.
- [ ] Obrir `games/arkanoid/index.html` va directament a «Tria jugador» (rànquing no buit) o a «Escriu el teu nom» (rànquing buit o `localStorage` bloquejat), sense errors a la consola.
- [ ] Sprites i sons de l'Arkanoid es carreguen correctament des de la nova ruta.
- [ ] Les pantalles «Tria jugador» i «Escriu el teu nom» es veuen i responen igual que abans (fletxes, Enter, hover i clic, Backspace, Espai, Escape, màx. 10 caràcters, `ANÒNIM`).
- [ ] El rànquing desat abans de la reorganització (clau `arkanoid:ranking:v1`) es mostra sense canvis, i les noves partides s'hi desen amb el mateix format `{ name, score, level, date }`.
- [ ] Clicar «Jocs» des de `'paused'`, `'won'` o `'lost'` porta a `index.html` de l'arrel; la partida abandonada des de la pausa no apareix al rànquing.
- [ ] L'enllaç «Tornar als jocs» de `games/properament/index.html` porta al menú.
- [ ] `game.js` ja no conté `'selectGame'`, `GAMES`, `GAME_LIST_*` ni cap funció de rànquing o de selecció de jugador moguda a `shared/`.
- [ ] `shared/ranking.js` i `shared/player-select.js` no fan referència a res específic de l'Arkanoid (ni `level`, ni `'ARKANOID'`, ni la clau de `localStorage`): tot arriba per paràmetre.
- [ ] Tot funciona obrint els fitxers amb `file://`, sense servidor.
- [ ] Un cop començada, la partida d'Arkanoid es comporta igual que amb les SPEC 01-11.

## Decisions preses i descartades

- **Sí: `index.html` de l'arrel és un menú HTML/CSS (sense canvas).** Decisió de l'usuari; cada joc nou només afegeix una entrada a `GAMES`. **No:** menú en canvas amb JS propi (més feina per al mateix resultat), ni deixar el selector dins l'Arkanoid (acobla el menú a un joc concret).
- **Sí: menú amb enllaços + fletxes/Enter.** Decisió de l'usuari; conserva l'experiència de SPEC 11. **No:** enllaços estàtics sense JS.
- **Sí: tots els assets de l'Arkanoid a `games/arkanoid/assets/`.** Decisió de l'usuari; carpeta del joc autocontinguda i rutes internes sense canvis. **No:** `assets/` compartit a l'arrel.
- **Sí: `game.js` es mou però no es parteix** (més enllà del que surt cap a `shared/`). Decisió de l'usuari; limita el risc de regressió.
- **Sí: carpeta comuna `shared/` a l'arrel** amb rànquing i pantalles de jugador. Decisió de l'usuari. **No:** `games/common/` ni reaprofitar `js/`.
- **Sí: scripts clàssics amb objecte global** (`window.Ranking`, `window.PlayerSelect`). Decisió de l'usuari; funciona amb `file://` i és coherent amb `spritesheet.js`. **No:** ES modules (obligarien a servir el projecte per HTTP).
- **Sí: component `PlayerSelect` amb estat propi i callback `onPlayerChosen`.** Decisió de l'usuari; el joc només hi delega. **No:** funcions soltes amb l'estat al joc.
- **Sí: columna extra opcional al rànquing.** Decisió de l'usuari; l'Arkanoid la mapeja a `level` per conservar el format desat. **No:** `level` obligatori per a tots els jocs.
- **Sí: es manté la clau `arkanoid:ranking:v1`.** Decisió de l'usuari; cada joc futur tindrà la seva `<id>:ranking:v1`. **No:** nou esquema de claus amb migració.
- **Sí: un sol estat `'choosePlayer'` a l'Arkanoid** en lloc de `'selectPlayer'`/`'enterName'`; la distinció entre llista i nom passa a ser interna del component.
- **Sí: moure amb `git mv`** per conservar l'historial dels fitxers.
- **Sí: actualitzar `README.md` i `CLAUDE.md`.** Decisió de l'usuari. **No:** reescriure les rutes a les specs antigues (són històriques).

## Decisions preses durant la implementació

- Menú: el ressaltat només s'aplica a `a:focus` (no a `:hover`) i passar el ratolí per sobre d'un enllaç li dona el focus; així mai hi ha dues files ressaltades alhora quan es combinen ratolí i fletxes.
- Menú: si cap enllaç té el focus (p. ex. després de clicar fora), la primera fletxa enfoca Arkanoid.
- Arkanoid: la ruta del menú és la constant `GAME_MENU_URL` (`'../../index.html'`). `returnToGameSelector()` conserva el nom però només navega: ja no cal `createInitialState()` ni reiniciar `gamesButtonHovered`, perquè la pàgina es descarrega.
- Rànquing: `addRankingEntry()` i `getPlayerOptions()` es queden a `game.js` com a embolcalls d'una línia (`ranking.add()` i `ranking.playerNames()`) per no tocar els llocs on es criden; `getPlayerOptions()` desapareix al pas 4 amb la resta de la selecció de jugador.
- Rànquing: la `y` de la capçalera de la taula (150) passa a la constant `RANKING_TABLE_TOP` de `game.js`, perquè `drawTable()` rep `top` per paràmetre.
- Rànquing: la regla de validació de la columna extra només s'aplica si el joc la configura; per a l'Arkanoid es continuen descartant les entrades sense `level` numèric, com abans.
- Selecció de jugador: `playerSelect.handleMouseMove()` retorna `true` si ha consumit el moviment (pantalla de llista). A «Escriu el teu nom» retorna `false` i el joc continua actualitzant `mouseX`, com feia abans a `'enterName'`.
- Selecció de jugador: `promptForPlayer()` es manté a `game.js` (posa `gameState = 'choosePlayer'` i crida `playerSelect.start()`) perquè la criden `initGame()` i el reinici des de `'won'`/`'lost'`; el callback `onPlayerChosen` és la funció nova `startWithPlayer()`.
- Selecció de jugador: `playerSelect` es crea a `initGame()`, no en carregar l'script, perquè necessita `ctx`.
- Selecció de jugador: la taula de rànquing de «Tria jugador» es dibuixa sense fila ressaltada (`null`). Abans es passava `lastRankingEntry`, però sempre valia `null` en aquest punt perquè `createInitialState()` el reinicia abans d'entrar-hi.

## Riscos identificats

| Risc | Mitigació |
| --- | --- |
| Amb `file://`, alguns navegadors (p. ex. Firefox) aïllen `localStorage` per ruta: en moure la pàgina a `games/arkanoid/` el rànquing existent podria no veure's | A Chrome/Edge l'origen `file://` és compartit; verificar-ho al criteri d'acceptació. Si es perd en algun navegador, s'accepta (no hi ha migració a l'abast). |
| Rutes relatives trencades després del moviment (sprites, sons, scripts de `shared/`) | Les rutes d'assets són relatives al document i es mouen junts; els `<script>` de `shared/` usen `../../shared/`. Verificar sense errors 404 a la consola. |
| Regressió a les pantalles de jugador en extreure-les (posicions, hover, clic) | Les posicions es calculen a partir de `width`/`height` amb els mateixos valors resultants a 800×600; revisar cada control de SPEC 08/09 al pas 4. |
| L'ordre de càrrega dels `<script>` (globals no definits) | `shared/*.js` es carreguen abans de `js/game.js` a `games/arkanoid/index.html`. |
| Col·lisió de noms globals entre `shared/` i `game.js` | Els scripts de `shared/` només exposen `window.Ranking` i `window.PlayerSelect` i encapsulen la resta dins una IIFE. |
