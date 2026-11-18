// player.js — the salvage skiff: movement, dash, auto-fire at the nearest foe,
// stardust magnet, XP and levels. It never touches the DOM; the UI reads it.

import { ARENA, PLAYER_BASE, xpNeed } from './config.js';
import { fireBullet } from './shots.js';

export function createPlayer() {
  return {
    x: ARENA.w / 2,
    y: ARENA.h / 2,
    vx: 0,
    vy: 0,
    r: PLAYER_BASE.radius,
    angle: -Math.PI / 2,
    hp: PLAYER_BASE.maxHp,
    maxHp: PLAYER_BASE.maxHp,
    level: 1,
    xp: 0,
    alive: true,
    fireTimer: 0,
    dashTimer: 0,
    dashCd: 0,
    invuln: 0,
    orbitAngle: 0,
    upgrades: {},
    stats: {
      damage: PLAYER_BASE.bulletDamage,
      fireRate: PLAYER_BASE.fireRate,
      bulletSpeed: PLAYER_BASE.bulletSpeed,
      speed: PLAYER_BASE.speed,
      magnet: PLAYER_BASE.magnetRadius,
      multishot: 0,
      pierce: 0,
      crit: 0,
      orbit: 0,
      regen: 0,
      dashCooldown: PLAYER_BASE.dashCooldown,
    },
  };
}

function nearestEnemy(G) {
  let best = null;
  let bestD = Infinity;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.x - G.player.x;
    const dy = e.y - G.player.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function updatePlayer(G, dt, input) {
  const p = G.player;
  if (!p.alive) return;

  if (p.invuln > 0) p.invuln -= dt;
  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.stats.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.stats.regen * dt);

  // Dash: a short burst with brief mercy frames, on Space when cooled down.
  const wantDash = input.wasPressed('Space');
  if (wantDash && p.dashCd <= 0 && p.dashTimer <= 0) {
    p.dashTimer = PLAYER_BASE.dashTime;
    p.dashCd = p.stats.dashCooldown;
    p.invuln = Math.max(p.invuln, 0.25);
    G.audio.dash();
    G.shake = Math.min(G.shake + 2, 6);
  }

  const ax = input.axisX();
  const ay = input.axisY();
  const len = Math.hypot(ax, ay) || 1;
  const nx = ax / len;
  const ny = ay / len;
  const speed = p.dashTimer > 0 ? PLAYER_BASE.dashSpeed : p.stats.speed;
  if (p.dashTimer > 0) p.dashTimer -= dt;
  const targetVx = ax === 0 && ay === 0 ? 0 : nx * speed;
  const targetVy = ax === 0 && ay === 0 ? 0 : ny * speed;
  const k = 1 - Math.pow(0.0001, dt); // frame-rate independent smoothing
  p.vx += (targetVx - p.vx) * k;
  p.vy += (targetVy - p.vy) * k;
  p.x = Math.max(p.r, Math.min(ARENA.w - p.r, p.x + p.vx * dt));
  p.y = Math.max(p.r, Math.min(ARENA.h - p.r, p.y + p.vy * dt));

  // Face the nearest enemy when there is one, else face the movement.
  const target = nearestEnemy(G);
  if (target) {
    p.angle = Math.atan2(target.y - p.y, target.x - p.x);
  } else if (ax !== 0 || ay !== 0) {
    p.angle = Math.atan2(ay, ax);
  }

  // Auto-fire at the nearest enemy.
  p.fireTimer -= dt;
  if (target && p.fireTimer <= 0) {
    p.fireTimer = 1 / p.stats.fireRate;
    const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
    const shots = 1 + p.stats.multishot;
    for (let i = 0; i < shots; i++) {
      const spread = (i - (shots - 1) / 2) * 0.12;
      const isCrit = G.rng.chance(p.stats.crit);
      fireBullet(G, p.x, p.y, baseAngle + spread, p.stats.damage * (isCrit ? 2 : 1), p.stats.pierce, isCrit);
    }
    G.audio.shoot();
  }

  // Orbit blades spin around the hull.
  p.orbitAngle += dt * 3.2;

  // Magnet: stardust drifts in, then snaps to the hull and levels the player up.
  for (const gem of G.gems) {
    if (gem.dead) continue;
    const dx = p.x - gem.x;
    const dy = p.y - gem.y;
    const d = Math.hypot(dx, dy);
    if (d < p.stats.magnet) {
      const pull = 620 * (1 - d / p.stats.magnet) + 120;
      gem.vx += (dx / (d || 1)) * pull * dt;
      gem.vy += (dy / (d || 1)) * pull * dt;
    }
    gem.x += gem.vx * dt;
    gem.y += gem.vy * dt;
    gem.vx *= 0.92;
    gem.vy *= 0.92;
    if (d < p.r + 10) {
      gem.dead = true;
      p.xp += gem.value;
      G.stardust += gem.value;
      G.score += 5 * gem.value;
      G.audio.pickup();
      gainLevelIfReady(G);
    }
  }
  G.gems = G.gems.filter((g) => !g.dead);
}

function gainLevelIfReady(G) {
  const p = G.player;
  while (p.xp >= xpNeed(p.level)) {
    p.xp -= xpNeed(p.level);
    p.level += 1;
    G.pendingLevels += 1;
  }
}

// Damage the player; returns true when this hit kills them.
export function takeDamage(G, dmg) {
  const p = G.player;
  if (!p.alive || p.invuln > 0) return false;
  p.hp -= dmg;
  p.invuln = PLAYER_BASE.hitInvuln;
  G.audio.hurt();
  G.shake = Math.min(G.shake + 5, 10);
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    return true;
  }
  return false;
}

export function healPlayer(G, amount) {
  const p = G.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}
