
# Joc de Arkanoid

Joc d'Arkanoid/Breakout fet amb HTML5 Canvas i JavaScript pur, sense dependències ni eines de build. Obre `index.html` en un navegador per jugar-hi.

## Controls

- **Fletxes esquerra/dreta** o **A/D**, o el **ratolí**, per moure la pala.
- **Espai** o **Enter** per reiniciar la partida des de les pantalles de victòria, "nivell superat" o derrota.
- **M** per silenciar/activar els efectes de so.

## Funcionalitats

- Pala i pilota amb física de rebot bàsica (l'angle de rebot a la pala depèn del punt d'impacte).
- 5 nivells amb graelles de blocs generades proceduralment (colors aleatoris per fila).
- Blocs resistents que necessiten dos impactes per destruir-se, en quantitat creixent per nivell.
- Animació d'explosió en destruir cada bloc.
- Efectes de so de rebot i de trencament de bloc, amb tecla de silenci.
- Power-up d'estrella: en destruir certs blocs cau una estrella que, capturada amb la pala, activa una segona pilota i dobla la puntuació mentre hi ha dues pilotes en joc.
- Puntuació i vides, amb estats de victòria (per nivell i final) i derrota.

## Desenvolupament

Aquest projecte s'ha construït seguint un flux de treball basat en specs: cada funcionalitat es defineix primer a `specs/NN-slug.md` (comanda `/spec`) i, un cop aprovada, s'implementa pas a pas amb `/spec-impl`. Vegeu `CLAUDE.md` per als detalls del flux i l'historial de specs implementades.
