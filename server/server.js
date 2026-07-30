/* ═══════════════════════════════════════════════
   server.js — The Tower Clone 本地后端
   排行榜 + 统计提交 + 每日任务
   JSON 文件存储 · 零数据库依赖
   ═══════════════════════════════════════════════ */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3457;

app.use(cors());
app.use(express.json());

// 也托管静态文件，这样直接访问服务器就能玩游戏
app.use(express.static(path.join(__dirname, '..')));

// ═══ JSON 数据库 ═══
const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const MISSIONS_FILE = path.join(DATA_DIR, 'missions.json');

function readJSON(filepath, fallback) {
  try {
    if (!fs.existsSync(filepath)) return fallback;
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJSON(filepath, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

// ═══ 账号注册 ═══
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  const result = auth.register(username, password);
  if (result.error) return res.status(400).json({ error: result.error });

  // 同时创建玩家记录
  const players = readJSON(PLAYERS_FILE, {});
  if (!players[result.playerId]) {
    players[result.playerId] = {
      id: result.playerId,
      name: result.username,
      bestWave: 0, totalWaves: 0, totalKills: 0,
      killsByType: { basic: 0, fast: 0, ranged: 0, tank: 0, boss: 0 },
      totalCoins: 0, gamesPlayed: 0,
      lastSeen: Date.now(), createdAt: Date.now()
    };
    writeJSON(PLAYERS_FILE, players);
  }
  res.json(result);
});

// ═══ 账号登录 ═══
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const result = auth.login(username, password);
  if (result.error) return res.status(401).json({ error: result.error });
  res.json(result);
});

// ═══ 玩家注册/获取（兼容旧 API） ═══
app.post('/api/player', (req, res) => {
  const { id, name } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const players = readJSON(PLAYERS_FILE, {});
  if (!players[id]) {
    players[id] = {
      id: id,
      name: name || 'Player',
      bestWave: 0,
      totalWaves: 0,
      totalKills: 0,
      killsByType: { basic: 0, fast: 0, ranged: 0, tank: 0, boss: 0 },
      totalCoins: 0,
      gamesPlayed: 0,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };
  } else {
    // 更新名字（如果提供了）
    if (name) players[id].name = name;
    players[id].lastSeen = Date.now();
  }
  writeJSON(PLAYERS_FILE, players);
  res.json(players[id]);
});

// ═══ 提交统计（游戏结束/定时同步） ═══
app.post('/api/stats', (req, res) => {
  const { id, stats } = req.body;
  if (!id || !stats) return res.status(400).json({ error: 'id and stats required' });

  const players = readJSON(PLAYERS_FILE, {});
  if (!players[id]) return res.status(404).json({ error: 'player not found. register first.' });

  const p = players[id];
  // 合并统计（取最佳/累加）
  if (stats.bestWave > p.bestWave) p.bestWave = stats.bestWave;
  p.totalWaves += (stats.totalWaves || 0);
  p.totalKills += (stats.totalKills || 0);
  if (stats.killsByType) {
    for (const k in stats.killsByType) {
      if (!p.killsByType[k]) p.killsByType[k] = 0;
      p.killsByType[k] += stats.killsByType[k];
    }
  }
  p.totalCoins += (stats.totalCoins || 0);
  p.gamesPlayed += 1;
  p.lastSeen = Date.now();
  if (stats.name) p.name = stats.name;

  players[id] = p;
  writeJSON(PLAYERS_FILE, players);
  res.json({ ok: true, player: p });
});

// ═══ 排行榜 ═══
app.get('/api/leaderboard/:type', (req, res) => {
  const { type } = req.params;
  const players = readJSON(PLAYERS_FILE, {});

  const list = Object.values(players).map(p => ({
    id: p.id,
    name: p.name,
    bestWave: p.bestWave,
    totalWaves: p.totalWaves,
    totalKills: p.totalKills,
    gamesPlayed: p.gamesPlayed,
    lastSeen: p.lastSeen
  }));

  // 排序
  switch (type) {
    case 'bestWave':
      list.sort((a, b) => b.bestWave - a.bestWave);
      break;
    case 'totalWaves':
      list.sort((a, b) => b.totalWaves - a.totalWaves);
      break;
    case 'totalKills':
      list.sort((a, b) => b.totalKills - a.totalKills);
      break;
    case 'gamesPlayed':
      list.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
      break;
    default:
      list.sort((a, b) => b.bestWave - a.bestWave);
  }

  res.json(list.slice(0, 100)); // top 100
});

