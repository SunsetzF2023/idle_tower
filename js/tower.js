/* ═══════════════════════════════════════════════
   tower.js — tower stats + in-game upgrades + workshop
   All numbers sourced from The Tower wiki
   https://the-tower-idle-tower-defense.game-vault.net/wiki/Workshop
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.tower = {

  baseStats: function () {
    return {
      hp: 100, maxHp: 100,
      damage: 6, attackSpeed: 1.0, range: 150,
      critChance: 0, critFactor: 1.2,
      multishotChance: 0, multishotTargets: 2,
      defensePercent: 0,
      healthRegen: 0,
      cashBonus: 1.0,
      size: 25, collisionRadius: 29
    };
  },

  upgradeCost: function (base, level) {
    return Math.floor(base * Math.pow(1.5, level));
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
      format: function (v) { return String(v); }
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
  // Exact values from the wiki
  // sections: attack | defense | utility
  // ═══════════════════════════════════════════════
  WORKSHOP: {
    attack: {
      label: '⚔ ATTACK',
      items: {
        damage: {
          name: 'Damage', icon: '⚔',
          base: 6, perLv: 2, costBase: 30, maxLv: 99,
          desc: '+2 base damage per level',
          unlock: 0 // free
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
          desc: '+1% per level. Max 80%',
          unlock: 0, format: function (v) { return v + '%'; }
        },
        critFactor: {
          name: 'Crit Factor', icon: '✦',
          base: 1.2, perLv: 0.1, costBase: 50, maxLv: 150,
          desc: '×1.2 +0.1/lv. Max ×16.2',
          unlock: 0, format: function (v) { return '×' + v.toFixed(1); }
        },
        range: {
          name: 'Range', icon: '🎯',
          base: 150, perLv: 2.5, costBase: 50, maxLv: 79,
          desc: '30m base, +0.5m/lv. Max 69.5m',
          unlock: 50 // one-time coin unlock
        },
        multishot: {
          name: 'Multishot Chance', icon: '⫻',
          base: 0, perLv: 0.5, costBase: 60, maxLv: 99,
          desc: '+0.5%/lv. Max 49.5%. Unlock 400 coins',
          unlock: 400, format: function (v) { return v.toFixed(1) + '%'; }
        },
        multishotTargets: {
          name: 'Multishot Targets', icon: '⫼',
          base: 2, perLv: 1, costBase: 450, maxLv: 7,
          desc: '+1 target/lv. Max 9 targets',
          unlock: 400
        }
      }
    },
    defense: {
      label: '🛡 DEFENSE',
      items: {
        health: {
          name: 'Max Health', icon: '❤',
          base: 100, perLv: 10, costBase: 30, maxLv: 99,
          desc: '+10 HP per level',
          unlock: 0
        },
        healthRegen: {
          name: 'Health Regen', icon: '💚',
          base: 0, perLv: 1, costBase: 30, maxLv: 50,
          desc: '+1 HP/sec per level',
          unlock: 0
        },
        defensePercent: {
          name: 'Defense %', icon: '🛡',
          base: 0, perLv: 0.5, costBase: 50, maxLv: 99,
          desc: '+0.5%/lv. Reduces dmg taken. Max 49.5%. Unlock 75 coins',
          unlock: 75, format: function (v) { return v.toFixed(1) + '%'; }
        }
      }
    },
    utility: {
      label: '📦 UTILITY',
      items: {
        cashBonus: {
          name: 'Cash Bonus', icon: '💵',
          base: 1.0, perLv: 0.02, costBase: 30, maxLv: 50,
          desc: 'Multiplies all cash earned. Max ×2.0',
          unlock: 0, format: function (v) { return '×' + v.toFixed(2); }
        },
        cashWave: {
          name: 'Cash/Wave', icon: '💸',
          base: 0, perLv: 4, costBase: 30, maxLv: 50,
          desc: '+4 cash per wave. Max +200/wave',
          unlock: 0
        },
        startCash: {
          name: 'Starting Cash', icon: '💰',
          base: 0, perLv: 5, costBase: 30, maxLv: 20,
          desc: '+5 starting cash per level',
          unlock: 0
        }
      }
    }
  },

  /** Workshop cost: base × 1.5^level (same scaling as wiki) */
  wsCost: function (item, level) {
    return Math.floor(item.costBase * Math.pow(1.5, level));
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

  /** Gather all current stats (workshop + in-game) */
  getStats: function (state) {
    var ws = state.workshop || {};
    var dmgIg = this.ingameInfo('damage', state.damageLevel || 0);
    var spdIg = this.ingameInfo('speed', state.speedLevel || 0);
    var rngIg = this.ingameInfo('range', state.rangeLevel || 0);

    // Workshop base + per-level bonus
    var wsDmg = (ws.damage || 0) * this.WORKSHOP.attack.items.damage.perLv;
    var wsSpd = (ws.speed || 0) * this.WORKSHOP.attack.items.speed.perLv;
    var wsRng = (ws.range || 0) * this.WORKSHOP.attack.items.range.perLv;
    var wsHp = (ws.health || 0) * this.WORKSHOP.defense.items.health.perLv;
    var wsRegen = (ws.healthRegen || 0) * this.WORKSHOP.defense.items.healthRegen.perLv;
    var wsDef = (ws.defensePercent || 0) * this.WORKSHOP.defense.items.defensePercent.perLv;
    var wsCashBonus = 1.0 + (ws.cashBonus || 0) * this.WORKSHOP.utility.items.cashBonus.perLv;
    var wsCashWave = (ws.cashWave || 0) * this.WORKSHOP.utility.items.cashWave.perLv;

    var totalDamage = this.WORKSHOP.attack.items.damage.base + wsDmg + (dmgIg ? dmgIg.value - this.INGAME.damage.baseVal : 0);
    var totalSpeed = this.WORKSHOP.attack.items.speed.base + wsSpd + (spdIg ? spdIg.value - this.INGAME.speed.baseVal : 0);
    var totalRange = this.WORKSHOP.attack.items.range.base + wsRng + (rngIg ? rngIg.value - this.INGAME.range.baseVal : 0);
    var totalCrit = (ws.critChance || 0) * this.WORKSHOP.attack.items.critChance.perLv;
    var totalCritFactor = this.WORKSHOP.attack.items.critFactor.base + (ws.critFactor || 0) * this.WORKSHOP.attack.items.critFactor.perLv;
    var totalMs = (ws.multishot || 0) * this.WORKSHOP.attack.items.multishot.perLv;
    var totalMsTargets = this.WORKSHOP.attack.items.multishotTargets.base + (ws.multishotTargets || 0) * this.WORKSHOP.attack.items.multishotTargets.perLv;

    return {
      hp: state.towerHP,
      maxHp: this.WORKSHOP.defense.items.health.base + wsHp,
      damage: Math.floor(totalDamage),
      attackSpeed: Math.min(5.95, totalSpeed),
      range: Math.floor(totalRange),
      critChance: Math.min(80, totalCrit),
      critFactor: Math.min(16.2, totalCritFactor),
      multishotChance: Math.min(49.5, totalMs),
      multishotTargets: totalMsTargets,
      defensePercent: Math.min(49.5, wsDef),
      healthRegen: wsRegen,
      cashBonus: wsCashBonus,
      cashPerWave: wsCashWave,
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
