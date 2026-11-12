# 14 - Pàgina de puntuacions dels jocs

**Estat:** tancat
**Depèn de:** SPEC 11, SPEC 12, SPEC 13
**Data:** 2026-11-12

**Objectiu:** Afegir una pàgina HTML de només consulta, accessible des del menú, que mostra el rànquing de cada joc en una pestanya pròpia, llegint la configuració dels jocs d'un fitxer compartit `shared/games.js`.

## Abast

**Dins de l'abast:**

- **`shared/games.js`** (script clàssic, objecte global `window.GAMES`, sense ES modules perquè ha de funcionar amb `file://`): l'array `GAMES` surt d'`index.html` i s'amplia amb la configuració del rànquing de cada joc:
  - `{ id: 'arkanoid', label: 'Arkanoid', ranking: { storageKey: 'arkanoid:ranking:v1', extraField: 'level', extraLabel: 'Nivell' } }`
  - `{ id: 'starship', label: 'Starship', ranking: { storageKey: 'starship:ranking:v1', extraField: 'level', extraLabel: 'Nivell' } }`
- **Menú (`index.html`)**: carrega `shared/games.js` i en genera la llista com fins ara. Sota la llista de jocs, un enllaç diferenciat «Puntuacions» (`scores/index.html`), separat visualment dels jocs (marge superior, mida de lletra més petita) però amb el mateix ressaltat de focus/hover. Entra al cicle de fletxes ↑↓ (darrer element; de «Puntuacions» ↓ torna al primer joc). El focus inicial continua sent el primer joc. La línia d'ajuda no canvia.
- **Pàgina nova `scores/index.html`** (HTML/CSS, sense canvas, UTF-8, `lang="ca"`, fons `#222` i estil del menú):
  - Títol «Puntuacions».
  - Una pestanya per cada joc de `GAMES`, en el mateix ordre (Arkanoid, Starship). La pestanya activa es ressalta en groc `#ffeb3b`. En carregar, és activa la primera.
  - Sota les pestanyes, una `<table>` HTML amb el rànquing del joc actiu, columnes: **#**, **Nom**, **Punts**, la columna extra del joc (`extraLabel`, «Nivell») i **Data** (`dd/mm/aaaa`, a partir de `entry.date`). Ordre i contingut, els de `ranking.entries` (ja ordenat per `shared/ranking.js`).
  - Si el rànquing del joc és buit: missatge «Encara no hi ha puntuacions» en lloc de la taula.
  - Les entrades es llegeixen amb `Ranking.create( game.ranking ).load()` + `entries` (es carrega `../shared/ranking.js`); no es fa servir `drawTable()`.
  - Controls: clic a una pestanya l'activa; `ArrowLeft`/`ArrowRight` canvien de pestanya de manera cíclica (amb `preventDefault()`); `Escape` torna al menú (`../index.html`). Enllaç visible «Tornar al menú» i línia d'ajuda «←→ per canviar de joc · Esc per tornar».
  - Només lectura: la pàgina no escriu mai a `localStorage`.
- Actualitzar `CLAUDE.md` (estructura: `shared/games.js`, `scores/`, com afegir un joc ara inclou la seva configuració de rànquing a `shared/games.js`) i `README.md` (estructura i com consultar les puntuacions).

**Fora de l'abast (specs futures):**

- Esborrar rànquings, filtrar per jugador, rànquing combinat entre jocs.
- Modificar els jocs (`games/*/js/game.js`): continuen creant el seu `Ranking` amb la seva pròpia configuració; no llegeixen `shared/games.js`.
- Canvis a `shared/ranking.js` o `shared/player-select.js`.
- Recordar la pestanya activa (URL hash o `localStorage`).
- Accés a la pàgina de puntuacions des de dins dels jocs.
- Canviar el format o les claus de `localStorage`.

## Model de dades

Sense canvis a `localStorage`: es llegeixen les claus existents `arkanoid:ranking:v1` i `starship:ranking:v1`, entrades `{ name, score, level, date }`.

`shared/games.js`:

```js
// Llista de jocs del menú i configuració del seu rànquing (comú al menú i a la pàgina de puntuacions).
window.GAMES = [
  {
    id: 'arkanoid',
    label: 'Arkanoid',
    ranking: { storageKey: 'arkanoid:ranking:v1', extraField: 'level', extraLabel: 'Nivell' }
  },
  {
    id: 'starship',
    label: 'Starship',
    ranking: { storageKey: 'starship:ranking:v1', extraField: 'level', extraLabel: 'Nivell' }
  }
];
```

L'objecte `ranking` té exactament la forma dels paràmetres de `Ranking.create()`, de manera que es pot passar directament.

Estructura resultant:

```
index.html                ← carrega shared/games.js + enllaç «Puntuacions»
scores/index.html         ← nou
shared/
  games.js                ← nou
  ranking.js              ← sense canvis
  player-select.js        ← sense canvis
games/…                   ← sense canvis
```

Estat de `scores/index.html` (noms orientatius): `activeIndex` (pestanya activa) i una funció `renderTab( index )` que regenera la taula o el missatge de buit.

