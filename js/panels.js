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
    document.getElementById('s-totalwaves').textContent = state.totalWaves || 0;
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

  /** Render encyclopedia: enemy guide + mechanics */
  renderEncyclo: function (state) {
    var html = '';

    // ── Enemy Guide ──
    html += '<div class="panel-section">';
    html += '<div class="panel-title">👾 ENEMY GUIDE</div>';
    var types = Tower.enemy.TYPES;
    var tKeys = ['basic', 'fast', 'ranged', 'tank', 'boss'];
    for (var i = 0; i < tKeys.length; i++) {
      var t = types[tKeys[i]];
      var baseHP = Tower.enemy.baseHP(1);
      html += '<div style="margin-bottom:8px;padding:6px;background:var(--bg);border-radius:4px;font-size:10px;line-height:1.6">'
        + '<span style="color:' + t.color + ';font-size:12px">●</span> '
        + '<b style="color:var(--text-bright)">' + t.name.toUpperCase() + '</b>'
        + '<div style="color:var(--text);opacity:0.7">'
        + 'HP: ' + (baseHP * t.hpMul) + ' (×' + t.hpMul + ') · '
        + 'Spd: ' + t.speed + 'px/s · '
        + 'Dmg: ' + t.collisionDmg + ' · '
        + '💵 ' + t.cash
        + '</div>';
      // Special note
      if (tKeys[i] === 'boss') html += '<div style="color:var(--amber);font-size:9px">Every 10 waves · 💥10 dmg</div>';
      if (tKeys[i] === 'fast') html += '<div style="color:var(--amber);font-size:9px">From wave 5</div>';
      if (tKeys[i] === 'ranged') html += '<div style="color:var(--amber);font-size:9px">From wave 5 · 🏹 Stops at range & shoots</div>';
      if (tKeys[i] === 'tank') html += '<div style="color:var(--amber);font-size:9px">From wave 8 · 🛡 Sticks & rams tower</div>';
      html += '</div>';
    }
    html += '<div style="font-size:9px;color:var(--text);opacity:0.5">HP scales: 3 + wave × 3, then × type multiplier</div>';
    html += '</div>';

    // ── Mechanics ──
    html += '<div class="panel-section">';
    html += '<div class="panel-title">📖 MECHANICS</div>';
    html += '<div style="font-size:10px;color:var(--text);line-height:1.8">'
      + '<div>⚔ <b>Damage:</b> per-bullet base dmg</div>'
      + '<div>⚡ <b>Atk Speed:</b> shots per second</div>'
      + '<div>🎯 <b>Range:</b> target acquisition radius</div>'
      + '<div>★ <b>Crit:</b> % chance × multiplier</div>'
      + '<div>⫻ <b>Multishot:</b> % chance to fire second bullet</div>'
      + '<div>🛡 <b>Defense%:</b> reduces collision dmg</div>'
      + '<div>💚 <b>Regen:</b> HP restored per second</div>'
      + '<div>💵 <b>Cash Bonus:</b> multiplies all cash earned</div>'
      + '</div>';
    html += '</div>';

    // ── Currency ──
    html += '<div class="panel-section">';
    html += '<div class="panel-title">🪙 CURRENCY</div>';
    html += '<div style="font-size:10px;color:var(--text);line-height:1.8">'
      + '<div>💵 <b>Cash:</b> earned from kills. Resets on death. Spent in-game.</div>'
      + '<div>🪙 <b>Coins:</b> earned from waves + death bonus. Permanent. Spent in Workshop.</div>'
      + '<div style="color:var(--text);opacity:0.5;margin-top:4px">Death bonus: wave × 2 + kills × 0.1</div>'
      + '</div>';
    html += '</div>';

    document.getElementById('left-encyclo').innerHTML = html;
  },

  /** Render leaderboard + daily missions */
  renderLeaderboard: function (state) {
    var self = this;
    var html = '';

    // ── 账号（登录/注册） ──
    html += '<div class="panel-section">';
    html += '<div class="panel-title">👤 ACCOUNT</div>';

    if (Tower.network.isLoggedIn()) {
      html += '<div style="font-size:10px;color:var(--text);line-height:1.8">'
        + '<div><b style="color:var(--text-bright)">' + Tower.network.getName() + '</b>'
        + ' <span style="font-size:8px;color:var(--green)">● online</span></div>'
        + '<div style="font-size:8px;opacity:0.4">🆔 ' + Tower.network.getId() + '</div>'
        + '<button onclick="Tower.panels._logout()" style="width:100%;margin-top:4px;padding:3px;background:var(--bg3);border:1px solid var(--border);color:var(--red);font-family:var(--mono);font-size:9px;cursor:pointer">logout</button>'
        + '</div>';
    } else {
      html += '<div style="font-size:10px;color:var(--text)">'
        + '<input id="lb-user" type="text" placeholder="username" '
        + 'style="width:100%;padding:4px 6px;background:var(--bg);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:9px;border-radius:2px;margin-bottom:3px">'
        + '<input id="lb-pass" type="password" placeholder="password" '
        + 'style="width:100%;padding:4px 6px;background:var(--bg);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:9px;border-radius:2px;margin-bottom:3px">'
        + '<div id="lb-auth-msg" style="font-size:8px;color:var(--red);min-height:10px;margin-bottom:3px"></div>'
        + '<div style="display:flex;gap:3px">'
        + '<button onclick="Tower.panels._doLogin()" style="flex:1;padding:3px;background:var(--bg3);border:1px solid var(--blue);color:var(--blue);font-family:var(--mono);font-size:9px;cursor:pointer">sign in</button>'
        + '<button onclick="Tower.panels._doSignup()" style="flex:1;padding:3px;background:var(--bg3);border:1px solid var(--green);color:var(--green);font-family:var(--mono);font-size:9px;cursor:pointer">register</button>'
        + '</div></div>';
    }
    html += '</div>';

    // ── Server config ──
    var currentUrl = Tower.network.getServerUrl();
    html += '<div class="panel-section">';
    html += '<div class="panel-title">🔗 SERVER</div>';
    html += '<div style="font-size:10px;color:var(--text)">'
      + '<input id="lb-server-url" type="text" placeholder="Paste Pinggy URL here..." '
      + 'value="' + (currentUrl || '') + '" '
      + 'style="width:100%;padding:4px 6px;background:var(--bg);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:9px;border-radius:2px;margin-bottom:4px" '
      + 'onchange="Tower.panels._setServerUrl(this.value)">'
      + '<button onclick="Tower.panels._setServerUrl(document.getElementById(\'lb-server-url\').value);Tower.panels.renderLeaderboard(Tower.game.state)" '
      + 'style="width:100%;padding:3px;background:var(--bg3);border:1px solid var(--border);color:var(--blue);font-family:var(--mono);font-size:9px;cursor:pointer">↻ connect</button>'
      + (currentUrl ? '<div style="font-size:8px;color:var(--green);margin-top:3px">✓ connected</div>' : '<div style="font-size:8px;color:var(--text);opacity:0.4;margin-top:3px">empty = offline mode</div>')
      + '</div></div>';

    // ── Leaderboard tabs ──
    html += '<div class="panel-section" style="padding-bottom:4px">';
    html += '<div class="panel-title">🏆 LEADERBOARD</div>';
    html += '<div style="display:flex;gap:2px;margin-bottom:6px">';
    ['bestWave','totalWaves','totalKills'].forEach(function (t) {
      html += '<button class="lb-sort-btn" id="lb-sort-'+t+'" onclick="Tower.panels._loadLB(\''+t+'\')" '
        + 'style="flex:1;padding:3px 0;font-size:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text);cursor:pointer;font-family:var(--mono)">'
        + (t==='bestWave'?'Best Wave':t==='totalWaves'?'Total Waves':'Kills') + '</button>';
    });
    html += '</div>';
    html += '<div id="lb-list" style="font-size:10px;color:var(--text);line-height:1.8;max-height:300px;overflow-y:auto">';
    html += '<div style="color:var(--text);opacity:0.4;text-align:center;padding:10px">loading...</div>';
    html += '</div></div>';

    // ── Global stats ──
    html += '<div class="panel-section">';
    html += '<div class="panel-title">🌍 GLOBAL STATS</div>';
    html += '<div id="lb-global" style="font-size:10px;color:var(--text);line-height:1.8">';
    html += '<div style="color:var(--text);opacity:0.4">loading...</div>';
    html += '</div></div>';

    // ── Daily missions ──
    html += '<div class="panel-section">';
    html += '<div class="panel-title">📋 DAILY MISSIONS</div>';
    html += '<div id="lb-missions" style="font-size:10px;color:var(--text);line-height:1.8">';
    html += '<div style="color:var(--text);opacity:0.4">loading...</div>';
    html += '</div></div>';

    document.getElementById('left-leaderboard').innerHTML = html;

    // Load data
    this._loadLB('bestWave');
    this._loadGlobal();
    this._loadMissions();
  },

  _setServerUrl: function (url) {
    Tower.network.setServerUrl(url);
  },

  _doLogin: function () {
    var user = document.getElementById('lb-user').value.trim();
    var pass = document.getElementById('lb-pass').value;
    var msg = document.getElementById('lb-auth-msg');
    if (!user || !pass) { msg.textContent = 'fill in both fields'; return; }
    msg.textContent = '...';
    var self = this;
    Tower.network.signin(user, pass).then(function (r) {
      if (r.error) { msg.textContent = r.error; return; }
      self.renderLeaderboard(Tower.game.state);
      self.updateLeft(Tower.game.state);
    }).catch(function () { msg.textContent = 'server unreachable'; });
  },

  _doSignup: function () {
    var user = document.getElementById('lb-user').value.trim();
    var pass = document.getElementById('lb-pass').value;
    var msg = document.getElementById('lb-auth-msg');
    if (!user || !pass) { msg.textContent = 'fill in both fields'; return; }
    if (pass.length < 4) { msg.textContent = 'password min 4 chars'; return; }
    msg.textContent = '...';
    var self = this;
    Tower.network.signup(user, pass).then(function (r) {
      if (r.error) { msg.textContent = r.error; return; }
      self.renderLeaderboard(Tower.game.state);
      self.updateLeft(Tower.game.state);
    }).catch(function () { msg.textContent = 'server unreachable'; });
  },

  _logout: function () {
    Tower.network.logout();
    Tower.game.restart();
    this.renderLeaderboard(Tower.game.state);
  },

  _editName: function () {
    var name = prompt('Enter your player name:', Tower.network.getName() || '');
    if (name && name.trim()) {
      Tower.network.setName(name.trim());
      var el = document.getElementById('lb-name');
      if (el) el.textContent = name.trim();
    }
  },

  _loadLB: function (type) {
    var self = this;
    // Highlight active sort
    ['bestWave','totalWaves','totalKills'].forEach(function (t) {
      var btn = document.getElementById('lb-sort-'+t);
      if (btn) btn.style.borderColor = t === type ? 'var(--blue)' : 'var(--border)';
    });

    Tower.network.getLeaderboard(type).then(function (data) {
      var el = document.getElementById('lb-list');
      if (!el) return;
      if (!data || data.length === 0) {
        el.innerHTML = '<div style="color:var(--text);opacity:0.4;text-align:center;padding:10px">no players yet — be the first!</div>';
        return;
      }
      var html = '';
      var medals = ['🥇','🥈','🥉'];
      var myId = Tower.network.getId();
      for (var i = 0; i < Math.min(data.length, 20); i++) {
        var p = data[i];
        var rank = medals[i] || ('#' + (i+1));
        var isMe = p.id === myId;
        var val = type === 'bestWave' ? p.bestWave : (type === 'totalWaves' ? p.totalWaves : p.totalKills);
        html += '<div style="' + (isMe ? 'background:rgba(125,207,255,0.08);border-radius:2px;padding:1px 4px' : 'padding:1px 4px') + '">'
          + '<span style="width:20px;display:inline-block">' + rank + '</span>'
          + '<span style="' + (isMe ? 'color:var(--blue)' : '') + '">' + self._esc(p.name || 'Player') + '</span>'
          + '<span style="float:right;color:var(--text-bright)">' + val + '</span>'
          + '</div>';
      }
      el.innerHTML = html;
    }).catch(function () {
      var el = document.getElementById('lb-list');
      if (el) el.innerHTML = '<div style="color:var(--red);opacity:0.5;text-align:center;padding:10px">server offline</div>';
    });
  },

  _loadGlobal: function () {
    Tower.network.getGlobalStats().then(function (data) {
      var el = document.getElementById('lb-global');
      if (!el) return;
      el.innerHTML = '<div>Players: <b style="color:var(--text-bright)">' + (data.totalPlayers||0) + '</b></div>'
        + '<div>Active today: <b style="color:var(--green)">' + (data.activeToday||0) + '</b></div>'
        + '<div>Top best wave: <b style="color:var(--amber)">' + (data.topBestWave||0) + '</b></div>'
        + '<div>Total kills: <b style="color:var(--text-bright)">' + (data.totalKillsAll||0).toLocaleString() + '</b></div>';
    }).catch(function () {
      var el = document.getElementById('lb-global');
      if (el) el.innerHTML = '<div style="color:var(--red);opacity:0.5">server offline</div>';
    });
  },

  _loadMissions: function () {
    Tower.network.getMissions().then(function (data) {
      var el = document.getElementById('lb-missions');
      if (!el) return;
      if (!data || !data.missions) {
        el.innerHTML = '<div style="color:var(--text);opacity:0.4">no missions today</div>';
        return;
      }
      var html = '<div style="font-size:9px;opacity:0.5;margin-bottom:4px">' + (data.date || '') + '</div>';
      for (var i = 0; i < data.missions.length; i++) {
        var m = data.missions[i];
        var pct = Math.min(100, Math.floor((m.progress||0) / m.target * 100));
        var barColor = m.done ? 'var(--green)' : (pct > 50 ? 'var(--amber)' : 'var(--blue)');
        html += '<div style="margin-bottom:6px;padding:4px;background:var(--bg);border-radius:3px">'
          + '<div style="display:flex;justify-content:space-between;font-size:10px">'
          + '<span>' + m.desc + '</span>'
          + '<span style="color:var(--orange)">🪙' + m.reward + '</span>'
          + '</div>'
          + '<div style="height:3px;background:var(--bg3);border-radius:1px;margin-top:2px">'
          + '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:1px"></div>'
          + '</div>'
          + '<div style="font-size:8px;color:var(--text);opacity:0.5">' + (m.progress||0) + '/' + m.target
          + (m.done && !m.claimed ? ' <span style="color:var(--green);cursor:pointer" onclick="Tower.panels._claimMission(\''+m.id+'\')">[claim 🪙'+m.reward+']</span>' : '')
          + (m.claimed ? ' <span style="color:var(--green)">✓</span>' : '')
          + '</div></div>';
      }
      el.innerHTML = html;
    }).catch(function () {
      var el = document.getElementById('lb-missions');
      if (el) el.innerHTML = '<div style="color:var(--red);opacity:0.5">server offline</div>';
    });
  },

  _claimMission: function (missionId) {
    var self = this;
    Tower.network.claimMission(missionId).then(function (data) {
      if (data && data.ok) {
        // Refresh coins display
        self._loadMissions();
        var state = Tower.game.state;
        if (state && data.reward) {
          state.coins += data.reward;
          Tower.game._save(state);
          Tower.panels.updateLeft(state);
        }
      }
    });
  },

  _esc: function (str) {
    return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  refreshAll: function (state) {
    this.updateLeft(state);
    this.renderUpgrades(state);
    this.updateWave(state);
    this.renderWorkshop(state);
  }
};
