# The Tower Clone — 设计文档

> 复刻热门放置增量塔防游戏 The Tower - Idle Tower Defense
> 仓库: https://github.com/SunsetzF2023/idle_tower
> 托管: GitHub Pages
> 版本: v0.1.0-alpha

---

## 1. 技术选型

| 项目 | 选择 | 原因 |
|------|------|------|
| 语言 | 纯 JS (ES5+) / HTML5 / CSS3 | 零依赖，浏览器原生支持 |
| 渲染 | Canvas 2D API (requestAnimationFrame) | 60fps 性能充足，无 GPU 开销 |
| 模块化 | `<script>` 标签 + 全局命名空间 `window.Tower` | `file://` 直接打开，无需服务器 |
| 本地测试 | **双击 `index.html` 即玩** | 无需任何工具 |
| 数据持久化 | localStorage | 客户端持久化，无后端 |
| CI/CD | GitHub Actions → GitHub Pages | 推送自动部署 |

**为什么不用游戏引擎 / 打包器 / 框架？** 渲染需求：六边形 + 圆形 + 线条 + 文字。Canvas 2D 原生 API 完全覆盖。零依赖意味着零供应链风险。`<script>` 标签直接加载意味着双击 HTML 就能跑。

---

## 2. 安全设计

虽然是纯客户端游戏，但安全不能忽略：

| 层面 | 措施 |
|------|------|
| CSP | `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self';">` |
| XSS | 无用户输入字段，无 innerHTML 拼接，统计面板用 textContent |
| localStorage | 读取时 try/catch + 类型校验，损坏数据降级为默认值 |
| 代码执行 | 禁止 `eval()` / `new Function()` / `setTimeout(string)` |
| 模块边界 | ES Modules 强制严格模式，文件间通过纯函数通信 |

---

## 3. 文件结构

```
idle_tower/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions → Pages 自动部署
├── .editorconfig
├── .gitignore
├── css/
│   └── main.css                # 三栏布局（终端暗色主题）
├── js/
│   ├── game.js                 # 入口：Tower.init() 初始化一切
│   ├── loop.js                 # requestAnimationFrame 游戏循环
│   ├── state.js                # 状态机（IDLE/PLAYING/WAVE_COMPLETE/GAME_OVER）
│   ├── tower.js                # 塔属性、升级逻辑
│   ├── enemy.js                # 敌人属性、类型定义、移动
│   ├── bullet.js               # 子弹飞行、命中判定
│   ├── wave.js                 # 波次管理 + spawner（1/8秒判定）
│   ├── combat.js               # 伤害计算、击杀判定
│   ├── economy.js              # Cash/Coins 经济系统
│   ├── renderer.js             # Canvas 渲染器（画家算法分层）
│   ├── panels.js               # 左右面板 DOM 更新
│   ├── storage.js              # localStorage 读写 + 校验
│   └── utils.js                # 向量计算、距离、碰撞
├── index.html                  # 入口（<script>标签按序加载）
├── DESIGN.md                   # 本设计文档
└── README.md
```

**加载方式：** `index.html` 底部按依赖顺序排列 `<script>` 标签（`utils.js` → 实体 → 系统 → UI → `game.js`），无需打包器，双击即可运行。

**命名空间：** 所有模块挂载到 `window.Tower = {}` 下（如 `Tower.tower`、`Tower.enemy`、`Tower.renderer`），避免全局污染的同时保持 `file://` 兼容。

**模块通信规则：**
- `game.js` 是唯一协调者，持有游戏循环和状态机
- 实体文件（tower/enemy/bullet）只暴露数据结构和纯函数
- UI 文件（renderer/panels）读取实体状态，不修改实体
- 系统文件（wave/combat/economy）之间通过 `game.js` 协调，不直接引用彼此

---

## 4. UI 布局（三栏 · 深色主题 · 复刻原作风格）

