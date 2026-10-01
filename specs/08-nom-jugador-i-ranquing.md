# 08 - Nom del jugador i rànquing de puntuacions

**Estat:** Approved
**Depèn de:** SPEC 01, SPEC 03, SPEC 05
**Data:** 2026-10-01

**Objectiu:** Demanar el nom del jugador en una pantalla inicial al canvas i, en acabar la partida (guanyada o perduda), desar la puntuació en un rànquing Top 10 persistent a `localStorage` i mostrar-lo.

## Abast

**Dins de l'abast:**

- Nou estat `gameState = 'enterName'`, que és l'estat inicial en carregar la pàgina (substitueix l'entrada directa a `'playing'` de `initGame()`). Es dibuixa al canvas una pantalla amb el títol del joc, el text "Escriu el teu nom" i el nom que s'està escrivint amb un cursor parpellejant.
- Mentre `gameState === 'enterName'`, només es processen: lletres (A-Z, a-z, incloent accentuades), números i espai per afegir un caràcter, `Backspace` per esborrar l'últim i `Enter` per confirmar. Qualsevol altra tecla s'ignora, incloses les dreceres `M` (silenci), `P`/`Escape` (pausa) i `Espai` com a drecera de continuar: a `'enterName'` l'espai només afegeix un espai al nom.
- El nom té un màxim de `PLAYER_NAME_MAX_LENGTH` (= 10) caràcters; en arribar-hi no s'accepten més caràcters. No s'accepten espais inicials.
- En prémer `Enter`: el nom es retalla (`trim`); si queda buit s'assigna `PLAYER_NAME_DEFAULT` (= `'ANÒNIM'`). El nom es desa a la variable global `playerName` i `gameState` passa a `'playing'` (la partida comença en aquell moment).
- En reiniciar després de `'won'` o `'lost'` (Espai/Enter, comportament existent), es reutilitza `playerName` i es torna directament a `'playing'`, sense tornar a passar per `'enterName'`. Només una recàrrega de la pàgina torna a demanar el nom.
- En entrar a `'won'` o `'lost'`, es desa exactament una vegada una entrada `{ name, score, level, date }` al rànquing, s'ordena i es retalla a `RANKING_MAX_ENTRIES` (= 10).
- Ordre del rànquing: per `score` descendent; en cas d'empat, l'entrada més antiga (`date` menor) primer. Una puntuació de 0 també es desa (si hi cap al Top 10).
- La pantalla final de `'won'`/`'lost'` (substitueix el contingut de l'overlay actual d'aquests estats) mostra: el missatge existent ("Has guanyat el joc!" / "Game Over"), la puntuació de la partida i la taula Top 10 amb columnes posició, nom, puntuació i nivell. Si l'entrada de la partida actual és dins del Top 10, la seva fila es ressalta (color diferent). Si no hi és, la taula es mostra sense cap ressaltat. A sota, la línia "Prem Espai o Enter per tornar a jugar".
- La persistència fa servir `localStorage` amb la clau `'arkanoid:ranking:v1'`, serialitzant l'array d'entrades en JSON. Si `localStorage` no està disponible o llança error (mode privat, quota, JSON corrupte), el joc continua funcionant amb un rànquing només en memòria i sense mostrar cap error al jugador.

**Fora de l'abast (specs futures):**

- Rànquing compartit entre jugadors/equips (backend, fitxer JSON al servidor, núvol).
- Rànquing per nivell, per dificultat o filtres per jugador.
- Pantalla de rànquing accessible des de la pantalla inicial o des del joc (només es mostra a `'won'`/`'lost'`).
- Botó per esborrar el rànquing o editar/canviar el nom sense recarregar la pàgina.
- Selecció de jugador entre noms ja usats o múltiples perfils.
- Mode arcade d'inicials de 3 caràcters amb selecció per fletxes.
- So o animació específics en entrar al rànquing o batre un rècord.
- Suport d'entrada de nom per ratolí o pantalla tàctil (teclat virtual).
- Entrada de nom per `<input>` HTML o `window.prompt()`.
- Desar la partida abandonada (recàrrega de pàgina a mig joc) al rànquing.

## Model de dades

Amplia l'estat global de SPEC 01/03/05:

```js
// Valors possibles de gameState: 'enterName' (nou), 'playing', 'paused',
// 'levelComplete', 'won', 'lost'

let playerName = '';          // nom confirmat; no es reinicia a createInitialState()
let nameInput = '';           // text en edició a la pantalla 'enterName'
let ranking = [];             // array d'entrades, ordenat, màx. RANKING_MAX_ENTRIES
let lastRankingEntry = null;  // referència a l'entrada de la partida actual (per ressaltar-la)

// Entrada del rànquing
// { name: 'JORDI', score: 1230, level: 3, date: 1790000000000 }
//   name  : string, 1-10 caràcters
//   score : enter, puntuació final de la partida
//   level : enter, nivell assolit (currentLevel en acabar)
//   date  : enter, Date.now() en acabar la partida (serveix per desempatar)
```

