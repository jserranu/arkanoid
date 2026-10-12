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
const TOTAL_LEVELS = 11;
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
const MAGNET_POWERUP_BLOCKS_PER_LEVEL = 1;
const MAGNET_DURATION_FRAMES = 1800;
const MAGNET_STAR_COLOR = '#2196f3';
const MAGNET_SPEED_MULTIPLIER = 1.5;
const LIFE_POWERUP_BLOCKS_PER_LEVEL = 1;
const LIFE_STAR_COLOR = '#43a047';
const LIFE_STAR_ZIGZAG_MIN_AMPLITUDE = 20;
const LIFE_STAR_ZIGZAG_MAX_AMPLITUDE = 50;
const LIFE_STAR_ZIGZAG_SPEED = 0.05;
const RANKING_STORAGE_KEY = 'arkanoid:ranking:v1';
const RANKING_TABLE_TOP = 150;
const GAME_MENU_URL = '../../index.html';
const GAMES_BUTTON = { x: 664, y: 44, width: 120, height: 36, label: 'Jocs' };
const BASE_BALL_SPEED_X = 3.2;
const BASE_BALL_SPEED_Y = -3.2;
const LEVEL_SPEED_INCREASE = 1.1;
const FRAMES_PER_SECOND = 60;
const TIME_SPEED_START_FRAMES = 60 * FRAMES_PER_SECOND;
const TIME_SPEED_INTERVAL_FRAMES = 30 * FRAMES_PER_SECOND;
const TIME_SPEED_INCREASE = 1.1;
const TIME_BONUS_MAX = 200;
const TIME_BONUS_STEP_POINTS = 20;
const TIME_BONUS_STEP_FRAMES = 20 * FRAMES_PER_SECOND;
const QUIZ_QUESTION_COUNT = 5;
const QUIZ_TIME_FRAMES = 30 * FRAMES_PER_SECOND;
const QUIZ_RESULT_LOCK_FRAMES = 30;
const QUIZ_ANSWER_MAX_LENGTH = 2;
const WIDE_PADDLE_FRAMES = 30 * FRAMES_PER_SECOND;
const WIDE_PADDLE_FACTOR = 2;
const SKILL_ICON_SIZE = 18;
const SKILL_ICON_COLOR = '#ff9800';
const LEVEL_PATTERNS = [
  'full', 'pyramid', 'checkerboard', 'diamond', 'stripes',
  'invertedPyramid', 'frame', 'columns', 'zigzag', 'cross',
  'sixtySeven',
];

// Mapa de bits (5 files x 8 columnes) amb les xifres "6" i "7"
const SIXTY_SEVEN_BITMAP = [
  '###..###',
  '#......#',
  '###....#',
  '#.#....#',
  '###....#',
];

let canvas;
let ctx;
let paddle;
let balls;
let blocks;
let explosions;
let stars;
let fireStars;
let lifeStars;
let magnetStars;
let fireModeActive;
let fireModeFramesRemaining;
let magnetModeActive;
let magnetFramesRemaining;
let skillCount;
let widePaddleActive;
let widePaddleFramesRemaining;
let levelTotalBlocks;
let quizDoneThisLevel;
let quiz = null;
let gameState;
let score;
let lives;
let currentLevel;
let ballSpeedMultiplier;
let levelFrames;
let lastLevelBonus;
let muted = false;
let playerName = '';
const ranking = Ranking.create( {
  storageKey: RANKING_STORAGE_KEY,
  extraField: 'level',
  extraLabel: 'Nivell'
} );
let lastRankingEntry = null;
let playerSelect;
let gamesButtonHovered = false;

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

function addRankingEntry() {
  lastRankingEntry = ranking.add( { name: playerName, score, extra: currentLevel } );
}

// Selecció de jugador (llista o entrada del nom) delegada al component comú
function promptForPlayer() {
  gameState = 'choosePlayer';
  playerSelect.start();
}

