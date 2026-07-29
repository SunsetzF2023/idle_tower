/* ═══════════════════════════════════════════════
   economy.js — Cash / Coins 经济系统
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.economy = {

  /** 击杀敌人获得 Cash */
  earnCash: function (state, enemy) {
    state.cash += enemy.cash;
    return enemy.cash;
  },

  /** 波次完成获得 Coins */
  earnCoins: function (state, wave) {
    var earned = wave; // 简化：每波给等于波次数的 coins
    state.coins += earned;
    return earned;
  },

  /** 检查是否能负担升级 */
  canAfford: function (state, cost) {
    return state.cash >= cost;
  },

  /** 扣除升级费用 */
  spendCash: function (state, cost) {
    state.cash -= cost;
    if (state.cash < 0) state.cash = 0;
  },

  /** 死亡时清空 Cash + 结算 Coins */
  onDeath: function (state) {
    var bonus = Math.floor(state.wave * 2 + state.totalKills * 0.1);
    state.coins += bonus;
    state.cash = 0;
    return bonus;
  }
};
