/* ═══════════════════════════════════════════════
   game.js — main controller: init, state machine, workshop
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.game = {

  /** Initialize game */
  init: function () {
    Tower.renderer.init('game-canvas');

    var save = Tower.storage.load(Tower.storage.defaults());

    var state = {
      _current: 'idle',
      _leftTab: 'ingame',

      // Tower
      towerHP: 100,
      towerMaxHP: 100,
      damageLevel: 0,
      speedLevel: 0,
      rangeLevel: 0,
      _flashTimer: 0,

      // Resources
      cash: 0,
      coins: save.coins || 0,

      // Permanent upgrades
      workshop: save.workshop || { damage: 0, speed: 0, range: 0, cash: 0 },

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

    // Apply starting cash from workshop
    state.cash = Tower.tower.startingCash(state);

    this.state = state;
    // Ensure save key exists from the start
    this._save(state);
    Tower.panels.refreshAll(state);
    Tower.loop.start(state);
  },

  /** Persist stats to localStorage */
  _save: function (state) {
    Tower.storage.save({
      bestWave: state.bestWave,
      totalKills: state.totalKills,
      killsByType: state.killsByType,
      coins: state.coins,
      workshop: state.workshop
    });
  },

  /** Switch left panel tab */
  switchLeftTab: function (tab) {
    var state = this.state;
    state._leftTab = tab;
    document.getElementById('left-ingame').style.display = tab === 'ingame' ? 'block' : 'none';
    document.getElementById('left-workshop').style.display = tab === 'workshop' ? 'block' : 'none';
    document.getElementById('tab-ingame').classList.toggle('active', tab === 'ingame');
    document.getElementById('tab-workshop').classList.toggle('active', tab === 'workshop');
    if (tab === 'workshop') {
      Tower.panels.renderWorkshop(state);
    }
  },

  /** Buy workshop upgrade */
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

  /** Start next wave */
  nextWave: function () {
    var state = this.state;
    if (state._current !== 'idle') return;

    state._current = 'playing';
    state.waveKills = 0;
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.damageNumbers = [];

    Tower.loop.resetWave(state);
    Tower.panels.refreshAll(state);
  },

  /** In-game upgrade */
  upgrade: function (stat) {
    var state = this.state;
    if (state._current !== 'idle') return;

    var info, levelKey;
    if (stat === 'damage') { info = Tower.tower.damageInfo(state.damageLevel); levelKey = 'damageLevel'; }
    else if (stat === 'speed') { info = Tower.tower.speedInfo(state.speedLevel); levelKey = 'speedLevel'; }
    else if (stat === 'range') { info = Tower.tower.rangeInfo(state.rangeLevel); levelKey = 'rangeLevel'; }
    else return;

    if (!Tower.economy.canAfford(state, info.cost)) return;
    Tower.economy.spendCash(state, info.cost);
    state[levelKey]++;

    Tower.panels.refreshAll(state);
  },

  /** Game over handler */
  onGameOver: function (state) {
    var coinBonus = Tower.economy.onDeath(state);
    if (state.wave > state.bestWave) state.bestWave = state.wave;

    this._save(state);
    Tower.panels.showGameOver(state, coinBonus);
    Tower.panels.refreshAll(state);
  },

  /** Restart run */
  restart: function () {
    var state = this.state;
    this._save(state);

    state._current = 'idle';
    state.towerHP = state.towerMaxHP;
    state.damageLevel = 0;
    state.speedLevel = 0;
    state.rangeLevel = 0;
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
