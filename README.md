
# Joc de Arkanoid

Joc d'Arkanoid/Breakout fet amb HTML5 Canvas i JavaScript pur, sense dependències ni eines de build. Obre `index.html` en un navegador per jugar-hi.

## Controls

- **Fletxes esquerra/dreta** o **A/D**, o el **ratolí**, per moure la pala.
- **Espai** o **Enter** per reiniciar la partida des de les pantalles de victòria, "nivell superat" o derrota.
- **M** per silenciar/activar els efectes de so.
- **P** o **Escape** per posar el joc en pausa; **Espai** o **Enter** per continuar.
- **Espai** o **clic de ratolí** per disparar la pilota quan està enganxada a la pala (power-up magnètic).
- A la pantalla inicial: **fletxes amunt/avall** i **Enter** (o el **ratolí**) per triar jugador; **Escape** per tornar a la selecció des de l'entrada de nom.

## Funcionalitats

- Pala i pilota amb física de rebot bàsica (l'angle de rebot a la pala depèn del punt d'impacte).
- 11 nivells amb graelles de blocs generades proceduralment (colors aleatoris per fila).
- Blocs resistents que necessiten dos impactes per destruir-se, en quantitat creixent per nivell.
- Animació d'explosió en destruir cada bloc.
- Efectes de so de rebot i de trencament de bloc, amb tecla de silenci.
- Bonus de temps en superar un nivell (200 punts menys 20 per cada 20 s) i pilota que s'accelera ×1.1 cada 30 s a partir dels 60 s de nivell.
- Power-ups que cauen en destruir certs blocs (la pala els captura):
  - **Estrella groga**: activa una segona pilota i dobla la puntuació mentre n'hi ha dues en joc.
  - **Estrella vermella**: durant 15 s les pilotes són de foc, destrueixen els blocs d'un sol cop sense rebotar i deixen una estela vermella.
  - **Estrella verda**: suma una vida extra.
  - **Estrella blava**: durant 30 s la pilota va ×1.5 més ràpida i s'enganxa a la pala; es dispara amb Espai o clic.
- Pausa del joc amb P o Escape.
- Nom de jugador i rànquing Top 10 persistent a `localStorage`, amb selecció de jugador a la pantalla inicial.
- Puntuació i vides, amb estats de victòria (per nivell i final) i derrota.

## Desenvolupament

Aquest projecte s'ha construït seguint un flux de treball basat en specs: cada funcionalitat es defineix primer a `specs/NN-slug.md` (comanda `/spec`) i, un cop aprovada, s'implementa pas a pas amb `/spec-impl`. Actualment hi ha 9 specs implementades a `specs/`. Vegeu `CLAUDE.md` per als detalls del flux i l'historial de specs implementades.
