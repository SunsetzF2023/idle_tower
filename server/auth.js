/* ═══════════════════════════════════════════════
   auth.js — 简单账号系统
   scrypt 密码哈希 · 用户名+密码注册/登录
   ═══════════════════════════════════════════════ */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

function readAccounts() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch (e) { return {}; }
}

function writeAccounts(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/** Hash password with random salt using scrypt */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

/** Verify password against stored hash */
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

/** Register new account → returns playerId */
function register(username, password) {
  if (!username || !password) return { error: 'username and password required' };
  if (username.length < 2) return { error: 'username too short (min 2 chars)' };
  if (password.length < 4) return { error: 'password too short (min 4 chars)' };
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return { error: 'username: only letters, numbers, _, -' };

  const accounts = readAccounts();
  const key = username.toLowerCase();
  if (accounts[key]) return { error: 'username already taken' };

  const playerId = 'u_' + username.toLowerCase();
  accounts[key] = {
    username: username,
    playerId: playerId,
    password: hashPassword(password),
    createdAt: Date.now()
  };
  writeAccounts(accounts);
  return { ok: true, playerId: playerId, username: username };
}

/** Login → returns playerId or error */
function login(username, password) {
  if (!username || !password) return { error: 'username and password required' };

  const accounts = readAccounts();
  const key = username.toLowerCase();
  const account = accounts[key];
  if (!account) return { error: 'account not found' };
  if (!verifyPassword(password, account.password)) return { error: 'wrong password' };

  return { ok: true, playerId: account.playerId, username: account.username };
}

module.exports = { register, login };
