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
const POWERUP_BLOCKS_PER_LEVEL = 3;
const STAR_FALL_SPEED = 2;
const STAR_SIZE = 16;
const STAR_COLOR = '#ffeb3b';
const DOUBLE_POINTS_MULTIPLIER = 2;
const FIRE_POWERUP_BLOCKS_PER_LEVEL = 3;
const FIRE_DURATION_FRAMES = 900;
const FIRE_STAR_COLOR = '#e00f0c';
const FIRE_BALL_COLOR = '#e00f0c';
const FIRE_TRAIL_LENGTH = 8;
const LIFE_POWERUP_BLOCKS_PER_LEVEL = 1;
const LIFE_STAR_COLOR = '#43a047';
const LIFE_STAR_ZIGZAG_MIN_AMPLITUDE = 20;
const LIFE_STAR_ZIGZAG_MAX_AMPLITUDE = 50;
const LIFE_STAR_ZIGZAG_SPEED = 0.05;
const PLAYER_NAME_MAX_LENGTH = 10;
const PLAYER_NAME_DEFAULT = 'ANÒNIM';
const RANKING_MAX_ENTRIES = 10;
const RANKING_STORAGE_KEY = 'arkanoid:ranking:v1';
const PLAYER_LIST_ROW_HEIGHT = 30;
const PLAYER_LIST_LEFT = 470;
const PLAYER_LIST_WIDTH = 300;
const PLAYER_LIST_HEADER_Y = 150;
const NEW_PLAYER_LABEL = 'Nou jugador';
const BASE_BALL_SPEED_X = 3.2;
const BASE_BALL_SPEED_Y = -3.2;
const LEVEL_SPEED_INCREASE = 1.1;
const LEVEL_PATTERNS = [ 'full', 'pyramid', 'checkerboard', 'diamond', 'stripes' ];

let canvas;
let ctx;
let paddle;
let balls;
let blocks;
let explosions;
let stars;
let fireStars;
let lifeStars;
let fireModeActive;
let fireModeFramesRemaining;
let gameState;
let score;
let lives;
let currentLevel;
let ballSpeedMultiplier;
let muted = false;
let playerName = '';
let nameInput = '';
let ranking = [];
let lastRankingEntry = null;
let playerOptions = [];
let selectedPlayerIndex = 0;

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

function isValidRankingEntry( entry ) {
  return entry !== null
    && typeof entry === 'object'
    && typeof entry.name === 'string'
    && Number.isFinite( entry.score )
    && Number.isFinite( entry.level )
    && Number.isFinite( entry.date );
}

function loadRanking() {
  ranking = [];
  try {
    const raw = localStorage.getItem( RANKING_STORAGE_KEY );
    if ( !raw ) return;
    const parsed = JSON.parse( raw );
    if ( Array.isArray( parsed ) ) {
      ranking = parsed.filter( isValidRankingEntry ).slice( 0, RANKING_MAX_ENTRIES );
    }
  } catch ( error ) {
    ranking = [];
  }
}

function saveRanking() {
  try {
    localStorage.setItem( RANKING_STORAGE_KEY, JSON.stringify( ranking ) );
  } catch ( error ) {
    // localStorage no disponible: el rànquing continua només en memòria
  }
}

function addRankingEntry() {
  const entry = {
    name: playerName,
    score,
    level: currentLevel,
    date: Date.now()
  };
  ranking.push( entry );
  ranking.sort( ( a, b ) => b.score - a.score || a.date - b.date );
  ranking = ranking.slice( 0, RANKING_MAX_ENTRIES );
  lastRankingEntry = entry;
  saveRanking();
}

function getPlayerOptions() {
  return [ ...new Set( ranking.map( ( entry ) => entry.name ) ) ];
}

function enterSelectPlayer() {
  playerOptions = getPlayerOptions();
  selectedPlayerIndex = 0;
  nameInput = '';
  gameState = 'selectPlayer';
}

function getPlayerListRowAt( x, y ) {
  if ( x < PLAYER_LIST_LEFT || x > PLAYER_LIST_LEFT + PLAYER_LIST_WIDTH ) return -1;
  const firstRowTop = PLAYER_LIST_HEADER_Y + PLAYER_LIST_ROW_HEIGHT / 2;
  const row = Math.floor( ( y - firstRowTop ) / PLAYER_LIST_ROW_HEIGHT );
  return row >= 0 && row <= playerOptions.length ? row : -1;
}

