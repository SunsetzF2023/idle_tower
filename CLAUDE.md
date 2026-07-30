# The Tower Clone — Project Guide

## Overview
Pure JS/HTML/CSS idle tower defense game. Clone of "The Tower - Idle Tower Defense".
Zero dependencies aside from Supabase SDK (CDN). Works by opening `index.html` directly or via GitHub Pages.

## Live URLs
- **GitHub Pages** (always online): https://sunsetzf2023.github.io/idle_tower
- **Repo**: https://github.com/SunsetzF2023/idle_tower

## Infrastructure
- **Hosting**: GitHub Pages (auto-deploy on push to `main`)
- **Database**: Supabase — project `nwobdjtjwwobpjvwvavq` (Singapore region, free tier)
- **Auth**: Supabase Auth (email confirmation disabled, usernames mapped to `username@tower.user`)
- **No local server needed** — frontend talks directly to Supabase via SDK

## File Structure
```
idle_tower/
├── index.html          # Entry point. CSP allows jsdelivr CDN + Supabase API
├── css/main.css        # Dark theme, three-column layout (left 240px / canvas / right 240px)
├── js/
│   ├── utils.js        # Math helpers: dist, angle, moveToward, rand, randomEdgePos
│   ├── storage.js      # localStorage save/load (local stats only)
│   ├── db.js           # Supabase client: auth, stats, leaderboard, daily missions
│   ├── tower.js        # Tower stats, WORKSHOP data (29 upgrades matching wiki), getStats()
│   ├── enemy.js        # Enemy types (basic/fast/tank/ranged/boss), create(), move(), takeDamage()
│   ├── bullet.js       # Tower bullets — flight + hit detection
│   ├── wave.js         # Wave spawner (1/8s ticks, 26s duration, spawn rate scaling)
│   ├── combat.js       # Damage calc, Defense%, DefAbs, Thorn, Death Defy, particles
│   ├── economy.js      # Cash/Coins, Coins/Kill, Coins/Wave multipliers
│   ├── loop.js         # Game loop (rAF): spawn → move → target → fire → bullets → hit
│   ├── renderer.js     # Canvas 2D painter's algorithm: background → range → bullets → enemies → tower → damage numbers → particles → mines → HP bar
│   ├── panels.js       # Left panel (stats + workshop + leaderboard tabs), right panel (upgrades + wave)
│   └── game.js         # Main controller: init(), state machine, restart(), onGameOver()
├── server/             # Old Express server (DEPRECATED — no longer used, Supabase replaced it)
├── supabase/
│   ├── migration.sql   # Database schema + RLS policies
│   └── SETUP.md        # Supabase setup instructions
├── DESIGN.md           # Original design document (may be outdated)
└── CLAUDE.md           # This file
```

## Key Architecture Decisions
- **Workshop values** match The Tower wiki: https://the-tower-idle-tower-defense.game-vault.net/wiki/Workshop
- **Enemy wiki**: https://the-tower-idle-tower-defense.game-vault.net/wiki/Enemies
- **Upgrade cost formula**: `base + level × base × 0.5` (linear, NOT exponential)
- **Game state machine**: idle → playing → wave_complete → (game_over | idle)
- **Canvas rendering**: painter's algorithm, layers ordered back-to-front
- **Enemy behaviors**: `charge` (rush tower), `tank` (stick + ram every 1.5s), `ranged` (stop at range circle + shoot purple bullets every 2s)
- **Ranged enemies** stop at tower range circle edge (always within tower range)
- **Persistent stats** (localStorage): bestWave, totalWaves, totalKills, killsByType, coins, workshop
- **Online stats** (Supabase): synced when logged in, survives across devices

## CSP Policy (index.html line 5)
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-hashes' https://cdn.jsdelivr.net
connect-src 'self' https://nwobdjtjwwobpjvwvavq.supabase.co
```
When adding external resources, update this line.

## Common Issues
- **CSP blocking new CDN/API**: Add to `script-src` or `connect-src` in index.html
- **"server unreachable" on register/login**: CSP is blocking Supabase. Check `connect-src`.
- **Workshop panel shows "undefined"**: New items must have correct `base` and `perLv` in tower.js WORKSHOP data
- **Enemy bullets not rendering**: renderer.js `_drawEnemyBullets` needs `state.enemyBullets` to be initialized in game.js

## Supabase Credentials
In `js/db.js`:
- URL: `https://nwobdjtjwwobpjvwvavq.supabase.co`
- Anon key is hardcoded in db.js (public, safe for client-side use)
- Auth users stored as `username@tower.user`
- Player data in `players` table, missions in `missions` table
