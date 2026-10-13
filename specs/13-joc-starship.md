# 13 - Joc Starship: nau contra asteroides

**Estat:** approved
**Depèn de:** SPEC 11, SPEC 12
**Data:** 2026-10-12

**Objectiu:** Afegir el joc «Starship» a `games/starship/`, en què el jugador pilota una nau en 2D i dispara als asteroides que cauen durant 5 nivells de 60 s, substituint el placeholder «Properament» al menú.

## Abast

**Dins de l'abast:**

- **Joc nou** a `games/starship/index.html` + `games/starship/js/game.js`. Canvas 800×600, mateix fons `#222` de pàgina que l'Arkanoid. Tot es dibuixa amb paths del canvas (cap imatge ni spritesheet).
- **Menú**: a `GAMES` d'`index.html`, l'entrada `properament` se substitueix per `{ id: 'starship', label: 'Starship' }`. S'elimina `games/properament/` (`git rm`).
- **Nau**: triangle que apunta amunt. Es mou lliurement per tot el canvas (sense sortir-ne) amb fletxes o WASD, 8 direccions (la diagonal es normalitza). Sense control de ratolí.
- **Tret**: mantenir `Espai` dispara automàticament cap amunt amb cadència fixa. Els trets desapareixen en sortir per dalt.
- **Asteroides**: polígons irregulars de 3 mides (gran, mitjà, petit). Neixen per sobre del canvas a una `x` aleatòria i cauen, aleatòriament, en vertical o en diagonal. Els diagonals reboten a les parets laterals. Els que surten per baix desapareixen sense penalització.
- Només neixen asteroides grans. En rebre un tret: gran → 2 mitjans, mitjà → 2 petits, petit → desapareix. Els fragments surten en direccions divergents, una mica més ràpids.
- **Puntuació**: gran 20, mitjà 50, petit 100 punts.
- **Vides**: 3. Es perd una vida quan un asteroide toca la nau; l'asteroide es destrueix (sense punts) i la nau és invulnerable 2 s (parpelleja). Amb 0 vides → `'lost'`.
- **Nivells**: 5, de 60 s cadascun. Cada nivell fa néixer asteroides més seguits i més ràpids. En esgotar el temps: s'eliminen els asteroides i trets en pantalla i es passa a `'levelComplete'` («Nivell N superat», Espai/Enter per continuar). Superar el nivell 5 → `'won'`. Vides i puntuació s'acumulen entre nivells.
- **HUD**: puntuació, nivell, temps restant del nivell (segons) i vides.
- **Rànquing i jugador** reutilitzant `shared/ranking.js` (`storageKey: 'starship:ranking:v1'`, `extraField: 'level'`, `extraLabel: 'Nivell'`) i `shared/player-select.js` (`title: 'STARSHIP'`). En obrir el joc es va a la selecció de jugador. En acabar (`'won'`/`'lost'`) es desa la partida i es mostra la taula amb l'entrada ressaltada; Espai/Enter torna a la selecció de jugador.
- **Pausa**: `P` o `Escape` a `'playing'` → `'paused'` (overlay «PAUSA»); Espai/Enter reprèn.
- **Botó «Jocs»** dibuixat al canvas a `'paused'`, `'won'` i `'lost'`, mateixa posició i comportament que a l'Arkanoid (només ratolí, navega a `../../index.html`, la partida abandonada des de la pausa no es desa).
- Actualitzar `CLAUDE.md` (estructura, joc nou, ja no hi ha placeholder) i `README.md` (llista de jocs i controls).

**Fora de l'abast (specs futures):**