Constants noves (junt a les constants existents de `js/game.js`):

- `PLAYER_NAME_MAX_LENGTH = 10`
- `PLAYER_NAME_DEFAULT = 'ANÒNIM'`
- `RANKING_MAX_ENTRIES = 10`
- `RANKING_STORAGE_KEY = 'arkanoid:ranking:v1'`

Convencions: la clau inclou `:v1` perquè un canvi futur de format es pugui migrar sense trencar les dades existents.

## Pla d'implementació

1. Afegir les constants i variables globals noves (`PLAYER_NAME_MAX_LENGTH`, `PLAYER_NAME_DEFAULT`, `RANKING_MAX_ENTRIES`, `RANKING_STORAGE_KEY`, `playerName`, `nameInput`, `ranking`, `lastRankingEntry`) a `js/game.js`. Sense canvis de comportament encara.
2. Implementar `loadRanking()` i `saveRanking()`: llegeixen/escriuen `RANKING_STORAGE_KEY` dins un `try/catch`, validant que el JSON llegit sigui un array (si no, `[]`). Cridar `loadRanking()` des d'`initGame()`. Verificar manualment a la consola que, amb `localStorage` bloquejat, no hi ha errors.
3. Implementar `addRankingEntry()`: crea `{ name: playerName, score, level: currentLevel, date: Date.now() }`, l'afegeix a `ranking`, ordena (score desc, date asc), retalla a `RANKING_MAX_ENTRIES`, desa `lastRankingEntry` i crida `saveRanking()`. Cridar-la en els dos llocs on `update()` posa `gameState = 'won'` i `gameState = 'lost'` (js/game.js, línies ~547 i ~556). Verificar al `localStorage` que s'hi crea una sola entrada per partida.
4. Afegir l'estat `'enterName'`: a `initGame()`, després de `createInitialState()`, posar `gameState = 'enterName'` i `nameInput = ''`. Implementar `drawNameScreen()` (títol, text "Escriu el teu nom", nom amb cursor parpellejant calculat amb `performance.now()`) i cridar-la des d'`drawOverlay()` quan `gameState === 'enterName'`. El sistema ha de mostrar la pantalla de nom en obrir el joc, amb el joc congelat al fons (`update()` ja no executa res si `gameState !== 'playing'`).
5. Al gestor de `keydown`, afegir una branca prioritària: si `gameState === 'enterName'`, processar només caràcters vàlids, `Backspace` i `Enter` (confirmar: `trim`, aplicar `PLAYER_NAME_DEFAULT` si buit, assignar `playerName`, `gameState = 'playing'`) i retornar abans d'executar la resta de dreceres (inclosa `M`). Cridar `e.preventDefault()` per a `Backspace` i `Espai` perquè el navegador no faci scroll/navegació. El sistema ha de permetre escriure un nom sense activar mute, pausa ni inici de partida.
6. Ampliar `drawOverlay()` per a `'won'`/`'lost'`: dibuixar el missatge existent més petit a dalt, la puntuació, la taula Top 10 (posició, nom, puntuació, nivell) amb la fila de `lastRankingEntry` ressaltada, i la línia de reinici a sota. Comprovar que tot cap als 800x600 px del canvas amb 10 files.
7. Verificar que `createInitialState()` (reinici amb Espai/Enter a `'won'`/`'lost'`) no reinicia `playerName` ni passa per `'enterName'`, i que `lastRankingEntry` es posa a `null` en començar una partida nova.

## Criteris d'acceptació

