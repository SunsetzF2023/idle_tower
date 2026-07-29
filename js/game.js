/* ═══════════════════════════════════════════════
   game.js — 主控制器：初始化、状态转换、生命周期
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.game = {

  /** 初始化游戏 */
  init: function () {
    // Canvas
    Tower.renderer.init('game-canvas');

    // 加载存档
    var save = Tower.storage.load(Tower.storage.defaults());

    // 初始化全局状态
    var state = {
      // 游戏状态
      _current: 'idle',  // idle | playing | wave_complete | game_over

      // 塔
      towerHP: 100,
      towerMaxHP: 100,
      damageLevel: 0,
      speedLevel: 0,
      rangeLevel: 0,
      _flashTimer: 0,

      // 资源
      cash: 0,
      coins: save.coins || 0,

      // 波次
      wave: 1,

      // 统计
      bestWave: save.bestWave || 0,
      totalKills: save.totalKills || 0,
      killsByType: save.killsByType || { basic: 0, fast: 0, tank: 0, boss: 0 },
      waveKills: 0,

      // 实体池
      enemies: [],
      bullets: [],
      particles: [],
      damageNumbers: []
    };

    // 挂到全局，方便所有模块访问
    this.state = state;

    // 渲染初始画面
    Tower.panels.refreshAll(state);

    // 启动游戏循环
    Tower.loop.start(state);
  },

  /** 点击"下一波" */
  nextWave: function () {
    var state = this.state;
    if (state._current !== 'idle') return;
    if (state._current === 'game_over') return;

    state._current = 'playing';
    state.waveKills = 0;
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.damageNumbers = [];

    Tower.loop.resetWave(state);
    Tower.panels.refreshAll(state);
  },

  /** 升级属性 */
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

  /** 游戏结束 */
  onGameOver: function (state) {
    Tower.economy.onDeath(state);
    // 更新最佳记录
    if (state.wave > state.bestWave) {
      state.bestWave = state.wave;
    }
    // 保存
    Tower.storage.save({
      bestWave: state.bestWave,
      totalKills: state.totalKills,
      killsByType: state.killsByType,
      coins: state.coins
    });
    // 显示覆盖层
    Tower.panels.showGameOver(state);
    Tower.panels.refreshAll(state);
  },

  /** 重新开始 */
  restart: function () {
    var state = this.state;
    // 保存当前统计
    Tower.storage.save({
      bestWave: state.bestWave,
      totalKills: state.totalKills,
      killsByType: state.killsByType,
      coins: state.coins
    });

    // 重置
    state._current = 'idle';
    state.towerHP = 100;
    state.towerMaxHP = 100;
    state.damageLevel = 0;
    state.speedLevel = 0;
    state.rangeLevel = 0;
    state.cash = 0;
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
