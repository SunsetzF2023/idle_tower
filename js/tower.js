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
    var val = 1.0 + level * 0.05;
    var next = 1.0 + (level + 1) * 0.05;
    return {
      level: level,
      value: Math.round(val * 100) / 100,
      next: Math.round(next * 100) / 100,
      cost: this.upgradeCost(10, level)
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

  /** 获取当前塔的全部属性 */
  getStats: function (state) {
    var di = this.damageInfo(state.damageLevel);
    var si = this.speedInfo(state.speedLevel);
    var ri = this.rangeInfo(state.rangeLevel);
    return {
      hp: state.towerHP,
      maxHp: state.towerMaxHP,
      damage: di.value,
      attackSpeed: si.value,
      range: ri.value,
      size: this.baseStats().size,
      collisionRadius: this.baseStats().collisionRadius,
      // 攻击间隔（毫秒）
      attackInterval: Math.floor(1000 / si.value)
    };
  },

  /** 塔坐标 = Canvas 中心 */
  position: function (cw, ch) {
    return { x: cw / 2, y: ch / 2 };
  }
};
