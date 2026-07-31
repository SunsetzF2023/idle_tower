# Enemy Expansion — Design Document

## Phase A: Core New Enemies

### 🪙 Coin Goblin
| Field | Value |
|-------|-------|
| Behaviour | `charge` — rushes tower |
| Shape | Gold filled circle + "¢" text |
| Speed | 35 px/s |
| HP | 0.5× (fragile) |
| Collision DMG | 0 (no damage to tower — pure reward) |
| Cash | 1 (low) |
| Coins | 15 (high!) |
| First wave | 1 |
| Special | Does not harm tower on contact. Just gives coins. Dies instantly like old basic. |

**Strategy**: Spawns randomly mixed with basics. Kill before it reaches tower for free coins. Tower takes no damage if it reaches.

---

### 🧬 Splitter
| Field | Value |
|-------|-------|
| Behaviour | `charge` |
| Shape | Large diamond (◊) — 14px radius |
| Speed | 25 px/s (slow) |
| HP | 4× (tanky) |
| Collision DMG | 4 |
| Cash | 3 |
| Coins | 5 |
| First wave | 6 |
| On death | Spawns 4 mini triangles at death position |

**Mini (split offspring)**:
| Field | Value |
|-------|-------|
| Behaviour | `charge` |
| Shape | Small triangle (△) — 7px radius |
| Speed | 55 px/s (fast!) |
| HP | 1× |
| Collision DMG | 1 |
| Cash | 0 |
| Coins | 0 |
| Ranged attack | Shoots yellow bullet every 2.5s at 200px/s, 1 dmg |
| Stop distance | Tower range circle (like Ranged) |

**Death cascade**: Splitter dies → 4 minis scatter from death point → minis walk to range circle → stop and shoot yellow bullets.

---

### 🌊 Spawner
| Field | Value |
|-------|-------|
| Behaviour | `spawner` — walks slowly, continuously spawns basics |
| Shape | Red filled square (■) — 16px radius |
| Speed | 15 px/s (very slow) |
| HP | 8× (very tanky) |
| Collision DMG | 5 |
| Cash | 6 |
| Coins | 12 |
| First wave | 8 |
| Spawn rate | Every 3s, spawns 1 basic enemy at own position |
| Max spawns | 6 total per Spawner |

**Strategy**: Must kill quickly — spawns basics that stick to tower. The longer it lives, the more basics pile up.

---

### 💚 Healer
| Field | Value |
|-------|-------|
| Behaviour | `ranged` — stops at range edge |
| Shape | Green cross (+) — 12px radius |
| Speed | 30 px/s |
| HP | 3× |
| Collision DMG | 0 |
| Cash | 4 |
| Coins | 10 |
| First wave | 7 |
| Heal beam | Every 1.5s. Targets lowest-HP enemy within 150px radius. Heals 15% max HP. |
| Visual | Green beam line from healer to healed enemy |

**Strategy**: Kill the healer FIRST, otherwise it keeps other enemies alive. Adds target priority decision.

---

### 🛡️ Shield
| Field | Value |
|-------|-------|
| Behaviour | `ranged` — stops at range edge |
| Shape | Hexagon (⬡) with dashed outer ring (shield visual) |
| Speed | 25 px/s |
| HP | 2× |
| Shield HP | 4× (shield must be destroyed first) |
| Collision DMG | 0 |
| Cash | 5 |
| Coins | 12 |
| First wave | 9 |
| Attack | Shoots red bullet every 2s, 2 dmg |
| Shield mechanic | Bullets hit shield first. Shield has `shieldHP` pool. Once depleted, `shieldBroken = true`, body becomes vulnerable. Shield visual: dashed ring disappears. |
| Reflect | While shield is up, 30% chance to reflect tower bullet to nearest enemy (bounce) |

**Visual**: Hexagon body + dashed hex ring around it. Ring shrinks/glows red as shield weakens.

---

### 💨 Dasher
| Field | Value |
|-------|-------|
| Behaviour | `dasher` — alternates dash/ranged |
| Shape | Right-pointing triangle (▷) — 11px radius, rotates to face tower |
| Speed | 60 px/s (fast) |
| HP | 2× |
| Collision DMG | 3 |
| Cash | 3 |
| Coins | 8 |
| First wave | 8 |
| Cycle | Dash: rushes at tower at 200 px/s. Hits → deals 3 dmg → immediately retreats to range circle → shoots 1 bullet → waits 2s → dashes again |
| Dash visual | Triangle leaves particle trail during dash |

---

## Phase A: Equipment/Weapons

### 🔵 Rotating Orb (Unlock: Workshop "Orbs" — already has data)
- 1-4 orbs orbit tower at fixed radius
- Enemies touching an orb take 1× tower damage
- Orb speed: workshop "Orb Speed" stat
- Visual: small blue circle rotating around tower

### 🚀 Cruise Missile (Unlock: Achievement "Kill 500 enemies")
- Every 8 seconds, auto-fires at the farthest enemy within range
- Deals 3× tower damage
- Visual: orange triangular projectile with smoke trail

---

## Combat Upgrade During Wave

**Change**: Remove `state._current === 'idle'` check from `ingameUpgrade()`.
- Players can spend Cash anytime
- Upgrade buttons remain enabled during PLAYING state
- Panel already refreshes every 500ms — shows live affordability

This matches the original The Tower behavior.
