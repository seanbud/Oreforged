# Roguelite Progression \u0026 Dynamic World Generation Plan

## User Objective
Transition Oreforged into a progressive "roguelite" game where:
1.  **Starting State**: Tiny world (Size=6?), Low Height (Flat/Hilly).
2.  **Meta-Progression**: In the Escape Menu, use collected resources to buy "Mods" for the *next* generation.
3.  **Mods**:
    *   **Energy**: Increases World Size & Max Height.
    *   **Ore Find**: Increases Ore density/rarity.
    *   **More Trees**: Increases tree density.
    *   **+DMG**: Increases Global Damage Multiplier (faster mining).
4.  **Loop**: Regenerating consumes the mods and resets costs. The new world reflects the mods.

## Technical blockers
*   **Static Chunk Size**: Currently `Chunk::SIZE` and `HEIGHT` are `constexpr` constants in `Chunk.h`. This prevents dynamic sizing at runtime.
*   **Fixed Array**: `m_blocks` is a `std::array`. Needs to be `std::vector` to support dynamic sizing per world-gen.

## Proposed Changes

### 1. Refactor Chunk.h / Chunk.cpp (C++)
*   **Remove `constexpr`**: Change `SIZE` and `HEIGHT` to member variables `m_size` and `m_height`.
*   **Vector Storage**: Replace `std::array<...>` with `std::vector<Block> m_blocks` (1D flattened).
    *   Indexing: `index = y * (m_size * m_size) + z * m_size + x`.
*   **Constructor**: Update constructor to accept `size` and `height`.
*   **Accessors**: Update `GetBlock` / `SetBlock` to use dynamic bounds/indexing.
*   **Generation**: Update `Generate` loops to use `m_size`.

### 2. Update World.h / World.cpp (C++)
*   **Generation Config**: Define a struct `WorldConfig` { int size; int height; float oreMultiplier; float treeMultiplier; float damageMultiplier; }.
*   **Store Params**: `World` needs to store `m_config`.
*   **Regenerate Method**: Update `Regenerate(seed, config)` to accept these parameters and recreate chunks with them.

### 3. Update Bridge & Game.cpp (C++)
*   **Bridge**: Update `regenerateWorld` binding to accept the config numbers from JS.
    *   Expected Args: `[seed, size, height, oreMult, treeMult, damageMult]`.

### 4. UI Logic (App.tsx)
*   **State**: Track `modLevels` (Energy, Ore, Trees, Damage).
*   **Shop Logic**:
    *   `calculateCost(modType, currentLevel)`: Exponential scaling.
    *   `buyMod(modType)`: Deduct resources (`totalMined`), increment level.
*   **Regenerate**:
    *   Calculate final parameters based on levels.
    *   Call `bridge.regenerateWorld(seed, finalSize, finalHeight, ...)`
    *   Reset `modLevels` and `totalMined` (Wait, user said "mods are wiped, costs reset". Does it wipe `totalMined`? "You click to modify... by clicking purchase... subtract from collected... when you finally buy... costs reset". This implies you SPEND your score. So yes, score goes down. But after regen, do you keep remaining score? Probably yes. But Mod Levels reset to 0.)

### 5. UI Escape Menu
*   **New Section**: "World Upgrades".
*   **Buttons**: Display Level, Next Benefit, Cost.
*   **Tooltip**: On "Regenerate" button, summarize active mods.

## Plan Steps

1.  **C++ Refactor (Core)**: Change `Chunk` to dynamic sizing. Verify build.
2.  **C++ Bridge Update**: Expose `regenerateWorld` with new params.
3.  **UI Logic**: Implement Mod Shop and state in `App.tsx`.
4.  **UI Polish**: Tooltips and Layout.

## Verification
*   Start game: Tiny world (6x6).
*   Mine currency.
*   Buy "Energy".
*   Regenerate.
*   Verify new world is Bigger (e.g. 10x10).
