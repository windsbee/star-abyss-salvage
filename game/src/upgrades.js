// upgrades.js — the level-up draft: eleven upgrades, each with a stack cap and
// a real effect on the numbers the player fights with. A draft offers three
// distinct upgrades the player has not maxed out yet.

export const UPGRADE_POOL = [
  {
    id: 'rapid', name: 'Rapid Cycler', desc: 'Fire rate +18%', max: 5,
    apply(G) { G.player.stats.fireRate *= 1.18; },
  },
  {
    id: 'heavy', name: 'Heavy Rounds', desc: 'Bullet damage +25%', max: 5,
    apply(G) { G.player.stats.damage *= 1.25; },
  },
  {
    id: 'thrusters', name: 'Ion Thrusters', desc: 'Move speed +12%', max: 4,
    apply(G) { G.player.stats.speed *= 1.12; },
  },
  {
    id: 'magnet', name: 'Magnet Coil', desc: 'Pickup radius +45%', max: 4,
    apply(G) { G.player.stats.magnet *= 1.45; },
  },
  {
    id: 'plating', name: 'Hull Plating', desc: 'Max hull +25 and repair 30', max: 5,
    apply(G) { G.player.maxHp += 25; G.player.hp = Math.min(G.player.maxHp, G.player.hp + 30); },
  },
  {
    id: 'capacitor', name: 'Dash Capacitor', desc: 'Dash recharges 22% faster', max: 3,
    apply(G) { G.player.stats.dashCooldown *= 0.78; },
  },
  {
    id: 'split', name: 'Split Shot', desc: '+1 projectile per volley', max: 3,
    apply(G) { G.player.stats.multishot += 1; },
  },
  {
    id: 'orbit', name: 'Orbit Blade', desc: '+1 blade circling your hull', max: 3,
    apply(G) { G.player.stats.orbit += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Rounds', desc: 'Bullets pierce +1 enemy', max: 2,
    apply(G) { G.player.stats.pierce += 1; },
  },
  {
    id: 'crit', name: 'Deadeye Rounds', desc: '+10% critical chance (crits deal double)', max: 4,
    apply(G) { G.player.stats.crit += 0.1; },
  },
  {
    id: 'regen', name: 'Nano Weave', desc: 'Regenerate 1.2 hull per second', max: 3,
    apply(G) { G.player.stats.regen += 1.2; },
  },
];

export function availableUpgrades(G) {
  return UPGRADE_POOL.filter((u) => (G.player.upgrades[u.id] || 0) < u.max);
}

// Three distinct upgrades, drawn from the ones still available.
export function rollChoices(G, count = 3) {
  const pool = availableUpgrades(G).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = G.rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function applyUpgrade(G, id) {
  const def = UPGRADE_POOL.find((u) => u.id === id);
  if (!def) return false;
  const stacks = G.player.upgrades[id] || 0;
  if (stacks >= def.max) return false;
  def.apply(G);
  G.player.upgrades[id] = stacks + 1;
  return true;
}
