const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width, HEIGHT = canvas.height;

const PADDLE_WIDTH = 16, PADDLE_HEIGHT = 90, PADDLE_MARGIN = 20;
const BALL_SIZE = 16, BASE_BALL_SPEED = 4;
const WIN_SCORE = 10;

let playerY = HEIGHT / 2 - PADDLE_HEIGHT / 2;
let aiY = HEIGHT / 2 - PADDLE_HEIGHT / 2;
let ball = {};

let running = false, paused = false, soundEnabled = true, countdownInProgress = false;
let playerScore = 0, aiScore = 0;

const difficultySelect = document.getElementById('difficulty');

const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
function playTone(freq, dur = 0.1, vol = 0.2) {
  if (!soundEnabled) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq,audioCtx.currentTime);
  g.gain.setValueAtTime(vol,audioCtx.currentTime);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function playSound(type) {
  const map = { paddle: 450, wall: 300, score: 700 };
  if (map[type]) playTone(map[type], 0.1, 0.2);
}

function getDifficultySettings() {
  switch(difficultySelect.value) {
    case 'easy':
      return { aiSpeed: 1.5, ballSpeed: 3.0, aiMistakeChance: 0.25 };
    case 'medium':
      return { aiSpeed: 3.0, ballSpeed: 4.0, aiMistakeChance: 0.1 };
    case 'hard':
      return { aiSpeed: 5.0, ballSpeed: 5.2, aiMistakeChance: 0.01 };
    default:
      return { aiSpeed: 3.0, ballSpeed: 4.0, aiMistakeChance: 0.1 };
  }
}

function resetBall(toRight = true) {
  const { ballSpeed } = getDifficultySettings();
  ball = {
    x: WIDTH/2 - BALL_SIZE/2,
    y: HEIGHT/2 - BALL_SIZE/2,
    vx: (toRight?1:-1)*(ballSpeed + Math.random()*1.2),
    vy: (Math.random()*2 - 1) * ballSpeed
  };
}

function updateScoreboard() {
  document.getElementById('playerScore').textContent = playerScore;
  document.getElementById('aiScore').textContent = aiScore;
}

function update() {
  const { aiSpeed, aiMistakeChance } = getDifficultySettings();
  ball.x += ball.vx; ball.y += ball.vy;

  if (ball.y <= 0 || ball.y + BALL_SIZE >= HEIGHT) { ball.vy *= -1; playSound('wall'); }

  if (ball.x <= PADDLE_MARGIN + PADDLE_WIDTH &&
      ball.y + BALL_SIZE > playerY && ball.y < playerY + PADDLE_HEIGHT) {
    ball.vx = Math.abs(ball.vx) * 1.05;
    ball.vy += ((ball.y + BALL_SIZE/2) - (playerY + PADDLE_HEIGHT/2))/22;
    playSound('paddle');
  }

  if (ball.x + BALL_SIZE >= WIDTH - PADDLE_MARGIN - PADDLE_WIDTH &&
      ball.y + BALL_SIZE > aiY && ball.y < aiY + PADDLE_HEIGHT) {
    ball.vx = -Math.abs(ball.vx) * 1.05;
    ball.vy += ((ball.y + BALL_SIZE/2) - (aiY + PADDLE_HEIGHT/2))/22;
    playSound('paddle');
  }

  if (ball.x + BALL_SIZE < 0) { aiScore++; updateScoreboard(); playSound('score'); resetBall(true); }
  if (ball.x > WIDTH) { playerScore++; updateScoreboard(); playSound('score'); resetBall(false); }

  let aiTarget = ball.y + BALL_SIZE/2;
  if (Math.random() < aiMistakeChance) aiTarget += (Math.random()*200 - 100);

  if (aiY + PADDLE_HEIGHT/2 < aiTarget - 10) aiY += aiSpeed;
  else if (aiY + PADDLE_HEIGHT/2 > aiTarget + 10) aiY -= aiSpeed;
  aiY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, aiY));

  if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) {
    running = false;
    showWinMessage();
  }
}

function draw() {
  ctx.fillStyle = '#241f33';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = '#4b3d84'; ctx.lineWidth = 2;
  for (let i = 16; i < HEIGHT - 16; i += 28) {
    ctx.beginPath();
    ctx.moveTo(WIDTH/2, i);
    ctx.lineTo(WIDTH/2, i + 16);
    ctx.stroke();
  }

  ctx.fillStyle = '#e6ccff';
  ctx.fillRect(PADDLE_MARGIN, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillStyle = '#c798e2';
  ctx.fillRect(WIDTH - PADDLE_MARGIN - PADDLE_WIDTH, aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

  ctx.fillStyle = '#f2e2e2';
  ctx.beginPath();
  ctx.arc(ball.x + BALL_SIZE/2, ball.y + BALL_SIZE/2, BALL_SIZE/2, 0, Math.PI*2);
  ctx.fill();
}

function showWinMessage() {
  ctx.save();
  ctx.font = '42px Orbitron, sans-serif';
  ctx.fillStyle = playerScore > aiScore ? '#e6ccff' : '#c798e2';
  ctx.textAlign = 'center';
  ctx.fillText(playerScore > aiScore ? 'You Win!' : 'AI Wins!', WIDTH/2, HEIGHT/2 - 10);
  ctx.font = '22px Orbitron, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Click Reset to play again.', WIDTH/2, HEIGHT/2 + 30);
  ctx.restore();
}

function startWithCountdown() {
  if (countdownInProgress) return;
  countdownInProgress = true;
  let count = 4;
  const cd = document.getElementById('countdown');
  cd.textContent = count;
  const iv = setInterval(() => {
    count--;
    if (count > 0) {
      cd.textContent = count;
      playTone(500, 0.1, 0.15);
    }
    else {
      clearInterval(iv);
      cd.textContent = '';
      resetBall(Math.random() > 0.5);
      running = true; paused = false;
      countdownInProgress = false;
    }
  }, 700);
}

function gameLoop() {
  if (running && !paused) {
    update();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', e => {
  if (!running || paused || countdownInProgress) return;
  const y = e.clientY - canvas.getBoundingClientRect().top;
  playerY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, y - PADDLE_HEIGHT/2));
});

document.getElementById('startBtn').onclick = () => {
  if (paused) {
    paused = false;
    return;
  }

  if (!running && !countdownInProgress) {
    startWithCountdown();
  }
};


document.getElementById('pauseBtn').onclick = () => {
  if (!running || countdownInProgress || paused) return;
  paused = true;
};


document.getElementById('resetBtn').onclick = () => {
  playerScore = 0; aiScore = 0; updateScoreboard();
  running = false; paused = false; countdownInProgress = false;
  document.getElementById('countdown').textContent = '';
  playerY = aiY = HEIGHT/2 - PADDLE_HEIGHT/2;
  resetBall(Math.random()>0.5); draw();
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.querySelector('#muteToggle svg').style.fill = soundEnabled ? '#ffffff' : '#555555';
}

updateScoreboard();
resetBall(true);
gameLoop();
