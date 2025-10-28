/* SuperGol - Mini fútbol top-down (multijugador local)
   Jugador1: W A S D
   Jugador2: Arrow keys
   Publicable en GitHub Pages (es estático)
*/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W = canvas.width, H = canvas.height;

// Game state
let running = false;
let paused = false;
let matchTime = 120; // segundos por partido
let timeLeft = matchTime;
let score = [0, 0];

// Entities
const playerRadius = 18;
const ballRadius = 12;

let players = [
  { id: 1, x: 150, y: H/2, vx:0, vy:0, color: '#1d4ed8', up:false, down:false, left:false, right:false, speed: 3.2 },
  { id: 2, x: W-150, y: H/2, vx:0, vy:0, color: '#ef4444', up:false, down:false, left:false, right:false, speed: 3.2 }
];

let ball = { x: W/2, y: H/2, vx: 0, vy: 0, friction: 0.995 };

// Goals (rectangles at left and right middle)
const goalWidth = 14;
const goalHeight = 160;
const goalY = (H - goalHeight)/2;

// UI elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreLbl = document.getElementById('score');
const timeLbl = document.getElementById('time');

function resetPositions() {
  players[0].x = 150; players[0].y = H/2;
  players[1].x = W-150; players[1].y = H/2;
  ball.x = W/2; ball.y = H/2; ball.vx = (Math.random()>0.5?1:-1)*2.2; ball.vy = (Math.random()-0.5)*2.2;
}

function resetMatch(fullReset = false){
  if(fullReset) score = [0,0];
  timeLeft = matchTime;
  paused = false;
  running = true;
  resetPositions();
  updateUI();
}

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if(e.key === ' '){ // space toggles pause
    paused = !paused;
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Movement mapping
function handlePlayerInput() {
  // Player 1: W A S D
  players[0].up = !!keys['w'] || !!keys['W'];
  players[0].down = !!keys['s'] || !!keys['S'];
  players[0].left = !!keys['a'] || !!keys['A'];
  players[0].right = !!keys['d'] || !!keys['D'];

  // Player 2: Arrows
  players[1].up = !!keys['ArrowUp'];
  players[1].down = !!keys['ArrowDown'];
  players[1].left = !!keys['ArrowLeft'];
  players[1].right = !!keys['ArrowRight'];
}

function applyPhysics(){
  // players movement
  players.forEach(p => {
    let mvx=0, mvy=0;
    if(p.up) mvy -= p.speed;
    if(p.down) mvy += p.speed;
    if(p.left) mvx -= p.speed;
    if(p.right) mvx += p.speed;
    // normalize diagonal to keep same speed
    if(mvx!==0 && mvy!==0){ mvx *= Math.SQRT1_2; mvy *= Math.SQRT1_2; }
    p.x += mvx; p.y += mvy;
    // bounds
    p.x = Math.max(playerRadius+goalWidth, Math.min(W - (playerRadius+goalWidth), p.x));
    p.y = Math.max(playerRadius, Math.min(H - playerRadius, p.y));
  });

  // ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= ball.friction;
  ball.vy *= ball.friction;

  // collisions player-ball (circle-circle)
  players.forEach(p => {
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const dist = Math.hypot(dx, dy);
    const minDist = playerRadius + ballRadius;
    if(dist < minDist && dist > 0){
      // push ball away and add velocity based on player's movement
      const overlap = minDist - dist;
      const nx = dx / dist, ny = dy / dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      // give impulse
      const impulse = 1.2;
      ball.vx = (ball.vx + nx * impulse + (p.x - (p.x - 0)) * 0) * 1; // simple
      ball.vy = (ball.vy + ny * impulse) * 1;
      // add player's current direction to ball
      // approximate player's movement vector
      let pvx = 0, pvy = 0;
      if(p.up) pvy -= p.speed;
      if(p.down) pvy += p.speed;
      if(p.left) pvx -= p.speed;
      if(p.right) pvx += p.speed;
      ball.vx += pvx * 0.35;
      ball.vy += pvy * 0.35;
    }
  });

  // ball - walls collision (top/bottom)
  if(ball.y < ballRadius){ ball.y = ballRadius; ball.vy = Math.abs(ball.vy); }
  if(ball.y > H - ballRadius){ ball.y = H - ballRadius; ball.vy = -Math.abs(ball.vy); }

  // goals detection (ball center crosses left or right beyond 0..W)
  // valid goal if y within goalY..goalY+goalHeight and x beyond goal line
  if(ball.x - ballRadius <= 0){
    // left edge -> right team scores if ball within goal vertical range
    if(ball.y > goalY && ball.y < goalY + goalHeight){
      score[1]++; onGoalScored();
    } else {
      // bounce on wall
      ball.x = ballRadius; ball.vx = Math.abs(ball.vx) * 0.6;
    }
  }
  if(ball.x + ballRadius >= W){
    if(ball.y > goalY && ball.y < goalY + goalHeight){
      score[0]++; onGoalScored();
    } else {
      ball.x = W - ballRadius; ball.vx = -Math.abs(ball.vx) * 0.6;
    }
  }
}

function onGoalScored(){
  paused = true;
  updateUI();
  setTimeout(()=> {
    resetPositions();
    paused = false;
  }, 900);
}

// Drawing
function drawField(){
  // green background
  ctx.fillStyle = '#0b8a3e';
  ctx.fillRect(0,0,W,H);

  // center line
  ctx.strokeStyle = '#ffffffcc';
  ctx.lineWidth = 3;
  ctx.setLineDash([18,12]);
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // center circle
  ctx.beginPath();
  ctx.strokeStyle = '#ffffff88';
  ctx.lineWidth = 2;
  ctx.arc(W/2, H/2, 70, 0, Math.PI*2);
  ctx.stroke();

  // goals (visual)
  ctx.fillStyle = '#ffffff20';
  ctx.fillRect(0, goalY, goalWidth, goalHeight);
  ctx.fillRect(W - goalWidth, goalY, goalWidth, goalHeight);
}

function drawPlayers(){
  players.forEach(p => {
    // shadow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.ellipse(p.x+6, p.y+8, playerRadius, playerRadius*0.6, 0, 0, Math.PI*2);
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.arc(p.x, p.y, playerRadius, 0, Math.PI*2);
    ctx.fill();

    // number
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.id, p.x, p.y);
  });
}

