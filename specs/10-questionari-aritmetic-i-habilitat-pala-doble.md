# 10 - Qüestionari aritmètic i habilitat de pala doble

**Estat:** Approved
**Depèn de:** SPEC 01, SPEC 03, SPEC 05
**Data:** 2026-10-02

**Objectiu:** Aturar el joc en trencar-se la meitat dels blocs de cada nivell per fer un qüestionari de 5 operacions (multiplicacions i divisions) amb 30 segons, de manera que encertar-les totes doni una habilitat acumulable (tecla `V`: pala el doble d'ample durant 30 s) i fallar-ne alguna n'hi resti una.

## Abast

**Dins de l'abast:**

- Nou estat `gameState = 'quiz'`, que congela el joc exactament com `'paused'` (`update()` no fa res; els efectes temporals —foc, imant, doble pilota, pala doble— i el comptador `levelFrames` queden aturats i continuen en reprendre).
- **Disparador:** un sol cop per nivell, en el moment en què el nombre de blocs destruïts arriba a `ceil(totalBlocsInicials / 2)`. Un bloc resistent només compta com a destruït quan desapareix. Si en el mateix fotograma s'acaben tots els blocs (el nivell es completa), no es mostra el qüestionari.
- **Qüestionari:** 5 preguntes seguides, una cada cop, amb un temporitzador global de 30 s (`QUIZ_TIME_FRAMES`) visible a la pantalla.
  - Cada pregunta és, a l'atzar, una multiplicació o una divisió.
  - Multiplicació: dos factors d'una xifra, entre 2 i 9 (p. ex. `7 × 8`).
  - Divisió: dividend d'un o dos xifres (màxim 99), divisor d'una xifra entre 2 i 9, i resultat enter exacte i de com a mínim 2 (p. ex. `72 ÷ 8`).
  - Dins del mateix qüestionari no es repeteix cap pregunta idèntica.
- **Entrada de la resposta només amb teclat:** dígits `0-9` (màxim 2 caràcters), `Backspace` per esborrar i `Enter` o `Espai` per confirmar. Confirmar amb el camp buit s'ignora. Qualsevol altra tecla s'ignora, incloses les dreceres `M`, `P` i `Escape`. El ratolí no fa res al qüestionari.
- **No es pot pausar durant el qüestionari:** la tecla `P` (igual que `Escape`) no passa mai `gameState` a `'paused'` mentre `gameState === 'quiz'`. El qüestionari ja és una aturada del joc amb el seu propi temporitzador, que no es pot aturar.
- En confirmar, es passa directament a la pregunta següent, sense indicar si ha estat correcta. Una resposta errada no talla el qüestionari: es responen les 5.
- **Resultat:** en respondre la cinquena pregunta, o en esgotar-se els 30 s, es mostra una pantalla de resultat amb la llista de les 5 preguntes marcades com a correctes (✓) o incorrectes/sense respondre (✗) i el missatge:
  - Les 5 correctes abans del temps: "Correcte! +1 habilitat".
  - Alguna errada o temps esgotat: "Error! −1 habilitat" (o "Error! Sense habilitats per perdre" si el comptador ja és 0; el comptador mai baixa de 0).
- Després d'un breu bloqueig d'entrada (`QUIZ_RESULT_LOCK_FRAMES`, 30 fotogrames) per evitar que el mateix `Espai`/`Enter` que ha confirmat l'última resposta descarti el resultat, `Espai` o `Enter` reprenen la partida (`gameState = 'playing'`). Es ignoren les repeticions de tecla (`e.repeat`).
- **Habilitats:** comptador `skillCount` (enter ≥ 0). Cada qüestionari correcte suma 1; cada qüestionari fallat o no acabat en 30 s en resta 1 (mínim 0). S'acumulen entre nivells i es reinicien a 0 en començar una partida nova (no es desen a `localStorage`).
- **Tecla `V`** (només a `'playing'`): si `skillCount > 0` i l'efecte no està actiu, gasta 1 habilitat i activa la pala doble durant 30 s (`WIDE_PADDLE_FRAMES`). L'amplada passa de `PADDLE_WIDTH` a `PADDLE_WIDTH * 2` mantenint el centre de la pala, i es limita perquè la pala no surti del canvas. En acabar l'efecte, l'amplada torna a `PADDLE_WIDTH` també mantenint el centre. Si `V` es prem amb l'efecte ja actiu o amb 0 habilitats, s'ignora (no gasta res ni allarga el temps).
- L'efecte de pala doble es cancel·la tant en canviar de nivell com en perdre una vida (com l'estrella blava): l'amplada torna a `PADDLE_WIDTH` i el temps restant es descarta. L'habilitat gastada no es recupera.
- **HUD:** a la zona superior esquerra, sota el "Bonus de temps", una línia amb un requadre taronja amb una "V" al mig (`SKILL_ICON_SIZE`, `SKILL_ICON_COLOR`) seguit del nombre d'habilitats acumulades i, mentre l'efecte està actiu, els segons restants just a continuació entre parèntesis (p. ex. `V 2 (25s)`). La línia ha de ser prou estreta per no solapar-se amb els blocs.

