/* ═══════════════════════════════════════════════
   game.js — main controller: init, state machine, workshop
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.game = {

  init: function () {
    Tower.renderer.init('game-canvas');
    Tower.db.init();

    var save = Tower.storage.load(Tower.storage.defaults());

    var state = {
      _current: 'idle',
      _leftTab: 'ingame',

      // Tower HP (runtime)
      towerHP: 100,
      towerMaxHP: 100,

      // In-game upgrade levels
      damageLevel: 0,
      speedLevel: 0,
      rangeLevel: 0,

      _flashTimer: 0,
      _regenTimer: 0,

      // Resources
      cash: 0,
      coins: save.coins || 0,

      // Workshop levels (permanent)
      workshop: save.workshop || {},

      // Wave
      wave: 1,

      // Stats (persistent across runs)
      bestWave: save.bestWave || 0,
      totalKills: save.totalKills || 0,
      totalWaves: save.totalWaves || 0,
      killsByType: save.killsByType || { basic: 0, fast: 0, tank: 0, boss: 0, ranged: 0 },
      waveKills: 0,

      // Entity pools
      enemies: [],
      bullets: [],
      enemyBullets: [],
      particles: [],
      damageNumbers: []
    };

    // Apply workshop health
    var wsHp = Tower.tower.getStats(state).maxHp;
    state.towerMaxHP = wsHp;
    state.towerHP = wsHp;
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
      totalWaves: state.totalWaves,
      killsByType: state.killsByType,
      coins: state.coins,
      workshop: state.workshop
    });
  },

  switchLeftTab: function (tab) {
    if (!this.state) return;
    var state = this.state;
    state._leftTab = tab;
    document.getElementById('left-ingame').style.display = tab === 'ingame' ? 'block' : 'none';
    document.getElementById('left-workshop').style.display = tab === 'workshop' ? 'block' : 'none';
    document.getElementById('left-leaderboard').style.display = tab === 'leaderboard' ? 'block' : 'none';
    document.getElementById('left-encyclo').style.display = tab === 'encyclo' ? 'block' : 'none';
    document.getElementById('tab-ingame').classList.toggle('active', tab === 'ingame');
    document.getElementById('tab-workshop').classList.toggle('active', tab === 'workshop');
    document.getElementById('tab-leaderboard').classList.toggle('active', tab === 'leaderboard');
    document.getElementById('tab-encyclo').classList.toggle('active', tab === 'encyclo');
    if (tab === 'workshop') Tower.panels.renderWorkshop(state);
    if (tab === 'leaderboard') Tower.panels.renderLeaderboard(state);
    if (tab === 'encyclo') Tower.panels.renderEncyclo(state);
  },

  /** Buy/upgrade workshop stat (handles unlock cost + level cost) */
  wsBuy: function (key) {
    var state = this.state;
    var ws = state.workshop;
    var item = null;
    var wsDef = Tower.tower.WORKSHOP;
    for (var s in wsDef) {
      if (wsDef[s].items && wsDef[s].items[key]) {
        item = wsDef[s].items[key];
        break;
      }
    }
    if (!item) return;

    var lv = ws[key] || 0;
    if (item.maxLv && lv >= item.maxLv) return;

    // Unlock check: one-time coin cost before first level
    if (lv === 0 && item.unlock > 0) {
      if (state.coins < item.unlock) return;
      state.coins -= item.unlock;
    }

    // Level cost
    var cost = Tower.tower.wsCost(item, lv);
    if (state.coins < cost) return;
    state.coins -= cost;
    ws[key] = lv + 1;

    // Apply HP change immediately
    if (key === 'health') {
      var newMax = Tower.tower.getStats(state).maxHp;
      var diff = newMax - state.towerMaxHP;
      state.towerMaxHP = newMax;
      state.towerHP += diff;
    }

    this._save(state);
    Tower.panels.refreshAll(state);
  },

  nextWave: function () {
    var state = this.state;
    if (state._current !== 'idle') return;

    var cpw = Tower.tower.getStats(state).cashPerWave;
    if (cpw > 0) state.cash += cpw;

    state._current = 'playing';
    state.waveKills = 0;
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.particles = [];
    state.damageNumbers = [];

    Tower.loop.resetWave(state);
    Tower.panels.refreshAll(state);
  },

  ingameUpgrade: function (stat) {
    var state = this.state;
    if (state._current !== 'idle') return;
    var lk = stat + 'Level';
    if (state[lk] === undefined) return;
    var info = Tower.tower.ingameInfo(stat, state[lk]);
    if (!info) return;

    // Free Upgrade chance
    var stats = Tower.tower.getStats(state);
    var freeChance = 0;
    if (stat === 'damage' || stat === 'speed' || stat === 'range') {
      freeChance = stats.freeAttackChance;  // these are attack upgrades
    }

    var isFree = false;
    if (freeChance > 0 && Tower.utils.chance(freeChance / 100)) {
      isFree = true;
    }

    if (!isFree) {
      if (!Tower.economy.canAfford(state, info.cost)) return;
      Tower.economy.spendCash(state, info.cost);
    }
    state[lk]++;
    Tower.panels.refreshAll(state);
  },

  onGameOver: function (state) {
    var coinBonus = Tower.economy.onDeath(state);
    if (state.wave > state.bestWave) state.bestWave = state.wave;
    this._save(state);

    // 提交统计到 Supabase
    Tower.db.submitStats({
      bestWave: state.bestWave,
      totalWaves: state.totalWaves,
      totalKills: state.totalKills,
      killsByType: state.killsByType,
      coins: state.coins
    }).catch(function () {});

    Tower.panels.showGameOver(state, coinBonus);
    Tower.panels.refreshAll(state);
  },

  restart: function () {
    var state = this.state;
    this._save(state);

    state._current = 'idle';
    state.damageLevel = 0;
    state.speedLevel = 0;
    state.rangeLevel = 0;
    state.cash = Tower.tower.startingCash(state);
    state.wave = 1;
    state.waveKills = 0;
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.particles = [];
    state.damageNumbers = [];
    state._flashTimer = 0;

    var wsHp = Tower.tower.getStats(state).maxHp;
    state.towerMaxHP = wsHp;
    state.towerHP = wsHp;

    Tower.panels.hideGameOver();
    Tower.panels.refreshAll(state);
  }
};