function startWithPlayer( name ) {
  playerName = name;
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
    stuck: false,
  } ];

  magnetModeActive = false;
  magnetFramesRemaining = 0;
  widePaddleActive = false;
  widePaddleFramesRemaining = 0;
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
    case 'invertedPyramid': {
      const width = Math.min( BLOCK_COLS, 2 * ( BLOCK_ROWS - 1 - row ) + 1 );
      const start = Math.floor( ( BLOCK_COLS - width ) / 2 );
      return col >= start && col < start + width;
    }
    case 'frame':
      return row === 0 || row === BLOCK_ROWS - 1 || col === 0 || col === BLOCK_COLS - 1;
    case 'columns':
      return col % 2 === 0;
    case 'zigzag':
      return ( col + ( Math.floor( col / 2 ) % 2 === 0 ? row : BLOCK_ROWS - 1 - row ) ) % 2 === 0 || row === 2;
    case 'sixtySeven':
      return SIXTY_SEVEN_BITMAP[ row ][ col ] === '#';
    case 'cross': {
      const midRow = Math.floor( BLOCK_ROWS / 2 );
      const midCols = [ Math.floor( ( BLOCK_COLS - 1 ) / 2 ), Math.ceil( ( BLOCK_COLS - 1 ) / 2 ) ];
      return row === midRow || midCols.includes( col );
    }
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
        hasMagnetPowerUp: false,
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

  const magnetPowerUpCount = Math.min( MAGNET_POWERUP_BLOCKS_PER_LEVEL, generatedBlocks.length );
  const magnetPowerUpIndices = shuffledIndices( generatedBlocks.length );
  for ( let i = 0; i < magnetPowerUpCount; i++ ) {
    generatedBlocks[ magnetPowerUpIndices[ i ] ].hasMagnetPowerUp = true;
  }

  return generatedBlocks;
}

function randomIntInclusive( min, max ) {
  return min + Math.floor( Math.random() * ( max - min + 1 ) );
}

function generateQuizQuestion() {
  if ( Math.random() < 0.5 ) {
    const a = randomIntInclusive( 2, 9 );
    const b = randomIntInclusive( 2, 9 );
    return { text: `${ a } × ${ b }`, answer: a * b, given: null };
  }

  const divisor = randomIntInclusive( 2, 9 );
  const quotient = randomIntInclusive( 2, Math.floor( 99 / divisor ) );
  return { text: `${ divisor * quotient } ÷ ${ divisor }`, answer: quotient, given: null };
}

function generateQuizQuestions() {
  const questions = [];
  const usedTexts = new Set();
  while ( questions.length < QUIZ_QUESTION_COUNT ) {
    const question = generateQuizQuestion();
    if ( usedTexts.has( question.text ) ) continue;
    usedTexts.add( question.text );
    questions.push( question );
  }
  return questions;
}

function countDestroyedBlocks() {
  return blocks.filter( ( block ) => !block.alive ).length;
}

function shouldStartQuiz() {
  return !quizDoneThisLevel && countDestroyedBlocks() >= Math.ceil( levelTotalBlocks / 2 );
}

function startQuiz() {
  quiz = {
    questions: generateQuizQuestions(),
    index: 0,
    input: '',
    framesRemaining: QUIZ_TIME_FRAMES,
    phase: 'answering',
    success: false,
    resultLockFrames: 0,
  };
  quizDoneThisLevel = true;
  gameState = 'quiz';
}

function updateQuiz() {
  if ( quiz.phase === 'result' ) {
    if ( quiz.resultLockFrames > 0 ) quiz.resultLockFrames -= 1;
    return;
  }

  quiz.framesRemaining -= 1;
  if ( quiz.framesRemaining <= 0 ) {
    finishQuiz();
  }
}

function finishQuiz() {
  quiz.success = quiz.questions.every( ( question ) => question.given === question.answer );

  if ( quiz.success ) {
    skillCount += 1;
    quiz.skillDelta = 1;
  } else if ( skillCount > 0 ) {
    skillCount -= 1;
    quiz.skillDelta = -1;
  } else {
    quiz.skillDelta = 0;
  }

  quiz.phase = 'result';
  quiz.resultLockFrames = QUIZ_RESULT_LOCK_FRAMES;
}

function resumeAfterQuiz() {
  quiz = null;
  gameState = 'playing';
}

