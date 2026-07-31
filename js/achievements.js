/* ═══════════════════════════════════════════════
   achievements.js — achievement tracking + unlocks
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.achievements = {

  LIST: {
    killer_100: {
      id: 'killer_100',
      name: 'Century Slayer',
      desc: 'Kill 100 enemies',
      icon: '💀',
      reward: '🚀 Cruise Missile — auto-targets farthest enemy every 8s',
      check: function (state) { return state.totalKills >= 100; }
    },
    killer_500: {
      id: 'killer_500',
      name: 'Mass Executioner',
      desc: 'Kill 500 enemies',
      icon: '☠',
      reward: 'Cruise Missile cooldown reduced to 5s',
      check: function (state) { return state.totalKills >= 500; }
    },
    wave_10: {
      id: 'wave_10',
      name: 'First Milestone',
      desc: 'Reach wave 10',
      icon: '🏆',
      reward: '🪙 +200 bonus coins',
      check: function (state) { return state.bestWave >= 10; }
    },
    wave_20: {
      id: 'wave_20',
      name: 'Endurance Runner',
      desc: 'Reach wave 20',
      icon: '🏅',
      reward: '🪙 +500 bonus coins',
      check: function (state) { return state.bestWave >= 20; }
    },
    boss_slayer: {
      id: 'boss_slayer',
      name: 'Boss Slayer',
      desc: 'Kill 5 bosses',
      icon: '👑',
      reward: '🪙 +300 bonus coins',
      check: function (state) {
        return (state.killsByType && state.killsByType.boss || 0) >= 5;
      }
    },
    goblin_hoarder: {
      id: 'goblin_hoarder',
      name: 'Goblin Hoarder',
      desc: 'Kill 20 coin goblins',
      icon: '🪙',
      reward: '🪙 +500 bonus coins',
      check: function (state) {
        return (state.killsByType && state.killsByType.goblin || 0) >= 20;
      }
    }
  },

  /** Load unlocked achievements from localStorage */
  load: function () {
    try { return JSON.parse(localStorage.getItem('tower_achievements') || '[]'); }
    catch (e) { return []; }
  },

  save: function (list) {
    try { localStorage.setItem('tower_achievements', JSON.stringify(list)); } catch (e) {}
  },

  /** Check all achievements, return newly unlocked ones */
  check: function (state) {
    var unlocked = this.load();
    var changed = false;

    for (var key in this.LIST) {
      var a = this.LIST[key];
      if (unlocked.indexOf(key) !== -1) continue; // already unlocked
      if (a.check(state)) {
        unlocked.push(key);
        changed = true;
        // Give coin rewards immediately
        if (a.reward.indexOf('🪙') !== -1) {
          var match = a.reward.match(/\+(\d+)/);
          if (match) {
            state.coins += parseInt(match[1]);
            Tower.game._save(state);
          }
        }
        // Broadcast achievement unlocked
        if (Tower.panels && Tower.panels._showAchievement) {
          Tower.panels._showAchievement(a);
        }
      }
    }

    if (changed) this.save(unlocked);
    return unlocked;
  },

  /** Check if an achievement is unlocked */
  has: function (id) {
    return this.load().indexOf(id) !== -1;
  },

  /** Has cruise missile (any level) */
  hasMissile: function () {
    return this.has('killer_100');
  },

  /** Missile cooldown in ms */
  missileCooldown: function () {
    return this.has('killer_500') ? 5000 : 8000;
  }
};
