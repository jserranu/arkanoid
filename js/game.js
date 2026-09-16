const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const BLOCK_COLS = 8;
const BLOCK_ROWS = 5;
const BLOCK_WIDTH = 32;
const BLOCK_HEIGHT = 16;
const BLOCK_GAP = 8;
const BLOCK_TOP_MARGIN = 50;
const BLOCK_ROW_COLORS = [ 'red', 'yellow', 'green', 'cyan', 'magenta' ];

let canvas;
let ctx;
let paddle;
let ball;
let blocks;
let gameState;

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
    dx: 0,
    dy: 0,
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

function gameLoop() {
  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  drawBlocks();
  drawPaddle();
  drawBall();

  requestAnimationFrame( gameLoop );
}

function initGame() {
  canvas = document.getElementById( 'game' );
  ctx = canvas.getContext( '2d' );

  createInitialState();
  requestAnimationFrame( gameLoop );
}
