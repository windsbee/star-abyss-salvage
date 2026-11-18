// main.js — boot and the one loop: input every frame, the world in small steps,
// and the renderer painting what is there. The game moves between six modes:
// title, playing, paused, levelup (draft), gameover and victory.
// window.GAME is the live state, a debug handle for play-testing.

import { ARENA, PLAYER_BASE, SCORE, xpNeed } from './config.js';
import { createRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, updateWorld } from './world.js';
import { createPlayer, healPlayer, takeDamage, updatePlayer } from './player.js';
import { createDirector, updateDirector, updateEnemies } from './enemies.js';
import { applyUpgrade, rollChoices } from './upgrades.js';
import { addFloater, spawnExplosion, updateBullets, updateEnemyBullets, updateFloaters, updateOrbitBlades, updateParticles } from './shots.js';
import { render } from './render.js';
import { createUI } from './ui.js';

const BEST_KEY = 'star-abyss-salvage.best';
const MAX_FRAME = 0.05; // a longer stall is dropped, never replayed

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

const input = createInput(canvas);
const audio = createAudio();

const G = {
  mode: 'title',
  time: 0,
  score: 0,
  kills: 0,
  stardust: 0,
  wave: 1,
  endless: false,
  pendingLevels: 0,
  enemies: [],
  bullets: [],
  enemyBullets: [],
  particles: [],
  floaters: [],
  gems: [],
  deaths: [],
  shake: 0,
  hurtFlash: 0,
  player: createPlayer(),
  world: createWorld(),
  input,
  audio,
  rng: createRng((Math.random() * 4294967296) | 0),
  director: createDirector(),
  best: readBest(),
  levelUpChoices: [],
  lastWaveToast: 0,
};
window.GAME = G;

const ui = createUI({
  onStart: () => startGame(),
  onResume: () => resumeGame(),
  onRestart: () => startGame(),
  onPick: (i) => pickUpgrade(i),
  onEndless: () => continueEndless(),
  onMute: () => {
    audio.setMuted(!audio.isMuted());
    ui.setMuted(audio.isMuted());
  },
});

function startGame() {
  audio.unlock();
  audio.startMusic();
  G.player = createPlayer();
  G.enemies = [];
  G.bullets = [];
  G.enemyBullets = [];
  G.particles = [];
  G.floaters = [];
  G.gems = [];
  G.deaths = [];
  G.score = 0;
  G.kills = 0;
  G.stardust = 0;
  G.wave = 1;
  G.endless = false;
  G.pendingLevels = 0;
  G.shake = 0;
  G.hurtFlash = 0;
  G.director = createDirector();
  G.mode = 'playing';
  G.lastWaveToast = 0;
  ui.showScreen(null);
  ui.toast('WAVE 1 — SALVAGE RUN BEGINS');
  ui.setMuted(audio.isMuted());
}

function resumeGame() {
  if (G.mode !== 'paused') return;
  G.mode = 'playing';
  ui.showScreen(null);
}

function pauseGame() {
  if (G.mode !== 'playing') return;
  G.mode = 'paused';
  ui.showScreen('pause');
}

function gameOver() {
  G.mode = 'gameover';
  const isNewBest = G.score > G.best;
  if (isNewBest) {
    G.best = G.score;
    saveBest(G.best);
  }
  spawnExplosion(G, G.player.x, G.player.y, '#35f0ff', 30, 260);
  audio.explosion();
  ui.showOver(G, G.best, isNewBest);
}

function victory() {
  G.mode = 'victory';
  G.score += SCORE.victory;
  if (G.score > G.best) {
    G.best = G.score;
    saveBest(G.best);
  }
  audio.levelup();
  ui.showWin(G, G.best);
}

function continueEndless() {
  G.endless = true;
  G.player.hp = G.player.maxHp;
  G.director.phase = 'clear';
  G.director.timer = 1.5;
  G.mode = 'playing';
  ui.showScreen(null);
  ui.toast('ENDLESS DRIFT — HOW LONG CAN YOU LAST?');
}

function pickUpgrade(i) {
  if (G.mode !== 'levelup') return;
  const choice = G.levelUpChoices[i];
  if (!choice) return;
  applyUpgrade(G, choice.id);
  audio.click();
  G.pendingLevels -= 1;
  if (G.pendingLevels > 0) {
    G.levelUpChoices = rollChoices(G);
    ui.showLevelUp(G.levelUpChoices);
  } else {
    G.mode = 'playing';
    ui.showScreen(null);
  }
}

