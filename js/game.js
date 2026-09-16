const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const BLOCK_COLS = 8;
const BLOCK_ROWS = 5;
const BLOCK_WIDTH = 44;
const BLOCK_HEIGHT = 22;
const BLOCK_GAP = 8;
const BLOCK_TOP_MARGIN = 50;
const ALL_BLOCK_COLORS = [ 'gray', 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const PADDLE_SPEED = 8;
const PADDLE_WIDTH = 81;
const POINTS_PER_BLOCK = 10;
const INITIAL_LIVES = 3;
const LIFE_ICON_SIZE = 16;
const HUD_MARGIN = 16;
const TOTAL_LEVELS = 5;
const RESISTANT_BLOCKS_PER_LEVEL_STEP = 3;
const BASE_BALL_SPEED_X = 4;
const BASE_BALL_SPEED_Y = -4;
const LEVEL_SPEED_INCREASE = 1.1;
const LEVEL_PATTERNS = [ 'full', 'pyramid', 'checkerboard', 'diamond', 'stripes' ];

let canvas;
let ctx;
let paddle;
let ball;
let blocks;
let explosions;
let gameState;
let score;
let lives;
let currentLevel;
let ballSpeedMultiplier;
let muted = false;

const ballBounceAudio = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSoundAudio = new Audio( 'assets/sounds/break-sound.mp3' );

function playSound( baseAudio ) {
  if ( muted ) return;
  const instance = baseAudio.cloneNode();
  instance.play().catch( () => {} );
}

const keysPressed = {};
let mouseX = null;
let lastInput = 'keyboard';

function resetPaddleAndBall() {
  paddle = {
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - 30,
    width: PADDLE_WIDTH,
    height: 14,
  };

  ball = {
    x: CANVAS_WIDTH / 2,
    y: paddle.y - 8,
    radius: 8,
    dx: BASE_BALL_SPEED_X * ballSpeedMultiplier,
    dy: BASE_BALL_SPEED_Y * ballSpeedMultiplier,
  };
}

function isBlockPresentInPattern( pattern, row, col ) {
  switch ( pattern ) {
    case 'pyramid': {
      const width = Math.min( BLOCK_COLS, 2 * row + 1 );
      const start = Math.floor( ( BLOCK_COLS - width ) / 2 );
      return col >= start && col < start + width;
    }
    case 'checkerboard':
      return ( row + col ) % 2 === 0;
    case 'diamond': {
      const midRow = ( BLOCK_ROWS - 1 ) / 2;
      const distanceFromMid = Math.abs( row - midRow );
      const width = Math.max( 1, Math.round( BLOCK_COLS * ( 1 - distanceFromMid / ( midRow + 1 ) ) ) );
      const start = Math.floor( ( BLOCK_COLS - width ) / 2 );
      return col >= start && col < start + width;
    }
    case 'stripes':
      return row % 2 === 0;
    case 'full':
    default:
      return true;
  }
}

function generateBlocksForLevel( level ) {
  const generatedBlocks = [];
  const gridWidth = BLOCK_COLS * BLOCK_WIDTH + ( BLOCK_COLS - 1 ) * BLOCK_GAP;
  const leftMargin = ( CANVAS_WIDTH - gridWidth ) / 2;
  const pattern = LEVEL_PATTERNS[ ( level - 1 ) % LEVEL_PATTERNS.length ];

  for ( let row = 0; row < BLOCK_ROWS; row++ ) {
    const color = ALL_BLOCK_COLORS[ Math.floor( Math.random() * ALL_BLOCK_COLORS.length ) ];
    for ( let col = 0; col < BLOCK_COLS; col++ ) {
      if ( !isBlockPresentInPattern( pattern, row, col ) ) continue;
      generatedBlocks.push( {
        x: leftMargin + col * ( BLOCK_WIDTH + BLOCK_GAP ),
        y: BLOCK_TOP_MARGIN + row * ( BLOCK_HEIGHT + BLOCK_GAP ),
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        color,
        alive: true,
        hitsRemaining: 1,
      } );
    }
  }

  const resistantCount = Math.min( RESISTANT_BLOCKS_PER_LEVEL_STEP * ( level - 1 ), generatedBlocks.length );
  const shuffledIndices = generatedBlocks.map( ( _, index ) => index );
  for ( let i = shuffledIndices.length - 1; i > 0; i-- ) {
    const j = Math.floor( Math.random() * ( i + 1 ) );
    [ shuffledIndices[ i ], shuffledIndices[ j ] ] = [ shuffledIndices[ j ], shuffledIndices[ i ] ];
  }
  for ( let i = 0; i < resistantCount; i++ ) {
    generatedBlocks[ shuffledIndices[ i ] ].hitsRemaining = 2;
  }

  return generatedBlocks;
}

function createInitialState() {
  score = 0;
  lives = INITIAL_LIVES;
  currentLevel = 1;
  ballSpeedMultiplier = 1;

  resetPaddleAndBall();
  blocks = generateBlocksForLevel( currentLevel );
  explosions = [];

  gameState = 'playing';
}

function advanceToNextLevel() {
  currentLevel += 1;
  ballSpeedMultiplier *= LEVEL_SPEED_INCREASE;
  blocks = generateBlocksForLevel( currentLevel );
  explosions = [];
  resetPaddleAndBall();
  gameState = 'playing';
}

function drawPaddle() {
  drawSprite( ctx, 'paddle', paddle.x, paddle.y, paddle.width, paddle.height );
}

function drawBall() {
  drawSprite( ctx, 'ball', ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2 );
}

function drawBlocks() {
  for ( const block of blocks ) {
    if ( !block.alive ) continue;
    drawSprite( ctx, `block_${ block.color }`, block.x, block.y, block.width, block.height );
    if ( block.hitsRemaining > 1 ) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect( block.x, block.y, block.width, block.height );
    }
  }
}