- Sons i tecla `M` (no hi ha mp3 per a aquest joc).
- Power-ups, armes millorades, escut, vides extra.
- Enemics que disparen, caps finals.
- Bonus de temps o de vides en superar nivell.
- Control amb ratolí o tàctil.
- Rotació de la nau (estil Asteroids clàssic); la nau sempre apunta amunt.
- Extreure a `shared/` el bucle de joc, la pausa o el botó «Jocs» (es dupliquen a `games/starship/js/game.js`).
- Fons animat d'estrelles o altres efectes visuals decoratius (explosions animades incloses).
- Canvis a l'Arkanoid o a `shared/`.

## Model de dades

Nova clau a `localStorage`: `starship:ranking:v1`, entrades `{ name, score, level, date }` (gestionades per `Ranking`).

Estat global de `games/starship/js/game.js` (noms orientatius):

```js
// gameState: 'choosePlayer', 'playing', 'paused', 'levelComplete', 'won', 'lost'
let ship = { x, y, invulnerableFrames };
let bullets = [];            // { x, y }
let asteroids = [];          // { x, y, vx, vy, size: 'large'|'medium'|'small', radius, shape: [ /* offsets del polígon */ ] }
let score, lives, level;     // level 1..5
let levelFrames;             // frames transcorreguts al nivell actual
let spawnFrames;             // frames fins al pròxim asteroide
let fireCooldown;            // frames fins al pròxim tret
let playerName, lastRankingEntry;
```

Constants (valors inicials, ajustables en implementar):

```js
const CANVAS_WIDTH = 800, CANVAS_HEIGHT = 600;
const TOTAL_LEVELS = 5;
const LEVEL_DURATION_FRAMES = 60 * 60;          // 60 s a 60 fps
const INITIAL_LIVES = 3;
const SHIP_SPEED = 5;                            // px/frame
const SHIP_HIT_RADIUS = 14;
const INVULNERABLE_FRAMES = 120;                 // 2 s
const BULLET_SPEED = 9;
const FIRE_COOLDOWN_FRAMES = 15;                 // 4 trets/s
const ASTEROID_SIZES = {
  large:  { radius: 40, points: 20,  splitsInto: 'medium' },
  medium: { radius: 22, points: 50,  splitsInto: 'small' },
  small:  { radius: 12, points: 100, splitsInto: null }
};
const LEVELS = [                                 // un per nivell
  { spawnIntervalFrames: 96, minSpeed: 1.5, maxSpeed: 2.5 },
  { spawnIntervalFrames: 84, minSpeed: 1.8, maxSpeed: 2.8 },
  { spawnIntervalFrames: 72, minSpeed: 2.1, maxSpeed: 3.1 },
  { spawnIntervalFrames: 60, minSpeed: 2.4, maxSpeed: 3.4 },
  { spawnIntervalFrames: 48, minSpeed: 2.7, maxSpeed: 3.7 }
];
const RANKING_STORAGE_KEY = 'starship:ranking:v1';
const GAME_MENU_URL = '../../index.html';
const GAMES_BUTTON = { x: 664, y: 44, width: 120, height: 36, label: 'Jocs' };
```

Convencions: origen a dalt a l'esquerra; velocitats en px/frame; col·lisions cercle-cercle (tret = punt, nau = `SHIP_HIT_RADIUS`, asteroide = `radius`).

## Pla d'implementació

