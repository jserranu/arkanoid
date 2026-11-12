// Llista de jocs del menú i configuració del seu rànquing (comú al menú i a la pàgina de puntuacions).
// Les storageKey han de coincidir amb les que fa servir cada joc a games/<id>/js/game.js.
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
