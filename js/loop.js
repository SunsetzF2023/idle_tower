/* ═══════════════════════════════════════════════
   loop.js — requestAnimationFrame 游戏循环
   战斗帧逻辑：spawn → move enemies → lock target → fire → bullets → hit detect
   新机制: Lifesteal, Knockback, Rapid Fire, Super Crit, Bounce Shot, Land Mine
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
  _rapidFireUntil: 0,       // Rapid Fire 结束时间戳
  _mines: [],                // Land mines

  start: function (state) {
    this._lastTime = performance.now();
    this._lastAttackTime = 0;
    this._lastSpawnTime = 0;
    this._spawnCount = 0;
    this._spawnQueue = [];
    this._waveElapsed = 0;
    this._rapidFireUntil = 0;
    this._mines = [];
    state.enemyBullets = state.enemyBullets || [];
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
    state.enemyBullets = [];
    this._mines = [];
  },

  _tick: function (state) {
    var self = Tower.loop;
    self._rafId = requestAnimationFrame(function () { self._tick(state); });

    var now = performance.now();
    var dt = (now - self._lastTime) / 1000;
    self._lastTime = now;

    if (dt > 0.1) dt = 0.1;

    if (state._flashTimer && state._flashTimer > 0) {
      state._flashTimer -= dt * 5;
      if (state._flashTimer < 0) state._flashTimer = 0;
    }

    if (state._current === 'playing') {
      var stats = Tower.tower.getStats(state);
      var gameDt = dt * (stats.gameSpeed || 1.0);
      self._waveElapsed += gameDt * 1000;
      self._updatePlaying(state, gameDt, now);
    }

    Tower.combat.updateParticles(state, dt);
    Tower.combat.updateDamageNumbers(state, dt);

    if (!state._lastAutoSave || now - state._lastAutoSave > 10000) {
      Tower.game._save(state);
      state._lastAutoSave = now;
    }

    Tower.renderer.render(state);

    Tower.panels.updateLeft(state);
    Tower.panels.updateWave(state);
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

    // ── 2. 敌人移动 ──
    for (var i = state.enemies.length - 1; i >= 0; i--) {
      var enemy = state.enemies[i];
      if (!enemy.alive) continue;

      if (enemy.behaviour === 'ranged' && !enemy.stopped) {
        var distToTower = Tower.utils.dist(enemy.x, enemy.y, towerPos.x, towerPos.y);
        // Clamp stop distance: inside range circle, but never beyond canvas bounds
        var maxStop = Math.min(size.w, size.h) / 2 - enemy.radius - 10;
        var stopDist = Math.min(stats.range - enemy.radius, maxStop);
        if (distToTower <= stopDist + enemy.speed * dt) {
          var angle = Tower.utils.angle(towerPos.x, towerPos.y, enemy.x, enemy.y);
          enemy.x = towerPos.x + Math.cos(angle) * stopDist;
          enemy.y = towerPos.y + Math.sin(angle) * stopDist;
          enemy.stopped = true;
          enemy._lastAttack = now;
        } else {
          var moveResult = Tower.utils.moveToward(enemy.x, enemy.y, towerPos.x, towerPos.y, enemy.speed * dt);
          enemy.x = moveResult.x;
          enemy.y = moveResult.y;
        }
      } else if (enemy.behaviour !== 'ranged') {
        var hit = Tower.enemy.move(enemy, towerPos.x, towerPos.y, stats.collisionRadius, dt);
        if (hit) {
          if (enemy.behaviour === 'tank') {
            if (!enemy.stuck) {
              enemy.stuck = true;
              enemy._lastAttack = now;
              Tower.combat.spawnDamageNumber(state, enemy.x, enemy.y, '-' + enemy.collisionDmg, '#bb9af7');
              state._flashTimer = 1;
            }
          } else {
            var hitResult = Tower.combat.enemyHitTower(state, enemy);
            Tower.combat.spawnParticles(state, enemy);
            Tower.combat.spawnDamageNumber(state, enemy.x, enemy.y, '-' + hitResult.damage, '#f7768e');
            state._flashTimer = 1;
            if (hitResult.deathDefy) {
              Tower.combat.spawnDamageNumber(state, towerPos.x, towerPos.y, 'DEATH DEFY!', '#ff9e64');
            }
            if (hitResult.dead) {
              state._current = 'game_over';
              Tower.game.onGameOver(state);
              return;
            }
          }
        }
      }
    }

    // ── 2.5 Tank 持续冲撞 ──
    for (var t = state.enemies.length - 1; t >= 0; t--) {
      var tank = state.enemies[t];
      if (!tank.alive || tank.behaviour !== 'tank' || !tank.stuck) continue;
      if (!tank._lastAttack) tank._lastAttack = now;
      if (now - tank._lastAttack >= (tank.attackInterval || 1500)) {
        tank._lastAttack = now;
        var tankHit = Tower.combat.enemyHitTower(state, tank);
        Tower.combat.spawnParticles(state, tank);
        Tower.combat.spawnDamageNumber(state, tank.x, tank.y, '-' + tankHit.damage, '#bb9af7');
        state._flashTimer = 1;
        if (tankHit.deathDefy) {
          Tower.combat.spawnDamageNumber(state, towerPos.x, towerPos.y, 'DEATH DEFY!', '#ff9e64');
        }
        if (tankHit.dead) {
          state._current = 'game_over';
          Tower.game.onGameOver(state);
          return;
        }
      }
    }

    // ── 3. 塔锁敌 + 攻击 ──
    // Rapid Fire check
    var isRapidFire = self._rapidFireUntil > 0 && now < self._rapidFireUntil;
    var effectiveInterval = isRapidFire ? stats.attackInterval / 5 : stats.attackInterval;

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

    if (target && now - self._lastAttackTime >= effectiveInterval) {
      self._lastAttackTime = now;

      // Rapid Fire proc check
      if (!isRapidFire && stats.rapidFireChance > 0) {
        if (Tower.utils.chance(stats.rapidFireChance / 100)) {
          self._rapidFireUntil = now + stats.rapidFireDuration * 1000;
          Tower.combat.spawnDamageNumber(state, towerPos.x, towerPos.y - 20, 'RAPID FIRE!', '#ff9e64');
        }
      }

      self._fireBullets(state, towerPos, target, stats);
    }

    // ── 4. 子弹飞行 + 命中 ──
    for (var k = state.bullets.length - 1; k >= 0; k--) {
      var b = state.bullets[k];
      if (!b.alive) { state.bullets.splice(k, 1); continue; }

      var bHit = Tower.bullet.move(b, state.enemies, dt);
      if (bHit) {
        var targetEnemy = null;
        for (var m = 0; m < state.enemies.length; m++) {
          if (state.enemies[m].id === b.targetId && state.enemies[m].alive) {
            targetEnemy = state.enemies[m];
            break;
          }
        }
        if (targetEnemy) {
          var rawDmg = stats.damage;

          // Damage/Meter bonus
          rawDmg = Tower.combat.calcBulletDamage(state, targetEnemy, rawDmg);

          // Crit
          var isCrit = Tower.utils.chance(stats.critChance / 100);
          var dmg = isCrit ? Math.floor(rawDmg * stats.critFactor) : rawDmg;

          // Super Crit (crit of crit)
          var isSuperCrit = false;
          if (isCrit && stats.superCritChance > 0) {
            isSuperCrit = Tower.utils.chance(stats.superCritChance / 100);
            if (isSuperCrit) {
              dmg = Math.floor(dmg * stats.superCritMult);
            }
          }

          Tower.enemy.takeDamage(targetEnemy, dmg);

          // Lifesteal
          if (stats.lifestealPercent > 0) {
            var heal = dmg * stats.lifestealPercent / 100;
            state.towerHP = Math.min(state.towerMaxHP, state.towerHP + heal);
          }

          // Knockback
          if (stats.knockbackChance > 0 && Tower.utils.chance(stats.knockbackChance / 100)) {
            var kbAngle = Tower.utils.angle(towerPos.x, towerPos.y, targetEnemy.x, targetEnemy.y);
            var kbDist = stats.knockbackForce * 20; // force → pixels
            targetEnemy.x += Math.cos(kbAngle) * kbDist;
            targetEnemy.y += Math.sin(kbAngle) * kbDist;
            // If it was stopped (ranged), un-stop it so it walks back
            if (targetEnemy.stopped) targetEnemy.stopped = false;
            if (targetEnemy.stuck) targetEnemy.stuck = false;
          }

          // Damage number
          var dmgLabel = isSuperCrit ? '💥💥 ' + dmg : (isCrit ? '💥 ' + dmg : String(dmg));
          var dmgColor = isSuperCrit ? '#ff5555' : (isCrit ? '#ff9e64' : '#c0caf5');
          Tower.combat.spawnDamageNumber(state, targetEnemy.x, targetEnemy.y - targetEnemy.radius, dmgLabel, dmgColor);

          // Bounce Shot
          if (stats.bounceChance > 0 && Tower.utils.chance(stats.bounceChance / 100)) {
            var bounced = 0;
            var lastTarget = targetEnemy;
            for (var bn = 0; bn < stats.bounceTargets; bn++) {
              var bounceTarget = null;
              var bounceDist = Infinity;
              for (var be = 0; be < state.enemies.length; be++) {
                var be_ = state.enemies[be];
                if (!be_.alive || be_.id === lastTarget.id) continue;
                var bd = Tower.utils.dist(lastTarget.x, lastTarget.y, be_.x, be_.y);
                if (bd < bounceDist && bd <= stats.range) {
                  bounceDist = bd;
                  bounceTarget = be_;
                }
              }
              if (!bounceTarget) break;
              var bounceDmg = Math.floor(dmg * 0.6); // 60% dmg per bounce
              Tower.enemy.takeDamage(bounceTarget, bounceDmg);
              Tower.combat.spawnDamageNumber(state, bounceTarget.x, bounceTarget.y - bounceTarget.radius, '↗' + bounceDmg, '#bb9af7');
              // Lifesteal from bounce
              if (stats.lifestealPercent > 0) {
                state.towerHP = Math.min(state.towerMaxHP, state.towerHP + bounceDmg * stats.lifestealPercent / 100);
              }
              lastTarget = bounceTarget;
              bounced++;
              if (bounceTarget.hp <= 0) {
                bounceTarget.alive = false;
                self._onEnemyKilled(state, bounceTarget);
              }
            }
          }

          if (targetEnemy.hp <= 0) {
            targetEnemy.alive = false;
            self._onEnemyKilled(state, targetEnemy);
          }
        }
      }
    }

    // ── 5. Ranged 敌人射击 ──
    state.enemyBullets = state.enemyBullets || [];
    for (var r = 0; r < state.enemies.length; r++) {
      var ranged = state.enemies[r];
      if (!ranged.alive || ranged.behaviour !== 'ranged' || !ranged.stopped) continue;
      if (!ranged._lastAttack) ranged._lastAttack = now;
      if (now - ranged._lastAttack >= (ranged.attackInterval || 2000)) {
        ranged._lastAttack = now;
        if (ranged.type === 'hellfire') {
          // Continuous beam — apply damage directly, no bullet
          if (!ranged.rampStart) ranged.rampStart = now;
          var elapsed = (now - ranged.rampStart) / 1000;
          var dmg = Math.min(ranged.bulletDamage + elapsed * (ranged.rampRate || 0.3), ranged.maxDamage || 4);
          dmg = Math.ceil(dmg);
          ranged.currentRampDmg = dmg;
          state.towerHP -= dmg;
          if (state.towerHP < 0) state.towerHP = 0;
          Tower.combat.spawnDamageNumber(state, towerPos.x, towerPos.y - 10, '-' + dmg, '#ff4500');
          state._flashTimer = 0.3;
          if (state.towerHP <= 0) {
            state._current = 'game_over';
            Tower.game.onGameOver(state);
            return;
          }
        } else {
          state.enemyBullets.push({
            x: ranged.x, y: ranged.y,
            targetX: towerPos.x, targetY: towerPos.y,
            speed: ranged.bulletSpeed || 150,
            damage: ranged.bulletDamage || 1,
            color: ranged.bulletColor || '#bb9af7',
            radius: 2.5, alive: true
          });
        }
      }
    }

    // ── 6. 敌人子弹飞行 + 命中塔 ──
    for (var eb = state.enemyBullets.length - 1; eb >= 0; eb--) {
      var eb_ = state.enemyBullets[eb];
      if (!eb_.alive) { state.enemyBullets.splice(eb, 1); continue; }
      var moveR = Tower.utils.moveToward(eb_.x, eb_.y, eb_.targetX, eb_.targetY, eb_.speed * dt);
      eb_.x = moveR.x;
      eb_.y = moveR.y;
      if (moveR.arrived) {
        var ebDmg = eb_.damage || 1;
        // Defense applies to enemy bullets too
        if (stats.defensePercent > 0) ebDmg = ebDmg * (1 - stats.defensePercent / 100);
        ebDmg = Math.max(1, ebDmg - stats.defenseAbsolute);
        state.towerHP -= Math.floor(ebDmg);
        if (state.towerHP < 0) state.towerHP = 0;
        Tower.combat.spawnParticles(state, { x: eb_.x, y: eb_.y, color: eb_.color, type: 'basic', radius: 4 });
        Tower.combat.spawnDamageNumber(state, eb_.x, eb_.y, '-' + Math.floor(ebDmg), eb_.color);
        state._flashTimer = 1;
        eb_.alive = false;
        state.enemyBullets.splice(eb, 1);

        // Death Defy for enemy bullet
        if (state.towerHP <= 0 && stats.deathDefy > 0) {
          if (Tower.utils.chance(stats.deathDefy / 100)) {
            state.towerHP = 1;
            Tower.combat.spawnDamageNumber(state, towerPos.x, towerPos.y, 'DEATH DEFY!', '#ff9e64');
          }
        }
        if (state.towerHP <= 0) {
          state._current = 'game_over';
          Tower.game.onGameOver(state);
          return;
        }
      }
    }

    // ── 7. Orbs rotation + collision ──
    if (stats.orbs > 0) {
      state._orbs = state._orbs || [];
      // Init orbs if needed
      while (state._orbs.length < stats.orbs) {
        state._orbs.push({ angle: (Math.PI * 2 / stats.orbs) * state._orbs.length });
      }
      while (state._orbs.length > stats.orbs) { state._orbs.pop(); }
      var orbDist = stats.range * 0.55; // orbit at 55% of range
      var orbRpm = stats.orbSpeed || 0.4;
      for (var oi = 0; oi < state._orbs.length; oi++) {
        var orb = state._orbs[oi];
        orb.angle += (orbRpm / 60) * Math.PI * 2 * dt; // rpm → radians/sec
        if (orb.angle > Math.PI * 2) orb.angle -= Math.PI * 2;
        orb.x = towerPos.x + Math.cos(orb.angle) * orbDist;
        orb.y = towerPos.y + Math.sin(orb.angle) * orbDist;
        // Collision with enemies
        for (var oe = state.enemies.length - 1; oe >= 0; oe--) {
          var oee = state.enemies[oe];
          if (!oee.alive) continue;
          if (Tower.utils.dist(orb.x, orb.y, oee.x, oee.y) < 7 + oee.radius) {
            var orbDmg = stats.damage;
            Tower.enemy.takeDamage(oee, orbDmg);
            Tower.combat.spawnDamageNumber(state, oee.x, oee.y, '🔵' + orbDmg, '#7dcfff');
            if (oee.hp <= 0) {
              oee.alive = false;
              self._onEnemyKilled(state, oee);
            }
          }
        }
      }
    } else {
      state._orbs = [];
    }

    // ── 8. Land mines ──
    // Mines trigger when enemy walks over them
    for (var mi = self._mines.length - 1; mi >= 0; mi--) {
      var mine = self._mines[mi];
      mine.life -= dt;
      if (mine.life <= 0) { self._mines.splice(mi, 1); continue; }
      for (var me = state.enemies.length - 1; me >= 0; me--) {
        var me_ = state.enemies[me];
        if (!me_.alive) continue;
        if (Tower.utils.dist(mine.x, mine.y, me_.x, me_.y) < mine.radius + me_.radius) {
          var mineDmg = Math.floor(stats.damage * stats.landMineDamage / 100);
          Tower.enemy.takeDamage(me_, mineDmg);
          Tower.combat.spawnParticles(state, { x: mine.x, y: mine.y, color: '#ff9e64', type: 'boss', radius: 6 });
          Tower.combat.spawnDamageNumber(state, me_.x, me_.y, '💣' + mineDmg, '#ff9e64');
          self._mines.splice(mi, 1);
          if (me_.hp <= 0) {
            me_.alive = false;
            self._onEnemyKilled(state, me_);
          }
          break;
        }
      }
    }

    // ── 8. 检查波次完成 ──
    self._checkWaveComplete(state);
  },

  _doSpawn: function (state, towerPos, size) {
    var self = Tower.loop;
    var canSpawn = Tower.wave.shouldSpawnBasic(state.wave, self._waveElapsed, self._spawnCount, self._spawnQueue);
    if (!canSpawn) return;

    var spawnRate = Tower.wave.getSpawnRate(state.wave);

    var enemyType = 'basic';
    if (self._spawnQueue.length > 0 && Tower.utils.chance(0.85)) {
      enemyType = self._spawnQueue.shift();
    } else if (!Tower.utils.chance(spawnRate)) {
      return;
    }

    var aliveCount = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].alive) aliveCount++;
    }
    if (aliveCount >= 120) return;

    var enemy = Tower.enemy.create(enemyType, state.wave, size.w, size.h);
    state.enemies.push(enemy);
    self._spawnCount++;
  },

  _fireBullets: function (state, towerPos, primaryTarget, stats) {
    state.bullets.push(Tower.bullet.create(towerPos.x, towerPos.y, primaryTarget));
    if (Tower.utils.chance(stats.multishotChance / 100)) {
      var second = null;
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (!e.alive || e.id === primaryTarget.id) continue;
        var d = Tower.utils.dist(towerPos.x, towerPos.y, e.x, e.y);
        if (d <= stats.range) { second = e; break; }
      }
      if (second) {
        state.bullets.push(Tower.bullet.create(towerPos.x, towerPos.y, second));
      }
    }
  },

  _onEnemyKilled: function (state, enemy) {
    var stats = Tower.tower.getStats(state);
    var earned = Tower.economy.earnCash(state, enemy);
    state.totalKills++;
    state.waveKills++;
    if (state.killsByType[enemy.type] !== undefined) {
      state.killsByType[enemy.type]++;
    }
    // Hellfire death AOE explosion
    if (enemy.type === 'hellfire') {
      var aoeR = 80, aoePct = 0.30;
      var hits = Tower.enemy.explodeAOE(enemy, state.enemies, aoeR, aoePct);
      for (var p = 0; p < 30; p++) {
        var a = Math.random() * Math.PI * 2;
        var spd = Tower.utils.rand(60, 200);
        state.particles.push({
          x: enemy.x, y: enemy.y,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          life: 0.8, maxLife: 0.8,
          radius: Tower.utils.rand(2, 5),
          color: Math.random() < 0.5 ? '#ff4500' : '#ff8c00'
        });
      }
      for (var h = 0; h < hits.length; h++) {
        var he = hits[h].enemy;
        Tower.combat.spawnDamageNumber(state, he.x, he.y, '💥' + hits[h].damage, '#ff4500');
        if (he.hp <= 0) { he.alive = false; Tower.loop._onEnemyKilled(state, he); }
      }
    } else {
      Tower.combat.spawnParticles(state, enemy);
    }

    // Land Mine spawn chance on kill
    if (stats.landMineChance > 0 && Tower.utils.chance(stats.landMineChance / 100)) {
      var self = Tower.loop;
      self._mines.push({
        x: enemy.x, y: enemy.y,
        radius: 18, life: 60,
        color: '#ff9e64'
      });
    }
  },

  _checkWaveComplete: function (state) {
    var anyAlive = false;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].alive) { anyAlive = true; break; }
    }
    if (!anyAlive && this._waveElapsed >= Tower.wave.WAVE_DURATION && this._spawnQueue.length === 0) {
      state._current = 'idle';
      Tower.economy.earnCoins(state, state.wave);
      state.totalWaves++;  // 累计波次
      if (state.wave > state.bestWave) {
        state.bestWave = state.wave;
      }
      Tower.game._save(state);
      state.wave++;
      state.enemies = [];
      state.bullets = [];
      state.enemyBullets = [];
      Tower.panels.refreshAll(state);
    }
  }
};
