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
  showGameOver: function (state, coinBonus) {
    document.getElementById('game-over-overlay').classList.add('show');
    document.getElementById('go-wave').textContent = state.wave;
    document.getElementById('go-kills').textContent = state.totalKills;
    // 动态添加 coins 结算信息
    var existing = document.getElementById('go-coins');
    if (!existing) {
      var div = document.createElement('div');
      div.className = 'go-stat';
      div.id = 'go-coins';
      div.style.color = '#e0af68';
      var overlay = document.getElementById('game-over-overlay');
      var btn = overlay.querySelector('.restart-btn');
      overlay.insertBefore(div, btn);
    }
    document.getElementById('go-coins').textContent = '+ ' + (coinBonus || 0) + ' coins earned';
  },

  hideGameOver: function () {
    document.getElementById('game-over-overlay').classList.remove('show');
  },

  /** 刷新全部面板 */
  refreshAll: function (state) {
    this.updateLeft(state);
    this.updateUpgrades(state);
    this.updateWave(state);
    this.renderWorkshop(state);
  },

  /** 渲染局外属性面板 */
  renderWorkshop: function (state) {
    var ws = state.workshop || {};
    var defs = Tower.tower.WORKSHOP;
    var html = '';
    var keys = ['damage', 'speed', 'range', 'cash'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var d = defs[k];
      var lv = ws[k] || 0;
      var cost = Tower.tower.workshopCost(k, lv);
      var maxed = lv >= d.max;
      var canBuy = state.coins >= cost && !maxed;
      var bonus = '';
      if (k === 'damage') bonus = '+' + (lv * d.perLv) + ' dmg';
      else if (k === 'speed') bonus = '+' + (lv * d.perLv).toFixed(2) + '/s';
      else if (k === 'range') bonus = '+' + (lv * d.perLv) + 'px';
      else bonus = '+' + (lv * d.perLv) + ' cash';

      html += '<div class="ws-row">'
        + '<div class="ws-name">' + d.icon + ' ' + d.name + ' <span style="font-size:9px;opacity:0.5">Lv.' + lv + '</span></div>'
        + '<div class="ws-desc">' + d.desc + ' (' + bonus + ')</div>'
        + '<div class="ws-bottom">'
        + '<span class="ws-cost">' + (maxed ? 'MAX' : '🪙 ' + cost) + '</span>'
        + '<button class="ws-btn" onclick="Tower.game.buyWorkshop(\'' + k + '\')"'
        + (canBuy ? '' : ' disabled') + '>'
        + (maxed ? 'MAX' : 'upgrade') + '</button>'
        + '</div></div>';
    }
    document.getElementById('ws-upgrades').innerHTML = html;
  }
};
