/* ═══════════════════════════════════════════════
   network.js — 后端通信：注册 / 提交统计 / 排行榜 / 每日任务
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.network = {

  // 从 localStorage 加载，默认为空（同源访问）
  API_BASE: '',

  /** 初始化：加载或创建玩家 ID + 服务器地址 */
  init: function () {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem('tower_player') || 'null'); } catch (e) {}
    this._player = stored || { id: this._uid(), name: '' };
    if (!stored) this._savePlayer();

    var savedUrl = null;
    try { savedUrl = localStorage.getItem('tower_server_url'); } catch (e) {}
    this.API_BASE = savedUrl || '';
  },

  _uid: function () {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  _savePlayer: function () {
    try { localStorage.setItem('tower_player', JSON.stringify(this._player)); } catch (e) {}
  },

  /** 设置自定义服务器地址（Pinggy / 自建） */
  setServerUrl: function (url) {
    url = (url || '').replace(/\/+$/, '');
    this.API_BASE = url;
    try { localStorage.setItem('tower_server_url', url); } catch (e) {}
    return url;
  },

  getServerUrl: function () {
    return this.API_BASE;
  },

  /** 是否已登录 */
  isLoggedIn: function () {
    return !!(this._player && this._player.loggedIn);
  },

  /** 注册账号 → 返回 promise */
  signup: function (username, password) {
    var self = this;
    return this._post('/api/auth/register', { username: username, password: password })
      .then(function (data) {
        if (data.ok) {
          self._player = { id: data.playerId, name: data.username, loggedIn: true };
          self._savePlayer();
        }
        return data;
      });
  },

  /** 登录 → 返回 promise */
  signin: function (username, password) {
    var self = this;
    return this._post('/api/auth/login', { username: username, password: password })
      .then(function (data) {
        if (data.ok) {
          self._player = { id: data.playerId, name: data.username, loggedIn: true };
          self._savePlayer();
        }
        return data;
      });
  },

  /** 退出登录 */
  logout: function () {
    this._player = { id: this._uid(), name: '', loggedIn: false };
    this._savePlayer();
  },

  /** 注册/获取玩家名 */
  setName: function (name) {
    this._player.name = name;
    this._savePlayer();
    this._post('/api/player', { id: this._player.id, name: name });
  },

  getName: function () {
    return this._player.name || 'Player';
  },

  getId: function () {
    return this._player.id;
  },

  /** 注册玩家（首次或每次启动） */
  register: function () {
    var self = this;
    this._post('/api/player', { id: this._player.id, name: this._player.name })
      .then(function (data) {
        if (data && data.name) {
          self._player.name = data.name;
          self._savePlayer();
        }
      })
      .catch(function () { /* 服务器不可用静默降级 */ });
  },

  /** 提交统计（游戏结束/定时） */
  submitStats: function (stats) {
    return this._post('/api/stats', {
      id: this._player.id,
      stats: {
        bestWave: stats.bestWave || 0,
        totalWaves: stats.totalWaves || 0,
        totalKills: stats.totalKills || 0,
        killsByType: stats.killsByType || {},
        totalCoins: stats.coins || 0,
        name: this._player.name
      }
    });
  },

  /** 获取排行榜 */
  getLeaderboard: function (type) {
    return this._get('/api/leaderboard/' + (type || 'bestWave'));
  },

  /** 获取全局统计 */
  getGlobalStats: function () {
    return this._get('/api/stats');
  },

  /** 获取每日任务 */
  getMissions: function () {
    return this._get('/api/missions');
  },

  /** 提交任务进度 */
  submitMissionProgress: function (progress) {
    return this._post('/api/missions/progress', { progress: progress });
  },

  /** 领取任务奖励 */
  claimMission: function (missionId) {
    return this._post('/api/missions/claim', { id: this._player.id, missionId: missionId });
  },

  // ═══ HTTP helpers ═══
  _get: function (path) {
    var self = this;
    return fetch(self.API_BASE + path)
      .then(function (r) { return r.json(); });
  },

  _post: function (path, body) {
    var self = this;
    return fetch(self.API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
};
