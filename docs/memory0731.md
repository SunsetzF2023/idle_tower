# Session Summary — July 31, 2026

## What We Built Today

### 🔥 Hellfire Enemy (Wave 10+)
- Ramping beam damage: 1 → 4 over 10s (0.3/s ramp), ticks every 200ms
- Persistent orange laser visual (3-layer glow from enemy to tower)
- Death AOE: 80px radius, 30% max HP damage to nearby enemies
- Nerfed from original (was 0.8/s ramp, 8 cap, 400ms ticks — too punishing)

### 🧬 Splitter Enemy (Wave 6+)
- Cyan diamond shape, 4× HP, walks to tower
- On death: spawns 4 yellow mini triangles
- Minis are 'ranged' behaviour — walk to range circle, shoot yellow bullets (2.5s interval, 1 dmg)

### 🪙 Coin Goblin
- Gold circle with ¢ symbol, all waves
- 0.5× HP, no damage to tower on contact
- +15 Coins on kill (best early-game coin source)

### ⏩ 2× Game Speed
- Workshop → Utility → Game Speed (1000🪙 unlock)
- Doubles dt globally — all movement, attacks, bullets run at 2× speed

### 🚀 Cruise Missile
- Auto-fires every 8s at farthest enemy within range (counter to Hellfire/Ranged)
- 3× tower damage, orange triangle projectile
- Unlocked via achievement (kill 100 enemies)
- Cooldown reduced to 5s at 500 kills

### 🏆 Achievement System
- 6 achievements with coin rewards
- Checked every 5s in game loop + on game over
- Stored in localStorage (`tower_achievements`)
- Achievements: Century Slayer (100 kills), Mass Executioner (500 kills), First Milestone (wave 10), Endurance Runner (wave 20), Boss Slayer (5 bosses), Goblin Hoarder (20 goblins)

### 🔵 Rotating Orbs
- Workshop → Defense → Orbs (500🪙 unlock, 3000🪙 each, max 4)
- Blue glowing circles orbiting at 55% of range
- Deal 1× tower damage on enemy contact
- Orb Speed workshop stat controls rotation rate

### ⚔️ Combat Upgrades
- Removed idle-only restriction — can spend Cash anytime during combat
- Match original The Tower behavior

### ✉ Mail System
- Supabase `mail` table with subject, body, coins, to_users, claimed_by
- Admin panel (SunsetzF2023 only) — compose + send to all or selected players
- Player inbox with claim button
- Targeted mail via player checkboxes

### 🖥 Electron Desktop App
- `package.json` + `main.js` — Electron wrapper
- GitHub Actions auto-build for Win/Mac/Linux on `v*` tag push
- Tag `v1.0.0` triggered first build (may need debug)

### 🔧 Bug Fixes
- Ranged enemies stop inside range circle (edge tangent, not on edge)
- Hellfire continuous beam (was choppy bullet-based, now direct damage)
- Daily missions progress tracking fixed
- Players table insert fixed (RLS policy changed to USING true)
- GitHub OAuth login bypasses email signup rate limits
- Supabase trigger auto-creates players row on auth user creation
- IN-GAME stats sync from Supabase on login (cross-device)

---

## Current Architecture

