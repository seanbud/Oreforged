import { remoteFacet } from '../../engine/hooks';
import { BlockType } from './GameDefinitions';

export const Facets = {
    // Core Gameplay State
    PlayerStats: remoteFacet('player_stats', {
        totalMined: 0,
        currentTool: 0,
        toolHealth: 100,
        isToolBroken: false,
        damageMultiplier: 1.0,
        regenCost: 0,
    }),
    Inventory: remoteFacet('inventory', {} as Record<BlockType, number>),

    // Progression & Unlocks
    Progression: remoteFacet('progression', {
        tree: 0,
        ore: 0,
        energy: 0,
        damage: 0,
    }),
    UnlockCrafting: remoteFacet('unlock_crafting', false),

    // World & System
    WorldSeed: remoteFacet('world_seed', "12345"),
    IsGenerating: remoteFacet('is_generating', false),
    CountWater: remoteFacet('count_water', false),
    ShowToast: remoteFacet('show_toast', ''),
};
