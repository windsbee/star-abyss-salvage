// world.js — the arena itself: a deep-space backdrop of drifting parallax stars
// and slow nebula clouds, pre-rendered once so the frame loop stays cheap.
// The arena is a fixed 960x600 field; the renderer scales it to the window.

import { ARENA, COLORS } from './config.js';
import { createRng } from './random.js';

export function createWorld() {
  const rng = createRng(1337);
  const layers = [];
  for (let layer = 0; layer < 3; layer++) {
    const stars = [];
    const count = [90, 60, 35][layer];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rng.range(0, ARENA.w),
        y: rng.range(0, ARENA.h),
        size: rng.range(0.6, 1.4 + layer * 0.5),
        twinkle: rng.range(0, Math.PI * 2),
        speed: rng.range(2, 6 + layer * 4),
      });
    }
    layers.push({ depth: 0.15 + layer * 0.25, stars });
  }
  const nebulas = [
    { x: 180, y: 130, r: 260, color: 'rgba(53, 240, 255, 0.05)' },
    { x: 780, y: 420, r: 300, color: 'rgba(255, 79, 216, 0.05)' },
    { x: 620, y: 110, r: 220, color: 'rgba(255, 209, 102, 0.04)' },
    { x: 220, y: 480, r: 240, color: 'rgba(125, 255, 138, 0.03)' },
  ];
  // Nebula glow is painted once to an offscreen canvas and blitted each frame.
  const nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = ARENA.w;
  nebulaCanvas.height = ARENA.h;
  const nctx = nebulaCanvas.getContext('2d');
  for (const n of nebulas) {
    const grad = nctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    grad.addColorStop(0, n.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    nctx.fillStyle = grad;
    nctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  return { layers, nebulaCanvas, time: 0 };
}

// Stars drift slowly downward and sideways, faster the deeper the layer,
// so the field feels alive even when the player sits still.
export function updateWorld(world, dt, vx, vy) {
  world.time += dt;
  for (const layer of world.layers) {
    for (const s of layer.stars) {
      s.y += s.speed * dt;
      s.x -= vx * 0.02 * layer.depth * dt;
      s.y -= vy * 0.02 * layer.depth * dt;
      if (s.y > ARENA.h + 2) {
        s.y = -2;
        s.x = Math.random() * ARENA.w;
      }
      if (s.x < -2) s.x = ARENA.w + 2;
      if (s.x > ARENA.w + 2) s.x = -2;
    }
  }
}

export function drawWorld(ctx, world) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  ctx.drawImage(world.nebulaCanvas, 0, 0);
  for (const layer of world.layers) {
    for (const s of layer.stars) {
      const tw = 0.55 + 0.45 * Math.sin(world.time * 1.5 + s.twinkle);
      ctx.globalAlpha = tw * (0.4 + layer.depth * 0.5);
      ctx.fillStyle = '#cfe9ff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
  }
  ctx.globalAlpha = 1;
  // Arena edge: a faint neon frame so the bounds read at a glance.
  ctx.strokeStyle = 'rgba(53, 240, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, ARENA.w - 2, ARENA.h - 2);
}
