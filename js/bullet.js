/* ═══════════════════════════════════════════════
   bullet.js — 子弹飞行 + 命中判定
   ═══════════════════════════════════════════════ */
window.Tower = window.Tower || {};

Tower.bullet = {

  BULLET_SPEED: 400,   // 像素/秒
  BULLET_RADIUS: 2,

  /** 创建子弹 */
  create: function (x, y, target) {
    return {
      x: x,
      y: y,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      speed: this.BULLET_SPEED,
      radius: this.BULLET_RADIUS,
      alive: true
    };
  },

  /** 子弹飞行一步，返回是否命中 */
  move: function (bullet, enemies, dt) {
    if (!bullet.alive) return false;

    // 尝试找到目标敌人（如果还活着）
    var target = null;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].id === bullet.targetId && enemies[i].alive) {
        target = enemies[i];
        break;
      }
    }
    // 目标已死 → 子弹自毁
    if (!target) {
      bullet.alive = false;
      return false;
    }

    // 更新目标位置
    bullet.targetX = target.x;
    bullet.targetY = target.y;

    // 向目标移动
    var result = Tower.utils.moveToward(bullet.x, bullet.y, bullet.targetX, bullet.targetY, bullet.speed * dt);
    bullet.x = result.x;
    bullet.y = result.y;

    if (result.arrived) {
      bullet.alive = false;
      return true; // 命中
    }
    return false;
  }
};