## Pla d'implementació

1. [x] Crear `shared/games.js` amb `window.GAMES` i fer que `index.html` el carregui i en tregui l'array local. Verificar: el menú es veu i funciona igual que abans.
2. [x] Afegir al menú l'enllaç «Puntuacions» sota la llista, amb estil diferenciat, dins del cicle ↑↓. Crear `scores/index.html` mínim (títol + «Tornar al menú») perquè l'enllaç no estigui trencat.
3. [x] `scores/index.html`: pestanyes generades des de `GAMES`, taula HTML amb les entrades de `Ranking.create( game.ranking )`, columnes #/Nom/Punts/extra/Data i missatge de rànquing buit.
4. [x] Controls de la pàgina: clic a pestanya, `ArrowLeft`/`ArrowRight` cíclics, `Escape` al menú, línia d'ajuda.
5. [x] Actualitzar `CLAUDE.md` i `README.md`.

## Criteris d'acceptació

- [x] El menú mostra «Arkanoid» i «Starship» com abans i, separat a sota, «Puntuacions»; la llista de jocs surt de `shared/games.js` (no hi ha cap array `GAMES` a `index.html`).
- [x] Al menú, ↑↓ recorre Arkanoid → Starship → Puntuacions → Arkanoid; Enter o clic a «Puntuacions» obre `scores/index.html`.
- [x] Obrir `scores/index.html` amb `file://` mostra «Puntuacions», les pestanyes Arkanoid i Starship (Arkanoid activa) i cap error a la consola.
- [x] La taula de cada pestanya mostra les mateixes entrades i en el mateix ordre que el rànquing del joc corresponent a la seva selecció de jugador, amb #, Nom, Punts, Nivell i Data en format `dd/mm/aaaa`.
- [x] Amb un rànquing buit (o la clau inexistent o amb JSON invàlid) la pestanya mostra «Encara no hi ha puntuacions».
- [x] `ArrowLeft`/`ArrowRight` canvien de pestanya de manera cíclica; el clic també; la pestanya activa es veu ressaltada en groc.
- [x] `Escape` i l'enllaç «Tornar al menú» porten a `index.html`.
- [x] Visitar la pàgina de puntuacions no modifica cap clau de `localStorage`.
- [x] Arkanoid i Starship funcionen igual que abans (els seus fitxers no han canviat).

## Decisions preses i descartades

- **Sí: pàgina pròpia `scores/index.html` enllaçada des del menú.** Decisió de l'usuari. **No:** taules dins del menú ni dins de cada joc (el rànquing ja es veu a la selecció de jugador). El nom de carpeta `scores/` és decisió de la spec; queda fora de `games/` perquè no és un joc.
- **Sí: una pestanya per joc.** Decisió de l'usuari; escala quan s'afegeixin jocs. **No:** totes les taules alhora ni rànquing combinat.
- **Sí: només consulta.** Decisió de l'usuari. **No:** esborrar rànquings ni filtrar per jugador.
- **Sí: moure `GAMES` a `shared/games.js` amb la configuració del rànquing.** Decisió de l'usuari; menú i pàgina de puntuacions comparteixen una sola llista. **No:** duplicar la llista a la pàgina.
- **Sí: taula HTML** llegint `Ranking.create(...).entries`. Decisió de l'usuari; coherent amb el menú, que no té canvas, i reutilitza la càrrega tolerant a errors de `shared/ranking.js`. **No:** canvas amb `drawTable()`.
- **Sí: columna Data** a més de les dels jocs. Decisió de l'usuari.
- **Sí: «Puntuacions» com a enllaç separat sota la llista, dins del cicle ↑↓.** Decisió de l'usuari. **No:** com una entrada més de `GAMES` (no és un joc).
- **Sí: ←→ per pestanyes, Escape al menú, més ratolí.** Decisió de l'usuari.
- **No: que els jocs llegeixin la seva configuració de `shared/games.js`.** Decisió de la spec per no tocar els jocs; la duplicació de `storageKey` s'accepta (vegeu riscos).

## Riscos identificats

| Risc | Mitigació |
| --- | --- |
| La `storageKey` de `shared/games.js` i la de `games/<id>/js/game.js` divergeixen i la pàgina mostra un rànquing buit | Documentar a `CLAUDE.md` que afegir o canviar un joc implica revisar totes dues; el criteri d'acceptació compara la pàgina amb el rànquing de cada joc. |
| `localStorage` bloquejat o JSON corrupte | `Ranking.load()` ja és tolerant i deixa `entries` buit → missatge «Encara no hi ha puntuacions». |
| Amb `file://`, alguns navegadors aïllen `localStorage` per fitxer o per carpeta i la pàgina no veu les dades dels jocs | Verificar-ho als criteris d'acceptació amb el navegador habitual; si passa, es documenta a `README.md` (servir-ho amb un servidor estàtic) en lloc de canviar la persistència. |
| Noms de jugador amb caràcters HTML | Omplir les cel·les amb `textContent`, mai `innerHTML`. |
