/* ═══════════════════════════════════════════════
   combat.js — 伤害计算 + 击杀判定 + 粒子生成
   Defense Absolute / Thorn / Death Defy implemented
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.combat = {

  /** 塔攻击敌人 */
  towerAttack: function (state, enemy) {
    var stats = Tower.tower.getStats(state);
    var killed = Tower.enemy.takeDamage(enemy, stats.damage);
    return { damage: stats.damage, killed: killed };
  },

  /** 敌人碰撞塔 — applies Defense% + Defense Absolute */
  enemyHitTower: function (state, enemy) {
    var stats = Tower.tower.getStats(state);
    var rawDmg = enemy.collisionDmg;

    // Defense % reduction
    if (stats.defensePercent > 0) {
      rawDmg = rawDmg * (1 - stats.defensePercent / 100);
    }
    // Defense Absolute (flat reduction, min 1)
    rawDmg = Math.max(1, rawDmg - stats.defenseAbsolute);

    var finalDmg = Math.floor(rawDmg);

    // Thorn damage — reflect % back to enemy
    if (stats.thornPercent > 0 && enemy.alive) {
      var reflect = Math.floor(finalDmg * stats.thornPercent / 100);
      if (reflect > 0) {
        Tower.enemy.takeDamage(enemy, reflect);
      }
    }

    state.towerHP -= finalDmg;
    if (state.towerHP < 0) state.towerHP = 0;

    // Death Defy — chance to survive lethal hit
    if (state.towerHP <= 0 && stats.deathDefy > 0) {
      if (Tower.utils.chance(stats.deathDefy / 100)) {
        state.towerHP = 1;
        return { damage: finalDmg, dead: false, deathDefy: true };
      }
    }

    return {
      damage: finalDmg,
      dead: state.towerHP <= 0
    };
  },

  /** 计算最终伤害（给 tower bullet 用） */
  calcBulletDamage: function (state, enemy, baseDmg) {
    var stats = Tower.tower.getStats(state);

    // Damage/Meter bonus
    if (stats.damagePerMeter > 0) {
      var size = Tower.renderer.getSize();
      var tp = Tower.tower.position(size.w, size.h);
      var dist = Tower.utils.dist(tp.x, tp.y, enemy.x, enemy.y);
      var meterBonus = (stats.damagePerMeter / 100) * (dist / 50); // 50px ≈ 1m
      baseDmg = Math.floor(baseDmg * (1 + meterBonus));
    }

    return baseDmg;
  },

  /** 生成击杀粒子 */
  spawnParticles: function (state, enemy) {
    var count = enemy.type === 'boss' ? 20 : 6;
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = Tower.utils.rand(40, 120);
      state.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        radius: Tower.utils.rand(1.5, 3),
        color: enemy.color
      });
    }
  },

  /** 生成伤害数字 */
  spawnDamageNumber: function (state, x, y, text, color) {
    state.damageNumbers.push({
      x: x,
      y: y,
      text: String(text),
      color: color || '#ffffff',
      life: 0.6,
      maxLife: 0.6
    });
  },

  /** 更新粒子 */
  updateParticles: function (state, dt) {
    for (var i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }
  },

  /** 更新伤害数字 */
  updateDamageNumbers: function (state, dt) {
    for (var i = state.damageNumbers.length - 1; i >= 0; i--) {
      var d = state.damageNumbers[i];
      d.y -= 40 * dt;
      d.life -= dt;
      if (d.life <= 0) {
        state.damageNumbers.splice(i, 1);
      }
    }
  }
};