1. [x] Crear `games/starship/index.html` (UTF-8, `lang="ca"`, canvas 800×600, scripts `../../shared/*.js` abans de `js/game.js`) i `js/game.js` amb el bucle `requestAnimationFrame`, fons i HUD estàtic. A `index.html` de l'arrel, substituir l'entrada `properament` per `starship` i fer `git rm -r games/properament`. Verificar: el menú obre Starship i es veu el canvas sense errors.
2. [x] Nau: dibuix, moviment amb fletxes/WASD (8 direccions, normalitzat, dins del canvas). Partida temporalment directa a `'playing'`.
3. [x] Trets: Espai mantingut dispara amb `FIRE_COOLDOWN_FRAMES`; moviment i eliminació en sortir per dalt.
4. [x] Asteroides: generació segons `LEVELS[level-1]` (vertical o diagonal aleatori), forma poligonal irregular fixa per asteroide, caiguda, rebot lateral dels diagonals, eliminació en sortir per baix.
5. [x] Col·lisió tret-asteroide: divisió gran → 2 mitjans → 2 petits, puntuació al HUD.
6. [x] Col·lisió nau-asteroide: perdre vida, destruir l'asteroide, invulnerabilitat amb parpelleig, estat `'lost'` amb 0 vides.
7. [x] Temporitzador de nivell (temps restant al HUD), `'levelComplete'` amb neteja de la pantalla i Espai/Enter per continuar, `'won'` en superar el nivell 5.
8. [x] Pausa (`P`/`Escape`, overlay «PAUSA», Espai/Enter reprèn) i botó «Jocs» a `'paused'`/`'won'`/`'lost'` (hover i clic amb `getCanvasCoordinates()`).
9. [x] Rànquing i jugador: crear `Ranking` i `PlayerSelect`, estat inicial `'choosePlayer'`, desar en `'won'`/`'lost'`, mostrar la taula amb `drawTable()` i tornar a la selecció de jugador amb Espai/Enter.
10. [x] Actualitzar `CLAUDE.md` i `README.md`.

## Criteris d'acceptació

- [ ] El menú mostra «Arkanoid» i «Starship»; no hi ha «Properament» ni existeix `games/properament/`.
- [ ] Obrir `games/starship/index.html` amb `file://` va a «Tria jugador» (rànquing no buit) o «Escriu el teu nom» (buit), amb el títol «STARSHIP» i sense errors a la consola.
- [ ] La nau es mou en 8 direccions amb fletxes i amb WASD, a la mateixa velocitat en diagonal, i no surt mai del canvas.
- [ ] Mantenir Espai dispara 4 trets/s; deixar-lo anar atura el tret.
- [ ] Els asteroides cauen en vertical i en diagonal; els diagonals reboten a les parets laterals; els que surten per baix no treuen vida.
- [ ] Un tret a un asteroide gran dona 20 punts i en surten 2 mitjans; a un mitjà, 50 punts i 2 petits; a un petit, 100 punts i desapareix.
- [ ] Un asteroide que toca la nau resta 1 vida; durant els 2 s següents la nau parpelleja i cap xoc resta vida.
- [ ] Amb 0 vides la partida passa a `'lost'`, es desa al rànquing `starship:ranking:v1` amb `{ name, score, level, date }` i es mostra la taula amb l'entrada ressaltada.
- [ ] El HUD mostra puntuació, nivell, segons restants i vides.
- [ ] Als 60 s el nivell acaba, la pantalla queda neta i es mostra «Nivell N superat»; Espai/Enter comença el següent amb la mateixa puntuació i vides.
- [ ] Al nivell 5 neixen asteroides visiblement més seguits i ràpids que al nivell 1.
- [ ] Superar el nivell 5 porta a `'won'` i desa la partida amb `level: 5`.
- [ ] `P`/`Escape` pausa i Espai/Enter reprèn; durant la pausa res es mou ni el temps avança.
- [ ] El botó «Jocs» apareix només a `'paused'`, `'won'` i `'lost'` i porta al menú; la partida abandonada des de la pausa no es desa.
- [ ] El rànquing de l'Arkanoid (`arkanoid:ranking:v1`) no canvia en jugar a Starship, i l'Arkanoid funciona igual que abans.

## Decisions preses i descartades

