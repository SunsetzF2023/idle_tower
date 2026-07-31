/* ═══════════════════════════════════════════════
   db.js — Supabase 云端数据库
   替换 network.js，永久在线不休眠
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.db = {

  // ── Supabase 项目配置 ──
  SUPABASE_URL: 'https://nwobdjtjwwobpjvwvavq.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53b2JkanRqd3dvYnBqdnd2YXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODczNjEsImV4cCI6MjEwMDk2MzM2MX0.iD5P5sjX3f1Fk-MpBqouW04SXrIUGXZwv402bctFkpA',

  _client: null,

  /** 初始化 Supabase 客户端 */
  init: function () {
    if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
      console.warn('Tower: Supabase not configured. Set Tower.db.SUPABASE_URL and SUPABASE_KEY.');
      return false;
    }
    if (window.supabase) {
      this._client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
      // 恢复之前的 session
      this._restoreSession();
      return true;
    }
    return false;
  },

  _restoreSession: function () {
    var self = this;
    try {
      var stored = JSON.parse(localStorage.getItem('tower_session') || 'null');
      if (stored && stored.refresh_token) {
        this._client.auth.setSession(stored).then(function () {
          self._onAuthChange();
        }).catch(function () {});
      }
    } catch (e) {}
  },

  _saveSession: function () {
    var self = this;
    if (!this._client) return;
    this._client.auth.getSession().then(function (r) {
      if (r.data && r.data.session) {
        try { localStorage.setItem('tower_session', JSON.stringify(r.data.session)); } catch (e) {}
      }
    }).catch(function () {});
  },

  _onAuthChange: function () {
    // 通知 panels 刷新
    if (Tower.game && Tower.game.state) {
      Tower.panels.updateLeft(Tower.game.state);
      if (Tower.game.state._leftTab === 'leaderboard') {
        Tower.panels.renderLeaderboard(Tower.game.state);
      }
    }
  },

  /** ── 账号操作 ── */

  isLoggedIn: function () {
    return this._getCachedUser() !== null;
  },

  _getCachedUser: function () {
    try { return JSON.parse(localStorage.getItem('tower_user') || 'null'); } catch (e) { return null; }
  },

  _setCachedUser: function (user) {
    try { localStorage.setItem('tower_user', JSON.stringify(user)); } catch (e) {}
  },

  /** 注册 */
  signup: function (username, password) {
    var self = this;
    if (!this._client) return Promise.reject('no client');
    var email = username + '@tower.user';
    return this._client.auth.signUp({ email: email, password: password })
      .then(function (r) {
        if (r.error) return { error: r.error.message };
        // 创建玩家记录
        var uid = r.data.user.id;
        return self._client.from('players').insert({
          user_id: uid, username: username
        }).then(function () {
          self._setCachedUser({ id: uid, name: username });
          self._saveSession();
          return { ok: true, playerId: uid, username: username };
        });
      });
  },

  /** 登录 */
  signin: function (username, password) {
    var self = this;
    if (!this._client) return Promise.reject('no client');
    var email = username + '@tower.user';
    return this._client.auth.signInWithPassword({ email: email, password: password })
      .then(function (r) {
        if (r.error) return { error: r.error.message };
        // 获取玩家名
        var uid = r.data.user.id;
        return self._client.from('players').select('username').eq('user_id', uid).single()
          .then(function (p) {
            var name = (p.data && p.data.username) || username;
            self._setCachedUser({ id: uid, name: name });
            self._saveSession();
            return { ok: true, playerId: uid, username: name };
          });
      });
  },

  /** 退出 */
  logout: function () {
    if (this._client) this._client.auth.signOut();
    try { localStorage.removeItem('tower_session'); } catch (e) {}
    try { localStorage.removeItem('tower_user'); } catch (e) {}
  },

  /** 获取当前用户名 */
  getName: function () {
    var u = this._getCachedUser();
    return (u && u.name) || '';
  },

  /** 获取当前用户 ID */
  getId: function () {
    var u = this._getCachedUser();
    return (u && u.id) || '';
  },

  /** ── 统计操作 ── */

  /** 提交统计 */
  submitStats: function (stats) {
    var self = this;
    if (!this._client) return Promise.reject('no client');
    var uid = this.getId();
    if (!uid) return Promise.reject('not logged in');

    // 先读当前值
    return this._client.from('players').select('*').eq('user_id', uid).single()
      .then(function (r) {
        if (!r.data) return Promise.reject('player not found');
        var p = r.data;
        var update = {
          best_wave: Math.max(p.best_wave, stats.bestWave || 0),
          total_waves: p.total_waves + (stats.totalWaves || 0),
          total_kills: p.total_kills + (stats.totalKills || 0),
          total_coins: p.total_coins + (stats.totalCoins || 0),
          games_played: p.games_played + 1,
          last_seen: new Date().toISOString()
        };
        // 合并 kills_by_type
        if (stats.killsByType) {
          var kt = p.kills_by_type || {};
          for (var k in stats.killsByType) {
            kt[k] = (kt[k] || 0) + stats.killsByType[k];
          }
          update.kills_by_type = kt;
        }
        return self._client.from('players').update(update).eq('user_id', uid);
      });
  },

  /** 排行榜 */
  getLeaderboard: function (type) {
    if (!this._client) return Promise.reject('no client');
    var col = type === 'totalWaves' ? 'total_waves' :
              type === 'totalKills' ? 'total_kills' : 'best_wave';
    return this._client.from('players')
      .select('username,best_wave,total_waves,total_kills,games_played')
      .order(col, { ascending: false })
      .limit(100)
      .then(function (r) {
        return (r.data || []).map(function (p) {
          return {
            id: p.username,
            name: p.username,
            bestWave: p.best_wave,
            totalWaves: p.total_waves,
            totalKills: p.total_kills,
            gamesPlayed: p.games_played
          };
        });
      });
  },

  /** 全局统计 */
  getGlobalStats: function () {
    if (!this._client) return Promise.reject('no client');
    return this._client.from('players').select('best_wave,total_kills')
      .then(function (r) {
        var data = r.data || [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
          totalPlayers: data.length,
          activeToday: data.filter(function (p) {
            return p.last_seen && new Date(p.last_seen) >= today;
          }).length,
          topBestWave: data.reduce(function (m, p) { return Math.max(m, p.best_wave || 0); }, 0),
          totalKillsAll: data.reduce(function (s, p) { return s + (p.total_kills || 0); }, 0),
          totalWavesAll: data.reduce(function (s, p) { return s + (p.total_waves || 0); }, 0)
        };
      });
  },

  /** ── 每日任务 ── */
  _DAILY_MISSIONS: [
    { id: 'kill_50', desc: 'Kill 50 enemies', target: 50, reward: 10 },
    { id: 'kill_200', desc: 'Kill 200 enemies', target: 200, reward: 25 },
    { id: 'wave_5', desc: 'Reach wave 5', target: 5, reward: 15 },
    { id: 'wave_10', desc: 'Reach wave 10', target: 10, reward: 30 },
    { id: 'kill_boss', desc: 'Kill 1 boss', target: 1, reward: 20 },
    { id: 'kill_tank', desc: 'Kill 3 tanks', target: 3, reward: 15 },
    { id: 'kill_ranged', desc: 'Kill 5 ranged enemies', target: 5, reward: 15 },
    { id: 'games_3', desc: 'Play 3 games', target: 3, reward: 20 }
  ],

  getMissions: function () {
    if (!this._client) return Promise.reject('no client');
    var today = new Date().toISOString().slice(0, 10);
    var self = this;
    return this._client.from('missions').select('*').eq('date', today).maybeSingle()
      .then(function (r) {
        if (r.data) return r.data.missions_data;
        // New day, generate missions
        var shuffled = self._DAILY_MISSIONS.slice().sort(function () { return Math.random() - 0.5; });
        var fresh = {
          date: today,
          missions: shuffled.slice(0, 4).map(function (m) {
            return { id: m.id, desc: m.desc, target: m.target, reward: m.reward, progress: 0, done: false, claimed: false };
          })
        };
        return self._client.from('missions').upsert({ date: today, missions_data: fresh })
          .then(function () { return fresh; });
      });
  },

  submitMissionProgress: function (progress) {
    // 简化处理：合并到 submitStats 时一起提交
    return Promise.resolve();
  },

  claimMission: function (missionId) {
    var self = this;
    var today = new Date().toISOString().slice(0, 10);
    return this._client.from('missions').select('*').eq('date', today).maybeSingle()
      .then(function (r) {
        if (!r.data) return { error: 'no missions' };
        var data = r.data.missions_data;
        var reward = 0;
        for (var i = 0; i < data.missions.length; i++) {
          if (data.missions[i].id === missionId && data.missions[i].done && !data.missions[i].claimed) {
            data.missions[i].claimed = true;
            reward = data.missions[i].reward;
            break;
          }
        }
        if (reward === 0) return { error: 'not claimable' };
        return self._client.from('missions').update({ missions_data: data }).eq('date', today)
          .then(function () {
            // 给玩家加 coins
            var uid = self.getId();
            return self._client.from('players').select('total_coins').eq('user_id', uid).single()
              .then(function (pr) {
                var coins = (pr.data ? pr.data.total_coins : 0) + reward;
                return self._client.from('players').update({ total_coins: coins }).eq('user_id', uid)
                  .then(function () { return { ok: true, reward: reward }; });
              });
          });
      });
  }
};