```
┌─────────────────────────────────────────────┐
│  GitHub Pages (sunsetzf2023.github.io)      │
│  Pure static HTML/JS/CSS, zero deps         │
│  ┌───────────┐  ┌────────────┐              │
│  │  index.html│  │  12 JS files│              │
│  └─────┬─────┘  └─────┬──────┘              │
│        │               │                     │
│        ▼               ▼                     │
│  Supabase SDK (CDN) — jsdelivr              │
└────────┼────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Supabase (nwobdjtjwwobpjvwvavq)            │
│  Singapore region, free tier                │
│  ├─ auth.users (GitHub OAuth + email)       │
│  ├─ players (stats, workshop, coins)        │
│  ├─ missions (daily missions)               │
│  └─ mail (admin mail system)                │
└─────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `js/db.js` | Supabase client — auth, stats, leaderboard, missions, mail |
| `js/achievements.js` | Achievement tracking + unlock logic |
| `js/tower.js` | Workshop data (29+ upgrades), getStats(), cost formulas |
| `js/enemy.js` | 10 enemy types (basic, fast, ranged, tank, boss, hellfire, goblin, splitter, mini, ...) |
| `js/loop.js` | Game loop — spawn, move, target, fire, bullets, missiles, orbs |
| `js/renderer.js` | Canvas 2D — layered painter's algorithm, per-enemy shapes |
| `js/panels.js` | UI — left panel tabs (IN-GAME, WORKSHOP, LEADER, ENCYCLO), right panel (UPGRADE, WAVE) |
| `supabase/migration.sql` | Full DB schema + RLS + trigger |

---

## Enemy Roster

| Enemy | Wave | Behaviour | Shape | Special |
|-------|------|-----------|-------|---------|
| Basic | 1 | Tank (stick+ram) | Circle | Sticks to tower |
| Fast | 5 | Charge (explode) | Circle | 2× speed |
| Ranged | 5 | Ranged (stop+shoot) | Circle | Purple bullets |
| Splitter | 6 | Charge | Cyan Diamond | Splits into 4 minis |
| Mini | Split | Ranged | Yellow Triangle | Yellow bullets |
| Tank | 8 | Tank (stick+ram) | Circle | 5× HP |
| Hellfire | 10 | Ranged (beam) | Circle + laser | Ramping beam, death AOE |
| Boss | 10/20/... | Charge | Circle | 20× HP |
| Goblin | All | Charge | Gold ¢ | No damage, +15 coins |

---

## Workshop Upgrades (from wiki)

### Attack: damage, speed, critChance, critFactor, range, damagePerMeter, multishot, multishotTargets, rapidFireChance, rapidFireDuration, bounceChance, bounceTargets, superCritChance, superCritMult

### Defense: health, healthRegen, defensePercent, defenseAbsolute, thornDamage, lifesteal, knockbackChance, knockbackForce, orbs, orbSpeed, landMineChance, landMineDamage, deathDefy

### Utility: cashBonus, cashWave, startCash, coinsPerKill, coinsWave, freeAttackChance, freeDefenseChance, freeUtilityChance, gameSpeed

---

## Supabase Credentials
- URL: `https://nwobdjtjwwobpjvwvavq.supabase.co`
- Anon key in `js/db.js` (line 11-12)
- GitHub OAuth App: Client ID `Ov23liL1StbZR0Q9QcBs`
- Auth: email confirm disabled, GitHub provider enabled

---

## CSP Policy (index.html)
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-hashes' https://cdn.jsdelivr.net
connect-src 'self' https://nwobdjtjwwobpjvwvavq.supabase.co
style-src 'self' 'unsafe-inline'
```

---

## Future Plans (from design doc)

### Phase B — Next Enemies
- 🛡️ Shield — hexagon with outer shield ring, reflects bullets, red shots
- 💨 Dasher — dash in → retreat → ranged attack cycle
- 🌊 Spawner — red square, high HP, spawns basics
- 💚 Healer — green cross, heals nearby enemies with beam

### Phase C — Weapons/Equipment
- ⛓️ Lightning Chain — bullets chain to nearby enemies
- 🛡️ Rotating Shield — absorbs damage, resets per wave
- 🕳️ Black Hole — pulls + detonates enemies in radius
- 💥 Shock Bomb — area stun
- 🔫 Rotating Turret — orbiting mini-tower that shoots

### Other Ideas
- Rogue-like power-up selection between waves
- Async co-op (compare stats with friends)
- Desktop app polish (Electron release)

---

## Common Issues & Fixes
- **CSP blocking**: Add domain to `script-src` or `connect-src` in index.html
- **Supabase 406**: Use `.maybeSingle()` instead of `.single()` for optional queries
- **Supabase 403**: Check RLS policy exists for that operation
- **429 rate limit**: Switch to GitHub OAuth login
- **Players table empty**: Run trigger SQL, check RLS policy is USING (true)
- **Ranged outside circle**: `stopDist = stats.range - enemy.radius` in loop.js

---

## Session Stats
- **Commits**: ~25 commits today
- **Files changed**: ~15 files
- **New features**: Hellfire, Splitter, Goblin, Orbs, Cruise Missile, Achievements, Game Speed, Mail, Combat Upgrades, Electron
- **Bug fixes**: Ranged positioning, Hellfire beam, missions tracking, players insert, CSP, OAuth callback
