/* ═══════════════════════════════════════════════
   enemy.js — 敌人类型定义 + 实例创建 + 移动
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.enemy = {

  /** 敌人类型定义 */
  TYPES: {
    basic: {
      name: 'basic',
      speed: 40,           // 像素/秒
      hpMul: 1,
      collisionDmg: 1,     // 碰撞对塔伤害
      cash: 1,
      radius: 12,
      color: '#f7768e'
    },
    fast: {
      name: 'fast',
      speed: 70,
      hpMul: 1,
      collisionDmg: 1,
      cash: 2,
      radius: 10,
      color: '#e0af68'
    },
    tank: {
      name: 'tank',
      speed: 20,
      hpMul: 5,
      collisionDmg: 3,
      cash: 4,
      radius: 14,
      color: '#bb9af7'
    },
    boss: {
      name: 'boss',
      speed: 12,
      hpMul: 20,
      collisionDmg: 10,
      cash: 10,
      radius: 22,
      color: '#ff9e64'
    }
  },

  /** Base HP: 1 + wave × 2 — Wave1=3, Wave5=11, Wave10=21 */
  baseHP: function (wave) {
    return 1 + wave * 2;
  },

  /** 创建一个敌人实例 */
  create: function (typeKey, wave, cw, ch) {
    var t = this.TYPES[typeKey];
    if (!t) t = this.TYPES.basic;

    var baseHP = this.baseHP(wave);
    var pos = Tower.utils.randomEdgePos(cw, ch, 30);
    var center = Tower.utils.canvasCenter(cw, ch);

    return {
      id: Date.now() + Math.random(),
      type: t.name,
      x: pos.x,
      y: pos.y,
      radius: t.radius,
      color: t.color,
      speed: t.speed,
      hp: baseHP * t.hpMul,
      maxHp: baseHP * t.hpMul,
      collisionDmg: t.collisionDmg,
      cash: Math.floor(t.cash * (1 + wave * 0.1)),
      alive: true,
      reachedTower: false
    };
  },

  /** 移动敌人向塔一步，检测敌人边缘碰到塔边缘 */
  move: function (enemy, towerX, towerY, collisionRadius, dt) {
    if (!enemy.alive) return false;
    // 敌人碰撞距离 = 敌人半径 + 塔碰撞半径
    var hitDist = enemy.radius + collisionRadius;
    var dist = Tower.utils.dist(enemy.x, enemy.y, towerX, towerY);
    // 边缘碰到边缘 → 碰撞
    if (dist <= hitDist + enemy.speed * dt) {
      enemy.x = towerX + (enemy.x - towerX) * (hitDist / Math.max(dist, 0.001));
      enemy.y = towerY + (enemy.y - towerY) * (hitDist / Math.max(dist, 0.001));
      enemy.reachedTower = true;
      enemy.alive = false;
      return true;
    }
    var result = Tower.utils.moveToward(enemy.x, enemy.y, towerX, towerY, enemy.speed * dt);
    enemy.x = result.x;
    enemy.y = result.y;
    return false;
  },

  /** 敌人受到伤害，返回是否死亡 */
  takeDamage: function (enemy, damage) {
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.alive = false;
      return true;
    }
    return false;
  },

  /** 获取波次的敌人类型组成 */
  getWaveComposition: function (wave) {
    var comp = [];

    // Boss every 10 waves
    if (wave % 10 === 0) {
      comp.push({ type: 'boss', count: 1 });
    }

    // Fast from wave 6, but only a few
    if (wave >= 6) {
      comp.push({ type: 'fast', count: Math.floor((wave - 5) * 0.5) });
    }

    // Tank from wave 10
    if (wave >= 10) {
      comp.push({ type: 'tank', count: Math.floor((wave - 9) * 0.5) });
    }

    return comp;
  }
};
