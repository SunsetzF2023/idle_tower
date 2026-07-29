/* ═══════════════════════════════════════════════
   panels.js — left/right panel DOM updates
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.panels = {

  /** Update left panel: tower status + stats */
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

  /** Render right-panel upgrade rows dynamically */
  renderUpgrades: function (state) {
    var defs = Tower.tower.UPGRADES;
    var unlocks = state.unlocks || {};
    var html = '';
    var anyLocked = false;

    var order = ['damage', 'speed', 'range', 'hp', 'crit', 'critFactor', 'multishot', 'cashWave'];
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      var def = defs[key];
      if (!def) continue;

      // Visibility check
      if (def.visible === 'unlocked') {
        if (!unlocks[def.unlockKey]) { anyLocked = true; continue; }
      }

      var lv = state[key + 'Level'] || 0;
      var info = Tower.tower.upgradeInfo(key, lv);
      var canBuy = !info.maxed && Tower.economy.canAfford(state, info.cost);
      var maxed = info.maxed;
      var nextStr = def.format(info.next);
      var costStr = maxed ? 'MAX' : info.cost + ' 💵';

      html += '<div class="upgrade-row">'
        + '<div class="upgrade-info">'
        + '<div class="upgrade-name">' + def.icon + ' ' + def.name + '</div>'
        + '<div class="upgrade-stat">' + def.format(info.value) + ' → ' + nextStr + '</div>'
        + '<div class="upgrade-cost">cost ' + costStr + '</div>'
        + '</div>'
        + '<button class="upgrade-btn" onclick="Tower.game.upgrade(\'' + key + '\')"'
        + ((canBuy && state._current === 'idle') ? '' : ' disabled') + '>'
        + (maxed ? 'MAX' : 'Lv.' + lv) + '</button>'
        + '</div>';
    }

    document.getElementById('ug-container').innerHTML = html;
    document.getElementById('ug-locked').style.display = anyLocked ? 'block' : 'none';
  },

  /** Update wave info */
  updateWave: function (state) {
    document.getElementById('s-wave').textContent = state.wave;
    var left = state.enemies.filter(function (e) { return e.alive; }).length;
    document.getElementById('s-left').textContent = left;
  },

  /** Show game over overlay with coin bonus */
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

  /** Render workshop panel — permanent bonuses + unlocks */
  renderWorkshop: function (state) {
    var ws = state.workshop || {};
    var ul = state.unlocks || {};
    var html = '';

    // Section: Permanent Bonuses
    html += '<div style="font-size:10px;color:var(--text);opacity:0.5;margin-bottom:6px">─ Permanent Bonuses ─</div>';
    var keys = ['damage', 'speed', 'range', 'cash'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var d = Tower.tower.WORKSHOP[k];
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
        + '<div class="ws-name">' + d.icon + ' ' + d.name + ' <span style="font-size:9px;opacity:0.5">Lv.' + lv + '/' + d.max + '</span></div>'
        + '<div class="ws-desc">' + d.desc + ' (' + bonus + ')</div>'
        + '<div class="ws-bottom">'
        + '<span class="ws-cost">' + (maxed ? 'MAX' : '🪙 ' + cost) + '</span>'
        + '<button class="ws-btn" onclick="Tower.game.buyWorkshop(\'' + k + '\')"'
        + (canBuy ? '' : ' disabled') + '>'
        + (maxed ? 'MAX' : 'upgrade') + '</button>'
        + '</div></div>';
    }

    // Section: Unlocks
    html += '<div style="font-size:10px;color:var(--text);opacity:0.5;margin:10px 0 6px">─ Unlocks (one-time) ─</div>';
    var ulKeys = ['health', 'crit', 'multishot', 'cashwave'];
    for (var j = 0; j < ulKeys.length; j++) {
      var uk = ulKeys[j];
      var ud = Tower.tower.UNLOCKS[uk];
      var owned = ul[uk];
      html += '<div class="ws-row">'
        + '<div class="ws-name">' + ud.icon + ' ' + ud.name + '</div>'
        + '<div class="ws-desc">' + ud.desc + '</div>'
        + '<div class="ws-bottom">'
        + (owned
          ? '<span style="font-size:9px;color:var(--green)">✅ unlocked</span>'
          : '<span class="ws-cost">🪙 ' + ud.cost + '</span>'
          + '<button class="ws-btn" onclick="Tower.game.buyUnlock(\'' + uk + '\')"'
          + (state.coins >= ud.cost ? '' : ' disabled') + '>buy</button>')
        + '</div></div>';
    }

    document.getElementById('ws-upgrades').innerHTML = html;
  },

  /** Refresh all panels */
  refreshAll: function (state) {
    this.updateLeft(state);
    this.renderUpgrades(state);
    this.updateWave(state);
    this.renderWorkshop(state);
  }
};
