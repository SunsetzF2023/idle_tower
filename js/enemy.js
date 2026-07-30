/* ═══════════════════════════════════════════════
   enemy.js — 敌人类型定义 + 实例创建 + 移动
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.enemy = {

  /** 敌人类型定义 */
  TYPES: {
    basic: {
      name: 'basic',
      behaviour: 'charge',   // 冲塔 → 碰撞消失
      speed: 40,
      hpMul: 1,
      collisionDmg: 1,
      cash: 1,
      coins: 0,
      radius: 12,
      color: '#f7768e'
    },
    fast: {
      name: 'fast',
      behaviour: 'charge',
      speed: 70,
      hpMul: 1,
      collisionDmg: 1,
      cash: 2,
      coins: 2,
      radius: 10,
      color: '#e0af68'
    },
    tank: {
      name: 'tank',
      behaviour: 'tank',     // 贴住塔持续冲撞，不消失
      speed: 20,
      hpMul: 5,
      collisionDmg: 3,
      cash: 4,
      coins: 5,
      radius: 14,
      color: '#bb9af7',
      attackInterval: 1500   // ms，贴住后每次冲撞间隔
    },
    ranged: {
      name: 'ranged',
      behaviour: 'ranged',   // 停在射程圈边缘远程射击
      speed: 30,
      hpMul: 1,
      collisionDmg: 0,       // 不碰撞 — 远程射击
      cash: 2,
      coins: 8,
      radius: 11,
      color: '#bb9af7',
      attackInterval: 2000,  // ms，射击间隔
      bulletDamage: 1,
      bulletSpeed: 150,      // 敌人子弹速度 px/s
      bulletColor: '#bb9af7'
    },
    boss: {
      name: 'boss',
      behaviour: 'charge',
      speed: 12,
      hpMul: 20,
      collisionDmg: 10,
      cash: 5,            // wiki base value
      coins: 10,
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

    var enemy = {
      id: Date.now() + Math.random(),
      type: t.name,
      behaviour: t.behaviour,
      x: pos.x,
      y: pos.y,
      radius: t.radius,
      color: t.color,
      speed: t.speed,
      hp: baseHP * t.hpMul,
      maxHp: baseHP * t.hpMul,
      collisionDmg: t.collisionDmg,
      cash: Math.floor(t.cash * (1 + wave * 0.1)),
      coins: t.coins || 0,
      alive: true,
      reachedTower: false,
      stuck: false,        // Tank 已贴住塔
      stopped: false,      // Ranged 已停在射击位
      _lastAttack: 0       // 上次攻击时间戳
    };

    // Ranged 特殊字段
    if (t.behaviour === 'ranged') {
      enemy.attackInterval = t.attackInterval;
      enemy.bulletDamage = t.bulletDamage;
      enemy.bulletSpeed = t.bulletSpeed;
      enemy.bulletColor = t.bulletColor;
    }

    // Tank 特殊字段
    if (t.behaviour === 'tank') {
      enemy.attackInterval = t.attackInterval;
      enemy._lastAttack = 0;
    }

    return enemy;
  },

  /** 移动敌人向塔一步，检测敌人边缘碰到塔边缘 */
  move: function (enemy, towerX, towerY, collisionRadius, dt) {
    if (!enemy.alive) return false;
    var hitDist = enemy.radius + collisionRadius;
    var dist = Tower.utils.dist(enemy.x, enemy.y, towerX, towerY);
    // 边缘碰到边缘 → 碰撞
    if (dist <= hitDist + enemy.speed * dt) {
      enemy.x = towerX + (enemy.x - towerX) * (hitDist / Math.max(dist, 0.001));
      enemy.y = towerY + (enemy.y - towerY) * (hitDist / Math.max(dist, 0.001));
      enemy.reachedTower = true;
      // Tank 不消失，贴住持续冲撞
      if (enemy.behaviour !== 'tank') {
        enemy.alive = false;
      }
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

    // Fast from wave 5, at least 1 per wave
    if (wave >= 5) {
      comp.push({ type: 'fast', count: Math.max(1, Math.floor((wave - 4) * 0.6)) });
    }

    // Ranged from wave 5
    if (wave >= 5) {
      comp.push({ type: 'ranged', count: Math.max(1, Math.floor((wave - 4) * 0.5)) });
    }

    // Tank from wave 8
    if (wave >= 8) {
      comp.push({ type: 'tank', count: Math.max(1, Math.floor((wave - 7) * 0.4)) });
    }

    return comp;
  }
};
