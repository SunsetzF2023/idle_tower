/* ═══════════════════════════════════════════════
   game.js — main controller: init, state machine, workshop
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.game = {

  init: function () {
    Tower.renderer.init('game-canvas');

    var save = Tower.storage.load(Tower.storage.defaults());

    var state = {
      _current: 'idle',
      _leftTab: 'ingame',

      // Tower HP
      towerHP: 100,
      towerMaxHP: 100,

      // In-game levels
      damageLevel: 0,
      speedLevel: 0,
      rangeLevel: 0,
      hpLevel: 0,
      critLevel: 0,
      critFactorLevel: 0,
      multishotLevel: 0,
      cashWaveLevel: 0,

      _flashTimer: 0,

      // Resources
      cash: 0,
      coins: save.coins || 0,

      // Workshop
      workshop: save.workshop || { damage: 0, speed: 0, range: 0, cash: 0 },
      unlocks: save.unlocks || {},

      // Wave
      wave: 1,

      // Stats
      bestWave: save.bestWave || 0,
      totalKills: save.totalKills || 0,
      killsByType: save.killsByType || { basic: 0, fast: 0, tank: 0, boss: 0 },
      waveKills: 0,

      // Entity pools
      enemies: [],
      bullets: [],
      particles: [],
      damageNumbers: []
    };

    state.cash = Tower.tower.startingCash(state);

    this.state = state;
    this._save(state);
    Tower.panels.refreshAll(state);
    Tower.loop.start(state);
  },

  _save: function (state) {
    Tower.storage.save({
      bestWave: state.bestWave,
      totalKills: state.totalKills,
      killsByType: state.killsByType,
      coins: state.coins,
      workshop: state.workshop,
      unlocks: state.unlocks
    });
  },

  switchLeftTab: function (tab) {
    var state = this.state;
    state._leftTab = tab;
    document.getElementById('left-ingame').style.display = tab === 'ingame' ? 'block' : 'none';
    document.getElementById('left-workshop').style.display = tab === 'workshop' ? 'block' : 'none';
    document.getElementById('tab-ingame').classList.toggle('active', tab === 'ingame');
    document.getElementById('tab-workshop').classList.toggle('active', tab === 'workshop');
    if (tab === 'workshop') Tower.panels.renderWorkshop(state);
  },

  /** Buy permanent workshop bonus */
  buyWorkshop: function (key) {
    var state = this.state;
    var ws = state.workshop;
    var def = Tower.tower.WORKSHOP[key];
    var lv = ws[key] || 0;
    if (lv >= def.max) return;
    var cost = Tower.tower.workshopCost(key, lv);
    if (state.coins < cost) return;
    state.coins -= cost;
    ws[key] = lv + 1;
    this._save(state);
    Tower.panels.renderWorkshop(state);
    Tower.panels.updateLeft(state);
  },

  /** Buy one-time unlock */
  buyUnlock: function (key) {
    var state = this.state;
    if (state.unlocks[key]) return;
    var def = Tower.tower.UNLOCKS[key];
    if (state.coins < def.cost) return;
    state.coins -= def.cost;
    state.unlocks[key] = true;
    this._save(state);
    Tower.panels.refreshAll(state);
  },

  nextWave: function () {
    var state = this.state;
    if (state._current !== 'idle') return;
    // Cash per wave
    var cpw = Tower.tower.getStats(state).cashPerWave;
    if (cpw > 0) state.cash += cpw;

    state._current = 'playing';
    state.waveKills = 0;
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.damageNumbers = [];

    Tower.loop.resetWave(state);
    Tower.panels.refreshAll(state);
  },

  upgrade: function (stat) {
    var state = this.state;
    if (state._current !== 'idle') return;

    var levelKey = stat + 'Level';
    if (state[levelKey] === undefined) return;

    var info = Tower.tower.upgradeInfo(stat, state[levelKey]);
    if (info.maxed) return;
    if (!Tower.economy.canAfford(state, info.cost)) return;

    Tower.economy.spendCash(state, info.cost);
    state[levelKey]++;

    // If upgrading HP, apply to tower
    if (stat === 'hp') {
      var hpInfo = Tower.tower.upgradeInfo('hp', state.hpLevel);
      state.towerMaxHP = hpInfo.value;
      state.towerHP = Math.min(state.towerHP + Tower.tower.UPGRADES.hp.perLv, state.towerMaxHP);
    }

    Tower.panels.refreshAll(state);
  },

  onGameOver: function (state) {
    var coinBonus = Tower.economy.onDeath(state);
    if (state.wave > state.bestWave) state.bestWave = state.wave;
    this._save(state);
    Tower.panels.showGameOver(state, coinBonus);
    Tower.panels.refreshAll(state);
  },

  restart: function () {
    var state = this.state;
    this._save(state);

    state._current = 'idle';
    state.towerHP = state.towerMaxHP;
    state.damageLevel = 0;
    state.speedLevel = 0;
    state.rangeLevel = 0;
    state.hpLevel = 0;
    state.critLevel = 0;
    state.critFactorLevel = 0;
    state.multishotLevel = 0;
    state.cashWaveLevel = 0;
    state.cash = Tower.tower.startingCash(state);
    state.wave = 1;
    state.waveKills = 0;
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.damageNumbers = [];
    state._flashTimer = 0;

    Tower.panels.hideGameOver();
    Tower.panels.refreshAll(state);
  }
};
