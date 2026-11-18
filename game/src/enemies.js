// enemies.js — every foe: its shape in the data, its steering, the wave director
// that trickles them in, and the boss. Damage is applied here; the caller (the
// main loop) owns what a death means, so this file never imports the shooter.

import { ARENA, BOSS, ELITE_MULT, ENEMY_TYPES, spawnInterval, waveComposition, waveHasElite, waveScale } from './config.js';

export function createEnemy(G, type, x, y, elite = false) {
  const def = ENEMY_TYPES[type];
  const scale = waveScale(G.wave);
  const hp = def.hp * scale.hp * (elite ? ELITE_MULT.hp : 1);
  return {
    type,
    name: def.name,
    x,
    y,
    vx: 0,
    vy: 0,
    r: def.radius * (elite ? ELITE_MULT.radius : 1),
    hp,
    maxHp: hp,
    speed: def.speed * scale.speed * (elite ? ELITE_MULT.speed : 1),
    damage: def.damage * (elite ? ELITE_MULT.damage : 1),
    score: def.score * (elite ? ELITE_MULT.score : 1),
    color: elite ? '#ffd166' : def.color,
    elite,
    isBoss: false,
    hitCd: 0,
    shootCd: (def.shootCooldown || 0) * G.rng.range(0.7, 1.3),
    wobble: G.rng.range(0, Math.PI * 2),
    dead: false,
    flash: 0,
    bladeCd: 0,
  };
}

export function createBoss(G, x, y) {
  const e = createEnemy(G, 'brute', x, y, false);
  e.isBoss = true;
  e.type = 'boss';
  e.name = BOSS.name;
  e.hp = BOSS.hp;
  e.maxHp = BOSS.hp;
  e.speed = BOSS.speed;
  e.r = BOSS.radius;
  e.damage = BOSS.damage;
  e.score = BOSS.score;
  e.color = BOSS.color;
  e.radialCd = 2.0;
  e.summonCd = BOSS.summonCooldown;
  return e;
}

// Subtract hp; returns true the moment the enemy dies.
export function damageEnemy(G, e, dmg) {
  if (e.dead) return false;
  e.hp -= dmg;
  e.flash = 0.08;
  if (e.hp <= 0) {
    e.dead = true;
    return true;
  }
  return false;
}

// A spawn point on an arena edge, kept away from the player.
export function pickSpawnPoint(G) {
  const p = G.player;
  for (let tries = 0; tries < 12; tries++) {
    const edge = G.rng.int(0, 3);
    let x;
    let y;
    if (edge === 0) {
      x = G.rng.range(20, ARENA.w - 20);
      y = 20;
    } else if (edge === 1) {
      x = G.rng.range(20, ARENA.w - 20);
      y = ARENA.h - 20;
    } else if (edge === 2) {
      x = 20;
      y = G.rng.range(20, ARENA.h - 20);
    } else {
      x = ARENA.w - 20;
      y = G.rng.range(20, ARENA.h - 20);
    }
    if (Math.hypot(x - p.x, y - p.y) > 260) return { x, y };
  }
  return { x: 20, y: 20 };
}

