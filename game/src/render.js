// render.js — drawing only: the game state in, pixels out. Every entity is a
// vector shape drawn with the canvas API (no image assets), in one neon palette
// so the scene reads at a glance. Screen shake is applied here, nowhere else.

import { ARENA, COLORS } from './config.js';
import { bladePositions } from './shots.js';
import { drawWorld } from './world.js';

function drawGem(ctx, gem, time) {
  const bob = Math.sin(time * 4 + gem.x) * 1.5;
  ctx.save();
  ctx.translate(gem.x, gem.y + bob);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 8;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flashing = e.flash > 0;
  const body = flashing ? '#ffffff' : e.color;
  if (e.isBoss) {
    // The Monarch: a rotating dashed outer ring, a spiked core, a crown of shards.
    ctx.rotate(time * 0.4);
    ctx.strokeStyle = body;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-time * 0.4);
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * e.r * 0.7, Math.sin(a) * e.r * 0.7);
      ctx.lineTo(Math.cos(a + 0.2) * e.r * 1.15, Math.sin(a + 0.2) * e.r * 1.15);
      ctx.lineTo(Math.cos(a + 0.4) * e.r * 0.7, Math.sin(a + 0.4) * e.r * 0.7);
    }
    ctx.fill();
    ctx.fillStyle = '#1a0512';
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4fd8';
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'mite') {
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + e.wobble;
      ctx.moveTo(Math.cos(a) * e.r * 0.55, Math.sin(a) * e.r * 0.55);
      ctx.lineTo(Math.cos(a + 0.25) * e.r * 1.25, Math.sin(a + 0.25) * e.r * 1.25);
      ctx.lineTo(Math.cos(a + 0.5) * e.r * 0.55, Math.sin(a + 0.5) * e.r * 0.55);
    }
    ctx.fill();
    ctx.fillStyle = '#2b0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'drone') {
    ctx.rotate(time * 1.5 + e.wobble);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -e.r);
    ctx.lineTo(e.r, 0);
    ctx.lineTo(0, e.r);
    ctx.lineTo(-e.r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-time * 1.5 - e.wobble);
    ctx.fillStyle = '#2b1a05';
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'brute') {
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.r;
      const py = Math.sin(a) * e.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2b1140';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.r * 0.55;
      const py = Math.sin(a) * e.r * 0.55;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (e.type === 'spitter') {
    ctx.rotate(Math.atan2(0, 1));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(e.r, 0);
    ctx.lineTo(-e.r * 0.8, e.r * 0.8);
    ctx.lineTo(-e.r * 0.4, 0);
    ctx.lineTo(-e.r * 0.8, -e.r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0a2b12';
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.elite) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Health arc over anything hurt.
  if (e.hp < e.maxHp && !e.isBoss) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (e.hp / e.maxHp));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (!p.alive) return;
  // Blink the hull while invulnerable after a hit.
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Engine flame, longer when dashing or moving fast.
  const speed = Math.hypot(p.vx, p.vy);
  const flame = 10 + Math.min(18, speed * 0.03) + (p.dashTimer > 0 ? 14 : 0);
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(-10, 5);
  ctx.lineTo(-10 - flame, 0);
  ctx.lineTo(-10, -5);
  ctx.closePath();
  ctx.fill();
  // The skiff: a sleek dart hull.
  ctx.fillStyle = COLORS.cyan;
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(-11, 11);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-11, -11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Shield ring while mercy frames last.
  if (p.invuln > 0) {
    ctx.strokeStyle = 'rgba(53, 240, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBossBar(ctx, G) {
  const boss = G.enemies.find((e) => e.isBoss && !e.dead);
  if (!boss) return;
  const w = 420;
  const x = (ARENA.w - w) / 2;
  const y = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 6, y - 6, w + 12, 26);
  ctx.fillStyle = '#3a0a2e';
  ctx.fillRect(x, y, w, 14);
  ctx.fillStyle = '#ff4fd8';
  ctx.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ABYSS MONARCH', ARENA.w / 2, y + 11);
}

export function render(ctx, G) {
  ctx.save();
  if (G.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  }
  drawWorld(ctx, G.world);
  for (const gem of G.gems) drawGem(ctx, gem, G.time);
  for (const o of G.enemyBullets) {
    ctx.fillStyle = '#ff4fd8';
    ctx.shadowColor = '#ff4fd8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  for (const e of G.enemies) {
    if (!e.dead) drawEnemy(ctx, e, G.time);
  }
  // Orbit blades.
  if (G.player.stats.orbit > 0 && G.player.alive) {
    ctx.fillStyle = '#7dff8a';
    ctx.shadowColor = '#7dff8a';
    ctx.shadowBlur = 8;
    for (const b of bladePositions(G)) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  drawPlayer(ctx, G);
  // Player bullets as additive streaks.
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.bullets) {
    ctx.strokeStyle = b.crit ? '#ffd166' : '#35f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // Floating combat text.
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / 0.9);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  drawBossBar(ctx, G);
  // Low-hull warning: the edges of the screen bleed red.
  const p = G.player;
  if (p.alive && p.hp < p.maxHp * 0.3) {
    const pulse = 0.12 + 0.08 * Math.sin(G.time * 6);
    const grad = ctx.createRadialGradient(
      ARENA.w / 2, ARENA.h / 2, ARENA.h * 0.35,
      ARENA.w / 2, ARENA.h / 2, ARENA.h * 0.75,
    );
    grad.addColorStop(0, 'rgba(255,40,40,0)');
    grad.addColorStop(1, `rgba(255,40,40,${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  }
  // Red flash right after a hit.
  if (G.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${G.hurtFlash * 0.35})`;
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  }
  ctx.restore();
}
