// config.js — every tunable number of Star Abyss Salvage in one place.
// Nothing here imports anything else, so tuning never pulls in game logic.

export const ARENA = { w: 960, h: 600 };

export const COLORS = {
  bg: '#050914',
  cyan: '#35f0ff',
  gold: '#ffd166',
  magenta: '#ff4fd8',
  green: '#7dff8a',
  red: '#ff5d5d',
  white: '#eaf6ff',
  dim: '#8fa8c8',
};

export const PLAYER_BASE = {
  radius: 14,
  maxHp: 100,
  speed: 235,
  fireRate: 3.2, // shots per second
  bulletDamage: 12,
  bulletSpeed: 540,
  magnetRadius: 75,
  dashCooldown: 2.6, // seconds
  dashTime: 0.16,
  dashSpeed: 720,
  hitInvuln: 0.6, // seconds of mercy after taking a hit
  xpNeedBase: 5, // xp for level 2; grows per level below
};

// xp needed to go from `level` to `level + 1`.
export function xpNeed(level) {
  return PLAYER_BASE.xpNeedBase + (level - 1) * 4;
}

// Enemy types. hp/speed scale with the wave (see waveScale below).
export const ENEMY_TYPES = {
  mite: { name: '虚空螨', hp: 18, speed: 95, radius: 11, damage: 8, score: 10, color: '#ff5d5d' },
  drone: { name: '碎片无人机', hp: 34, speed: 70, radius: 14, damage: 10, score: 20, color: '#ff9f43' },
  brute: { name: '重装残骸', hp: 95, speed: 46, radius: 20, damage: 16, score: 30, color: '#c77dff' },
  spitter: { name: '孢子喷吐者', hp: 30, speed: 62, radius: 13, damage: 8, score: 25, color: '#7dff8a', shootCooldown: 2.6, orbSpeed: 150, orbDamage: 10 },
};

export const ELITE_MULT = { hp: 3.2, speed: 1.05, radius: 1.5, damage: 1.5, score: 5 };

export const BOSS = {
  name: '深渊君主',
  hp: 950,
  speed: 55,
  radius: 46,
  damage: 20,
  score: 1000,
  color: '#ff4fd8',
  radialCooldown: 3.0, // seconds between radial orb bursts
  radialCount: 10,
  orbSpeed: 130,
  orbDamage: 12,
  summonCooldown: 7.0, // seconds between mite summons
};

// Multipliers applied to a wave's enemies. Wave 1 is the baseline.
export function waveScale(wave) {
  return {
    hp: 1 + (wave - 1) * 0.16,
    speed: Math.min(1 + (wave - 1) * 0.045, 1.4),
  };
}

// How many of each enemy a wave throws at the player. Wave 10 is the boss wave.
export function waveComposition(wave) {
  if (wave === 10) return { mite: 4, drone: 0, brute: 0, spitter: 0, boss: true };
  return {
    mite: 4 + wave * 2,
    drone: wave >= 2 ? wave : 0,
    brute: wave >= 4 ? Math.floor(wave / 2) : 0,
    spitter: wave >= 3 ? Math.floor((wave - 1) / 2) : 0,
    boss: false,
  };
}

// True on the waves that field an elite (a bigger, richer version of one enemy).
export function waveHasElite(wave) {
  return wave % 5 === 0 && wave !== 10;
}

// Seconds between spawns while a wave is trickling in.
export function spawnInterval(wave) {
  return Math.max(0.5 - wave * 0.035, 0.2);
}

// Score pieces.
export const SCORE = { kill: 0, gem: 5, waveClear: 50, victory: 1000 };