- [ ] En obrir `index.html`, es veu la pantalla de nom i la partida no avança (la pilota no es mou) fins que es prem `Enter`.
- [ ] Escrivint lletres, números i espais, el text apareix a la pantalla; `Backspace` esborra l'últim caràcter.
- [ ] No es poden escriure més de 10 caràcters ni començar el nom amb un espai.
- [ ] Escriure `M`, `P` o `Escape` durant la pantalla de nom no silencia el so ni pausa el joc; la lletra s'afegeix al nom (excepte `Escape`, que s'ignora).
- [ ] `Enter` amb el nom buit (o només espais) assigna el nom `ANÒNIM` i comença la partida.
- [ ] Al final d'una partida (`'won'` o `'lost'`) es desa exactament una entrada nova al rànquing, amb nom, puntuació, nivell assolit i data.
- [ ] La taula mostra com a màxim 10 entrades, ordenades per puntuació descendent; a igualtat de puntuació l'entrada més antiga va primer.
- [ ] La fila de la partida acabada es veu ressaltada quan és dins del Top 10, i no hi ha cap fila ressaltada quan no hi és.
- [ ] En recarregar la pàgina, el rànquing conserva les entrades anteriors (clau `arkanoid:ranking:v1` a `localStorage`).
- [ ] Reiniciar amb `Espai`/`Enter` després de `'won'`/`'lost'` comença directament la partida amb el mateix nom, sense mostrar la pantalla de nom.
- [ ] Amb `localStorage` bloquejat o amb un valor JSON invàlid a la clau, el joc carrega sense errors a la consola i el rànquing funciona en memòria durant la sessió.
- [ ] El comportament de la partida (rebots, blocs, power-ups, nivells, pausa, sons) és idèntic al de SPEC 01-07 un cop començada.

## Decisions preses i descartades

- **Sí: `localStorage` per a la persistència.** Les dades són mínimes (< 5 KB) i no calen consultes; manté l'stack d'HTML+JS pur sense backend. **No:** fitxer/servidor, trenca l'stack actual; **No:** només memòria, no seria un rànquing real.
- **Sí: clau versionada `arkanoid:ranking:v1`.** Permet migrar l'esquema més endavant sense perdre dades.
- **Sí: pantalla de nom dibuixada al canvas (estat `'enterName'`).** Coherent amb l'estètica i amb el patró d'estats ja existent (`'paused'`, `'levelComplete'`). **No:** `<input>` HTML ni `window.prompt()`, trenquen la unitat visual i el flux de teclat.
- **Sí: dreceres (`M`, `P`, `Escape`, `Espai` com a continuar) desactivades a `'enterName'`.** Si no, escriure una `M` o una `P` en un nom silenciaria o pausaria el joc.
- **Sí: màxim 10 caràcters, nom buit = `ANÒNIM`.** Evita desbordar la taula i no bloqueja el jugador que només vol jugar. **No:** inicials d'estil arcade de 3 caràcters, descartat per l'usuari.
- **Sí: entrada `{ name, score, level, date }`.** El nivell dóna context a la puntuació i la data permet un desempat determinista (el més antic primer: qui ha arribat primer a la puntuació la manté).
- **Sí: Top 10.** Cap a l'overlay de 800x600 amb marge; més files obligarien a reduir la tipografia.
- **Sí: rànquing només a la pantalla final (`'won'`/`'lost'`), amb Espai/Enter per reiniciar.** Manté la drecera de reinici existent i evita un estat intermedi `'ranking'`. **No:** pantalla de rànquing a la inici, descartat per l'usuari.
- **Sí: reutilitzar el nom en reiniciar.** Evita fricció en partides consecutives. Un canvi de jugador requereix recarregar la pàgina (acceptat; un selector de jugador seria una altra spec).
- **Sí: es desen també les partides perdudes.** Un rànquing que només tingués victòries seria quasi buit; es registra la puntuació acumulada en qualsevol final.
- **No: desar partides abandonades per recàrrega.** Seria necessari interceptar `beforeunload`; fora de l'abast per mantenir la spec centrada.

## Riscos identificats

| Risc                                                              | Mitigació                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `localStorage` desactivat o amb quota plena (mode privat)         | `try/catch` a `loadRanking()`/`saveRanking()` i rànquing en memòria; el joc no es trenca.     |
| JSON corrupte o manipulat a la clau                               | Es valida que sigui un array d'objectes amb els camps esperats; si no, es descarta i s'usa `[]`. |
| `Backspace`/`Espai` fan scroll o navegació del navegador          | `e.preventDefault()` a la branca d'`'enterName'`.                                             |
| Dues entrades per partida (p. ex. si `update()` s'executa dos cops) | `addRankingEntry()` només es crida en la transició a `'won'`/`'lost'`, que fa `return` just després. |
| Noms amb caràcters que desbordin la taula (amples, com `W`)       | Límit de 10 caràcters i columna de nom amb amplada fixa verificada visualment amb `WWWWWWWWWW`. |

## El que **no** hi ha en aquesta spec

- Rànquing en línia o compartit entre dispositius.
- Pantalla de rànquing fora del final de partida.
- Gestió de múltiples jugadors o canvi de nom sense recarregar.
- Esborrat del rànquing.
- Entrada de nom per ratolí, tàctil o d'estil arcade de 3 inicials.
- Sons o animacions nous per al rànquing.
