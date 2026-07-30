/* ═══════════════════════════════════════════════
   renderer.js — Canvas 渲染器（画家算法分层）
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.renderer = {

  ctx: null,
  canvas: null,

  init: function (canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', this._resize.bind(this));
  },

  _resize: function () {
    if (!this.canvas) return;
    var area = document.getElementById('game-area');
    if (area) {
      var w = area.clientWidth;
      var h = area.clientHeight;
      var size = Math.min(w, h);
      this.canvas.width = size;
      this.canvas.height = size;
    }
  },

  getSize: function () {
    return { w: this.canvas.width, h: this.canvas.height };
  },

  /** 主渲染入口 */
  render: function (state) {
    var ctx = this.ctx;
    var w = this.canvas.width;
    var h = this.canvas.height;
    var center = Tower.utils.canvasCenter(w, h);

    // 层 1: 背景
    this._clear(ctx, w, h);

    // 层 2: 攻击范围
    this._drawRange(state, center);

    // 层 3: 子弹
    this._drawBullets(state);

    // 层 3.5: 敌人子弹
    this._drawEnemyBullets(state);

    // 层 4: 敌人 + 血条
    this._drawEnemies(state);

    // 层 5: 塔
    this._drawTower(state, center);

    // 层 6: 伤害数字
    this._drawDamageNumbers(state);

    // 层 7: 粒子
    this._drawParticles(state);

    // 层 7.5: 地雷
    this._drawMines();

    // 层 8: 塔血条（在 Canvas 上方居中）
    this._drawTowerHP(state, w);
  },

  _clear: function (ctx, w, h) {
    ctx.fillStyle = '#0f1119';
    ctx.fillRect(0, 0, w, h);
  },

  _drawRange: function (state, center) {
    var ctx = this.ctx;
    var stats = Tower.tower.getStats(state);
    // 黄色虚线圆圈 — 清晰可见
    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, stats.range, 0, Math.PI * 2);
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255,200,80,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 内圈半透填充
    ctx.beginPath();
    ctx.arc(center.x, center.y, stats.range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,200,80,0.03)';
    ctx.fill();
    ctx.restore();
  },

  _drawTower: function (state, center) {
    var ctx = this.ctx;
    var size = Tower.tower.baseStats().size;
    var sides = 6;
    ctx.beginPath();
    for (var i = 0; i < sides; i++) {
      var angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
      var x = center.x + size * Math.cos(angle);
      var y = center.y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#7dcfff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 塔受伤闪烁
    if (state._flashTimer && state._flashTimer > 0) {
      ctx.strokeStyle = 'rgba(247,118,142,' + state._flashTimer + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  },

  _drawEnemies: function (state) {
    var ctx = this.ctx;
    var enemies = state.enemies;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      // 描边圆
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 血条
      this._drawEnemyHealthBar(e);
    }
  },

  _drawEnemyHealthBar: function (enemy) {
    var ctx = this.ctx;
    var barW = enemy.radius * 2.4;
    var barH = 3;
    var bx = enemy.x - barW / 2;
    var by = enemy.y - enemy.radius - 6;
    var ratio = enemy.hp / enemy.maxHp;

    // 背景
    ctx.fillStyle = 'rgba(247,118,142,0.3)';
    ctx.fillRect(bx, by, barW, barH);
    // 前景 — 颜色从红渐变绿
    var r, g;
    if (ratio > 0.5) { r = Math.floor(247 * (1 - ratio) * 2); g = 206; }
    else { r = 247; g = Math.floor(206 * ratio * 2); }
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',106)';
    ctx.fillRect(bx, by, barW * ratio, barH);
  },

  _drawBullets: function (state) {
    var ctx = this.ctx;
    var bullets = state.bullets;
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b.alive) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#c0caf5';
      ctx.fill();
    }
  },

  _drawEnemyBullets: function (state) {
    var ctx = this.ctx;
    var bullets = state.enemyBullets || [];
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b.alive) continue;
      // 外发光
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(187,154,247,0.25)';
      ctx.fill();
      // 子弹本体
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color || '#bb9af7';
      ctx.fill();
    }
  },

  _drawDamageNumbers: function (state) {
    var ctx = this.ctx;
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'center';
    for (var i = 0; i < state.damageNumbers.length; i++) {
      var d = state.damageNumbers[i];
      var alpha = d.life / d.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  },

  _drawParticles: function (state) {
    var ctx = this.ctx;
    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  _drawMines: function () {
    var ctx = this.ctx;
    var mines = Tower.loop._mines || [];
    for (var i = 0; i < mines.length; i++) {
      var m = mines[i];
      var alpha = Math.min(1, m.life / 5); // fade in quickly
      ctx.globalAlpha = alpha * 0.6;
      // Outer ring
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff9e64';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Inner dot
      ctx.beginPath();
      ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff9e64';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  _drawTowerHP: function (state, canvasW) {
    var ctx = this.ctx;
    var barW = 120;
    var barH = 6;
    var bx = canvasW / 2 - barW / 2;
    var by = 12;
    var ratio = state.towerHP / state.towerMaxHP;

    ctx.fillStyle = 'rgba(247,118,142,0.25)';
    ctx.fillRect(bx, by, barW, barH);

    if (ratio > 0.5) {
      var g2 = Math.floor(206 * (1 - ratio) * 2);
      ctx.fillStyle = 'rgb(' + Math.floor(247 * (1-ratio)*2) + ',' + (206 - g2 + 106) + ',106)';
    } else {
      ctx.fillStyle = '#f7768e';
    }
    // 简化：直接用绿色渐变
    if (ratio > 0.6) ctx.fillStyle = '#9ece6a';
    else if (ratio > 0.3) ctx.fillStyle = '#e0af68';
    else ctx.fillStyle = '#f7768e';
    ctx.fillRect(bx, by, barW * ratio, barH);

    // HP 文字
    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = '#a9b1d6';
    ctx.textAlign = 'center';
    ctx.fillText(state.towerHP + ' / ' + state.towerMaxHP, canvasW / 2, by + barH + 12);
  }
};