function drawBall(){
  // shadow
  ctx.beginPath();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.ellipse(ball.x+4, ball.y+6, ballRadius, ballRadius*0.6, 0, 0, Math.PI*2);
  ctx.fill();

  // ball
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI*2);
  ctx.fill();

  // simple pattern
  ctx.strokeStyle = '#00000020';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// UI update
function updateUI(){
  scoreLbl.textContent = `${score[0]} - ${score[1]}`;
  timeLbl.textContent = timeLeft;
}

// Main loop
function loop(){
  if(!running){
    requestAnimationFrame(loop);
    return;
  }
  if(!paused){
    handlePlayerInput();
    applyPhysics();
  }
  // draw
  drawField();
  drawPlayers();
  drawBall();
  updateUI();
  requestAnimationFrame(loop);
}

// Timer countdown
let timerInterval = null;
function startTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    if(!paused && running){
      timeLeft--;
      if(timeLeft <= 0){
        timeLeft = 0;
        paused = true;
        running = false;
        // match finished
        setTimeout(()=> {
          alert(`Fin del partido\nResultado: ${score[0]} - ${score[1]}`);
        }, 60);
      }
    }
  }, 1000);
}

// Buttons
startBtn.addEventListener('click', ()=> {
  resetMatch(true);
  startTimer();
});
pauseBtn.addEventListener('click', ()=> { paused = !paused; });
resetBtn.addEventListener('click', ()=> {
  score = [0,0];
  resetMatch(true);
});

// responsive canvas resizing (keep internal W/H fixed but scale CSS)
function resizeCanvas(){
  // we keep logical size fixed; let CSS scale for responsiveness.
  const containerWidth = Math.min(window.innerWidth - 40, 1100);
  const scale = containerWidth / canvas.width;
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}
window.addEventListener('resize', resizeCanvas);

// init
resetPositions();
updateUI();
resizeCanvas();
loop();
