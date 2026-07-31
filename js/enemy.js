/* ═══════════════════════════════════════════════
   enemy.js — enemy type definitions + spawn + movement
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.enemy = {

  /** Enemy type definitions */
  TYPES: {
    goblin: {
      name: 'goblin',
      behaviour: 'charge',   // harmless coin piñata
      speed: 35,
      hpMul: 0.5,
      collisionDmg: 0,       // no damage — pure reward
      cash: 1,
      coins: 15,
      radius: 10,
      color: '#ffd700',      // gold
      shape: 'goblin'
    },
    basic: {
      name: 'basic',
      behaviour: 'tank',
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
      behaviour: 'tank',     // sticks to tower, continuous ramming
      speed: 20,
      hpMul: 5,
      collisionDmg: 3,
      cash: 4,
      coins: 5,
      radius: 14,
      color: '#bb9af7',
      attackInterval: 1500   // ms between rams
    },
    ranged: {
      name: 'ranged',
      behaviour: 'ranged',   // stops at range circle, shoots from distance
      speed: 30,
      hpMul: 1,
      collisionDmg: 0,       // no contact damage — ranged attacker
      cash: 2,
      coins: 8,
      radius: 11,
      color: '#bb9af7',
      attackInterval: 2000,  // ms between shots
      bulletDamage: 1,
      bulletSpeed: 150,      // enemy bullet speed px/s
      bulletColor: '#bb9af7'
    },
    boss: {
      name: 'boss',
      behaviour: 'charge',
      speed: 12,
      hpMul: 20,
      collisionDmg: 10,
      cash: 5,
      coins: 10,
      radius: 22,
      color: '#ff9e64'
    },
    hellfire: {
      name: 'hellfire',
      behaviour: 'ranged',    // stops at range circle, ramping beam damage
      speed: 25,
      hpMul: 3,
      collisionDmg: 0,
      cash: 5,
      coins: 12,
      radius: 13,
      color: '#ff6b35',
      attackInterval: 800,    // ms — deliberate ticks
      bulletDamage: 1,        // base, ramps up
      bulletSpeed: 9999,      // instant beam (handled in loop)
      bulletColor: '#ff4500',
      rampRate: 0.3,          // +0.3 damage per second (slower ramp)
      maxDamage: 4            // damage cap (was 8, too punishing)
    }
  },

  /** Base HP: 1 + wave × 2 */
  baseHP: function (wave) {
    return 1 + wave * 2;
  },

  /** Create an enemy instance */
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
      collisionDmg: Math.ceil(t.collisionDmg * (1 + (wave - 1) * 0.08)),  // +8%/wave
      cash: Math.floor(t.cash * (1 + wave * 0.1)),
      coins: t.coins || 0,
      alive: true,
      reachedTower: false,
      stuck: false,        // Tank has latched onto tower
      stopped: false,      // Ranged has reached firing position
      _lastAttack: 0       // timestamp of last attack
    };

    // Ranged-specific fields
    if (t.behaviour === 'ranged') {
      enemy.attackInterval = t.attackInterval;
      enemy.bulletDamage = Math.ceil(t.bulletDamage * (1 + (wave - 1) * 0.08));
      enemy.bulletSpeed = t.bulletSpeed;
      enemy.bulletColor = t.bulletColor;
      // Hellfire ramping damage
      if (t.name === 'hellfire') {
        enemy.rampRate = t.rampRate;
        enemy.maxDamage = t.maxDamage;
        enemy.rampStart = 0;       // timestamp when started attacking current target
        enemy.currentRampDmg = enemy.bulletDamage;
      }
    }

    // Tank-specific fields
    if (t.behaviour === 'tank') {
      enemy.attackInterval = t.attackInterval;
      enemy._lastAttack = 0;
    }

    return enemy;
  },

  /** Move enemy toward tower one step. Edge-to-edge collision detection. */
  move: function (enemy, towerX, towerY, collisionRadius, dt) {
    if (!enemy.alive) return false;
    var hitDist = enemy.radius + collisionRadius;
    var dist = Tower.utils.dist(enemy.x, enemy.y, towerX, towerY);
    // Edge touches edge → collision
    if (dist <= hitDist + enemy.speed * dt) {
      enemy.x = towerX + (enemy.x - towerX) * (hitDist / Math.max(dist, 0.001));
      enemy.y = towerY + (enemy.y - towerY) * (hitDist / Math.max(dist, 0.001));
      enemy.reachedTower = true;
      // Tank doesn't die — latches on for continuous ramming
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

  /** AOE explosion — deals % of target's max HP to all enemies in radius */
  explodeAOE: function (source, enemies, radius, pct) {
    var hits = [];
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive || e.id === source.id) continue;
      var d = Tower.utils.dist(source.x, source.y, e.x, e.y);
      if (d <= radius) {
        var dmg = Math.ceil(e.maxHp * pct);
        Tower.enemy.takeDamage(e, dmg);
        hits.push({ enemy: e, damage: dmg });
      }
    }
    return hits;
  },

  /** Apply damage to enemy. Returns true if killed. */
  takeDamage: function (enemy, damage) {
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.alive = false;
      return true;
    }
    return false;
  },

  /** Get wave enemy type composition */
  getWaveComposition: function (wave) {
    var comp = [];

    // Coin goblin every wave (~10% of spawns)
    comp.push({ type: 'goblin', count: Math.max(1, Math.floor(wave * 0.3)) });

    // Boss every 10 waves
    if (wave % 10 === 0) {
      comp.push({ type: 'boss', count: 1 });
    }

    // Fast from wave 5
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

    // Hellfire from wave 10
    if (wave >= 10) {
      comp.push({ type: 'hellfire', count: Math.max(1, Math.floor((wave - 9) * 0.5)) });
    }

    return comp;
  }
};
