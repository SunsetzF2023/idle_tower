/* ═══════════════════════════════════════════════
   tower.js — tower stats + in-game upgrades + workshop
   All numbers sourced from The Tower wiki
   https://the-tower-idle-tower-defense.game-vault.net/wiki/Workshop
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.tower = {

  baseStats: function () {
    return {
      hp: 10, maxHp: 10,
      damage: 6, attackSpeed: 1.0, range: 150,
      critChance: 0, critFactor: 1.2,
      multishotChance: 0, multishotTargets: 2,
      rapidFireChance: 0, rapidFireDuration: 0.6,
      bounceChance: 0, bounceTargets: 1,
      superCritChance: 0, superCritMult: 1.2,
      defensePercent: 0, defenseAbsolute: 1,
      thornPercent: 0, lifestealPercent: 0,
      knockbackChance: 0, knockbackForce: 0.4,
      deathDefy: 0, landMineChance: 0, landMineDamage: 100,
      healthRegen: 0,
      cashBonus: 1.0, coinsPerKill: 1.0,
      freeAttackChance: 0, freeDefenseChance: 0, freeUtilityChance: 0,
      size: 25, collisionRadius: 29
    };
  },

  /** In-game Cash upgrade cost: base + level × base × 0.5 (linear, not exponential) */
  upgradeCost: function (base, level) {
    return Math.floor(base + level * base * 0.5);
  },

  // ═══════════════════════════════════════════════
  // In-game Cash upgrades (always visible)
  // These stack on top of workshop base values
  // ═══════════════════════════════════════════════
  INGAME: {
    damage: {
      key: 'damage', name: 'Damage', icon: '⚔',
      baseVal: 6, perLv: 2, costBase: 10,
      format: function (v) { return String(v); }
    },
    speed: {
      key: 'speed', name: 'Atk Speed', icon: '⚡',
      baseVal: 1.0, perLv: 0.12, costBase: 8,
      format: function (v) { return v.toFixed(2) + '/s'; }
    },
    range: {
      key: 'range', name: 'Range', icon: '🎯',
      baseVal: 150, perLv: 5, costBase: 15,
      format: function (v) { return String(v) + 'px'; }
    },
    critChance: {
      key: 'critChance', name: 'Crit Chance', icon: '★',
      baseVal: 0, perLv: 2, costBase: 12,
      format: function (v) { return (v || 0) + '%'; }
    },
    healthRegen: {
      key: 'healthRegen', name: 'HP Regen', icon: '💚',
      baseVal: 0, perLv: 0.5, costBase: 10,
      format: function (v) { return v.toFixed(1) + '/s'; }
    },
    defensePct: {
      key: 'defensePct', name: 'Defense %', icon: '🛡',
      baseVal: 0, perLv: 1, costBase: 14,
      format: function (v) { return (v || 0).toFixed(1) + '%'; }
    },
    maxHealth: {
      key: 'maxHealth', name: 'Max Health', icon: '❤',
      baseVal: 10, perLv: 10, costBase: 12,
      format: function (v) { return String(v); }
    },
    cashBonus: {
      key: 'cashBonus', name: 'Cash Bonus', icon: '💵',
      baseVal: 1.0, perLv: 0.05, costBase: 15,
      format: function (v) { return '×' + v.toFixed(2); }
    },
    cpk: {
      key: 'cpk', name: 'Coins/Kill', icon: '🪙',
      baseVal: 1.0, perLv: 0.05, costBase: 20,
      format: function (v) { return '×' + v.toFixed(2); }
    }
  },

  ingameInfo: function (key, level) {
    var def = this.INGAME[key];
    if (!def) return null;
    var val = def.baseVal + level * def.perLv;
    return {
      key: key, level: level,
      value: val,
      next: def.baseVal + (level + 1) * def.perLv,
      cost: this.upgradeCost(def.costBase, level),
      format: def.format
    };
  },

  // ═══════════════════════════════════════════════
  // Workshop — permanent Coin upgrades
  // Exact values from the wiki: base, perLv, maxLv, costBase
  // Section order: attack | defense | utility
  // ═══════════════════════════════════════════════
  WORKSHOP: {
    attack: {
      label: '⚔ ATTACK',
      items: {
        damage: {
          name: 'Damage', icon: '⚔',
          base: 6, perLv: 2, costBase: 30, maxLv: 6000,
          desc: '+2 base damage per level. Max ~71M',
          unlock: 0
        },
        speed: {
          name: 'Atk Speed', icon: '⚡',
          base: 1.0, perLv: 0.05, costBase: 30, maxLv: 99,
          desc: '+0.05/s per level. Max 5.95/s',
          unlock: 0
        },
        critChance: {
          name: 'Crit Chance', icon: '★',
          base: 0, perLv: 1, costBase: 50, maxLv: 79,
          desc: '+1% per level. Max 80%. x' + (1.2).toFixed(1) + ' dmg',
          unlock: 0,
          format: function (v) { return (v || 0) + '%'; }
        },
        critFactor: {
          name: 'Crit Factor', icon: '✦',
          base: 1.2, perLv: 0.1, costBase: 50, maxLv: 150,
          desc: '×1.2 +0.1/lv. Max ×16.2',
          unlock: 0,
          format: function (v) { return '×' + v.toFixed(1); }
        },
        range: {
          name: 'Range', icon: '🎯',
          base: 150, perLv: 2.5, costBase: 50, maxLv: 79,
          desc: '30m base, +0.5m/lv. Max 69.5m',
          unlock: 50
        },
        damagePerMeter: {
          name: 'Damage/Meter', icon: '📏',
          base: 0, perLv: 0.02, costBase: 50, maxLv: 200,
          desc: '+0.02%/lv. Bonus dmg based on distance',
          unlock: 500,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        multishot: {
          name: 'Multishot Chance', icon: '⫻',
          base: 0, perLv: 0.5, costBase: 60, maxLv: 99,
          desc: '+0.5%/lv. Max 49.5%. Chance to fire 2nd bullet',
          unlock: 400,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        multishotTargets: {
          name: 'Multishot Targets', icon: '⫼',
          base: 2, perLv: 1, costBase: 450, maxLv: 7,
          desc: '+1 target/lv. Max 9 targets',
          unlock: 400
        },
        rapidFireChance: {
          name: 'Rapid Fire Chance', icon: '🔥',
          base: 0, perLv: 0.4, costBase: 120, maxLv: 85,
          desc: '+0.4%/lv. Max 34%. Temporarily boosts atk speed',
          unlock: 200,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        rapidFireDuration: {
          name: 'Rapid Fire Duration', icon: '⏱',
          base: 0.6, perLv: 0.05, costBase: 120, maxLv: 99,
          desc: '+0.05s/lv. Max 5.55s',
          unlock: 200,
          format: function (v) { return v.toFixed(2) + 's'; }
        },
        bounceChance: {
          name: 'Bounce Shot Chance', icon: '↗',
          base: 0, perLv: 0.8, costBase: 200, maxLv: 85,
          desc: '+0.8%/lv. Max 68%. Bullet bounces to next enemy',
          unlock: 500,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        bounceTargets: {
          name: 'Bounce Shot Targets', icon: '↘',
          base: 1, perLv: 1, costBase: 700, maxLv: 7,
          desc: '+1 target/lv. Max 8',
          unlock: 500
        },
        superCritChance: {
          name: 'Super Crit Chance', icon: '💥',
          base: 0, perLv: 0.2, costBase: 50000, maxLv: 100,
          desc: '+0.2%/lv. Max 20%. Crits can crit again!',
          unlock: 10000,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        superCritMult: {
          name: 'Super Crit Mult', icon: '💫',
          base: 1.2, perLv: 0.1, costBase: 30000, maxLv: 120,
          desc: '×1.2 +0.1/lv. Max ×13.2',
          unlock: 10000,
          format: function (v) { return '×' + v.toFixed(1); }
        }
      }
    },
    defense: {
      label: '🛡 DEFENSE',
      items: {
        health: {
          name: 'Max Health', icon: '❤',
          base: 10, perLv: 10, costBase: 30, maxLv: 6000,
          desc: '+10 HP per level. Base: 10. Max ~60K',
          unlock: 0
        },
        healthRegen: {
          name: 'Health Regen', icon: '💚',
          base: 0, perLv: 1, costBase: 30, maxLv: 6000,
          desc: '+1 HP/sec per level',
          unlock: 0
        },
        defensePercent: {
          name: 'Defense %', icon: '🛡',
          base: 0, perLv: 0.5, costBase: 50, maxLv: 99,
          desc: '+0.5%/lv. Reduces dmg taken. Max 49.5%',
          unlock: 75,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        defenseAbsolute: {
          name: 'Defense Absolute', icon: '🔰',
          base: 1, perLv: 1, costBase: 50, maxLv: 5000,
          desc: 'Flat damage reduction. All hits minus this amount',
          unlock: 0
        },
        thornDamage: {
          name: 'Thorn Damage', icon: '🌵',
          base: 0, perLv: 1, costBase: 60, maxLv: 99,
          desc: '+1%/lv. Reflect % of enemy hit dmg back. Max 99%',
          unlock: 0,
          format: function (v) { return (v || 0) + '%'; }
        },
        lifesteal: {
          name: 'Lifesteal', icon: '🩸',
          base: 0, perLv: 0.05, costBase: 60, maxLv: 80,
          desc: '+0.05%/lv. Heal % of dmg dealt. Max 4.0%',
          unlock: 0,
          format: function (v) { return (v || 0).toFixed(2) + '%'; }
        },
        knockbackChance: {
          name: 'Knockback Chance', icon: '👊',
          base: 0, perLv: 1, costBase: 80, maxLv: 80,
          desc: '+1%/lv. Push enemy away on hit. Max 80%',
          unlock: 0,
          format: function (v) { return (v || 0) + '%'; }
        },
        knockbackForce: {
          name: 'Knockback Force', icon: '💢',
          base: 0.4, perLv: 0.15, costBase: 80, maxLv: 40,
          desc: '+0.15/lv. Push distance multiplier. Max 6.4',
          unlock: 0,
          format: function (v) { return '×' + v.toFixed(1); }
        },
        landMineChance: {
          name: 'Land Mine Chance', icon: '💣',
          base: 0, perLv: 0.6, costBase: 500, maxLv: 50,
          desc: '+0.6%/lv. Spawn mines on enemy kill. Max 30%',
          unlock: 300,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        orbs: {
          name: 'Orbs', icon: '🔵',
          base: 0, perLv: 1, costBase: 3000, maxLv: 4,
          desc: '+1 rotating orb. Deals 1× tower dmg on contact. Max 4',
          unlock: 500
        },
        orbSpeed: {
          name: 'Orb Speed', icon: '🌀',
          base: 0.4, perLv: 0.15, costBase: 125, maxLv: 38,
          desc: '+0.15 rpm. Base 0.4 rpm. Max 6.1 rpm',
          unlock: 500,
          format: function (v) { return v.toFixed(1) + ' rpm'; }
        },
        landMineDamage: {
          name: 'Land Mine Damage', icon: '🧨',
          base: 100, perLv: 10, costBase: 500, maxLv: 200,
          desc: '+10%/lv. Mine dmg as % of tower dmg. Max 2100%',
          unlock: 300,
          format: function (v) { return Math.floor(v) + '%'; }
        },
        deathDefy: {
          name: 'Death Defy', icon: '💀',
          base: 0, perLv: 0.4, costBase: 1000, maxLv: 75,
          desc: '+0.4%/lv. Chance to survive lethal hit at 1 HP. Max 30%',
          unlock: 500,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        }
      }
    },
    utility: {
      label: '📦 UTILITY',
      items: {
        cashBonus: {
          name: 'Cash Bonus', icon: '💵',
          base: 1.0, perLv: 0.02, costBase: 30, maxLv: 149,
          desc: 'Multiplies all cash earned. Max ×3.98',
          unlock: 0,
          format: function (v) { return '×' + v.toFixed(2); }
        },
        cashWave: {
          name: 'Cash/Wave', icon: '💸',
          base: 0, perLv: 4, costBase: 30, maxLv: 149,
          desc: '+4 cash per wave start. Max +596',
          unlock: 0
        },
        autoWave: {
          name: 'Auto Next Wave', icon: '⏭',
          base: 0, perLv: 1, costBase: 500, maxLv: 1,
          desc: 'Auto-start next wave after 2s rest between waves.',
          unlock: 0
        },
        gameSpeed: {
          name: 'Game Speed ⏩', icon: '⏩',
          base: 1.0, perLv: 1.0, costBase: 1000, maxLv: 1,
          desc: 'Unlock 2× game speed. Everything moves twice as fast.',
          unlock: 0,
          format: function (v) { return v.toFixed(0) + '×'; }
        },
        startCash: {
          name: 'Starting Cash', icon: '💰',
          base: 0, perLv: 5, costBase: 30, maxLv: 20,
          desc: '+5 starting cash per level. Max +100',
          unlock: 0
        },
        coinsPerKill: {
          name: 'Coins/Kill', icon: '🪙',
          base: 1.0, perLv: 0.02, costBase: 50, maxLv: 149,
          desc: 'Multiplies coins from kills. Max ×3.98',
          unlock: 0,
          format: function (v) { return '×' + v.toFixed(2); }
        },
        coinsWave: {
          name: 'Coins/Wave', icon: '💎',
          base: 1, perLv: 1, costBase: 50, maxLv: 149,
          desc: '+1 coin per wave completion. Max +150',
          unlock: 0
        },
        freeAttackChance: {
          name: 'Free Attack Upgrade', icon: '🆓',
          base: 0, perLv: 0.5, costBase: 75, maxLv: 99,
          desc: '+0.5%/lv. Chance to not pay for atk upgrade. Max 49.5%',
          unlock: 0,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        freeDefenseChance: {
          name: 'Free Defense Upgrade', icon: '🆓',
          base: 0, perLv: 0.5, costBase: 75, maxLv: 99,
          desc: '+0.5%/lv. Chance to not pay for def upgrade. Max 49.5%',
          unlock: 0,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        },
        freeUtilityChance: {
          name: 'Free Utility Upgrade', icon: '🆓',
          base: 0, perLv: 0.5, costBase: 75, maxLv: 99,
          desc: '+0.5%/lv. Chance to not pay for util upgrade. Max 49.5%',
          unlock: 0,
          format: function (v) { return (v || 0).toFixed(1) + '%'; }
        }
      }
    }
  },

  /** Workshop cost: base + level × base × 0.7 (linear, matching wiki gentle scaling) */
  wsCost: function (item, level) {
    return Math.floor(item.costBase + level * item.costBase * 0.7);
  },

  /** Get total workshop bonus for a stat */
  wsBonus: function (state, key) {
    var ws = state.workshop || {};
    for (var section in this.WORKSHOP) {
      var items = this.WORKSHOP[section].items;
      if (items[key]) {
        var lv = ws[key] || 0;
        return lv * items[key].perLv;
      }
    }
    return 0;
  },

  /** Check if a workshop key belongs to a given section ('attack'|'defense'|'utility') */
  _sectionOf: function (key) {
    for (var s in this.WORKSHOP) {
      if (this.WORKSHOP[s].items[key]) return s;
    }
    return null;
  },

  /** Gather all current stats (workshop + in-game) */
  getStats: function (state) {
    var ws = state.workshop || {};
    var dmgIg = this.ingameInfo('damage', state.damageLevel || 0);
    var spdIg = this.ingameInfo('speed', state.speedLevel || 0);
    var rngIg = this.ingameInfo('range', state.rangeLevel || 0);
    var critIg = this.ingameInfo('critChance', state.critChanceLevel || 0);
    var regenIg = this.ingameInfo('healthRegen', state.healthRegenLevel || 0);
    var defIg = this.ingameInfo('defensePct', state.defensePctLevel || 0);
    var hpIg = this.ingameInfo('maxHealth', state.maxHealthLevel || 0);
    var cashIg = this.ingameInfo('cashBonus', state.cashBonusLevel || 0);
    var cpkIg = this.ingameInfo('cpk', state.cpkLevel || 0);

    // Helper: get workshop value = base + lv × perLv
    function wsVal(key, item) {
      var lv = ws[key] || 0;
      return item.base + lv * item.perLv;
    }

    // ── Attack stats ──
    var atk = this.WORKSHOP.attack.items;
    var totalDamage = wsVal('damage', atk.damage) + (dmgIg ? dmgIg.value - this.INGAME.damage.baseVal : 0);
    var totalSpeed = wsVal('speed', atk.speed) + (spdIg ? spdIg.value - this.INGAME.speed.baseVal : 0);
    var totalRange = wsVal('range', atk.range) + (rngIg ? rngIg.value - this.INGAME.range.baseVal : 0);
    var totalCrit = wsVal('critChance', atk.critChance) + (critIg ? critIg.value : 0);
    var totalCritFactor = wsVal('critFactor', atk.critFactor);
    var totalMs = wsVal('multishot', atk.multishot);
    var totalMsTargets = wsVal('multishotTargets', atk.multishotTargets);
    var totalRfChance = wsVal('rapidFireChance', atk.rapidFireChance);
    var totalRfDuration = wsVal('rapidFireDuration', atk.rapidFireDuration);
    var totalBounce = wsVal('bounceChance', atk.bounceChance);
    var totalBounceTargets = wsVal('bounceTargets', atk.bounceTargets);
    var totalSuperCritChance = wsVal('superCritChance', atk.superCritChance);
    var totalSuperCritMult = wsVal('superCritMult', atk.superCritMult);
    var totalDmgPerMeter = wsVal('damagePerMeter', atk.damagePerMeter);

    // ── Defense stats ──
    var def = this.WORKSHOP.defense.items;
    var totalHp = wsVal('health', def.health);
    var totalRegen = wsVal('healthRegen', def.healthRegen) + (regenIg ? regenIg.value : 0);
    var totalDefPct = wsVal('defensePercent', def.defensePercent) + (defIg ? defIg.value : 0);
    var totalDefAbs = wsVal('defenseAbsolute', def.defenseAbsolute);
    var totalThorn = wsVal('thornDamage', def.thornDamage);
    var totalLs = wsVal('lifesteal', def.lifesteal);
    var totalKbChance = wsVal('knockbackChance', def.knockbackChance);
    var totalKbForce = wsVal('knockbackForce', def.knockbackForce);
    var totalMineChance = wsVal('landMineChance', def.landMineChance);
    var totalOrbs = wsVal('orbs', def.orbs);
    var totalOrbSpeed = wsVal('orbSpeed', def.orbSpeed);
    var totalMineDamage = wsVal('landMineDamage', def.landMineDamage);
    var totalDeathDefy = wsVal('deathDefy', def.deathDefy);

    // ── Utility stats ──
    var util = this.WORKSHOP.utility.items;
    var totalCashBonus = wsVal('cashBonus', util.cashBonus);
    var totalCashWave = wsVal('cashWave', util.cashWave);
    var totalCpk = wsVal('coinsPerKill', util.coinsPerKill);
    var totalCoinsWave = wsVal('coinsWave', util.coinsWave);
    var totalFreeAtk = wsVal('freeAttackChance', util.freeAttackChance);
    var totalFreeDef = wsVal('freeDefenseChance', util.freeDefenseChance);
    var totalFreeUtil = wsVal('freeUtilityChance', util.freeUtilityChance);

    return {
      hp: state.towerHP,
      maxHp: Math.floor(totalHp + (hpIg ? hpIg.value - this.INGAME.maxHealth.baseVal : 0)),
      damage: Math.floor(totalDamage),
      attackSpeed: Math.min(5.95, totalSpeed),
      range: Math.floor(totalRange),
      critChance: Math.min(80, totalCrit),
      critFactor: Math.min(16.2, totalCritFactor),
      multishotChance: Math.min(49.5, totalMs),
      multishotTargets: totalMsTargets,
      rapidFireChance: Math.min(34, totalRfChance),
      rapidFireDuration: Math.min(5.55, totalRfDuration),
      bounceChance: Math.min(68, totalBounce),
      bounceTargets: totalBounceTargets,
      superCritChance: Math.min(20, totalSuperCritChance),
      superCritMult: Math.min(13.2, totalSuperCritMult),
      damagePerMeter: Math.min(5.9, totalDmgPerMeter),
      defensePercent: Math.min(49.5, totalDefPct),
      defenseAbsolute: Math.floor(totalDefAbs),
      thornPercent: Math.min(99, totalThorn),
      lifestealPercent: Math.min(4.0, totalLs),
      knockbackChance: Math.min(80, totalKbChance),
      knockbackForce: Math.min(6.4, totalKbForce),
      orbs: Math.min(4, totalOrbs),
      orbSpeed: Math.min(6.1, totalOrbSpeed),   // rotations per minute
      landMineChance: Math.min(30, totalMineChance),
      landMineDamage: Math.min(2100, totalMineDamage),
      deathDefy: Math.min(30, totalDeathDefy),
      healthRegen: totalRegen,
      cashBonus: totalCashBonus + (cashIg ? cashIg.value - this.INGAME.cashBonus.baseVal : 0),
      cashPerWave: Math.floor(totalCashWave),
      coinsPerKill: totalCpk + (cpkIg ? cpkIg.value - this.INGAME.cpk.baseVal : 0),
      autoWave: (ws.autoWave || 0) >= 1,
      gameSpeed: (ws.gameSpeed || 0) >= 1 ? 2.0 : 1.0,
      coinsPerWave: Math.floor(totalCoinsWave),
      freeAttackChance: Math.min(49.5, totalFreeAtk),
      freeDefenseChance: Math.min(49.5, totalFreeDef),
      freeUtilityChance: Math.min(49.5, totalFreeUtil),
      size: this.baseStats().size,
      collisionRadius: this.baseStats().collisionRadius,
      attackInterval: Math.floor(1000 / Math.min(5.95, totalSpeed))
    };
  },

  /** Tower position = canvas center */
  position: function (cw, ch) {
    return { x: cw / 2, y: ch / 2 };
  },

  startingCash: function (state) {
    return ((state.workshop && state.workshop.startCash) || 0) * this.WORKSHOP.utility.items.startCash.perLv;
  }
};
