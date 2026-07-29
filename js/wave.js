/* ═══════════════════════════════════════════════
   wave.js — 波次管理 + 1/8秒生成判定
   公式: spawnRate × 8 × 26秒 (原作逆向)
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.wave = {

  SPAWN_INTERVAL: 125,      // 1/8秒 = 125ms
  WAVE_DURATION: 26000,     // 26秒
  TICKS_PER_SEC: 8,

  /** Spawn Rate 随波次增长 */
  getSpawnRate: function (wave) {
    // Wave 1: 15%, 每波+1%, 上限56%
    var rate = 0.14 + wave * 0.01;
    return Math.min(0.56, Math.max(0.10, rate));
  },

  /** 理论生成总数 */
  getExpectedCount: function (wave) {
    var rate = this.getSpawnRate(wave);
    return Math.floor(rate * this.TICKS_PER_SEC * 26);
  },

  /** 下一波需要生成的特殊敌人队列 */
  buildSpawnQueue: function (wave) {
    var comp = Tower.enemy.getWaveComposition(wave);
    var queue = [];
    for (var i = 0; i < comp.length; i++) {
      for (var j = 0; j < comp[i].count; j++) {
        queue.push(comp[i].type);
      }
    }
    // 随机打乱，让特殊敌人均匀分布在波次中
    return this._shuffle(queue);
  },

  /** 检查是否应该继续生成普通敌人 */
  shouldSpawnBasic: function (wave, elapsed, basicSpawned, specialQueue) {
    // 时间没到 26 秒 → 持续生成
    if (elapsed < this.WAVE_DURATION) return true;
    // 时间到了但特殊队列还没清空 → 继续生成基础敌人作为填充
    return specialQueue.length > 0;
  },

  _shuffle: function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
};