function processDeaths() {
  for (const e of G.deaths) {
    G.kills += 1;
    G.score += e.score;
    const gems = e.isBoss ? 20 : e.elite ? 5 : 1;
    for (let i = 0; i < gems; i++) {
      const a = G.rng.range(0, Math.PI * 2);
      G.gems.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * G.rng.range(20, 90),
        vy: Math.sin(a) * G.rng.range(20, 90),
        value: 1, dead: false,
      });
    }
    spawnExplosion(G, e.x, e.y, e.color, e.isBoss ? 40 : e.elite ? 24 : 12, e.isBoss ? 300 : 170);
    addFloater(G, e.x, e.y - e.r - 8, `+${e.score}`, '#eaf6ff');
    audio.explosion();
    if (e.elite) {
      healPlayer(G, 10);
      addFloater(G, G.player.x, G.player.y - 24, '+10 HULL', '#7dff8a');
    }
    if (e.isBoss) {
      G.deaths = [];
      victory();
      return;
    }
  }
  G.deaths = [];
}

function collidePlayerAndEnemies() {
  const p = G.player;
  if (!p.alive) return;
  for (const e of G.enemies) {
    if (e.dead || e.hitCd > 0) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const rr = e.r + p.r;
    if (dx * dx + dy * dy < rr * rr) {
      e.hitCd = 0.7;
      // Shove the enemy back so it does not sit on the hull.
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * 12;
      e.y += (dy / d) * 12;
      if (takeDamage(G, e.damage)) {
        G.hurtFlash = 1;
        gameOver();
        return;
      }
      G.hurtFlash = 1;
    }
  }
}

function collidePlayerAndOrbs() {
  const p = G.player;
  if (!p.alive) return;
  for (const o of G.enemyBullets) {
    if (o.dead) continue;
    const dx = o.x - p.x;
    const dy = o.y - p.y;
    const rr = o.r + p.r;
    if (dx * dx + dy * dy < rr * rr) {
      o.dead = true;
      if (takeDamage(G, o.damage)) {
        G.hurtFlash = 1;
        gameOver();
        return;
      }
      G.hurtFlash = 1;
    }
  }
  G.enemyBullets = G.enemyBullets.filter((o) => !o.dead);
}

function update(dt) {
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
  if (G.hurtFlash > 0) G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2.2);
  updateWorld(G.world, dt, G.player.vx, G.player.vy);

  if (G.mode === 'title') return;

  if (G.mode !== 'playing') return;

  // Wave banner the moment a new wave's intro starts.
  if (G.wave !== G.lastWaveToast && G.director.phase === 'intro') {
    G.lastWaveToast = G.wave;
    ui.toast(G.wave === 10 ? 'WAVE 10 — THE ABYSS MONARCH' : `WAVE ${G.wave}`);
  }

  updatePlayer(G, dt, input);
  updateEnemies(G, dt);
  updateDirector(G, dt);
  updateBullets(G, dt);
  updateOrbitBlades(G, dt);
  updateEnemyBullets(G, dt);
  collidePlayerAndEnemies();
  collidePlayerAndOrbs();
  processDeaths();
  updateParticles(G, dt);
  updateFloaters(G, dt);
  G.enemies = G.enemies.filter((e) => !e.dead);

  if (!G.player.alive) return;
  if (G.pendingLevels > 0) {
    G.mode = 'levelup';
    G.levelUpChoices = rollChoices(G);
    audio.levelup();
    ui.showLevelUp(G.levelUpChoices);
  }
}

function handleKeys() {
  if (input.wasPressed('KeyM')) {
    audio.setMuted(!audio.isMuted());
    ui.setMuted(audio.isMuted());
  }
  if (G.mode === 'title' && (input.wasPressed('Enter') || input.mouse.clicked)) {
    startGame();
    return;
  }
  if (G.mode === 'playing' && (input.wasPressed('KeyP') || input.wasPressed('Escape'))) {
    pauseGame();
    return;
  }
  if (G.mode === 'paused' && (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter'))) {
    resumeGame();
    return;
  }
  if ((G.mode === 'gameover' || G.mode === 'victory') && input.wasPressed('Enter')) {
    startGame();
    return;
  }
  if (G.mode === 'levelup') {
    const keys = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'];
    for (let i = 0; i < keys.length; i++) {
      if (input.wasPressed(keys[i])) {
        pickUpgrade(i % 3);
        return;
      }
    }
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  handleKeys();
  update(dt);
  render(ctx, G);
  ui.updateHUD(G);
  input.endFrame();
  if (!window.__gameReady) window.__gameReady = true;
}

// Leaving the tab pauses a running game rather than letting it play unseen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.mode === 'playing') pauseGame();
});

ui.setTitleBest(G.best);
ui.showScreen('title');
ui.setMuted(audio.isMuted());
requestAnimationFrame(frame);
