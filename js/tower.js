/* ═══════════════════════════════════════════════
   tower.js — tower stats + in-game upgrades + workshop
   Numbers faithfully sourced from The Tower wiki
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.tower = {

  baseStats: function () {
    return {
      hp: 100,
      maxHp: 100,
      damage: 6,
      attackSpeed: 1.0,
      range: 150,
      critChance: 0,
      critFactor: 1.2,
      multishotChance: 0,
      multishotTargets: 2,
      size: 25,
      collisionRadius: 29
    };
  },

  upgradeCost: function (base, level) {
    return Math.floor(base * Math.pow(1.5, level));
  },

  // ═══════════════════════════════════════════════
  // In-game upgrade definitions
  // visible: always | unlocked | hidden
  // ═══════════════════════════════════════════════
  UPGRADES: {
    damage: {
      key: 'damage', name: 'Damage', icon: '⚔',
      visible: 'always',
      baseVal: 6, perLv: 2, costBase: 10,
      format: function (v) { return String(v); }
    },
    speed: {
      key: 'speed', name: 'Atk Speed', icon: '⚡',
      visible: 'always',
      baseVal: 1.0, perLv: 0.12, costBase: 8,
      format: function (v) { return v.toFixed(2) + '/s'; }
    },
    range: {
      key: 'range', name: 'Range', icon: '🎯',
      visible: 'always',
      baseVal: 150, perLv: 5, costBase: 15,
      format: function (v) { return String(v); }
    },
    hp: {
      key: 'hp', name: 'Max HP', icon: '❤',
      visible: 'unlocked', unlockKey: 'health',
      baseVal: 100, perLv: 5, costBase: 8,
      format: function (v) { return String(v); }
    },
    crit: {
      key: 'crit', name: 'Crit Chance', icon: '★',
      visible: 'unlocked', unlockKey: 'crit',
      baseVal: 0, perLv: 1, costBase: 15, maxLv: 80,
      format: function (v) { return v + '%'; }
    },
    critFactor: {
      key: 'critFactor', name: 'Crit Factor', icon: '✦',
      visible: 'unlocked', unlockKey: 'crit',
      baseVal: 1.2, perLv: 0.1, costBase: 15, maxLv: 150,
      format: function (v) { return '×' + v.toFixed(1); }
    },
    multishot: {
      key: 'multishot', name: 'Multishot', icon: '⫻',
      visible: 'unlocked', unlockKey: 'multishot',
      baseVal: 0, perLv: 0.5, costBase: 20, maxLv: 99,
      format: function (v) { return v.toFixed(1) + '%'; }
    },
    cashWave: {
      key: 'cashWave', name: 'Cash/Wave', icon: '💵',
      visible: 'unlocked', unlockKey: 'cashwave',
      baseVal: 0, perLv: 4, costBase: 10,
      format: function (v) { return '+' + v + '/wave'; }
    }
  },

  /** Build in-game upgrade info for a given level */
  upgradeInfo: function (key, level) {
    var def = this.UPGRADES[key];
    var val = def.baseVal + level * def.perLv;
    var next = def.baseVal + (level + 1) * def.perLv;
    if (key === 'critFactor') { val = def.baseVal + level * def.perLv; next = def.baseVal + (level+1) * def.perLv; }
    return {
      key: key,
      level: level,
      value: val,
      next: next,
      cost: this.upgradeCost(def.costBase, level),
      maxed: def.maxLv ? level >= def.maxLv : false
    };
  },

  /** Gather all current stats (in-game + workshop bonuses) */
  getStats: function (state) {
    var ws = state.workshop || {};
    var ul = state.unlocks || {};
    var di = this.upgradeInfo('damage', state.damageLevel);
    var si = this.upgradeInfo('speed', state.speedLevel);
    var ri = this.upgradeInfo('range', state.rangeLevel);
    return {
      hp: state.towerHP,
      maxHp: state.towerMaxHP,
      damage: di.value + (ws.damage || 0),
      attackSpeed: si.value + (ws.speed || 0) * 0.08,
      range: ri.value + (ws.range || 0) * 3,
      critChance: ul.crit ? this.upgradeInfo('crit', state.critLevel || 0).value : 0,
      critFactor: ul.crit ? this.upgradeInfo('critFactor', state.critFactorLevel || 0).value : 1.2,
      multishotChance: ul.multishot ? this.upgradeInfo('multishot', state.multishotLevel || 0).value : 0,
      multishotTargets: 2,
      cashPerWave: ul.cashwave ? this.upgradeInfo('cashWave', state.cashWaveLevel || 0).value : 0,
      size: this.baseStats().size,
      collisionRadius: this.baseStats().collisionRadius,
      attackInterval: Math.floor(1000 / (si.value + (ws.speed || 0) * 0.08))
    };
  },

  // ═══════════════════════════════════════════════
  // Workshop — Permanent bonuses (levelable)
  // ═══════════════════════════════════════════════
  WORKSHOP: {
    damage: { name: 'Damage', icon: '⚔', base: 5, perLv: 1, max: 20, desc: '+1 base damage per level' },
    speed:  { name: 'Atk Speed', icon: '⚡', base: 5, perLv: 0.08, max: 20, desc: '+0.08/s per level' },
    range:  { name: 'Range', icon: '🎯', base: 8, perLv: 3, max: 15, desc: '+3px range per level' },
    cash:   { name: 'Start Cash', icon: '💰', base: 3, perLv: 5, max: 20, desc: '+5 starting cash per level' }
  },

  workshopCost: function (key, level) {
    var base = this.WORKSHOP[key].base;
    return Math.floor(base * Math.pow(2, level));
  },

  // ═══════════════════════════════════════════════
  // Workshop — Unlocks (one-time purchase)
  // ═══════════════════════════════════════════════
  UNLOCKS: {
    health:    { name: 'Health Upgrades', icon: '❤', cost: 5,  desc: 'Unlock Max HP in-game upgrade' },
    crit:      { name: 'Critical Hits',  icon: '★', cost: 10, desc: 'Unlock Crit Chance + Crit Factor' },
    multishot: { name: 'Multishot',      icon: '⫻', cost: 15, desc: 'Unlock Multishot Chance upgrade' },
    cashwave:  { name: 'Cash/Wave',      icon: '💵', cost: 5,  desc: 'Unlock Cash per Wave upgrade' }
  },

  startingCash: function (state) {
    return (state.workshop && state.workshop.cash || 0) * 5;
  }
};
