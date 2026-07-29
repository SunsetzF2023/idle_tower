/* ═══════════════════════════════════════════════
   utils.js — 数学/几何/随机工具函数
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.utils = {

  /** 两点距离 */
  dist(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /** 两点角度 (弧度) */
  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  /** 向量移动 */
  moveToward(x, y, tx, ty, speed) {
    var a = this.angle(x, y, tx, ty);
    var d = this.dist(x, y, tx, ty);
    if (d <= speed) return { x: tx, y: ty, arrived: true };
    return { x: x + Math.cos(a) * speed, y: y + Math.sin(a) * speed, arrived: false };
  },

  /** 范围随机 [min, max] */
  rand(min, max) {
    return Math.random() * (max - min) + min;
  },

  /** 整数随机 [min, max] */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /** 概率判定 */
  chance(prob) {
    return Math.random() < prob;
  },

  /** 钳制 */
  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  /** 在画布边缘随机生成位置 */
  randomEdgePos(cw, ch, margin) {
    margin = margin || 20;
    var edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: return { x: Math.random() * cw, y: -margin };              // top
      case 1: return { x: cw + margin, y: Math.random() * ch };          // right
      case 2: return { x: Math.random() * cw, y: ch + margin };          // bottom
      case 3: return { x: -margin, y: Math.random() * ch };              // left
    }
  },

  /** 画布中心 */
  canvasCenter(cw, ch) {
    return { x: cw / 2, y: ch / 2 };
  }
};