```
┌──────────────┬───────────────────────┬──────────────┐
│  左侧面板     │                       │  右侧面板     │
│  (240px)     │     Canvas 画布        │  (240px)     │
│              │     (响应式剩余)        │              │
│  ═ STATUS ═  │                       │  ═ UPGRADE ═ │
│  hp:  100    │      ○──────○         │  dmg   Lv.0  │
│  dmg: 6      │     ╱        ╲        │  [+1] 10💵   │
│  spd: 1.0/s  │    ╱   ⬡     ╲       │  spd   Lv.0  │
│  rng: 150px  │    ╲  (塔)   ╱       │  [+1] 10💵   │
│              │     ╲        ╱        │  rng   Lv.0  │
│  ═ STATS ═   │      ○──────○         │  [+1] 15💵   │
│  best wave:0 │    (敌人从四周来)       │              │
│  kills: 0    │                       │  ═ WAVE ═    │
│  basic: 0    │                       │  wave  1     │
│  fast:  0    │                       │  left: 5     │
│  tank:  0    │                       │  [▶ next]    │
│  boss:  0    │                       │              │
│              │                       │  💵 cash     │
│  wave kills  │                       │  🪙 coins    │
│  ───────── 0 │                       │              │
└──────────────┴───────────────────────┴──────────────┘
```

### 配色：深蓝暗色（复刻原作 + Windsurf 风格）

| 元素 | 颜色 | Hex |
|------|------|-----|
| 背景 | 深蓝黑 | `#0f1119` |
| 面板背景 | 暗蓝灰 | `#1a1d2e` |
| 面板边框 | 暗灰蓝 | `#2d3148` |
| 塔（六边形） | 天蓝 | `#7dcfff` |
| 塔攻击范围 | 半透天蓝 | `rgba(125,207,255,0.08)` |
| 敌人 Basic | 红色 | `#f7768e` |
| 敌人 Fast | 橙色 | `#e0af68` |
| 敌人 Tank | 紫色 | `#bb9af7` |
| 敌人 Boss | 亮橙 | `#ff9e64` |
| 敌人血条（满） | 绿色 | `#9ece6a` |
| 敌人血条（残） | 红→黄 | `#f7768e` → `#e0af68` |
| 子弹 | 白色 | `#c0caf5` |
| 伤害数字 | 白→淡出 | `#ffffff` → 透明 |
| 粒子（击杀爆散） | 对应敌人颜色 | 小碎片沿径向向外散开 |
| 文字主色 | 浅灰 | `#a9b1d6` |
| 文字高亮 | 白色 | `#c0caf5` |
| 按钮 | 暗底天蓝字 | `#7dcfff` on `#1a1d2e` |

### 视觉效果（活泼但不花哨）

| 效果 | 描述 |
|------|------|
| 子弹 | 白色小圆点，匀速飞向目标 |
| 伤害数字 | 白色，上浮 + 淡出，0.6s |
| 击杀粒子 | 敌人颜色小碎片沿径向爆散，0.5s 消失 |
| 塔受伤 | 六边形短暂闪烁红色（0.2s） |
| 波次切换 | 面板数字平滑刷新 |
| 按钮 hover | 边框微亮 |

---

## 5. 游戏循环（Game Loop）

```
┌─────────┐     ┌──────────┐     ┌───────────┐
│  IDLE   │────▶│ PLAYING  │────▶│  WAVE_    │
│  可升级  │     │  自动战斗  │     │  COMPLETE │──┐
└─────────┘     └──────────┘     └───────────┘  │
     ▲                     │        结算现金/硬币 │
     │         ┌───────────┘                     │
     │         ▼ 塔死亡                           │
     │    ┌──────────┐                           │
     └────│  GAME_   │◀──────────────────────────┘
          │  OVER    │
          │ 结算/重置 │
          └──────────┘
```

### 战斗帧逻辑（requestAnimationFrame, ~60fps）

