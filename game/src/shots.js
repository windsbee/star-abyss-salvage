// shots.js — everything that flies: player bullets, enemy orbs, orbit blades,
// particles and floating score text. Bullets ask enemies.js whether a hit kills;
// the main loop owns what a death means, so this file never imports the player.

import { ARENA } from './config.js';
import { damageEnemy } from './enemies.js';

export function fireBullet(G, x, y, angle, damage, pierce, crit) {
  G.bullets.push({
    x, y,
    vx: Math.cos(angle) * G.player.stats.bulletSpeed,
    vy: Math.sin(angle) * G.player.stats.bulletSpeed,
    r: 4, damage, pierce, crit,
    hit: new Set(),
    life: 1.2,
  });
}

export function updateBullets(G, dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -30 || b.x > ARENA.w + 30 || b.y < -30 || b.y > ARENA.h + 30) {
      b.dead = true;
      continue;
    }
    for (const e of G.enemies) {
      if (e.dead || b.hit.has(e)) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
        b.hit.add(e);
        const died = damageEnemy(G, e, b.damage);
        spawnSparkle(G, b.x, b.y, b.crit ? '#ffd166' : '#35f0ff', 3);
        if (b.crit) addFloater(G, e.x, e.y - e.r - 6, `CRIT ${Math.round(b.damage)}`, '#ffd166');
        G.audio.hit();
        if (died) G.deaths.push(e);
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.dead = true;
          break;
        }
      }
    }
  }
  G.bullets = G.bullets.filter((b) => !b.dead);
}

export function updateEnemyBullets(G, dt) {
  for (const o of G.enemyBullets) {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.life <= 0 || o.x < -20 || o.x > ARENA.w + 20 || o.y < -20 || o.y > ARENA.h + 20) o.dead = true;
  }
  G.enemyBullets = G.enemyBullets.filter((o) => !o.dead);
}

// Orbit blade positions, shared by the update and the renderer so both agree.
export function bladePositions(G) {
  const p = G.player;
  const n = p.stats.orbit;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = p.orbitAngle + (i / n) * Math.PI * 2;
    out.push({ x: p.x + Math.cos(a) * 46, y: p.y + Math.sin(a) * 46 });
  }
  return out;
}

export function updateOrbitBlades(G, dt) {
  if (G.player.stats.orbit <= 0) return;
  const blades = bladePositions(G);
  for (const b of blades) {
    for (const e of G.enemies) {
      if (e.dead || e.bladeCd > 0) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy < (e.r + 10) * (e.r + 10)) {
        e.bladeCd = 0.45;
        const died = damageEnemy(G, e, 16);
        spawnSparkle(G, b.x, b.y, '#7dff8a', 2);
        if (died) G.deaths.push(e);
      }
    }
  }
}

export function spawnExplosion(G, x, y, color, count = 14, speed = 160) {
  for (let i = 0; i < count; i++) {
    const a = G.rng.range(0, Math.PI * 2);
    const v = G.rng.range(speed * 0.3, speed);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: G.rng.range(0.3, 0.7), maxLife: 0.7,
      size: G.rng.range(2, 4.5), color,
      drag: 0.94,
    });
  }
}

export function spawnSparkle(G, x, y, color, count = 3) {
  for (let i = 0; i < count; i++) {
    const a = G.rng.range(0, Math.PI * 2);
    const v = G.rng.range(30, 90);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.25, maxLife: 0.25,
      size: G.rng.range(1.5, 3), color,
      drag: 0.9,
    });
  }
}

export function addFloater(G, x, y, text, color) {
  G.floaters.push({ x, y, text, color, life: 0.9 });
}

export function updateParticles(G, dt) {
  for (const p of G.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.life -= dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
}

export function updateFloaters(G, dt) {
  for (const f of G.floaters) {
    f.y -= 32 * dt;
    f.life -= dt;
  }
  G.floaters = G.floaters.filter((f) => f.life > 0);
}