function confirmPlayerSelection() {
  if ( selectedPlayerIndex < playerOptions.length ) {
    playerName = playerOptions[ selectedPlayerIndex ];
    nameInput = '';
    gameState = 'playing';
  } else {
    nameInput = '';
    gameState = 'enterName';
  }
}

function resetPaddleAndBall() {
  paddle = {
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - 30,
    width: PADDLE_WIDTH,
    height: 14,
  };

  balls = [ {
    x: CANVAS_WIDTH / 2,
    y: paddle.y - 8,
    radius: 8,
    dx: BASE_BALL_SPEED_X * ballSpeedMultiplier,
    dy: BASE_BALL_SPEED_Y * ballSpeedMultiplier,
    trail: [],
  } ];
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

function shuffledIndices( length ) {
  const indices = Array.from( { length }, ( _, index ) => index );
  for ( let i = indices.length - 1; i > 0; i-- ) {
    const j = Math.floor( Math.random() * ( i + 1 ) );
    [ indices[ i ], indices[ j ] ] = [ indices[ j ], indices[ i ] ];
  }
  return indices;
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
        hasPowerUp: false,
        hasFirePowerUp: false,
        hasLifePowerUp: false,
      } );
    }
  }

  const resistantCount = Math.min( RESISTANT_BLOCKS_PER_LEVEL_STEP * ( level - 1 ), generatedBlocks.length );
  const resistantIndices = shuffledIndices( generatedBlocks.length );
  for ( let i = 0; i < resistantCount; i++ ) {
    generatedBlocks[ resistantIndices[ i ] ].hitsRemaining = 2;
  }

  const powerUpCount = Math.min( POWERUP_BLOCKS_PER_LEVEL, generatedBlocks.length );
  const powerUpIndices = shuffledIndices( generatedBlocks.length );
  for ( let i = 0; i < powerUpCount; i++ ) {
    generatedBlocks[ powerUpIndices[ i ] ].hasPowerUp = true;
  }

  const firePowerUpCount = Math.min( FIRE_POWERUP_BLOCKS_PER_LEVEL, generatedBlocks.length );
  const firePowerUpIndices = shuffledIndices( generatedBlocks.length );
  for ( let i = 0; i < firePowerUpCount; i++ ) {
    generatedBlocks[ firePowerUpIndices[ i ] ].hasFirePowerUp = true;
  }

  const lifePowerUpCount = Math.min( LIFE_POWERUP_BLOCKS_PER_LEVEL, generatedBlocks.length );
  const lifePowerUpIndices = shuffledIndices( generatedBlocks.length );
  for ( let i = 0; i < lifePowerUpCount; i++ ) {
    generatedBlocks[ lifePowerUpIndices[ i ] ].hasLifePowerUp = true;
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
  stars = [];
  fireStars = [];
  lifeStars = [];
  fireModeActive = false;
  fireModeFramesRemaining = 0;
  lastRankingEntry = null;

  gameState = 'playing';
}

function advanceToNextLevel() {
  currentLevel += 1;
  ballSpeedMultiplier *= LEVEL_SPEED_INCREASE;
  blocks = generateBlocksForLevel( currentLevel );
  explosions = [];
  stars = [];
  fireStars = [];
  lifeStars = [];
  fireModeActive = false;
  fireModeFramesRemaining = 0;
  resetPaddleAndBall();
  gameState = 'playing';
}

function drawPaddle() {
  drawSprite( ctx, 'paddle', paddle.x, paddle.y, paddle.width, paddle.height );
}

