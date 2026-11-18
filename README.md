# Star Abyss Salvage

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/windsbee/star-abyss-salvage/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/windsbee/star-abyss-salvage/reward.svg)](https://make.fun/bounty/best-game-01)

A neon 2D arena-survival roguelite, built for make.fun's **“Make the best game”** bounty ($1,000 in USDC). Pilot a salvage skiff through the void, blast waves of void creatures, gather stardust, draft upgrades — and slay the **Abyss Monarch** on wave 10.

## Play

Open `game/index.html` in a desktop browser (or serve the repo with `node serve.ts` and open http://localhost:8080). No install, no network — the game is plain static files.

- **Move** — WASD / arrow keys
- **Fire** — automatic, aims at the nearest enemy
- **Dash** — Space (brief invulnerability, has a cooldown)
- **Pause** — P / Esc · **Mute** — M
- **Upgrade** — press 1 / 2 / 3 or click a card when you level up

## The run

- **Enemies** come in waves: void mites, shard drones, spitter spores and wreck brutes. Every 5th wave spawns elites; wave 10 brings the **Abyss Monarch** boss, with radial bullet barrages and mite summons.
- **Kills drop stardust** — collect it to level up. Each level pauses the game and offers **3 upgrade cards** (fire rate, damage, speed, magnet range, max hull, dash cooldown, multishot, orbit blades, piercing, crit, regen). Every pick changes how the run plays.
- **Win** — survive wave 10 and destroy the Monarch, then keep going in Endless Drift. **Lose** — your hull hits zero and the run ends with a stats screen (score, wave, kills, best).
- **Best score** is saved in localStorage.

## Presentation

- All art is drawn in code on canvas (vector neon: deep blue, cyan, gold, magenta) — no image assets.
- All sound is synthesized with WebAudio (laser, hit, pickup, explosion, dash, level-up, plus a slow ambient chord loop) — no audio files.
- Particles, hit flash, screen shake, floating score text, parallax starfield, low-hull red vignette.

## Structure

The source is split by responsibility, one clear job per file:

| File | Job |
| --- | --- |
| `game/index.html` | Page, HUD and screen markup |
| `game/src/main.js` | Boot, main loop, mode state machine (title / playing / paused / level-up / over / victory) |
| `game/src/config.js` | Arena, palette, tuning numbers, enemy and wave tables |
| `game/src/input.js` | Keyboard and mouse state |
| `game/src/random.js` | Seeded RNG |
| `game/src/audio.js` | WebAudio synth: effects and the ambient loop |
| `game/src/world.js` | Parallax starfield and arena border |
| `game/src/player.js` | The skiff: movement, dash, auto-fire, XP and levelling |
| `game/src/enemies.js` | Enemy types, the boss, and the wave director |
| `game/src/upgrades.js` | The upgrade pool, drafting and applying picks |
| `game/src/shots.js` | Bullets, enemy orbs, orbit blades, particles, floating text |
| `game/src/render.js` | Drawing only: state in, pixels out |
| `game/src/ui.js` | DOM HUD and screens (title, pause, draft, over, victory) |

## License

MIT — see [LICENSE](LICENSE).
