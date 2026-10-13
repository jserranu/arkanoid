const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const TOTAL_LEVELS = 5;
const FPS = 60;
const LEVEL_DURATION_FRAMES = 60 * FPS;
const INITIAL_LIVES = 3;
const HUD_MARGIN = 16;
const LIFE_ICON_SIZE = 16;
const SHIP_WIDTH = 30;
const SHIP_HEIGHT = 36;
const SHIP_SPEED = 5;
const SHIP_COLOR = '#4fc3f7';
const SHIP_HIT_RADIUS = 14;
const INVULNERABLE_FRAMES = 120;                 // 2 s
const BLINK_PERIOD_FRAMES = 6;
const BULLET_SPEED = 9;
const BULLET_LENGTH = 10;
const BULLET_COLOR = '#ffeb3b';
const FIRE_COOLDOWN_FRAMES = 15;                 // 4 trets/s
const ASTEROID_SIZES = {
  large: { radius: 40, points: 20, splitsInto: 'medium' },
  medium: { radius: 22, points: 50, splitsInto: 'small' },
  small: { radius: 12, points: 100, splitsInto: null }
};
const ASTEROID_VERTICES = 10;
const ASTEROID_MIN_ROUNDNESS = 0.75;              // radi mínim d'un vèrtex, en proporció del radi
const ASTEROID_DIAGONAL_MIN_ANGLE = Math.PI / 12; // 15° respecte de la vertical
const ASTEROID_DIAGONAL_MAX_ANGLE = Math.PI / 5;  // 36°
const ASTEROID_COLOR = '#bbb';
const FRAGMENT_SPREAD_ANGLE = Math.PI / 6;       // 30° a cada costat de la direcció original
const FRAGMENT_SPEED_FACTOR = 1.3;
const RANKING_STORAGE_KEY = 'starship:ranking:v1';
const RANKING_TABLE_TOP = 150;
const GAME_MENU_URL = '../../index.html';
const GAMES_BUTTON = { x: 664, y: 44, width: 120, height: 36, label: 'Jocs' };
const LEVELS = [
  { spawnIntervalFrames: 96, minSpeed: 1.5, maxSpeed: 2.5 },
  { spawnIntervalFrames: 84, minSpeed: 1.8, maxSpeed: 2.8 },
  { spawnIntervalFrames: 72, minSpeed: 2.1, maxSpeed: 3.1 },
  { spawnIntervalFrames: 60, minSpeed: 2.4, maxSpeed: 3.4 },
  { spawnIntervalFrames: 48, minSpeed: 2.7, maxSpeed: 3.7 }
];
// tecles de moviment (e.code, independent de la distribució del teclat) → direcció
const MOVE_KEYS = {
  ArrowLeft: [ -1, 0 ], KeyA: [ -1, 0 ],
  ArrowRight: [ 1, 0 ], KeyD: [ 1, 0 ],
  ArrowUp: [ 0, -1 ], KeyW: [ 0, -1 ],
  ArrowDown: [ 0, 1 ], KeyS: [ 0, 1 ]
};

let canvas;
let ctx;

// 'choosePlayer', 'playing', 'paused', 'levelComplete', 'won', 'lost'
let gameState = 'choosePlayer';
let score;
let lives;
let level;
let levelFrames;
let ship;
let bullets;
let fireCooldown;
let asteroids;
let spawnFrames;
const keysPressed = new Set();
let gamesButtonHovered = false;
let playerName = '';
const ranking = Ranking.create( {
  storageKey: RANKING_STORAGE_KEY,
  extraField: 'level',
  extraLabel: 'Nivell'
} );
let lastRankingEntry = null;
let playerSelect;

// Selecció de jugador (llista o entrada del nom) delegada al component comú
function promptForPlayer() {
  gameState = 'choosePlayer';
  playerSelect.start();
}

function startWithPlayer( name ) {
  playerName = name;
  gameState = 'playing';
}

