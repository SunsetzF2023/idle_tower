/* ═══════════════════════════════════════════════
   combat.js — 伤害计算 + 击杀判定 + 粒子生成
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.combat = {

  /** 塔攻击敌人 */
  towerAttack: function (state, enemy) {
    var stats = Tower.tower.getStats(state);
    var killed = Tower.enemy.takeDamage(enemy, stats.damage);
    return { damage: stats.damage, killed: killed };
  },

  /** 敌人碰撞塔 */
  enemyHitTower: function (state, enemy) {
    state.towerHP -= enemy.collisionDmg;
    if (state.towerHP < 0) state.towerHP = 0;
    return {
      damage: enemy.collisionDmg,
      dead: state.towerHP <= 0
    };
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
        life: 0.5,  // 秒
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
      d.y -= 40 * dt;  // 上浮
      d.life -= dt;
      if (d.life <= 0) {
        state.damageNumbers.splice(i, 1);
      }
    }
  }
};