// ═══ 所有玩家统计概览 ═══
app.get('/api/stats', (req, res) => {
  const players = readJSON(PLAYERS_FILE, {});
  const list = Object.values(players);
  res.json({
    totalPlayers: list.length,
    activeToday: list.filter(p => Date.now() - p.lastSeen < 86400000).length,
    topBestWave: list.reduce((max, p) => Math.max(max, p.bestWave), 0),
    totalWavesAll: list.reduce((sum, p) => sum + p.totalWaves, 0),
    totalKillsAll: list.reduce((sum, p) => sum + p.totalKills, 0)
  });
});

// ═══ 每日任务 ═══
const DAILY_MISSIONS = [
  { id: 'kill_50', desc: 'Kill 50 enemies', target: 50, reward: 10 },
  { id: 'kill_200', desc: 'Kill 200 enemies', target: 200, reward: 25 },
  { id: 'wave_5', desc: 'Reach wave 5', target: 5, reward: 15 },
  { id: 'wave_10', desc: 'Reach wave 10', target: 10, reward: 30 },
  { id: 'kill_boss', desc: 'Kill 1 boss', target: 1, reward: 20 },
  { id: 'kill_tank', desc: 'Kill 3 tanks', target: 3, reward: 15 },
  { id: 'kill_ranged', desc: 'Kill 5 ranged enemies', target: 5, reward: 15 },
  { id: 'games_3', desc: 'Play 3 games', target: 3, reward: 20 }
];

// 获取今日任务（基于日期 seed）
function getDailyMissions() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const missions = readJSON(MISSIONS_FILE, {});
  if (missions.date !== today) {
    // 新的一天，随机选 4 个任务
    const shuffled = [...DAILY_MISSIONS].sort(() => Math.random() - 0.5);
    const fresh = {
      date: today,
      missions: shuffled.slice(0, 4).map(m => ({
        ...m,
        progress: 0,
        done: false,
        claimed: false
      }))
    };
    writeJSON(MISSIONS_FILE, fresh);
    return fresh;
  }
  return missions;
}

app.get('/api/missions', (req, res) => {
  res.json(getDailyMissions());
});

// 更新任务进度
app.post('/api/missions/progress', (req, res) => {
  const { progress } = req.body; // { kill_50: 30, wave_5: 3, ... }
  if (!progress) return res.status(400).json({ error: 'progress required' });

  const missions = getDailyMissions();
  for (const m of missions.missions) {
    if (progress[m.id] !== undefined && !m.done) {
      m.progress = Math.min(m.target, (m.progress || 0) + progress[m.id]);
      if (m.progress >= m.target) m.done = true;
    }
  }
  writeJSON(MISSIONS_FILE, missions);
  res.json(missions);
});

// 领取任务奖励
app.post('/api/missions/claim', (req, res) => {
  const { id, missionId } = req.body;
  const missions = getDailyMissions();
  const m = missions.missions.find(m => m.id === missionId);
  if (!m) return res.status(404).json({ error: 'mission not found' });
  if (!m.done || m.claimed) return res.status(400).json({ error: 'not claimable' });

  m.claimed = true;
  writeJSON(MISSIONS_FILE, missions);

  // 给玩家发 coins
  const players = readJSON(PLAYERS_FILE, {});
  if (players[id]) {
    players[id].totalCoins += m.reward;
    writeJSON(PLAYERS_FILE, players);
  }

  res.json({ ok: true, reward: m.reward, missions });
});

// ═══ 启动 ═══
app.listen(PORT, () => {
  console.log(`\n🎮 The Tower Server running on http://localhost:${PORT}`);
  console.log(`📊 API:    http://localhost:${PORT}/api/leaderboard/bestWave`);
  console.log(`🎯 游戏:  http://localhost:${PORT}\n`);
});