// la partida acabada (guanyada o perduda) es desa amb el nivell on s'ha acabat
function endGame( state ) {
  gameState = state;
  lastRankingEntry = ranking.add( { name: playerName, score, extra: level } );
}

function createInitialState() {
  lastRankingEntry = null;
  score = 0;
  lives = INITIAL_LIVES;
  level = 1;
  levelFrames = 0;
  resetShip();
  bullets = [];
  fireCooldown = 0;
  asteroids = [];
  spawnFrames = LEVELS[ 0 ].spawnIntervalFrames;
}

function randomBetween( min, max ) {
  return min + Math.random() * ( max - min );
}

// forma irregular fixa: un factor de radi per vèrtex, repartits en angles iguals
function createAsteroid( size, x, y, vx, vy ) {
  const shape = [];
  for ( let i = 0; i < ASTEROID_VERTICES; i++ ) shape.push( randomBetween( ASTEROID_MIN_ROUNDNESS, 1 ) );
  return { x, y, vx, vy, size, radius: ASTEROID_SIZES[ size ].radius, shape };
}

// asteroide gran per sobre del canvas, en vertical o en diagonal (50 %)
function spawnAsteroid() {
  const { minSpeed, maxSpeed } = LEVELS[ level - 1 ];
  const speed = randomBetween( minSpeed, maxSpeed );
  let angle = 0;
  if ( Math.random() < 0.5 ) {
    angle = randomBetween( ASTEROID_DIAGONAL_MIN_ANGLE, ASTEROID_DIAGONAL_MAX_ANGLE );
    if ( Math.random() < 0.5 ) angle = -angle;
  }
  const radius = ASTEROID_SIZES.large.radius;
  const x = randomBetween( radius, CANVAS_WIDTH - radius );
  asteroids.push( createAsteroid( 'large', x, -radius, speed * Math.sin( angle ), speed * Math.cos( angle ) ) );
}

function updateAsteroids() {
  if ( --spawnFrames <= 0 ) {
    spawnAsteroid();
    spawnFrames = LEVELS[ level - 1 ].spawnIntervalFrames;
  }

  for ( const asteroid of asteroids ) {
    asteroid.x += asteroid.vx;
    asteroid.y += asteroid.vy;
    // rebot a les parets laterals (els verticals tenen vx = 0 i no hi arriben)
    if ( asteroid.x - asteroid.radius < 0 && asteroid.vx < 0 ) asteroid.vx = -asteroid.vx;
    if ( asteroid.x + asteroid.radius > CANVAS_WIDTH && asteroid.vx > 0 ) asteroid.vx = -asteroid.vx;
  }
  // els que surten per baix desapareixen sense penalització
  asteroids = asteroids.filter( ( asteroid ) => asteroid.y - asteroid.radius < CANVAS_HEIGHT );
}

// nau centrada a la part inferior; (x, y) és el centre del triangle
function resetShip() {
  ship = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - SHIP_HEIGHT, invulnerableFrames: 0 };
}

function updateShip() {
  let dx = 0;
  let dy = 0;
  for ( const code of keysPressed ) {
    const dir = MOVE_KEYS[ code ];
    if ( !dir ) continue;
    dx += dir[ 0 ];
    dy += dir[ 1 ];
  }
  // fletxa i WASD de la mateixa direcció no sumen el doble
  dx = Math.sign( dx );
  dy = Math.sign( dy );
  if ( dx === 0 && dy === 0 ) return;

  // en diagonal, la mateixa velocitat que en línia recta
  const length = Math.hypot( dx, dy );
  ship.x += dx / length * SHIP_SPEED;
  ship.y += dy / length * SHIP_SPEED;

  ship.x = Math.min( Math.max( ship.x, SHIP_WIDTH / 2 ), CANVAS_WIDTH - SHIP_WIDTH / 2 );
  ship.y = Math.min( Math.max( ship.y, SHIP_HEIGHT / 2 ), CANVAS_HEIGHT - SHIP_HEIGHT / 2 );
}