- **Sí: substituir «Properament».** Decisió de l'usuari. **No:** mantenir el placeholder com a tercera entrada.
- **Sí: nom «Starship», carpeta `games/starship/`, clau `starship:ranking:v1`.** Decisió de l'usuari; segueix la convenció `<id>:ranking:v1` de SPEC 12.
- **Sí: moviment lliure 2D per tota la pantalla.** Decisió de l'usuari. **No:** només horitzontal, ni limitat a la meitat inferior.
- **Sí: fletxes/WASD + Espai mantingut amb cadència fixa.** Decisió de l'usuari. **No:** un tret per pulsació, ni control amb ratolí.
- **Sí: 5 nivells de 60 s (sobreviure).** Decisió de l'usuari. **No:** objectiu de N asteroides destruïts, ni partida infinita.
- **Sí: caiguda vertical o diagonal aleatòria.** Decisió de l'usuari. Que els diagonals rebotin a les parets laterals és una decisió de la spec perquè no surtin de la pantalla abans d'arribar a baix.
- **Sí: només es perd vida per xoc amb la nau.** Decisió de l'usuari. **No:** penalitzar els asteroides que arriben a terra.
- **Sí: divisió gran → mitjà → petit, 20/50/100 punts.** Decisió de l'usuari. **No:** asteroides d'un sol tret ni resistència per mida.
- **Sí: gràfics amb formes del canvas.** Decisió de l'usuari; cap asset nou. **No:** spritesheet propi.
- **Sí: reutilitzar `shared/ranking.js` i `shared/player-select.js` sense modificar-los; pausa i botó «Jocs» com a l'Arkanoid.** Decisió de l'usuari.
- **No: sons.** Decisió de l'usuari (no s'ha triat reutilitzar-los); es pot afegir en una spec futura.
- **Sí: tot el joc en un sol `game.js`**, com l'Arkanoid. **No:** extreure a `shared/` el bucle, la pausa o el botó «Jocs» en aquesta spec (seria tocar l'Arkanoid).
- **Sí: només neixen asteroides grans; els petits surten de la divisió.** Simplifica la generació i fa que la divisió tingui sentit.
- **Sí: en acabar el nivell s'esborren els asteroides en pantalla.** Cada nivell comença net, com a l'Arkanoid.

## Decisions preses durant la implementació