```
帧更新（game loop）:
  1. deltaTime = 当前时间 - 上一帧时间
  2. 敌人生成判定（spawner: 每 125ms 一次概率判定）
  3. 敌人位置更新（向塔移动）
  4. 碰撞检测（敌人到达塔 → 扣塔 HP）
  5. 塔锁敌（范围内最近敌人）
  6. 子弹飞行 + 命中判定 + 扣敌人 HP
  7. 死亡判定（敌人 HP ≤ 0 → 给 Cash + 击杀统计）

帧渲染（renderer）:
  1. 清空画布（背景色填充）
  2. 绘制攻击范围圈
  3. 绘制子弹
  4. 绘制敌人（描边圆 + 头顶血条）
  5. 绘制塔（六边形描边）
  6. 绘制伤害浮动数字
  7. 绘制塔的 HP 条（Canvas 底部或 UI 面板）
```

---

## 6. 核心数值

### 6.1 塔 (Tower)

| 属性 | 初始值 | 升级增量 | 升级费用 | 说明 |
|------|--------|----------|----------|------|
| 生命 (HP) | **100** | — | — | 敌人碰到塔扣血，归零死亡 |
| 伤害 (Damage) | 6 | +2/级 | `10 × 1.5^Lv` | 每发子弹伤害 |
| 攻速 (Attack Speed) | 1.0/s | +0.05/级 | `10 × 1.5^Lv` | 最高 5.95/s |
| 射程 (Range) | 150px | +5px/级 | `15 × 1.5^Lv` | 攻击范围半径 |

**外观：** 六边形描边（线宽 2px），颜色 `#7dcfff`，边长 25px，Canvas 正中央。

**碰撞体：** 敌人到达六边形外接圆半径内 → 造成伤害。碰撞半径 = 六边形外接圆 ≈ 29px。

### 6.2 敌人 (Enemies)

| 类型 | 速度 (px/frame) | HP 倍率 | 碰撞伤害 | 击杀现金 | 首次出现 | 颜色 |
|------|---------|---------|----------|----------|----------|------|
| Basic | 1.0 | 1× | 1 | 1 | Wave 1 | `#f7768e` 红 |
| Fast | 2.0 | 1× | 1 | 2 | Wave 5 | `#e0af68` 橙 |
| Tank | 0.5 | 5× | 3 | 4 | Wave 8 | `#bb9af7` 紫 |
| Boss | 0.3 | 20× | 10 | 10+ | 每 10 波 | `#ff9e64` 亮橙 |

**基础 HP：** `10 + 波次 × 5`（再 × 类型倍率）

**外观：**
- 圆形描边（线宽 1.5px），不填充
- 半径: Basic/Fast/Tank 12px，Boss 22px
- 头顶血条: 宽 = 直径×1.2，高 3px，背景红 → 前景绿
- 移动方向: 从屏幕边缘生成 → 沿直线向塔中心移动

### 6.3 敌人生成公式（社区逆向数据）

原作底层机制，直接采用：

```
单波敌人生成总数 = Spawn Rate × 8 × 26秒 × Enemy Balance卡牌乘区

参数:
  Spawn Rate    — 每 1/8 秒 (125ms) 进行一次概率判定，命中则生成 1 只敌人
  8             — 每秒 8 次判定
  26            — 基础单波时长（秒）
  Enemy Balance — 卡牌乘区（Phase 1 不做，先按 1.0）
```

**Spawn Rate 随波次增长（Phase 1: Wave 1-10）：**

| 波次 | Spawn Rate | 理论生成数 | 同屏硬上限 |
|------|-----------|-----------|-----------|
| 1 | 15% | ~31 | 120 |
| 2 | 16% | ~33 | 120 |
| 3 | 17% | ~35 | 120 |
| 4 | 18% | ~37 | 120 |
| 5 | 19% | ~40 | 120 |
| 6 | 20% | ~42 | 120 |
| 7 | 21% | ~44 | 120 |
| 8 | 22% | ~46 | 120 |
| 9 | 23% | ~48 | 120 |
| 10 | 25% | ~52 | 120 |