// mantenint Espai es dispara des de la punta de la nau amb cadència fixa
function updateBullets() {
  if ( fireCooldown > 0 ) fireCooldown--;
  if ( keysPressed.has( 'Space' ) && fireCooldown === 0 ) {
    bullets.push( { x: ship.x, y: ship.y - SHIP_HEIGHT / 2 } );
    fireCooldown = FIRE_COOLDOWN_FRAMES;
  }

  for ( const bullet of bullets ) bullet.y -= BULLET_SPEED;
  bullets = bullets.filter( ( bullet ) => bullet.y + BULLET_LENGTH > 0 );
}

// dos fragments de la mida següent, desviats a banda i banda i una mica més ràpids
function splitAsteroid( asteroid ) {
  const nextSize = ASTEROID_SIZES[ asteroid.size ].splitsInto;
  if ( !nextSize ) return [];
  const speed = Math.hypot( asteroid.vx, asteroid.vy ) * FRAGMENT_SPEED_FACTOR;
  const angle = Math.atan2( asteroid.vx, asteroid.vy );
  return [ -FRAGMENT_SPREAD_ANGLE, FRAGMENT_SPREAD_ANGLE ].map( ( spread ) =>
    createAsteroid( nextSize, asteroid.x, asteroid.y,
      speed * Math.sin( angle + spread ), speed * Math.cos( angle + spread ) )
  );
}

// cada tret (la seva punta) destrueix com a màxim un asteroide
function handleBulletHits() {
  const remainingBullets = [];
  for ( const bullet of bullets ) {
    const hit = asteroids.find( ( asteroid ) =>
      Math.hypot( bullet.x - asteroid.x, bullet.y - asteroid.y ) < asteroid.radius );
    if ( !hit ) {
      remainingBullets.push( bullet );
      continue;
    }
    score += ASTEROID_SIZES[ hit.size ].points;
    asteroids.splice( asteroids.indexOf( hit ), 1, ...splitAsteroid( hit ) );
  }
  bullets = remainingBullets;
}

// un xoc resta una vida, destrueix l'asteroide sense punts i dona uns segons d'invulnerabilitat
function handleShipHit() {
  if ( ship.invulnerableFrames > 0 ) {
    ship.invulnerableFrames--;
    return;
  }
  const hit = asteroids.find( ( asteroid ) =>
    Math.hypot( ship.x - asteroid.x, ship.y - asteroid.y ) < asteroid.radius + SHIP_HIT_RADIUS );
  if ( !hit ) return;

  asteroids.splice( asteroids.indexOf( hit ), 1 );
  lives--;
  if ( lives <= 0 ) {
    endGame( 'lost' );
    return;
  }
  ship.invulnerableFrames = INVULNERABLE_FRAMES;
}

// en esgotar el temps es buida la pantalla; després del darrer nivell, victòria
function updateLevelTimer() {
  if ( ++levelFrames < LEVEL_DURATION_FRAMES ) return;
  asteroids = [];
  bullets = [];
  if ( level === TOTAL_LEVELS ) endGame( 'won' );
  else gameState = 'levelComplete';
}

// el nivell següent comença amb la nau a la posició inicial; puntuació i vides es conserven
function startNextLevel() {
  level++;
  levelFrames = 0;
  spawnFrames = LEVELS[ level - 1 ].spawnIntervalFrames;
  fireCooldown = 0;
  resetShip();
  gameState = 'playing';
}

function isGamesButtonVisible() {
  return gameState === 'paused' || gameState === 'won' || gameState === 'lost';
}

// Abandona la partida en curs (no es desa al rànquing) i torna al menú de jocs
function returnToGameSelector() {
  window.location.href = GAME_MENU_URL;
}

function isOverGamesButton( x, y ) {
  return x >= GAMES_BUTTON.x && x <= GAMES_BUTTON.x + GAMES_BUTTON.width &&
    y >= GAMES_BUTTON.y && y <= GAMES_BUTTON.y + GAMES_BUTTON.height;
}

function update() {
  if ( gameState !== 'playing' ) return;
  updateShip();
  updateBullets();
  updateAsteroids();
  handleBulletHits();
  handleShipHit();
  if ( gameState === 'playing' ) updateLevelTimer();
}