- HUD: puntuació a l'esquerra, «Nivell N · S s» centrat a dalt i les vides a la dreta com a petits triangles de la mateixa forma que la nau (sense sprites, coherent amb els gràfics de canvas).
- Constant `FPS = 60` per derivar `LEVEL_DURATION_FRAMES` i convertir frames a segons al HUD.
- Teclat per `e.code` (`KeyW`, `ArrowUp`...) a la taula `MOVE_KEYS`, perquè WASD funcioni igual amb qualsevol distribució de teclat. Fletxa i lletra de la mateixa direcció no sumen velocitat (`Math.sign`).
- La nau és una punta de fletxa (triangle amb l'escotadura a baix) de 30×36 px; `ship.x/y` n'és el centre i és el que es limita al canvas.
- Trets: segment vertical groc de 10 px (`BULLET_LENGTH`, `BULLET_COLOR`) que surt de la punta de la nau; `bullet.{x,y}` és la punta. El primer tret surt al moment de prémer Espai (el `fireCooldown` comença a 0).
- Asteroides: contorn gris (`ASTEROID_COLOR`) de 10 vèrtexs a angles iguals, amb un factor de radi aleatori 0,75-1 per vèrtex (`shape`), fixat en crear-lo. No giren.
- Caiguda: 50 % vertical, 50 % diagonal amb un angle de 15°-36° respecte de la vertical (cap a l'esquerra o la dreta); la velocitat total és aleatòria entre `minSpeed` i `maxSpeed` del nivell. El primer asteroide surt després d'un interval complet (`spawnFrames` comença a `spawnIntervalFrames`).
- `createAsteroid( size, x, y, vx, vy )` és genèrica per mida perquè la reutilitzi la divisió del pas 5.
- Divisió: els 2 fragments surten del centre de l'asteroide trencat, amb la seva direcció girada ±30° (`FRAGMENT_SPREAD_ANGLE`) i la velocitat ×1,3 (`FRAGMENT_SPEED_FACTOR`). Un asteroide vertical, doncs, dona dos fragments diagonals que després reboten a les parets com la resta.
- Col·lisió tret-asteroide: la punta del tret dins del radi nominal de l'asteroide (no el contorn irregular). Cada tret en destrueix com a màxim un.
- Xoc nau-asteroide: cercle de la nau (`SHIP_HIT_RADIUS`, centrat a `ship.x/y`) contra el radi nominal de l'asteroide. Si l'asteroide era gran, no es divideix: desapareix sencer. La nau es queda on és (no torna al centre).
- Parpelleig: la nau s'amaga 6 frames de cada 12 (`BLINK_PERIOD_FRAMES`) mentre `invulnerableFrames > 0`; els trets continuen sortint.
- En començar el nivell següent la nau torna a la posició inicial (centre a baix) i la invulnerabilitat s'anul·la; puntuació i vides es conserven.
- Espai/Enter a `'levelComplete'` ignora les pulsacions amb `e.repeat`: si el jugador manté Espai disparant quan s'acaba el temps, l'autorepetició no salta la pantalla de nivell superat.
- Els overlays de `'paused'` i `'levelComplete'` comparteixen `drawOverlayText()`.
- Pausa: P/Escape per `e.code` (`KeyP`), com la resta del teclat. Reprendre amb Espai/Enter també ignora `e.repeat`, perquè pausar amb Espai premut no reprengui la partida a l'instant.
- Botó «Jocs»: `GAMES_BUTTON`, `drawGamesButton()`, `isOverGamesButton()`, `isGamesButtonVisible()`, `returnToGameSelector()` i `getCanvasCoordinates()` copiats tal qual de l'Arkanoid (la spec descarta extreure'ls a `shared/`). Com que el canvas no té cap altre ús del ratolí, `mousemove` només actualitza el hover.
- Rànquing i jugador: mateixa estructura que l'Arkanoid (`promptForPlayer()`, `startWithPlayer()`, `drawRankingScreen()`, `RANKING_TABLE_TOP = 150`, overlay 0,85 i títols «Has guanyat!»/«Game Over»). La funció nova `endGame( state )` és l'únic punt que posa `'won'`/`'lost'` i desa l'entrada, de manera que una partida acabada es desa exactament un cop.
- Espai/Enter a `'won'`/`'lost'` també ignora `e.repeat`: si el jugador mor disparant, la taula no se salta.
- `blur` de la finestra buida les tecles premudes, perquè la nau no quedi movent-se si es canvia de finestra amb una tecla premuda.

## Riscos identificats

| Risc | Mitigació |
| --- | --- |
| Espai fa scroll o activa el botó enfocat | `preventDefault()` per a Espai i fletxes al `keydown`. |
| Moviment diagonal més ràpid que l'ortogonal | Normalitzar el vector de direcció abans d'aplicar `SHIP_SPEED`. |
| Xoc immediat en néixer un asteroide sobre la nau quan és a dalt de tot | Els asteroides neixen per sobre del canvas (`y = -radius`) i la invulnerabilitat de 2 s evita perdre vides seguides. |
| Massa asteroides en pantalla al nivell 5 (rendiment o dificultat excessiva) | Valors de `LEVELS` ajustables; es revisen jugant el nivell 5 als criteris d'acceptació. |
| Les dades del nivell en desar (`'won'` vs `'lost'`) | `level` és el nivell en què s'ha acabat la partida (5 en guanyar). |
| `shared/player-select.js` captura tecles que el joc també escolta (Espai, Escape) | Mentre `gameState === 'choosePlayer'` el `keydown` delega i fa `return`, com a l'Arkanoid. |

## Què **no** entra en aquesta spec

- Sons, power-ups, enemics que disparen, bonus de temps.
- Control amb ratolí o rotació de la nau.
- Refactor del codi comú entre jocs més enllà del que ja hi ha a `shared/`.