function drawExplosions() {
  const now = performance.now();
  const frameDuration = EXPLOSION_DURATION / 4;

  for ( const explosion of explosions ) {
    const elapsed = now - explosion.startTime;
    const frame = Math.min( 3, Math.floor( elapsed / frameDuration ) );
    drawFrame( ctx, EXPLOSION_FRAMES[ explosion.color ][ frame ], explosion.x, explosion.y, explosion.width, explosion.height );
  }
}

function clampPaddleX( x ) {
  return Math.max( 0, Math.min( CANVAS_WIDTH - paddle.width, x ) );
}

function updatePaddle() {
  if ( lastInput === 'mouse' && mouseX !== null ) {
    paddle.x = clampPaddleX( mouseX - paddle.width / 2 );
    return;
  }

  if ( keysPressed[ 'ArrowLeft' ] || keysPressed[ 'a' ] || keysPressed[ 'A' ] ) {
    paddle.x = clampPaddleX( paddle.x - PADDLE_SPEED );
  }
  if ( keysPressed[ 'ArrowRight' ] || keysPressed[ 'd' ] || keysPressed[ 'D' ] ) {
    paddle.x = clampPaddleX( paddle.x + PADDLE_SPEED );
  }
}

const PADDLE_MAX_BOUNCE_ANGLE = Math.PI / 3;

function checkPaddleCollision() {
  if ( ball.dy <= 0 ) return;
  if ( ball.y + ball.radius < paddle.y ) return;
  if ( ball.y - ball.radius > paddle.y + paddle.height ) return;
  if ( ball.x + ball.radius < paddle.x || ball.x - ball.radius > paddle.x + paddle.width ) return;

  playSound( ballBounceAudio );

  const speed = Math.hypot( ball.dx, ball.dy );
  const paddleCenter = paddle.x + paddle.width / 2;
  const hitPos = ( ball.x - paddleCenter ) / ( paddle.width / 2 );
  const clampedHitPos = Math.max( -1, Math.min( 1, hitPos ) );
  const angle = clampedHitPos * PADDLE_MAX_BOUNCE_ANGLE;

  ball.dx = speed * Math.sin( angle );
  ball.dy = -speed * Math.cos( angle );
  ball.y = paddle.y - ball.radius;
}

function ballOverlapsBlock( block ) {
  return ball.x + ball.radius > block.x &&
    ball.x - ball.radius < block.x + block.width &&
    ball.y + ball.radius > block.y &&
    ball.y - ball.radius < block.y + block.height;
}

function checkBlockCollisions() {
  for ( const block of blocks ) {
    if ( !block.alive ) continue;
    if ( !ballOverlapsBlock( block ) ) continue;

    block.hitsRemaining -= 1;

    if ( block.hitsRemaining <= 0 ) {
      block.alive = false;
      score += POINTS_PER_BLOCK;

      explosions.push( {
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        color: block.color,
        startTime: performance.now(),
      } );

      playSound( breakSoundAudio );
    } else {
      playSound( ballBounceAudio );
    }

    const overlapLeft = ( ball.x + ball.radius ) - block.x;
    const overlapRight = ( block.x + block.width ) - ( ball.x - ball.radius );
    const overlapTop = ( ball.y + ball.radius ) - block.y;
    const overlapBottom = ( block.y + block.height ) - ( ball.y - ball.radius );

    const minOverlapX = Math.min( overlapLeft, overlapRight );
    const minOverlapY = Math.min( overlapTop, overlapBottom );

    if ( minOverlapX < minOverlapY ) {
      ball.dx = -ball.dx;
    } else {
      ball.dy = -ball.dy;
    }

    break;
  }
}