function drawAsteroids() {
  ctx.strokeStyle = ASTEROID_COLOR;
  ctx.lineWidth = 2;
  for ( const asteroid of asteroids ) {
    ctx.beginPath();
    asteroid.shape.forEach( ( factor, i ) => {
      const angle = i / ASTEROID_VERTICES * Math.PI * 2;
      const px = asteroid.x + Math.cos( angle ) * asteroid.radius * factor;
      const py = asteroid.y + Math.sin( angle ) * asteroid.radius * factor;
      if ( i === 0 ) ctx.moveTo( px, py );
      else ctx.lineTo( px, py );
    } );
    ctx.closePath();
    ctx.stroke();
  }
}

// (x, y) és la punta del tret
function drawBullets() {
  ctx.strokeStyle = BULLET_COLOR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for ( const bullet of bullets ) {
    ctx.moveTo( bullet.x, bullet.y );
    ctx.lineTo( bullet.x, bullet.y + BULLET_LENGTH );
  }
  ctx.stroke();
}

function drawShip() {
  // parpelleig durant la invulnerabilitat
  if ( Math.floor( ship.invulnerableFrames / BLINK_PERIOD_FRAMES ) % 2 === 1 ) return;
  const top = ship.y - SHIP_HEIGHT / 2;
  const bottom = ship.y + SHIP_HEIGHT / 2;
  ctx.fillStyle = SHIP_COLOR;
  ctx.beginPath();
  ctx.moveTo( ship.x, top );
  ctx.lineTo( ship.x + SHIP_WIDTH / 2, bottom );
  ctx.lineTo( ship.x, bottom - SHIP_HEIGHT / 4 );
  ctx.lineTo( ship.x - SHIP_WIDTH / 2, bottom );
  ctx.closePath();
  ctx.fill();
}

function getRemainingSeconds() {
  return Math.ceil( ( LEVEL_DURATION_FRAMES - levelFrames ) / FPS );
}

// icona de vida: la mateixa silueta triangular de la nau, en petit
function drawLifeIcon( x, y ) {
  ctx.fillStyle = SHIP_COLOR;
  ctx.beginPath();
  ctx.moveTo( x + LIFE_ICON_SIZE / 2, y );
  ctx.lineTo( x + LIFE_ICON_SIZE, y + LIFE_ICON_SIZE );
  ctx.lineTo( x, y + LIFE_ICON_SIZE );
  ctx.closePath();
  ctx.fill();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText( `${ score }`, HUD_MARGIN, HUD_MARGIN );

  ctx.textAlign = 'center';
  ctx.fillText( `Nivell ${ level } · ${ getRemainingSeconds() } s`, CANVAS_WIDTH / 2, HUD_MARGIN );

  for ( let i = 0; i < lives; i++ ) {
    const x = CANVAS_WIDTH - HUD_MARGIN - ( i + 1 ) * ( LIFE_ICON_SIZE + 6 ) + 6;
    drawLifeIcon( x, HUD_MARGIN );
  }
}

function drawOverlayText( title, subtitle ) {
  ctx.fillStyle = 'rgba( 0, 0, 0, 0.6 )';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText( title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20 );
  if ( subtitle ) {
    ctx.font = '20px sans-serif';
    ctx.fillText( subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30 );
  }
}

function drawGamesButton() {
  const { x, y, width, height, label } = GAMES_BUTTON;
  ctx.fillStyle = gamesButtonHovered ? 'rgba(255, 235, 59, 0.2)' : 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect( x, y, width, height );
  ctx.strokeStyle = gamesButtonHovered ? '#ffeb3b' : '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect( x, y, width, height );
  ctx.fillStyle = gamesButtonHovered ? '#ffeb3b' : '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( label, x + width / 2, y + height / 2 );
}

