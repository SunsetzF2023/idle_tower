/* ═══════════════════════════════════════════════
   loop.js — requestAnimationFrame 游戏循环
   战斗帧逻辑：spawn → move enemies → lock target → fire → bullets → hit detect
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.loop = {

  _rafId: null,
  _lastTime: 0,
  _lastAttackTime: 0,
  _lastSpawnTime: 0,
  _spawnCount: 0,
  _spawnQueue: [],
  _waveElapsed: 0,

  start: function (state) {
    this._lastTime = performance.now();
    this._lastAttackTime = 0;
    this._lastSpawnTime = 0;
    this._spawnCount = 0;
    this._spawnQueue = [];
    this._waveElapsed = 0;
    this._tick(state);
  },

  stop: function () {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  },

  resetWave: function (state) {
    this._lastSpawnTime = performance.now();
    this._spawnCount = 0;
    this._waveElapsed = 0;
    this._spawnQueue = Tower.wave.buildSpawnQueue(state.wave);
  },

  _tick: function (state) {
    var self = Tower.loop;
    self._rafId = requestAnimationFrame(function () { self._tick(state); });

    var now = performance.now();
    var dt = (now - self._lastTime) / 1000; // 转为秒
    self._lastTime = now;

    // 上限保护：如果帧间隔太大（切标签页回来），限制 dt
    if (dt > 0.1) dt = 0.1;

    // 更新闪烁计时器
    if (state._flashTimer && state._flashTimer > 0) {
      state._flashTimer -= dt * 5;
      if (state._flashTimer < 0) state._flashTimer = 0;
    }

    if (state._current === 'playing') {
      self._waveElapsed += dt * 1000;
      self._updatePlaying(state, dt, now);
    }

    // 更新粒子 + 伤害数字（不管什么状态都更新）
    Tower.combat.updateParticles(state, dt);
    Tower.combat.updateDamageNumbers(state, dt);

    // Auto-save every 10s
    if (!state._lastAutoSave || now - state._lastAutoSave > 10000) {
      Tower.game._save(state);
      state._lastAutoSave = now;
    }

    // 渲染
    var size = Tower.renderer.getSize();
    var towerPos = Tower.tower.position(size.w, size.h);
    Tower.renderer.render(state);

    // 更新面板
    Tower.panels.updateLeft(state);
    Tower.panels.updateWave(state);
    // 每秒更新升级面板就够了（避免刷太频繁）
    if (!state._lastPanelUpdate || now - state._lastPanelUpdate > 500) {
      Tower.panels.renderUpgrades(state);
      document.getElementById('wave-btn').textContent = state._current === 'idle' ? '▶ next wave' : '...fighting...';
      document.getElementById('wave-btn').disabled = state._current !== 'idle';
      state._lastPanelUpdate = now;
    }
  },

  _updatePlaying: function (state, dt, now) {
    var self = Tower.loop;
    var size = Tower.renderer.getSize();
    var towerPos = Tower.tower.position(size.w, size.h);
    var stats = Tower.tower.getStats(state);

    // Health regen
    if (stats.healthRegen > 0) {
      state.towerHP = Math.min(state.towerMaxHP, state.towerHP + stats.healthRegen * dt);
    }

    // ── 1. 敌人生成 ──
    if (now - self._lastSpawnTime >= Tower.wave.SPAWN_INTERVAL) {
      self._lastSpawnTime = now;
      self._doSpawn(state, towerPos, size);
    }

    // ── 2. 敌人移动 + 碰撞塔 ──
    for (var i = state.enemies.length - 1; i >= 0; i--) {
      var enemy = state.enemies[i];
      if (!enemy.alive) continue;
      var hit = Tower.enemy.move(enemy, towerPos.x, towerPos.y, stats.collisionRadius, dt);
      if (hit) {
        // 碰撞 → 塔受伤 + 敌人爆散粒子
        var hitResult = Tower.combat.enemyHitTower(state, enemy);
        Tower.combat.spawnParticles(state, enemy);
        Tower.combat.spawnDamageNumber(state, enemy.x, enemy.y, '-' + hitResult.damage, '#f7768e');
        state._flashTimer = 1;
        if (hitResult.dead) {
          state._current = 'game_over';
          Tower.game.onGameOver(state);
          return;
        }
      }
    }

    // ── 3. 塔锁敌 + 攻击 ──
    // 找范围内最近的活敌人
    var target = null;
    var closestDist = Infinity;
    for (var j = 0; j < state.enemies.length; j++) {
      var ej = state.enemies[j];
      if (!ej.alive) continue;
      var d = Tower.utils.dist(towerPos.x, towerPos.y, ej.x, ej.y);
      if (d <= stats.range && d < closestDist) {
        closestDist = d;
        target = ej;
      }
    }

    if (target && now - self._lastAttackTime >= stats.attackInterval) {
      self._lastAttackTime = now;
      // 发射子弹（可能有双发）
      self._fireBullets(state, towerPos, target, stats);
    }

    // ── 4. 子弹飞行 + 命中 ──
    for (var k = state.bullets.length - 1; k >= 0; k--) {
      var b = state.bullets[k];
      var bHit = Tower.bullet.move(b, state.enemies, dt);
      if (bHit) {
        // 找到目标敌人造成伤害
        var targetEnemy = null;
        for (var m = 0; m < state.enemies.length; m++) {
          if (state.enemies[m].id === b.targetId && state.enemies[m].alive) {
            targetEnemy = state.enemies[m];
            break;
          }
        }
        if (targetEnemy) {
          var stats2 = Tower.tower.getStats(state);
          var rawDmg = stats2.damage;
          var isCrit = Tower.utils.chance(stats2.critChance / 100);
          var dmg = isCrit ? Math.floor(rawDmg * stats2.critFactor) : rawDmg;
          Tower.enemy.takeDamage(targetEnemy, dmg);
          var dmgColor = isCrit ? '#ff9e64' : '#c0caf5';
          var dmgText = (isCrit ? '💥 ' : '') + dmg;
          Tower.combat.spawnDamageNumber(state, targetEnemy.x, targetEnemy.y - targetEnemy.radius, dmgText, dmgColor);
          if (targetEnemy.hp <= 0) {
            targetEnemy.alive = false;
            self._onEnemyKilled(state, targetEnemy);
          }
          if (result.killed) {
            self._onEnemyKilled(state, targetEnemy);
          }
        }
      }
      // 清理死子弹
      if (!state.bullets[k].alive) {
        state.bullets.splice(k, 1);
      }
    }

    // ── 5. 检查波次完成 ──
    self._checkWaveComplete(state);
  },

  _doSpawn: function (state, towerPos, size) {
    var self = Tower.loop;
    var canSpawn = Tower.wave.shouldSpawnBasic(state.wave, self._waveElapsed, self._spawnCount, self._spawnQueue);
    if (!canSpawn) return;

    var spawnRate = Tower.wave.getSpawnRate(state.wave);

    // 先检查特殊队列
    var enemyType = 'basic';
    if (self._spawnQueue.length > 0 && Tower.utils.chance(0.5)) {
      enemyType = self._spawnQueue.shift();
    } else if (!Tower.utils.chance(spawnRate)) {
      return; // 概率判定失败，不生成
    }

    // 同屏上限
    var aliveCount = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].alive) aliveCount++;
    }
    if (aliveCount >= 120) return;

    var enemy = Tower.enemy.create(enemyType, state.wave, size.w, size.h);
    state.enemies.push(enemy);
    self._spawnCount++;
  },

  /** Fire bullets — handles multishot (up to 2 targets) and crit */
  _fireBullets: function (state, towerPos, primaryTarget, stats) {
    // Primary bullet
    state.bullets.push(Tower.bullet.create(towerPos.x, towerPos.y, primaryTarget));
    // Multishot: fire at a second target
    if (Tower.utils.chance(stats.multishotChance / 100)) {
      var second = null;
      var range = stats.range;
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (!e.alive || e.id === primaryTarget.id) continue;
        var d = Tower.utils.dist(towerPos.x, towerPos.y, e.x, e.y);
        if (d <= range) { second = e; break; }
      }
      if (second) {
        state.bullets.push(Tower.bullet.create(towerPos.x, towerPos.y, second));
      }
    }
  },

  _onEnemyKilled: function (state, enemy) {
    // Cash
    var earned = Tower.economy.earnCash(state, enemy);
    // 统计
    state.totalKills++;
    state.waveKills++;
    if (state.killsByType[enemy.type] !== undefined) {
      state.killsByType[enemy.type]++;
    }
    // 粒子
    Tower.combat.spawnParticles(state, enemy);
  },

  _checkWaveComplete: function (state) {
    // 检查是否所有敌人都死了
    var anyAlive = false;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].alive) { anyAlive = true; break; }
    }
    // 还需确保生成已完成且队列已空
    if (!anyAlive && this._waveElapsed >= Tower.wave.WAVE_DURATION && this._spawnQueue.length === 0) {
      state._current = 'idle';
      // Coins 结算
      Tower.economy.earnCoins(state, state.wave);
      // 更新最佳波次 + 立即保存
      if (state.wave > state.bestWave) {
        state.bestWave = state.wave;
      }
      Tower.game._save(state);
      state.wave++;
      // 清理实体
      state.enemies = [];
      state.bullets = [];
      // 更新面板
      Tower.panels.refreshAll(state);
    }
  }
};
