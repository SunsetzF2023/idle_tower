/* ═══════════════════════════════════════════════
   storage.js — localStorage 读写 + 数据校验
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.storage = {

  KEY: 'tower_save',

  /** 保存 */
  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) { /* 静默失败 */ }
  },

  /** 读取，失败返回默认值 */
  load(fallback) {
    try {
      var raw = localStorage.getItem(this.KEY);
      if (!raw) return fallback;
      var data = JSON.parse(raw);
      // 类型校验
      if (typeof data.bestWave !== 'number') return fallback;
      if (typeof data.totalKills !== 'number') return fallback;
      return data;
    } catch (e) {
      return fallback;
    }
  },

  /** 默认存档 */
  defaults() {
    return {
      bestWave: 0,
      totalKills: 0,
      killsByType: { basic: 0, fast: 0, tank: 0, boss: 0 },
      coins: 0,
      workshop: { damage: 0, speed: 0, range: 0, cash: 0 },
      unlocks: {}
    };
  }
};