function drawRankingScreen( message ) {
  ctx.fillStyle = 'rgba( 0, 0, 0, 0.85 )';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( message, CANVAS_WIDTH / 2, 50 );
  ctx.font = '22px sans-serif';
  ctx.fillText( `Puntuació: ${ score }`, CANVAS_WIDTH / 2, 95 );

  ranking.drawTable( ctx, 200, RANKING_TABLE_TOP, lastRankingEntry );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '20px sans-serif';
  ctx.fillText( 'Prem Espai o Enter per tornar a jugar', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40 );
}

function drawOverlay() {
  if ( gameState === 'choosePlayer' ) {
    ctx.fillStyle = 'rgba( 0, 0, 0, 0.85 )';
    ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );
    playerSelect.draw();
  } else if ( gameState === 'paused' ) {
    drawOverlayText( 'PAUSA', 'Prem Espai o Enter per continuar' );
  } else if ( gameState === 'levelComplete' ) {
    drawOverlayText( `Nivell ${ level } superat`, 'Prem Espai o Enter per continuar' );
  } else if ( gameState === 'won' ) {
    drawRankingScreen( 'Has guanyat!' );
  } else if ( gameState === 'lost' ) {
    drawRankingScreen( 'Game Over' );
  }
  if ( isGamesButtonVisible() ) drawGamesButton();
}

function gameLoop() {
  update();

  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  drawAsteroids();
  drawBullets();
  drawShip();
  drawHUD();
  drawOverlay();

  requestAnimationFrame( gameLoop );
}

function getCanvasCoordinates( e ) {
  const rect = canvas.getBoundingClientRect();
  return [
    ( e.clientX - rect.left ) * canvas.width / rect.width,
    ( e.clientY - rect.top ) * canvas.height / rect.height
  ];
}

function setupInput() {
  window.addEventListener( 'keydown', ( e ) => {
    if ( gameState === 'choosePlayer' ) {
      playerSelect.handleKey( e );
      return;
    }

    if ( MOVE_KEYS[ e.code ] || e.code === 'Space' ) e.preventDefault();
    keysPressed.add( e.code );

    // e.repeat: mantenir Espai disparant no ha de saltar la pantalla de nivell superat ni treure la pausa
    const confirm = !e.repeat && ( e.code === 'Space' || e.code === 'Enter' );
    if ( gameState === 'playing' && ( e.code === 'KeyP' || e.code === 'Escape' ) ) {
      gameState = 'paused';
    } else if ( gameState === 'paused' && confirm ) {
      gameState = 'playing';
    } else if ( gameState === 'levelComplete' && confirm ) {
      startNextLevel();
    } else if ( ( gameState === 'won' || gameState === 'lost' ) && confirm ) {
      createInitialState();
      promptForPlayer();
    }
  } );
  window.addEventListener( 'keyup', ( e ) => {
    keysPressed.delete( e.code );
  } );
  // si la finestra perd el focus no arriben els keyup: s'evita que la nau continuï movent-se
  window.addEventListener( 'blur', () => keysPressed.clear() );

  canvas.addEventListener( 'mousemove', ( e ) => {
    if ( gameState === 'choosePlayer' ) {
      playerSelect.handleMouseMove( ...getCanvasCoordinates( e ) );
      return;
    }
    gamesButtonHovered = isGamesButtonVisible() && isOverGamesButton( ...getCanvasCoordinates( e ) );
  } );
  canvas.addEventListener( 'click', ( e ) => {
    if ( gameState === 'choosePlayer' ) {
      playerSelect.handleClick( ...getCanvasCoordinates( e ) );
      return;
    }
    if ( isGamesButtonVisible() && isOverGamesButton( ...getCanvasCoordinates( e ) ) ) returnToGameSelector();
  } );
}

function initGame() {
  canvas = document.getElementById( 'game' );
  ctx = canvas.getContext( '2d' );

  ranking.load();
  playerSelect = PlayerSelect.create( {
    ctx,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    title: 'STARSHIP',
    ranking,
    onPlayerChosen: startWithPlayer
  } );
  createInitialState();
  promptForPlayer();
  setupInput();
  requestAnimationFrame( gameLoop );
}
