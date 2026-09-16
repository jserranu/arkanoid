const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const BLOCK_COLS = 8;
const BLOCK_ROWS = 5;
const BLOCK_WIDTH = 32;
const BLOCK_HEIGHT = 16;
const BLOCK_GAP = 8;
const BLOCK_TOP_MARGIN = 50;
const BLOCK_ROW_COLORS = [ 'red', 'yellow', 'green', 'cyan', 'magenta' ];
const PADDLE_SPEED = 8;

let canvas;
let ctx;
let paddle;
let ball;
let blocks;
let gameState;

const keysPressed = {};
let mouseX = null;
let lastInput = 'keyboard';

function createInitialState() {
  paddle = {
    x: CANVAS_WIDTH / 2 - 162 / 2,
    y: CANVAS_HEIGHT - 30,
    width: 162,
    height: 14,
  };

  ball = {
    x: CANVAS_WIDTH / 2,
    y: paddle.y - 8,
    radius: 8,
    dx: 4,
    dy: -4,
  };

  blocks = [];
  const gridWidth = BLOCK_COLS * BLOCK_WIDTH + ( BLOCK_COLS - 1 ) * BLOCK_GAP;
  const leftMargin = ( CANVAS_WIDTH - gridWidth ) / 2;

  for ( let row = 0; row < BLOCK_ROWS; row++ ) {
    const color = BLOCK_ROW_COLORS[ row ];
    for ( let col = 0; col < BLOCK_COLS; col++ ) {
      blocks.push( {
        x: leftMargin + col * ( BLOCK_WIDTH + BLOCK_GAP ),
        y: BLOCK_TOP_MARGIN + row * ( BLOCK_HEIGHT + BLOCK_GAP ),
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        color,
        alive: true,
      } );
    }
  }

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

    block.alive = false;

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

function updateBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if ( ball.x - ball.radius <= 0 ) {
    ball.x = ball.radius;
    ball.dx = -ball.dx;
  } else if ( ball.x + ball.radius >= CANVAS_WIDTH ) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.dx = -ball.dx;
  }

  if ( ball.y - ball.radius <= 0 ) {
    ball.y = ball.radius;
    ball.dy = -ball.dy;
  }

  checkPaddleCollision();
  checkBlockCollisions();
}

function update() {
  updatePaddle();
  updateBall();
}

function gameLoop() {
  update();

  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  drawBlocks();
  drawPaddle();
  drawBall();

  requestAnimationFrame( gameLoop );
}

function setupInput() {
  window.addEventListener( 'keydown', ( e ) => {
    keysPressed[ e.key ] = true;
    lastInput = 'keyboard';
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
