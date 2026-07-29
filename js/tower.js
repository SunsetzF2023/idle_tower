/* ═══════════════════════════════════════════════
   tower.js — 塔属性 + 升级逻辑
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.tower = {

  /** 获取基础属性 */
  baseStats: function () {
    return {
      hp: 100,
      maxHp: 100,
      damage: 6,
      attackSpeed: 1.0,      // 每秒攻击次数
      range: 150,             // 像素
      size: 25,               // 六边形边长
      collisionRadius: 29     // 外接圆 ≈ size / cos(30°) ≈ 28.9
    };
  },

  /** 升级费用公式: base × 1.5^level */
  upgradeCost: function (base, level) {
    return Math.floor(base * Math.pow(1.5, level));
  },

  /** 伤害升级信息 */
  damageInfo: function (level) {
    return {
      level: level,
      value: 6 + level * 2,
      next: 6 + (level + 1) * 2,
      cost: this.upgradeCost(10, level)
    };
  },

  /** 攻速升级信息 */
  speedInfo: function (level) {
    var val = 1.0 + level * 0.12;
    var next = 1.0 + (level + 1) * 0.12;
    return {
      level: level,
      value: Math.round(val * 100) / 100,
      next: Math.round(next * 100) / 100,
      cost: this.upgradeCost(8, level)  // 降价，鼓励升级
    };
  },

  /** 射程升级信息 */
  rangeInfo: function (level) {
    return {
      level: level,
      value: 150 + level * 5,
      next: 150 + (level + 1) * 5,
      cost: this.upgradeCost(15, level)
    };
  },

  /** 获取当前塔的全部属性（含局外永久加成） */
  getStats: function (state) {
    var di = this.damageInfo(state.damageLevel);
    var si = this.speedInfo(state.speedLevel);
    var ri = this.rangeInfo(state.rangeLevel);
    var ws = state.workshop || {};
    return {
      hp: state.towerHP,
      maxHp: state.towerMaxHP,
      damage: di.value + (ws.damage || 0),
      attackSpeed: si.value + (ws.speed || 0) * 0.08,
      range: ri.value + (ws.range || 0) * 3,
      size: this.baseStats().size,
      collisionRadius: this.baseStats().collisionRadius,
      attackInterval: Math.floor(1000 / (si.value + (ws.speed || 0) * 0.08))
    };
  },

  /** ── 局外属性 (Workshop) ── */

  WORKSHOP: {
    damage: { name: 'Damage', icon: '⚔', base: 5, perLv: 1, max: 20, desc: '+1 base damage per level' },
    speed:  { name: 'Atk Speed', icon: '⚡', base: 5, perLv: 0.08, max: 20, desc: '+0.08/s per level' },
    range:  { name: 'Range', icon: '🎯', base: 8, perLv: 3, max: 15, desc: '+3px range per level' },
    cash:   { name: 'Start Cash', icon: '💰', base: 3, perLv: 5, max: 20, desc: '+5 starting cash per level' }
  },

  /** 局外升级费用: baseCoins × 2^level */
  workshopCost: function (key, level) {
    var base = this.WORKSHOP[key].base;
    return Math.floor(base * Math.pow(2, level));
  },

  /** 初始现金（含局外加成） */
  startingCash: function (state) {
    return (state.workshop && state.workshop.cash || 0) * 5;
  },

  /** 塔坐标 = Canvas 中心 */
  position: function (cw, ch) {
    return { x: cw / 2, y: ch / 2 };
  }
};