function submitQuizAnswer() {
  if ( quiz.input === '' ) return;

  quiz.questions[ quiz.index ].given = Number( quiz.input );
  quiz.input = '';
  quiz.index += 1;

  if ( quiz.index >= QUIZ_QUESTION_COUNT ) {
    finishQuiz();
  }
}

function handleQuizInput( e ) {
  if ( quiz.phase === 'result' ) {
    if ( e.key === 'Enter' || e.key === ' ' ) {
      e.preventDefault();
      if ( !e.repeat && quiz.resultLockFrames <= 0 ) resumeAfterQuiz();
    }
    return;
  }

  if ( e.key === 'Backspace' ) {
    e.preventDefault();
    quiz.input = quiz.input.slice( 0, -1 );
  } else if ( e.key === 'Enter' || e.key === ' ' ) {
    e.preventDefault();
    if ( !e.repeat ) submitQuizAnswer();
  } else if ( !e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9]$/.test( e.key ) ) {
    if ( quiz.input.length < QUIZ_ANSWER_MAX_LENGTH ) {
      quiz.input += e.key;
    }
  }
}

function createInitialState() {
  score = 0;
  lives = INITIAL_LIVES;
  currentLevel = 1;
  ballSpeedMultiplier = 1;
  levelFrames = 0;
  lastLevelBonus = 0;
  skillCount = 0;

  resetPaddleAndBall();
  blocks = generateBlocksForLevel( currentLevel );
  explosions = [];
  stars = [];
  fireStars = [];
  lifeStars = [];
  magnetStars = [];
  fireModeActive = false;
  fireModeFramesRemaining = 0;
  lastRankingEntry = null;
  levelTotalBlocks = blocks.length;
  quizDoneThisLevel = false;
  quiz = null;

  gameState = 'playing';
}