**Fora de l'abast (specs futures):**

- Altres operacions (sumes, restes, fraccions, nombres negatius o decimals) o dificultat creixent per nivell.
- Mostrar la resposta correcta de les preguntes errades.
- Més d'un qüestionari per nivell, o qüestionaris per temps o per vides.
- Persistir les habilitats a `localStorage` o entre partides.
- Habilitats diferents de la pala doble, o un menú per triar-les.
- Entrada amb ratolí o teclat virtual.
- Sons o animacions nous per al qüestionari o per a l'habilitat.
- Modificar el rànquing (no s'hi desa cap dada del qüestionari ni de les habilitats).

## Model de dades

Amplia l'estat global de SPEC 01/03/05/08/09:

```js
// Valors possibles de gameState: 'quiz' (nou), 'selectPlayer', 'enterName',
// 'playing', 'paused', 'levelComplete', 'won', 'lost'

let skillCount;               // habilitats de pala doble acumulades (>= 0)
let widePaddleActive;         // true mentre dura l'efecte
let widePaddleFramesRemaining;
let levelTotalBlocks;         // blocs inicials del nivell (per calcular la meitat)
let quizDoneThisLevel;        // true un cop mostrat el qüestionari d'aquest nivell
let quiz = null;              // estat del qüestionari actiu (veure sota)

// quiz
// {
//   questions: [ { text: '7 × 8', answer: 56, given: null | number } ],
//   index: 0,                // pregunta actual (0..4)
//   input: '',               // dígits que s'estan escrivint
//   framesRemaining: 1800,   // QUIZ_TIME_FRAMES
//   phase: 'answering' | 'result',
//   success: false,          // només a 'result'
//   resultLockFrames: 0      // bloqueig d'entrada a 'result'
// }
```

Constants noves (junt a les constants de `js/game.js`):

- `QUIZ_QUESTION_COUNT = 5`
- `QUIZ_TIME_FRAMES = 30 * FRAMES_PER_SECOND`
- `QUIZ_RESULT_LOCK_FRAMES = 30`
- `QUIZ_ANSWER_MAX_LENGTH = 2`
- `WIDE_PADDLE_FRAMES = 30 * FRAMES_PER_SECOND`
- `WIDE_PADDLE_FACTOR = 2`

Funcions noves (noms orientatius):

- `generateQuizQuestions()`: retorna les 5 preguntes segons les regles de l'abast.
- `startQuiz()`: crea `quiz`, `gameState = 'quiz'`, `quizDoneThisLevel = true`.
- `updateQuiz()`: decrementa `framesRemaining` i `resultLockFrames`; en arribar a 0 a `'answering'` crida `finishQuiz()`.
- `submitQuizAnswer()` i `handleQuizInput( e )`: processen dígits, `Backspace`, `Enter`/`Espai`.
- `finishQuiz()`: calcula `success`, actualitza `skillCount` i passa a `phase = 'result'`.
- `activateWidePaddle()` / `endWidePaddle()`: aplica i desfà l'amplada mantenint el centre.
- `drawQuizScreen()` i `drawSkillsHud()` (o ampliació de `drawScore()`).

Cap canvi de format a `localStorage`.

## Pla d'implementació

1. Afegir les constants i variables globals noves a `js/game.js` i inicialitzar-les a `createInitialState()` (`skillCount = 0`, `quiz = null`, etc.); inicialitzar `levelTotalBlocks`, `quizDoneThisLevel = false` i `widePaddleActive = false` també en començar cada nivell (`advanceToNextLevel()`). Sense canvis de comportament encara.
2. Implementar `generateQuizQuestions()`. Verificar a la consola del navegador que, en cridar-la molts cops, totes les multiplicacions tenen factors 2-9, totes les divisions són exactes amb dividend ≤ 99 i divisor 2-9, i no hi ha preguntes repetides dins d'un mateix qüestionari.
3. Afegir la línia d'habilitats al HUD (`drawScore()`): requadre taronja amb "V" i el nombre d'habilitats. Verificar que es veu sense solapar el "Bonus de temps".
4. Implementar `activateWidePaddle()`/`endWidePaddle()` i la tecla `V` a `'playing'`, amb el decrement de `widePaddleFramesRemaining` a `update()` i els segons restants entre parèntesis al HUD. Prova manual: posar `skillCount = 2` a la consola i comprovar que `V` dobla la pala 30 s, que una segona `V` amb l'efecte actiu s'ignora, que la pala no surt del canvas i que la pausa congela el temps.
5. Cancel·lar l'efecte de pala doble (`widePaddleActive`, temps i amplada) a `resetPaddleAndBall()`, que ja s'executa en canviar de nivell, en perdre una vida i en començar una partida nova. Verificar els tres casos.
6. Implementar l'estat `'quiz'`: `startQuiz()`, `updateQuiz()` cridat des de `update()` quan `gameState === 'quiz'` (abans del `return` de `gameState !== 'playing'`) i `drawQuizScreen()` des de `drawOverlay()` amb la fase `'answering'` (pregunta actual, camp de resposta amb cursor, temps restant, "Pregunta N/5"). Disparar-lo des de `updateBalls()` quan els blocs destruïts arribin a `ceil(levelTotalBlocks / 2)` i `!quizDoneThisLevel` (i el nivell no s'hagi completat). El joc ha de quedar congelat al fons.
7. Implementar `handleQuizInput( e )` com a branca prioritària al `keydown` de `setupInput()` (abans de `keysPressed` i de `M`): dígits, `Backspace`, `Enter`/`Espai` (amb `preventDefault()`), ignorant la resta. Implementar `submitQuizAnswer()` per desar la resposta i avançar. Verificar que `M`, `P`, `Escape` i el ratolí no tenen efecte i que el camp no passa de 2 dígits.
8. Implementar `finishQuiz()` i la fase `'result'` de `drawQuizScreen()` (llista ✓/✗ i missatge d'èxit o error), el bloqueig `QUIZ_RESULT_LOCK_FRAMES`, i la represa amb `Espai`/`Enter` (`gameState = 'playing'`). Cobrir els tres camins: tot correcte (+1), alguna errada (−1) i temps esgotat (−1), incloent el cas amb `skillCount = 0`.
9. Revisió final: jugar un nivell complet, un canvi de nivell amb habilitats acumulades, la pèrdua de totes les vides (nova partida torna a 0 habilitats) i la pausa durant un efecte actiu; comprovar que el comportament de SPEC 01-09 no ha canviat.

## Criteris d'acceptació

- [ ] En destruir-se la meitat (arrodonida cap amunt) dels blocs inicials d'un nivell, el joc s'atura i apareix la pantalla de qüestionari amb la pilota i els blocs congelats al fons.
- [ ] El qüestionari només apareix un cop per nivell i torna a aparèixer a cada nivell nou.
- [ ] Si el nivell s'acaba en el mateix fotograma en què s'arriba a la meitat, no apareix el qüestionari i es mostra la pantalla de nivell superat.
- [ ] Es mostren 5 preguntes, una cada cop, amb el temps restant en segons i "Pregunta N/5".
- [ ] Totes les multiplicacions són d'un factor 2-9 per un factor 2-9, i totes les divisions tenen dividend ≤ 99, divisor 2-9 i resultat enter ≥ 2.
- [ ] La resposta s'introdueix només amb dígits; `Backspace` esborra; `Enter` o `Espai` confirmen; amb el camp buit no passa res; no es poden escriure més de 2 dígits.
- [ ] Durant el qüestionari, `M`, `P`, `Escape` i el ratolí no tenen cap efecte.
- [ ] Prémer `P` (o `Escape`) durant el qüestionari, en qualsevol de les dues fases, no pausa el joc ni atura el temporitzador de 30 s, i `gameState` continua sent `'quiz'`.
- [ ] Respondre les 5 correctament abans de 30 s mostra "Correcte! +1 habilitat" i `skillCount` augmenta en 1.
- [ ] Una errada, o no acabar en 30 s, mostra "Error! −1 habilitat" i `skillCount` disminueix en 1 sense baixar de 0.
- [ ] La pantalla de resultat llista les 5 preguntes marcades ✓/✗, i no es pot descartar durant els primers 30 fotogrames; després `Espai` o `Enter` reprenen la partida.
- [ ] Mentre dura el qüestionari, no avancen el temps de nivell, l'acceleració de la pilota ni els efectes temporals; en reprendre continuen des d'on eren.
- [ ] Amb `skillCount > 0`, prémer `V` durant la partida el decrementa en 1 i duplica l'amplada de la pala durant 30 s, mantenint-ne el centre i sense sortir del canvas; en acabar torna a l'amplada normal.
- [ ] Prémer `V` amb l'efecte actiu o amb 0 habilitats no gasta cap habilitat ni allarga el temps.
- [ ] L'efecte es cancel·la (amplada i temps) tant en canviar de nivell com en perdre una vida.
- [ ] El HUD mostra el nombre d'habilitats en tot moment i, mentre l'efecte és actiu, els segons restants entre parèntesis just després, sense solapar-se amb els blocs.
- [ ] Les habilitats s'acumulen entre nivells i tornen a 0 en començar una partida nova.
- [ ] El comportament de la partida (rebots, blocs, power-ups, nivells, pausa, sons, rànquing) és idèntic al de SPEC 01-09 fora del qüestionari i de la pala doble.

## Decisions preses i descartades

- **Sí: `V` consumeix 1 habilitat i dobla la pala 30 s; si ja està activa, s'ignora.** Decisió de l'usuari (opció recomanada); evita apilar o allargar efectes i fa que cada habilitat tingui un valor clar. **No:** habilitats passives que no es gasten; **No:** que `V` amb l'efecte actiu sumi 30 s.
- **Sí: disparador a `ceil(blocsInicials / 2)` blocs destruïts, un sol cop per nivell.** Decisió de l'usuari; el total inicial és fix i evita dependre dels blocs resistents. **No:** comptar només blocs normals (més complex, sense avantatge).
- **Sí: estat `'quiz'` que congela el joc i tots els efectes temporals.** Decisió de l'usuari; reutilitza el patró de `'paused'` i evita que el qüestionari penalitzi el jugador fent caducar power-ups. **No:** deixar córrer els temporitzadors durant el qüestionari.
- **Sí: el qüestionari no es pot pausar amb `P`.** Decisió de l'usuari; evita que el jugador aturi el temporitzador de 30 s per guanyar temps. **No:** permetre la pausa congelant també el temporitzador del qüestionari.
- **Sí: es responen les 5 preguntes i el resultat es mostra al final.** Decisió de l'usuari; el jugador veu quantes ha encertat. **No:** acabar el qüestionari a la primera errada.
- **Sí: no es mostren les respostes correctes.** Evita que el qüestionari es pugui "estudiar" amb retroalimentació immediata; es pot reconsiderar en una spec posterior.
- **Sí: màxim 2 dígits de resposta, factors 2-9 i quocient ≥ 2.** Cobreix totes les respostes possibles (màx. 81) i evita operacions trivials (`×1`, `×0`, `÷1`) que no aporten dificultat.
- **Sí: temps esgotat compta com a fallada encara que s'hagin encertat les respostes donades.** Redactat així per l'usuari: "no s'acaba de respondre en 1 minut" (posteriorment reduït a 30 s a petició de l'usuari).
- **Sí: bloqueig breu d'entrada a la pantalla de resultat.** El mateix `Espai`/`Enter` que confirma l'última resposta no ha de descartar el resultat sense que el jugador el vegi.
- **Sí: l'efecte de pala doble es cancel·la en canviar de nivell i en perdre una vida (mida i temps).** Decisió de l'usuari; és coherent amb l'estrella blava i simplifica la implementació, ja que tot passa a `resetPaddleAndBall()`. **No:** conservar l'efecte en perdre una vida (proposta inicial de la spec).
- **Sí: habilitats no persistents (només dins la partida).** Mantenir-ho simple i sense canvis a `localStorage`; es reinicien amb cada partida nova. **No:** desar-les al rànquing o al perfil del jugador.
- **Sí: tot dins de `js/game.js`.** Coherent amb la resta del joc (sense eines de build ni mòduls).

## Riscos identificats

| Risc                                                                                   | Mitigació                                                                                                                  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `resetPaddleAndBall()` recrea la pala amb `PADDLE_WIDTH` sense desactivar l'efecte | Desactivar `widePaddleActive` i el temps al mateix `resetPaddleAndBall()`; verificar-ho al pas 5.                           |
| L'`Espai`/`Enter` de l'última resposta descarta el resultat sense veure'l              | `QUIZ_RESULT_LOCK_FRAMES` i ignorar `e.repeat`.                                                                            |
| Pala doble prop de la vora surt del canvas                                             | Reutilitzar `clampPaddleX()` després de canviar l'amplada.                                                                 |
| Una pilota enganxada (`ball.stuck`) queda descentrada en canviar l'amplada             | `updateBalls()` ja recalcula `ball.x` des del centre de la pala a cada fotograma.                                          |
| El qüestionari salta quan el nivell està a punt de completar-se                        | Comprovar `allBlocksDestroyed()` abans de disparar el qüestionari.                                                         |
| Un clic de ratolí a `'quiz'` llança pilotes enganxades en tornar al joc                | El `click` només actua a `'playing'`; verificar que a `'quiz'` s'ignora.                                                   |
| Premsa de `V` en un estat no jugable (pausa, qüestionari, finals)                      | La tecla `V` només es tracta quan `gameState === 'playing'`.                                                               |

## El que **no** hi ha en aquesta spec

- Operacions diferents de la multiplicació i la divisió, ni dificultat creixent.
- Mostrar les respostes correctes.
- Més d'un qüestionari per nivell.
- Persistència de les habilitats o canvis al rànquing.
- Habilitats diferents de la pala doble.
- Entrada per ratolí o tàctil.
- Sons o animacions nous.
