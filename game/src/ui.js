// ui.js — the DOM half of the game: the HUD (hull, XP, wave, score, stardust,
// kills, dash) and every screen (title, pause, level-up draft, game over,
// victory). The canvas never draws text for the interface, so it stays crisp.

export function createUI(callbacks) {
  const el = (id) => document.getElementById(id);
  const hud = {
    hpFill: el('hp-fill'),
    hpText: el('hp-text'),
    xpFill: el('xp-fill'),
    xpText: el('xp-text'),
    wave: el('hud-wave'),
    score: el('hud-score'),
    dust: el('hud-dust'),
    kills: el('hud-kills'),
    dashFill: el('dash-fill'),
    bossBar: el('boss-bar'),
    bossFill: el('boss-fill'),
    muteBtn: el('btn-mute'),
  };
  const screens = {
    title: el('screen-title'),
    pause: el('screen-pause'),
    levelup: el('screen-levelup'),
    over: el('screen-over'),
    win: el('screen-win'),
  };
  const toastEl = el('toast');
  let toastTimer = null;
  let lastHud = '';

  function showScreen(name) {
    for (const [key, node] of Object.entries(screens)) {
      node.classList.toggle('hidden', key !== name);
    }
    el('hud').classList.toggle('hidden', name === 'title');
  }

  function updateHUD(G) {
    const p = G.player;
    const key = [
      Math.ceil(p.hp), p.maxHp, p.level, Math.floor(p.xp),
      G.wave, G.score, G.stardust, G.kills,
      Math.round(p.dashCd * 10),
    ].join('|');
    if (key === lastHud) return;
    lastHud = key;
    hud.hpFill.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
    hud.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    const need = 5 + (p.level - 1) * 4;
    hud.xpFill.style.width = `${Math.min(100, (p.xp / need) * 100)}%`;
    hud.xpText.textContent = `LV ${p.level}`;
    hud.wave.textContent = `WAVE ${G.wave}${G.endless ? ' ∞' : ''}`;
    hud.score.textContent = String(G.score);
    hud.dust.textContent = String(G.stardust);
    hud.kills.textContent = String(G.kills);
    const dashReady = p.dashCd <= 0;
    hud.dashFill.style.width = dashReady ? '100%' : `${Math.max(0, (1 - p.dashCd / p.stats.dashCooldown) * 100)}%`;
    hud.dashFill.classList.toggle('ready', dashReady);
    const boss = G.enemies.find((e) => e.isBoss && !e.dead);
    hud.bossBar.classList.toggle('hidden', !boss);
    if (boss) hud.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  }

  function toast(text, ms = 1800) {
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      toastEl.classList.add('hidden');
    }, ms);
  }

  function showLevelUp(choices) {
    const cards = el('cards');
    cards.innerHTML = '';
    choices.forEach((choice, i) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.innerHTML = `<span class="card-key">${i + 1}</span><span class="card-name">${choice.name}</span><span class="card-desc">${choice.desc}</span>`;
      card.addEventListener('click', () => callbacks.onPick(i));
      cards.appendChild(card);
    });
    showScreen('levelup');
  }

  function showOver(G, best, isNewBest) {
    el('over-score').textContent = String(G.score);
    el('over-wave').textContent = String(G.wave);
    el('over-kills').textContent = String(G.kills);
    el('over-best').textContent = String(best);
    el('over-newbest').classList.toggle('hidden', !isNewBest);
    showScreen('over');
  }

  function showWin(G, best) {
    el('win-score').textContent = String(G.score);
    el('win-wave').textContent = String(G.wave);
    el('win-kills').textContent = String(G.kills);
    el('win-best').textContent = String(best);
    showScreen('win');
  }

  function setTitleBest(best) {
    el('title-best').textContent = best > 0 ? `BEST ${best}` : 'No salvage runs yet — be the first.';
  }

  function setMuted(muted) {
    hud.muteBtn.textContent = muted ? '🔇 Sound off (M)' : '🔊 Sound on (M)';
  }

  el('btn-start').addEventListener('click', callbacks.onStart);
  el('btn-resume').addEventListener('click', callbacks.onResume);
  el('btn-restart-pause').addEventListener('click', callbacks.onRestart);
  el('btn-again').addEventListener('click', callbacks.onRestart);
  el('btn-endless').addEventListener('click', callbacks.onEndless);
  el('btn-again-win').addEventListener('click', callbacks.onRestart);
  hud.muteBtn.addEventListener('click', callbacks.onMute);

  return { showScreen, updateHUD, toast, showLevelUp, showOver, showWin, setTitleBest, setMuted };
}
