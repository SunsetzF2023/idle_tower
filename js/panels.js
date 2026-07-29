/* ═══════════════════════════════════════════════
   panels.js — left/right panel DOM updates
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.panels = {

  updateLeft: function (state) {
    var stats = Tower.tower.getStats(state);
    document.getElementById('s-hp').textContent = state.towerHP + '/' + stats.maxHp;
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

  /** Render in-game Cash upgrade rows */
  renderUpgrades: function (state) {
    var defs = Tower.tower.INGAME;
    var html = '';
    var keys = ['damage', 'speed', 'range'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var def = defs[k];
      var info = Tower.tower.ingameInfo(k, state[k + 'Level'] || 0);
      if (!info) continue;
      var canBuy = Tower.economy.canAfford(state, info.cost) && state._current === 'idle';
      html += '<div class="upgrade-row">'
        + '<div class="upgrade-info">'
        + '<div class="upgrade-name">' + def.icon + ' ' + def.name + '</div>'
        + '<div class="upgrade-stat">' + def.format(info.value) + ' → ' + def.format(info.next) + '</div>'
        + '<div class="upgrade-cost">cost ' + info.cost + ' 💵</div>'
        + '</div>'
        + '<button class="upgrade-btn" onclick="Tower.game.ingameUpgrade(\'' + k + '\')"'
        + (canBuy ? '' : ' disabled') + '>Lv.' + info.level + '</button>'
        + '</div>';
    }
    document.getElementById('ug-container').innerHTML = html;
    document.getElementById('ug-locked').style.display = 'none';
  },

  updateWave: function (state) {
    document.getElementById('s-wave').textContent = state.wave;
    var left = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].alive) left++;
    }
    document.getElementById('s-left').textContent = left;
  },

  showGameOver: function (state, coinBonus) {
    document.getElementById('game-over-overlay').classList.add('show');
    document.getElementById('go-wave').textContent = state.wave;
    document.getElementById('go-kills').textContent = state.totalKills;
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

  /** Render workshop: Attack / Defense / Utility sections */
  renderWorkshop: function (state) {
    var ws = state.workshop || {};
    var wsDef = Tower.tower.WORKSHOP;
    var html = '';
    html += '<div style="font-size:10px;color:var(--text);opacity:0.6;margin-bottom:8px;line-height:1.5">💡 Permanent Coin upgrades.<br>Stack with in-game Cash upgrades.</div>';

    var sections = ['attack', 'defense', 'utility'];
    for (var s = 0; s < sections.length; s++) {
      var sec = wsDef[sections[s]];
      html += '<div style="font-size:10px;color:var(--amber);margin:10px 0 4px;letter-spacing:0.05em">' + sec.label + '</div>';
      var itemKeys = Object.keys(sec.items);
      for (var i = 0; i < itemKeys.length; i++) {
        var k = itemKeys[i];
        var item = sec.items[k];
        var lv = ws[k] || 0;
        var locked = item.unlock > 0 && state.coins < item.unlock && lv === 0;
        var maxed = item.maxLv && lv >= item.maxLv;
        var cost = locked ? item.unlock : Tower.tower.wsCost(item, lv);
        var canBuy = !maxed && state.coins >= cost;

        var valueStr = '';
        if (lv > 0) {
          var bonus = lv * item.perLv;
          if (item.format) valueStr = item.format(item.base + bonus);
          else if (k === 'speed') valueStr = (item.base + bonus).toFixed(2) + '/s';
          else if (k === 'range') valueStr = Math.floor(item.base + bonus) + 'px';
          else if (k === 'health') valueStr = Math.floor(item.base + bonus) + ' HP';
          else valueStr = '+' + bonus;
        }

        html += '<div class="ws-row">'
          + '<div class="ws-name">' + item.icon + ' ' + item.name
          + (lv > 0 ? ' <span style="font-size:9px;opacity:0.5">Lv.' + lv + (item.maxLv ? '/' + item.maxLv : '') + '</span>' : '')
          + '</div>'
          + '<div class="ws-desc">' + item.desc + (lv > 0 ? ' <b>(' + valueStr + ')</b>' : '') + '</div>'
          + '<div class="ws-bottom">'
          + '<span class="ws-cost">' + (maxed ? 'MAX' : (locked ? '🔒 🪙 ' + item.unlock : '🪙 ' + cost)) + '</span>'
          + '<button class="ws-btn" onclick="Tower.game.wsBuy(\'' + k + '\')"'
          + (canBuy ? '' : ' disabled') + '>'
          + (maxed ? 'MAX' : (locked ? 'unlock' : 'upgrade')) + '</button>'
          + '</div></div>';
      }
    }
    document.getElementById('ws-upgrades').innerHTML = html;
  },

  refreshAll: function (state) {
    this.updateLeft(state);
    this.renderUpgrades(state);
    this.updateWave(state);
    this.renderWorkshop(state);
  }
};