**同屏硬上限（Hard Cap）：**
- 普通敌人: 120 只（触顶后不再生成，玩家需提高击杀速度）
- Boss: 10 只
- Phase 1 暂不设精英

**生成间隔：** 每 125ms (`1000/8`) 一次判定，成功则从屏幕随机边缘位置生成 1 只。

---

## 7. 货币系统

| 货币 | 变量名 | 获取方式 | 清空条件 | 用途 | Phase |
|------|--------|----------|----------|------|-------|
| 现金 | `cash` | 局内击杀敌人 | **死亡清零** | 波次间隙升级塔属性 | ✅ Phase 1 |
| 硬币 | `coins` | 每波结算 + 成就 + 任务 | **永久保留** | 工作坊永久升级 | Phase 3 |

**Phase 1 只做局内 Cash。** Coins 占位显示但不可用。

---

## 8. 游戏状态机

```js
const GameState = {
  IDLE:           'idle',            // 初始 / 波次升级完成，可操作升级面板
  PLAYING:        'playing',         // 战斗中，敌人持续生成
  WAVE_COMPLETE:  'wave_complete',   // 当前波敌人全灭，结算
  GAME_OVER:      'game_over',       // 塔 HP = 0，展示结算
};
```

| 状态 | 升级面板 | 敌人生成 | 可操作 |
|------|---------|----------|--------|
| IDLE | 可见，可用 | 停止 | ✅ |
| PLAYING | 可见，禁用 | 活跃 | ❌ |
| WAVE_COMPLETE | 可见，可用 | 停止 | ✅ |
| GAME_OVER | 隐藏 | 停止 | 仅"重新开始" |

---

## 9. 实现计划

### Phase 1 — 核心战斗 ⇦ 当前
- [ ] 项目骨架（文件结构 + .editorconfig + .gitignore + deploy.yml）
- [ ] index.html（CSP + 三栏布局 + Canvas）
- [ ] Canvas 渲染：六边形塔 + 攻击范围圈（renderer.js）
- [ ] 敌人 Basic 圆形：spawner 生成 → 移动 → 碰撞扣塔 HP
- [ ] 塔自动攻击：锁敌 → 子弹飞行 → 命中 → 扣敌人 HP → 死亡给 Cash
- [ ] 血条：敌人头顶 + 塔 HP 条
- [ ] 伤害浮动数字
- [ ] 局内 Cash + 右侧升级面板（伤害/攻速/射程）
- [ ] 波次系统（1-10 波）+ 下一波按钮
- [ ] 左侧统计面板（击杀计数、当前波次）
- [ ] 死亡 → 结算 → "重新开始" 按钮
- [ ] GitHub Actions 部署到 GitHub Pages

### Phase 2 — 敌人种类
- [ ] Fast、Tank、Boss 类型
- [ ] 波次敌人组合算法（按类型比例混合）
- [ ] Boss 每 10 波出现

### Phase 3 — 持久化与经济
- [ ] Coins 硬币系统（每波结算给 Coins）
- [ ] 工作坊永久升级（localStorage）
- [ ] 最佳波次记录 / 总击杀统计持久化
- [ ] 成就标记（首次击杀 Boss 等）

### Phase 4 — 体验完善
- [ ] 粒子效果（击杀爆散 / 塔受伤闪烁）
- [ ] 波次加速卡牌（Enemy Balance 乘区）
- [ ] 移动端响应式（竖屏单列布局）
- [ ] 音效（可选，Web Audio API）

---

## 10. 本地测试

```bash
# 克隆
git clone https://github.com/SunsetzF2023/idle_tower.git
cd idle_tower

# 本地运行（三选一）
npx serve .              # 推荐：零配置静态服务器
python -m http.server    # Python 自带
start index.html         # 直接打开（ES Modules 需要服务器）

# 打开浏览器 → http://localhost:3000
```
