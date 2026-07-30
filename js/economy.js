/* ═══════════════════════════════════════════════
   economy.js — Cash / Coins 经济系统
   Coins/Kill, Coins/Wave implemented
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.economy = {

  /** 击杀敌人获得 Cash (× Cash Bonus) + Coins (× Coins/Kill) */
  earnCash: function (state, enemy) {
    var stats = Tower.tower.getStats(state);
    // Cash
    var earned = Math.floor(enemy.cash * stats.cashBonus);
    state.cash += earned;
    // Coins from kills (× CPK multiplier)
    if (enemy.coins > 0) {
      var coinEarned = Math.floor(enemy.coins * stats.coinsPerKill);
      state.coins += coinEarned;
    }
    return earned;
  },

  /** 波次完成获得 Coins (base + Coins/Wave bonus) */
  earnCoins: function (state, wave) {
    var stats = Tower.tower.getStats(state);
    var earned = wave + stats.coinsPerWave;
    state.coins += earned;
    return earned;
  },

  /** 检查是否能负担升级 */
  canAfford: function (state, cost) {
    return state.cash >= cost;
  },

  /** 扣除升级费用（Free Upgrade chance 在 game.js 处理） */
  spendCash: function (state, cost) {
    state.cash -= cost;
    if (state.cash < 0) state.cash = 0;
  },

  /** 死亡时清空 Cash + 结算 Coins */
  onDeath: function (state) {
    var stats = Tower.tower.getStats(state);
    var bonus = Math.floor(state.wave * 2 + state.totalKills * 0.1 * stats.coinsPerKill);
    state.coins += bonus;
    state.cash = 0;
    return bonus;
  }
};