function allBlocksDestroyed() {
  return blocks.every( ( block ) => !block.alive );
}

function updateBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if ( ball.x - ball.radius <= 0 ) {
    ball.x = ball.radius;
    ball.dx = -ball.dx;
    playSound( ballBounceAudio );
  } else if ( ball.x + ball.radius >= CANVAS_WIDTH ) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.dx = -ball.dx;
    playSound( ballBounceAudio );
  }

  if ( ball.y - ball.radius <= 0 ) {
    ball.y = ball.radius;
    ball.dy = -ball.dy;
    playSound( ballBounceAudio );
  }

  checkPaddleCollision();
  checkBlockCollisions();

  if ( allBlocksDestroyed() ) {
    gameState = currentLevel < TOTAL_LEVELS ? 'levelComplete' : 'won';
    return;
  }

  if ( ball.y - ball.radius > CANVAS_HEIGHT ) {
    lives -= 1;
    if ( lives <= 0 ) {
      gameState = 'lost';
    } else {
      resetPaddleAndBall();
    }
  }
}

function updateExplosions() {
  const now = performance.now();
  explosions = explosions.filter( ( explosion ) => now - explosion.startTime < EXPLOSION_DURATION );
}

function update() {
  if ( gameState !== 'playing' ) return;

  updatePaddle();
  updateBall();
  updateExplosions();
}

function drawScore() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText( `${ score }`, HUD_MARGIN, HUD_MARGIN );

  ctx.font = '14px sans-serif';
  ctx.fillText( `Nivell ${ currentLevel }/${ TOTAL_LEVELS }`, HUD_MARGIN, HUD_MARGIN + 26 );
}

function drawLives() {
  for ( let i = 0; i < lives; i++ ) {
    const x = CANVAS_WIDTH - HUD_MARGIN - ( i + 1 ) * ( LIFE_ICON_SIZE + 4 );
    drawSprite( ctx, 'ball', x, HUD_MARGIN, LIFE_ICON_SIZE, LIFE_ICON_SIZE );
  }
}

function drawOverlay() {
  if ( gameState === 'playing' ) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let message;
  let continueMessage;
  if ( gameState === 'levelComplete' ) {
    message = `Nivell ${ currentLevel } superat!`;
    continueMessage = 'Prem Espai o Enter per continuar';
  } else if ( gameState === 'won' ) {
    message = 'Has guanyat el joc!';
    continueMessage = 'Prem Espai o Enter per tornar a jugar';
  } else {
    message = 'Game Over';
    continueMessage = 'Prem Espai o Enter per tornar a jugar';
  }
  ctx.fillText( message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20 );

  ctx.font = '20px sans-serif';
  ctx.fillText( continueMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30 );
}

function gameLoop() {
  update();

  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  drawBlocks();
  drawExplosions();
  drawPaddle();
  drawBall();
  drawScore();
  drawLives();
  drawOverlay();

  requestAnimationFrame( gameLoop );
}

function setupInput() {
  window.addEventListener( 'keydown', ( e ) => {
    keysPressed[ e.key ] = true;
    lastInput = 'keyboard';

    if ( e.key === 'm' || e.key === 'M' ) {
      muted = !muted;
    }

    if ( gameState === 'levelComplete' && ( e.key === ' ' || e.key === 'Enter' ) ) {
      advanceToNextLevel();
    } else if ( ( gameState === 'won' || gameState === 'lost' ) && ( e.key === ' ' || e.key === 'Enter' ) ) {
      createInitialState();
    }
  } );

  window.addEventListener( 'keyup', ( e ) => {
    keysPressed[ e.key ] = false;
  } );

  canvas.addEventListener( 'mousemove', ( e ) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    lastInput = 'mouse';
  } );
}

function initGame() {
  canvas = document.getElementById( 'game' );
  ctx = canvas.getContext( '2d' );

  createInitialState();
  setupInput();
  requestAnimationFrame( gameLoop );
}