function advanceToNextLevel() {
  currentLevel += 1;
  ballSpeedMultiplier *= LEVEL_SPEED_INCREASE;
  levelFrames = 0;
  blocks = generateBlocksForLevel( currentLevel );
  explosions = [];
  stars = [];
  fireStars = [];
  lifeStars = [];
  magnetStars = [];
  fireModeActive = false;
  fireModeFramesRemaining = 0;
  levelTotalBlocks = blocks.length;
  quizDoneThisLevel = false;
  quiz = null;
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

function drawMagnetStars() {
  for ( const star of magnetStars ) {
    drawStarShape( star.x, star.y, STAR_SIZE, MAGNET_STAR_COLOR );
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

function updateMagnetStars() {
  const remainingMagnetStars = [];

  for ( const star of magnetStars ) {
    star.y += star.dy;

    if ( star.y - STAR_SIZE / 2 > CANVAS_HEIGHT ) continue;

    if ( starOverlapsPaddle( star ) ) {
      if ( magnetModeActive ) {
        magnetFramesRemaining += MAGNET_DURATION_FRAMES;
      } else {
        magnetModeActive = true;
        magnetFramesRemaining = MAGNET_DURATION_FRAMES;
        balls.forEach( ( ball ) => {
          ball.dx *= MAGNET_SPEED_MULTIPLIER;
          ball.dy *= MAGNET_SPEED_MULTIPLIER;
        } );
      }
      continue;
    }

    remainingMagnetStars.push( star );
  }

  magnetStars = remainingMagnetStars;
}

function launchStuckBalls() {
  for ( const ball of balls ) {
    if ( !ball.stuck ) continue;
    ball.dy = -Math.hypot( ball.dx, ball.dy );
    ball.dx = 0;
    ball.stuck = false;
  }
}

function endMagnetMode() {
  magnetModeActive = false;
  magnetFramesRemaining = 0;
  balls.forEach( ( ball ) => {
    ball.dx /= MAGNET_SPEED_MULTIPLIER;
    ball.dy /= MAGNET_SPEED_MULTIPLIER;
  } );
  launchStuckBalls();
}

function clampPaddleX( x ) {
  return Math.max( 0, Math.min( CANVAS_WIDTH - paddle.width, x ) );
}

function setPaddleWidthKeepingCenter( width ) {
  const center = paddle.x + paddle.width / 2;
  paddle.width = width;
  paddle.x = clampPaddleX( center - width / 2 );
}

function activateWidePaddle() {
  if ( widePaddleActive || skillCount <= 0 ) return;
  skillCount -= 1;
  widePaddleActive = true;
  widePaddleFramesRemaining = WIDE_PADDLE_FRAMES;
  setPaddleWidthKeepingCenter( PADDLE_WIDTH * WIDE_PADDLE_FACTOR );
}

function endWidePaddle() {
  widePaddleActive = false;
  widePaddleFramesRemaining = 0;
  setPaddleWidthKeepingCenter( PADDLE_WIDTH );
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

  const paddleCenter = paddle.x + paddle.width / 2;

  if ( magnetModeActive ) {
    ball.stuck = true;
    ball.x = paddleCenter;
    ball.y = paddle.y - ball.radius;
    ball.trail = [];
    return;
  }

  const speed = Math.hypot( ball.dx, ball.dy );
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

  if ( block.hasMagnetPowerUp ) {
    magnetStars.push( {
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

function calculateTimeBonus() {
  const steps = Math.floor( levelFrames / TIME_BONUS_STEP_FRAMES );
  return Math.max( 0, TIME_BONUS_MAX - steps * TIME_BONUS_STEP_POINTS );
}

function formatLevelTime( frames ) {
  const totalSeconds = Math.floor( frames / FRAMES_PER_SECOND );
  const seconds = totalSeconds % 60;
  return `${ Math.floor( totalSeconds / 60 ) }:${ seconds < 10 ? '0' : '' }${ seconds }`;
}

function updateLevelTimer() {
  levelFrames += 1;
  if ( levelFrames >= TIME_SPEED_START_FRAMES &&
       ( levelFrames - TIME_SPEED_START_FRAMES ) % TIME_SPEED_INTERVAL_FRAMES === 0 ) {
    balls.forEach( ( ball ) => {
      ball.dx *= TIME_SPEED_INCREASE;
      ball.dy *= TIME_SPEED_INCREASE;
    } );
  }
}

function updateBalls() {
  for ( const ball of [ ...balls ] ) {
    if ( ball.stuck ) {
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - ball.radius;
      continue;
    }

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
    lastLevelBonus = calculateTimeBonus();
    score += lastLevelBonus;
    gameState = currentLevel < TOTAL_LEVELS ? 'levelComplete' : 'won';
    if ( gameState === 'won' ) addRankingEntry();
    return;
  }

  if ( shouldStartQuiz() ) {
    startQuiz();
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
  if ( gameState === 'quiz' ) {
    updateQuiz();
    return;
  }
  if ( gameState !== 'playing' ) return;

  updatePaddle();
  updateLevelTimer();
  updateBalls();
  updateExplosions();
  updateStars();
  updateFireStars();
  updateLifeStars();
  updateMagnetStars();

  if ( magnetModeActive ) {
    magnetFramesRemaining -= 1;
    if ( magnetFramesRemaining <= 0 ) {
      endMagnetMode();
    }
  }

  if ( widePaddleActive ) {
    widePaddleFramesRemaining -= 1;
    if ( widePaddleFramesRemaining <= 0 ) {
      endWidePaddle();
    }
  }

  if ( fireModeActive ) {
    fireModeFramesRemaining -= 1;
    if ( fireModeFramesRemaining <= 0 ) {
      fireModeActive = false;
      balls.forEach( ( ball ) => { ball.trail = []; } );
    }
  }
}

function drawSkillsHud( x, y ) {
  ctx.fillStyle = SKILL_ICON_COLOR;
  ctx.fillRect( x, y, SKILL_ICON_SIZE, SKILL_ICON_SIZE );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( 'V', x + SKILL_ICON_SIZE / 2, y + SKILL_ICON_SIZE / 2 + 1 );

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  const countText = `${ skillCount }`;
  const countX = x + SKILL_ICON_SIZE + 6;
  ctx.fillText( countText, countX, y + SKILL_ICON_SIZE / 2 + 1 );

  if ( widePaddleActive ) {
    const countWidth = ctx.measureText( countText ).width;
    const seconds = Math.ceil( widePaddleFramesRemaining / FRAMES_PER_SECOND );
    ctx.fillText( `(${ seconds }s)`, countX + countWidth + 6, y + SKILL_ICON_SIZE / 2 + 1 );
  }

  ctx.textBaseline = 'top';
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
    const fireText = `${ Math.ceil( fireModeFramesRemaining / FRAMES_PER_SECOND ) }s`;
    ctx.fillText( fireText, indicatorX, HUD_MARGIN );
    indicatorX += ctx.measureText( fireText ).width + 10;
  }

  if ( magnetModeActive ) {
    drawStarShape( indicatorX + STAR_SIZE / 2, HUD_MARGIN + 10, STAR_SIZE, MAGNET_STAR_COLOR );
    indicatorX += STAR_SIZE + 6;

    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    const magnetText = `${ Math.ceil( magnetFramesRemaining / FRAMES_PER_SECOND ) }s`;
    ctx.fillText( magnetText, indicatorX, HUD_MARGIN );
    indicatorX += ctx.measureText( magnetText ).width + 10;
  }

  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText( `Nivell ${ currentLevel }/${ TOTAL_LEVELS }`, HUD_MARGIN, HUD_MARGIN + 26 );
  ctx.fillText( `Bonus de temps: ${ calculateTimeBonus() }`, HUD_MARGIN, HUD_MARGIN + 44 );
  drawSkillsHud( HUD_MARGIN, HUD_MARGIN + 62 );
}

function drawLives() {
  for ( let i = 0; i < lives; i++ ) {
    const x = CANVAS_WIDTH - HUD_MARGIN - ( i + 1 ) * ( LIFE_ICON_SIZE + 4 );
    drawSprite( ctx, 'ball', x, HUD_MARGIN, LIFE_ICON_SIZE, LIFE_ICON_SIZE );
  }
}

function getQuizResultMessage() {
  if ( quiz.success ) return 'Correcte! +1 habilitat';
  return quiz.skillDelta < 0 ? 'Error! −1 habilitat' : 'Error! Sense habilitats per perdre';
}

function drawQuizResultScreen() {
  const centerX = CANVAS_WIDTH / 2;

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( 'Qüestionari', centerX, 100 );

  ctx.fillStyle = quiz.success ? '#66bb6a' : '#ff5252';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText( getQuizResultMessage(), centerX, 160 );

  ctx.font = '28px monospace';
  quiz.questions.forEach( ( question, i ) => {
    const correct = question.given === question.answer;
    const given = question.given === null ? '—' : question.given;
    const y = 230 + i * 40;

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText( `${ question.text } = ${ given }`, centerX + 80, y );

    ctx.fillStyle = correct ? '#66bb6a' : '#ff5252';
    ctx.textAlign = 'left';
    ctx.fillText( correct ? '✓' : '✗', centerX + 110, y );
  } );

  if ( quiz.resultLockFrames <= 0 ) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '20px sans-serif';
    ctx.fillText( 'Prem Espai o Enter per continuar', centerX, CANVAS_HEIGHT - 50 );
  }
}

function drawQuizScreen() {
  if ( quiz.phase === 'result' ) {
    drawQuizResultScreen();
    return;
  }

  const centerX = CANVAS_WIDTH / 2;
  const seconds = Math.ceil( quiz.framesRemaining / FRAMES_PER_SECOND );
  const question = quiz.questions[ quiz.index ];

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( 'Qüestionari', centerX, 100 );

  ctx.font = '22px sans-serif';
  ctx.fillText( `Pregunta ${ quiz.index + 1 }/${ QUIZ_QUESTION_COUNT }`, centerX, 160 );

  ctx.fillStyle = seconds <= 10 ? '#ff5252' : '#fff';
  ctx.fillText( `Temps: ${ seconds }s`, centerX, 195 );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px monospace';
  ctx.fillText( `${ question.text } =`, centerX, 290 );

  const cursorVisible = Math.floor( performance.now() / 500 ) % 2 === 0;
  ctx.font = 'bold 48px monospace';
  ctx.fillText( quiz.input + ( cursorVisible ? '_' : ' ' ), centerX, 370 );

  ctx.font = '16px sans-serif';
  ctx.fillText( 'Escriu la resposta i prem Enter o Espai', centerX, 450 );
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

function drawRankingScreen( message, continueMessage ) {
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( message, CANVAS_WIDTH / 2, 50 );
  ctx.font = '22px sans-serif';
  ctx.fillText( `Puntuació: ${ score }`, CANVAS_WIDTH / 2, 95 );
  if ( gameState === 'won' ) {
    ctx.font = '16px sans-serif';
    ctx.fillText( `Temps: ${ formatLevelTime( levelFrames ) } · Bonus de temps: +${ lastLevelBonus }`, CANVAS_WIDTH / 2, 122 );
  }

  ranking.drawTable( ctx, 200, RANKING_TABLE_TOP, lastRankingEntry );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '20px sans-serif';
  ctx.fillText( continueMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40 );
}

function drawOverlay() {
  if ( gameState === 'playing' ) return;

  const darkOverlay = gameState === 'choosePlayer' || gameState === 'quiz' || gameState === 'won' || gameState === 'lost';
  ctx.fillStyle = darkOverlay ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  if ( gameState === 'choosePlayer' ) {
    playerSelect.draw();
    return;
  }

  if ( gameState === 'quiz' ) {
    drawQuizScreen();
    return;
  }

  if ( gameState === 'won' || gameState === 'lost' ) {
    drawRankingScreen(
      gameState === 'won' ? 'Has guanyat el joc!' : 'Game Over',
      'Prem Espai o Enter per tornar a jugar'
    );
    drawGamesButton();
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

  if ( gameState === 'levelComplete' ) {
    ctx.font = '24px sans-serif';
    ctx.fillText( `Temps: ${ formatLevelTime( levelFrames ) } · Bonus de temps: +${ lastLevelBonus }`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25 );
  }

  ctx.font = '20px sans-serif';
  ctx.fillText( continueMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70 );

  if ( gameState === 'paused' ) drawGamesButton();
}

function gameLoop() {
  update();

  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  drawBlocks();
  drawExplosions();
  drawStars();
  drawFireStars();
  drawLifeStars();
  drawMagnetStars();
  drawPaddle();
  drawBalls();
  drawScore();
  drawLives();
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

    if ( gameState === 'quiz' ) {
      handleQuizInput( e );
      return;
    }

    keysPressed[ e.key ] = true;
    lastInput = 'keyboard';

    if ( e.key === 'm' || e.key === 'M' ) {
      muted = !muted;
    }

    if ( gameState === 'playing' && e.key === ' ' ) {
      e.preventDefault();
      launchStuckBalls();
    } else if ( gameState === 'playing' && ( e.key === 'v' || e.key === 'V' ) && !e.repeat ) {
      activateWidePaddle();
    } else if ( gameState === 'levelComplete' && ( e.key === ' ' || e.key === 'Enter' ) ) {
      advanceToNextLevel();
    } else if ( ( gameState === 'won' || gameState === 'lost' ) && ( e.key === ' ' || e.key === 'Enter' ) ) {
      createInitialState();
      promptForPlayer();
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
    if ( gameState === 'choosePlayer' && playerSelect.handleMouseMove( ...getCanvasCoordinates( e ) ) ) {
      return;
    }
    gamesButtonHovered = isGamesButtonVisible() && isOverGamesButton( ...getCanvasCoordinates( e ) );
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    lastInput = 'mouse';
  } );

  canvas.addEventListener( 'click', ( e ) => {
    if ( gameState === 'playing' ) {
      launchStuckBalls();
      return;
    }
    if ( isGamesButtonVisible() ) {
      if ( isOverGamesButton( ...getCanvasCoordinates( e ) ) ) returnToGameSelector();
      return;
    }
    if ( gameState === 'choosePlayer' ) playerSelect.handleClick( ...getCanvasCoordinates( e ) );
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
    title: 'ARKANOID',
    ranking,
    onPlayerChosen: startWithPlayer
  } );
  createInitialState();
  promptForPlayer();
  setupInput();
  requestAnimationFrame( gameLoop );
}