function steerToward(e, tx, ty, dt) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.vx = (dx / d) * e.speed;
  e.vy = (dy / d) * e.speed;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.bladeCd > 0) e.bladeCd -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.isBoss) {
      // The Monarch drifts at the player, bursts radial orbs, and calls mites.
      steerToward(e, p.x, p.y, dt);
      e.radialCd -= dt;
      if (e.radialCd <= 0) {
        e.radialCd = BOSS.radialCooldown;
        for (let i = 0; i < BOSS.radialCount; i++) {
          const a = (i / BOSS.radialCount) * Math.PI * 2 + e.wobble;
          G.enemyBullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * BOSS.orbSpeed, vy: Math.sin(a) * BOSS.orbSpeed,
            r: 6, damage: BOSS.orbDamage, life: 6,
          });
        }
        G.audio.bossRoar();
        G.shake = Math.min(G.shake + 4, 9);
      }
      e.summonCd -= dt;
      if (e.summonCd <= 0) {
        e.summonCd = BOSS.summonCooldown;
        if (G.enemies.length < 25) {
          for (let i = 0; i < 3; i++) {
            const s = pickSpawnPoint(G);
            G.enemies.push(createEnemy(G, 'mite', s.x, s.y));
          }
        }
      }
      continue;
    }

    if (e.type === 'mite') {
      // Fast chaser with a sideways wobble so it never flies dead straight.
      e.wobble += dt * 3;
      const wx = Math.cos(e.wobble) * 0.5;
      const wy = Math.sin(e.wobble) * 0.5;
      const mx = dx / dist + wx;
      const my = dy / dist + wy;
      const m = Math.hypot(mx, my) || 1;
      e.x += (mx / m) * e.speed * dt;
      e.y += (my / m) * e.speed * dt;
    } else if (e.type === 'drone') {
      steerToward(e, p.x, p.y, dt);
    } else if (e.type === 'brute') {
      steerToward(e, p.x, p.y, dt);
    } else if (e.type === 'spitter') {
      // Keeps a firing distance: closes in when far, backs off when close.
      const want = 260;
      const dir = dist > want + 40 ? 1 : dist < want - 40 ? -1 : 0;
      e.x += (dx / dist) * e.speed * dir * dt;
      e.y += (dy / dist) * e.speed * dir * dt;
      e.shootCd -= dt;
      if (e.shootCd <= 0 && dist < 460) {
        e.shootCd = ENEMY_TYPES.spitter.shootCooldown;
        G.enemyBullets.push({
          x: e.x, y: e.y,
          vx: (dx / dist) * ENEMY_TYPES.spitter.orbSpeed,
          vy: (dy / dist) * ENEMY_TYPES.spitter.orbSpeed,
          r: 5, damage: ENEMY_TYPES.spitter.orbDamage, life: 6,
        });
      }
    }

    // Soft bounce off the arena walls.
    e.x = Math.max(e.r, Math.min(ARENA.w - e.r, e.x));
    e.y = Math.max(e.r, Math.min(ARENA.h - e.r, e.y));
  }
}

// The wave director: intro pause, trickle the wave's queue in, then wait for
// the field to clear before the next wave. Wave 10 fields the boss.
export function createDirector() {
  return { phase: 'intro', timer: 1.0, queue: [], eliteQueued: false };
}

export function startWave(G, wave) {
  const comp = waveComposition(wave);
  const queue = [];
  for (let i = 0; i < comp.mite; i++) queue.push('mite');
  for (let i = 0; i < comp.drone; i++) queue.push('drone');
  for (let i = 0; i < comp.brute; i++) queue.push('brute');
  for (let i = 0; i < comp.spitter; i++) queue.push('spitter');
  // Shuffle the queue so the wave never arrives in neat type order.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = G.rng.int(0, i);
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  if (comp.boss) {
    queue.unshift('boss');
  } else if (waveHasElite(wave)) {
    queue.splice(Math.floor(queue.length * 0.6), 0, 'elite:mite');
  }
  G.director.queue = queue;
  G.director.phase = 'spawning';
  G.director.timer = 0.4;
}

export function updateDirector(G, dt) {
  const d = G.director;
  if (d.phase === 'intro') {
    d.timer -= dt;
    if (d.timer <= 0) startWave(G, G.wave);
    return;
  }
  if (d.phase === 'spawning') {
    d.timer -= dt;
    if (d.timer <= 0 && d.queue.length > 0) {
      const next = d.queue.shift();
      const s = pickSpawnPoint(G);
      if (next === 'boss') {
        G.enemies.push(createBoss(G, ARENA.w / 2, 30));
        G.audio.bossRoar();
      } else if (next === 'elite:mite') {
        G.enemies.push(createEnemy(G, 'mite', s.x, s.y, true));
      } else {
        G.enemies.push(createEnemy(G, next, s.x, s.y));
      }
      d.timer = spawnInterval(G.wave);
    }
    if (d.queue.length === 0) d.phase = 'fighting';
    return;
  }
  if (d.phase === 'fighting') {
    if (G.enemies.length === 0) {
      G.score += 50;
      if (G.wave < 10 || G.endless) {
        d.phase = 'clear';
        d.timer = 2.5;
      }
    }
    return;
  }
  if (d.phase === 'clear') {
    d.timer -= dt;
    if (d.timer <= 0) {
      G.wave += 1;
      d.phase = 'intro';
      d.timer = 1.0;
    }
  }
}
