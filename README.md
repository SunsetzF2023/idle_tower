# The Tower Clone

纯 JS/HTML/CSS，零依赖。双击 `index.html` 即可游玩。

## 玩法

- 塔 (天蓝六边形) 在屏幕中央，自动攻击范围内的敌人
- 敌人 (红/橙/紫/亮橙 圆形) 从屏幕边缘生成，向塔移动
- 敌人碰到塔 → 塔扣血，HP 归零则游戏结束
- 击杀敌人获得 Cash，波次间隙升级塔属性
- 每 10 波出现 Boss

## 本地运行

```bash
# 方式 1: 直接打开
start index.html

# 方式 2: 本地静态服务器
npx serve .
```

## 线上游玩

https://sunsetzf2023.github.io/idle_tower
