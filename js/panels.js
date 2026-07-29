/* ═══════════════════════════════════════════════
   panels.js — 左右面板 DOM 更新
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.panels = {

  /** 更新左侧面板：塔状态 + 统计 */
  updateLeft: function (state) {
    var stats = Tower.tower.getStats(state);
    document.getElementById('s-hp').textContent = state.towerHP;
    document.getElementById('s-dmg').textContent = stats.damage;
    document.getElementById('s-spd').textContent = stats.attackSpeed.toFixed(2) + '/s';
    document.getElementById('s-rng').textContent = stats.range;
    document.getElementById('s-cash').textContent = state.cash;
    document.getElementById('s-coins').textContent = state.coins;
    document.getElementById('s-best').textContent = state.bestWave;
    document.getElementById('s-kills').textContent = state.totalKills;
    document.getElementById('s-basic').textContent = state.killsByType.basic;
    document.getElementById('s-fast').textContent = state.killsByType.fast;
    document.getElementById('s-tank').textContent = state.killsByType.tank;
    document.getElementById('s-boss').textContent = state.killsByType.boss;
  },

  /** 更新右侧面板：升级按钮 */
  updateUpgrades: function (state) {
    var di = Tower.tower.damageInfo(state.damageLevel);
    var si = Tower.tower.speedInfo(state.speedLevel);
    var ri = Tower.tower.rangeInfo(state.rangeLevel);

    // Damage
    document.getElementById('u-dmg-lv').textContent = di.level;
    document.getElementById('u-dmg-next').textContent = di.next;
    document.getElementById('u-dmg-cost').textContent = di.cost;
    document.getElementById('u-dmg-btn').disabled = !Tower.economy.canAfford(state, di.cost);

    // Speed
    document.getElementById('u-spd-lv').textContent = si.level;
    document.getElementById('u-spd-next').textContent = si.next.toFixed(2) + '/s';
    document.getElementById('u-spd-cost').textContent = si.cost;
    document.getElementById('u-spd-btn').disabled = !Tower.economy.canAfford(state, si.cost);

    // Range
    document.getElementById('u-rng-lv').textContent = ri.level;
    document.getElementById('u-rng-next').textContent = ri.next;
    document.getElementById('u-rng-cost').textContent = ri.cost;
    document.getElementById('u-rng-btn').disabled = !Tower.economy.canAfford(state, ri.cost);

    // 波次按钮
    var waveBtn = document.getElementById('wave-btn');
    waveBtn.disabled = state._current !== 'idle';
    waveBtn.textContent = state._current === 'idle' ? '▶ next wave' : '...fighting...';
  },

  /** 更新波次信息 */
  updateWave: function (state) {
    document.getElementById('s-wave').textContent = state.wave;
    var left = state.enemies.filter(function (e) { return e.alive; }).length;
    document.getElementById('s-left').textContent = left;
  },

  /** 显示/隐藏 Game Over 覆盖层 */
  showGameOver: function (state) {
    document.getElementById('game-over-overlay').classList.add('show');
    document.getElementById('go-wave').textContent = state.wave;
    document.getElementById('go-kills').textContent = state.totalKills;
  },

  hideGameOver: function () {
    document.getElementById('game-over-overlay').classList.remove('show');
  },

  /** 刷新全部面板 */
  refreshAll: function (state) {
    this.updateLeft(state);
    this.updateUpgrades(state);
    this.updateWave(state);
  }
};