function drawBalls() {
  for ( const ball of balls ) {
    if ( fireModeActive ) {
      for ( let i = 0; i < ball.trail.length; i++ ) {
        const trailPoint = ball.trail[ i ];
        ctx.globalAlpha = ( ( i + 1 ) / ball.trail.length ) * 0.5;
        ctx.beginPath();
        ctx.arc( trailPoint.x, trailPoint.y, ball.radius, 0, Math.PI * 2 );
        ctx.fillStyle = FIRE_BALL_COLOR;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc( ball.x, ball.y, ball.radius, 0, Math.PI * 2 );
      ctx.fillStyle = FIRE_BALL_COLOR;
      ctx.fill();
    } else {
      drawSprite( ctx, 'ball', ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2 );
    }
  }
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

function drawStarShape( cx, cy, size, color = STAR_COLOR ) {
  const outerRadius = size / 2;
  const innerRadius = outerRadius / 2.5;
  const spikes = 5;
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;

  ctx.beginPath();
  ctx.moveTo( cx, cy - outerRadius );
  for ( let i = 0; i < spikes; i++ ) {
    rot += step;
    ctx.lineTo( cx + Math.cos( rot ) * innerRadius, cy + Math.sin( rot ) * innerRadius );
    rot += step;
    ctx.lineTo( cx + Math.cos( rot ) * outerRadius, cy + Math.sin( rot ) * outerRadius );
  }
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
}

function drawStars() {
  for ( const star of stars ) {
    drawStarShape( star.x, star.y, STAR_SIZE );
  }
}

function drawFireStars() {
  for ( const star of fireStars ) {
    drawStarShape( star.x, star.y, STAR_SIZE, FIRE_STAR_COLOR );
  }
}

function drawLifeStars() {
  for ( const star of lifeStars ) {
    drawStarShape( star.x, star.y, STAR_SIZE, LIFE_STAR_COLOR );
  }
}

function starOverlapsPaddle( star ) {
  return star.x + STAR_SIZE / 2 > paddle.x &&
    star.x - STAR_SIZE / 2 < paddle.x + paddle.width &&
    star.y + STAR_SIZE / 2 > paddle.y &&
    star.y - STAR_SIZE / 2 < paddle.y + paddle.height;
}

function updateStars() {
  const remainingStars = [];

  for ( const star of stars ) {
    star.y += star.dy;

    if ( star.y - STAR_SIZE / 2 > CANVAS_HEIGHT ) continue;

    if ( starOverlapsPaddle( star ) ) {
      if ( balls.length === 1 ) {
        const existingBall = balls[ 0 ];
        balls.push( {
          x: existingBall.x,
          y: existingBall.y,
          radius: existingBall.radius,
          dx: -existingBall.dx,
          dy: existingBall.dy,
          trail: [],
        } );
      }
      continue;
    }

    remainingStars.push( star );
  }

  stars = remainingStars;
}

function fireStarOverlapsPaddle( star ) {
  return star.x + STAR_SIZE / 2 > paddle.x &&
    star.x - STAR_SIZE / 2 < paddle.x + paddle.width &&
    star.y + STAR_SIZE / 2 > paddle.y &&
    star.y - STAR_SIZE / 2 < paddle.y + paddle.height;
}

function updateFireStars() {
  const remainingFireStars = [];

  for ( const star of fireStars ) {
    star.y += star.dy;

    if ( star.y - STAR_SIZE / 2 > CANVAS_HEIGHT ) continue;

    if ( fireStarOverlapsPaddle( star ) ) {
      if ( fireModeActive ) {
        fireModeFramesRemaining += FIRE_DURATION_FRAMES;
      } else {
        fireModeActive = true;
        fireModeFramesRemaining = FIRE_DURATION_FRAMES;
      }
      continue;
    }

    remainingFireStars.push( star );
  }

  fireStars = remainingFireStars;
}

function updateLifeStars() {
  const remainingLifeStars = [];

  for ( const star of lifeStars ) {
    star.y += star.dy;
    star.elapsed += 1;
    star.x = star.baseX + star.amplitude * Math.sin( star.elapsed * LIFE_STAR_ZIGZAG_SPEED );

    if ( star.y - STAR_SIZE / 2 > CANVAS_HEIGHT ) continue;

    if ( starOverlapsPaddle( star ) ) {
      lives += 1;
      continue;
    }

    remainingLifeStars.push( star );
  }

  lifeStars = remainingLifeStars;
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

function checkPaddleCollision( ball ) {
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

function ballOverlapsBlock( ball, block ) {
  return ball.x + ball.radius > block.x &&
    ball.x - ball.radius < block.x + block.width &&
    ball.y + ball.radius > block.y &&
    ball.y - ball.radius < block.y + block.height;
}

function destroyBlock( block ) {
  block.alive = false;
  score += POINTS_PER_BLOCK * ( balls.length === 2 ? DOUBLE_POINTS_MULTIPLIER : 1 );

  explosions.push( {
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
    color: block.color,
    startTime: performance.now(),
  } );

  if ( block.hasPowerUp ) {
    stars.push( {
      x: block.x + block.width / 2,
      y: block.y + block.height / 2,
      dy: STAR_FALL_SPEED,
    } );
  }

  if ( block.hasFirePowerUp ) {
    fireStars.push( {
      x: block.x + block.width / 2,
      y: block.y + block.height / 2,
      dy: STAR_FALL_SPEED,
    } );
  }

  if ( block.hasLifePowerUp ) {
    const baseX = block.x + block.width / 2;
    const amplitude = LIFE_STAR_ZIGZAG_MIN_AMPLITUDE +
      Math.random() * ( LIFE_STAR_ZIGZAG_MAX_AMPLITUDE - LIFE_STAR_ZIGZAG_MIN_AMPLITUDE );
    lifeStars.push( {
      x: baseX,
      y: block.y + block.height / 2,
      dy: STAR_FALL_SPEED,
      baseX,
      amplitude,
      elapsed: 0,
    } );
  }

  playSound( breakSoundAudio );
}

function checkBlockCollisions( ball ) {
  for ( const block of blocks ) {
    if ( !block.alive ) continue;
    if ( !ballOverlapsBlock( ball, block ) ) continue;

    if ( fireModeActive ) {
      destroyBlock( block );
      break;
    }

    block.hitsRemaining -= 1;

    if ( block.hitsRemaining <= 0 ) {
      destroyBlock( block );
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

function updateBalls() {
  for ( const ball of [ ...balls ] ) {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if ( fireModeActive ) {
      ball.trail.push( { x: ball.x, y: ball.y } );
      if ( ball.trail.length > FIRE_TRAIL_LENGTH ) {
        ball.trail.shift();
      }
    }

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

    checkPaddleCollision( ball );
    checkBlockCollisions( ball );
  }

  if ( allBlocksDestroyed() ) {
    gameState = currentLevel < TOTAL_LEVELS ? 'levelComplete' : 'won';
    if ( gameState === 'won' ) addRankingEntry();
    return;
  }

  balls = balls.filter( ( ball ) => ball.y - ball.radius <= CANVAS_HEIGHT );

  if ( balls.length === 0 ) {
    lives -= 1;
    if ( lives <= 0 ) {
      gameState = 'lost';
      addRankingEntry();
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
  updateBalls();
  updateExplosions();
  updateStars();
  updateFireStars();
  updateLifeStars();

  if ( fireModeActive ) {
    fireModeFramesRemaining -= 1;
    if ( fireModeFramesRemaining <= 0 ) {
      fireModeActive = false;
      balls.forEach( ( ball ) => { ball.trail = []; } );
    }
  }
}

function drawScore() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const scoreText = `${ score }`;
  ctx.fillText( scoreText, HUD_MARGIN, HUD_MARGIN );

  const scoreWidth = ctx.measureText( scoreText ).width;
  let indicatorX = HUD_MARGIN + scoreWidth + 10;

  if ( balls.length === 2 ) {
    drawStarShape( indicatorX + STAR_SIZE / 2, HUD_MARGIN + 10, STAR_SIZE );
    indicatorX += STAR_SIZE + 10;
  }

  if ( fireModeActive ) {
    drawStarShape( indicatorX + STAR_SIZE / 2, HUD_MARGIN + 10, STAR_SIZE, FIRE_STAR_COLOR );
    indicatorX += STAR_SIZE + 6;

    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText( `${ Math.ceil( fireModeFramesRemaining / 60 ) }s`, indicatorX, HUD_MARGIN );
  }

  ctx.font = '14px sans-serif';
  ctx.fillText( `Nivell ${ currentLevel }/${ TOTAL_LEVELS }`, HUD_MARGIN, HUD_MARGIN + 26 );
}

function drawLives() {
  for ( let i = 0; i < lives; i++ ) {
    const x = CANVAS_WIDTH - HUD_MARGIN - ( i + 1 ) * ( LIFE_ICON_SIZE + 4 );
    drawSprite( ctx, 'ball', x, HUD_MARGIN, LIFE_ICON_SIZE, LIFE_ICON_SIZE );
  }
}

function drawNameScreen() {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 56px sans-serif';
  ctx.fillText( 'ARKANOID', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100 );

  ctx.font = '24px sans-serif';
  ctx.fillText( 'Escriu el teu nom', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30 );

  const cursorVisible = Math.floor( performance.now() / 500 ) % 2 === 0;
  ctx.font = 'bold 36px monospace';
  ctx.fillText( nameInput + ( cursorVisible ? '_' : ' ' ), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20 );

  ctx.font = '16px sans-serif';
  ctx.fillText( 'Prem Enter per començar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80 );
  if ( ranking.length > 0 ) {
    ctx.fillText( 'Esc per tornar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 108 );
  }
}

function drawSelectPlayerScreen() {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( 'ARKANOID', CANVAS_WIDTH / 2, 50 );
  ctx.font = '22px sans-serif';
  ctx.fillText( 'Tria jugador', CANVAS_WIDTH / 2, 95 );

  ctx.fillStyle = '#fff';
  drawRankingTable( 30 );

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'left';
  ctx.fillText( 'Jugadors', PLAYER_LIST_LEFT, PLAYER_LIST_HEADER_Y );

  ctx.font = '18px monospace';
  for ( let i = 0; i <= playerOptions.length; i++ ) {
    const isNewPlayer = i === playerOptions.length;
    const y = PLAYER_LIST_HEADER_Y + ( i + 1 ) * PLAYER_LIST_ROW_HEIGHT;
    const selected = i === selectedPlayerIndex;
    if ( selected ) {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.2)';
      ctx.fillRect( PLAYER_LIST_LEFT - 8, y - PLAYER_LIST_ROW_HEIGHT / 2, PLAYER_LIST_WIDTH, PLAYER_LIST_ROW_HEIGHT );
    }
    ctx.fillStyle = selected ? '#ffeb3b' : ( isNewPlayer ? '#aaa' : '#fff' );
    ctx.textAlign = 'left';
    ctx.fillText( ( selected ? '> ' : '  ' ) + ( isNewPlayer ? NEW_PLAYER_LABEL : playerOptions[ i ] ), PLAYER_LIST_LEFT, y );
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '16px sans-serif';
  ctx.fillText( '↑↓ per triar · Enter o clic per jugar', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40 );
}

function drawRankingTable( left ) {
  const rowHeight = 30;
  const tableTop = 150;
  const columns = { position: left, name: left + 50, score: left + 320, level: left + 400 };

  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'right';
  ctx.fillText( '#', columns.position, tableTop );
  ctx.textAlign = 'left';
  ctx.fillText( 'Nom', columns.name, tableTop );
  ctx.textAlign = 'right';
  ctx.fillText( 'Punts', columns.score, tableTop );
  ctx.fillText( 'Nivell', columns.level, tableTop );

  ctx.font = '18px monospace';
  ranking.forEach( ( entry, index ) => {
    const y = tableTop + ( index + 1 ) * rowHeight;
    ctx.fillStyle = entry === lastRankingEntry ? '#ffeb3b' : '#fff';
    ctx.textAlign = 'right';
    ctx.fillText( `${ index + 1 }`, columns.position, y );
    ctx.textAlign = 'left';
    ctx.fillText( entry.name, columns.name, y );
    ctx.textAlign = 'right';
    ctx.fillText( `${ entry.score }`, columns.score, y );
    ctx.fillText( `${ entry.level }`, columns.level, y );
  } );
}

function drawRankingScreen( message, continueMessage ) {
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( message, CANVAS_WIDTH / 2, 50 );
  ctx.font = '22px sans-serif';
  ctx.fillText( `Puntuació: ${ score }`, CANVAS_WIDTH / 2, 95 );

  drawRankingTable( 200 );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '20px sans-serif';
  ctx.fillText( continueMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40 );
}

function drawOverlay() {
  if ( gameState === 'playing' ) return;

  const darkOverlay = gameState === 'selectPlayer' || gameState === 'enterName' || gameState === 'won' || gameState === 'lost';
  ctx.fillStyle = darkOverlay ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  if ( gameState === 'selectPlayer' ) {
    drawSelectPlayerScreen();
    return;
  }

  if ( gameState === 'enterName' ) {
    drawNameScreen();
    return;
  }

  if ( gameState === 'won' || gameState === 'lost' ) {
    drawRankingScreen(
      gameState === 'won' ? 'Has guanyat el joc!' : 'Game Over',
      'Prem Espai o Enter per tornar a jugar'
    );
    return;
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let message;
  let continueMessage;
  if ( gameState === 'paused' ) {
    message = 'PAUSA';
    continueMessage = 'Prem Espai o Enter per continuar';
  } else if ( gameState === 'levelComplete' ) {
    message = `Nivell ${ currentLevel } superat!`;
    continueMessage = 'Prem Espai o Enter per continuar';
  }
  ctx.fillText( message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20 );

  ctx.font = '20px sans-serif';
  ctx.fillText( continueMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60 );
}

function gameLoop() {
  update();

  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  drawBlocks();
  drawExplosions();
  drawStars();
  drawFireStars();
  drawLifeStars();
  drawPaddle();
  drawBalls();
  drawScore();
  drawLives();
  drawOverlay();

  requestAnimationFrame( gameLoop );
}

function handleSelectPlayerInput( e ) {
  const optionCount = playerOptions.length + 1;
  if ( e.key === 'ArrowUp' ) {
    e.preventDefault();
    selectedPlayerIndex = ( selectedPlayerIndex - 1 + optionCount ) % optionCount;
  } else if ( e.key === 'ArrowDown' ) {
    e.preventDefault();
    selectedPlayerIndex = ( selectedPlayerIndex + 1 ) % optionCount;
  } else if ( e.key === 'Enter' ) {
    e.preventDefault();
    confirmPlayerSelection();
  }
}

function handleNameInput( e ) {
  if ( e.key === 'Escape' ) {
    if ( ranking.length > 0 ) enterSelectPlayer();
  } else if ( e.key === 'Backspace' ) {
    e.preventDefault();
    nameInput = nameInput.slice( 0, -1 );
  } else if ( e.key === 'Enter' ) {
    e.preventDefault();
    playerName = nameInput.trim() || PLAYER_NAME_DEFAULT;
    gameState = 'playing';
  } else if ( e.key === ' ' ) {
    e.preventDefault();
    if ( nameInput.length > 0 && nameInput.length < PLAYER_NAME_MAX_LENGTH ) {
      nameInput += ' ';
    }
  } else if ( !e.ctrlKey && !e.metaKey && !e.altKey && /^[\p{L}\p{N}]$/u.test( e.key ) ) {
    if ( nameInput.length < PLAYER_NAME_MAX_LENGTH ) {
      nameInput += e.key;
    }
  }
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
    if ( gameState === 'selectPlayer' ) {
      handleSelectPlayerInput( e );
      return;
    }

    if ( gameState === 'enterName' ) {
      handleNameInput( e );
      return;
    }

    keysPressed[ e.key ] = true;
    lastInput = 'keyboard';

    if ( e.key === 'm' || e.key === 'M' ) {
      muted = !muted;
    }

    if ( gameState === 'levelComplete' && ( e.key === ' ' || e.key === 'Enter' ) ) {
      advanceToNextLevel();
    } else if ( ( gameState === 'won' || gameState === 'lost' ) && ( e.key === ' ' || e.key === 'Enter' ) ) {
      createInitialState();
    } else if ( gameState === 'playing' && ( e.key === 'p' || e.key === 'P' || e.key === 'Escape' ) ) {
      gameState = 'paused';
    } else if ( gameState === 'paused' && ( e.key === ' ' || e.key === 'Enter' ) ) {
      gameState = 'playing';
    }
  } );

  window.addEventListener( 'keyup', ( e ) => {
    keysPressed[ e.key ] = false;
  } );

  canvas.addEventListener( 'mousemove', ( e ) => {
    if ( gameState === 'selectPlayer' ) {
      const row = getPlayerListRowAt( ...getCanvasCoordinates( e ) );
      if ( row !== -1 ) selectedPlayerIndex = row;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    lastInput = 'mouse';
  } );

  canvas.addEventListener( 'click', ( e ) => {
    if ( gameState !== 'selectPlayer' ) return;
    const row = getPlayerListRowAt( ...getCanvasCoordinates( e ) );
    if ( row === -1 ) return;
    selectedPlayerIndex = row;
    confirmPlayerSelection();
  } );
}

function initGame() {
  canvas = document.getElementById( 'game' );
  ctx = canvas.getContext( '2d' );

  loadRanking();
  createInitialState();
  if ( ranking.length > 0 ) {
    enterSelectPlayer();
  } else {
    gameState = 'enterName';
    nameInput = '';
  }
  setupInput();
  requestAnimationFrame( gameLoop );
}
