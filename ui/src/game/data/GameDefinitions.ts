// Game data definitions for mining, crafting, and progression

export enum BlockType {
    Air = 0,
    Grass = 1,
    Dirt = 2,
    Stone = 3,
    Water = 4,
    Wood = 5,
    Leaves = 6,
    Bedrock = 7,
    Sand = 8,
    Coal = 9,
    Iron = 10,
    Gold = 11,
    Diamond = 12,
}

export enum ToolTier {
    HAND = 0,
    WOOD = 1,
    STONE = 2,
    IRON = 3,
    GOLD = 4,
    DIAMOND = 5,
}

export interface BlockDefinition {
    health: number;      // How many damage points to break
    hardness: ToolTier;  // Minimum tool tier required
    name: string;
    color: number;       // Javascript hex color for particles
}

export interface ToolDefinition {
    damage: number;      // Damage per hit
    name: string;
    tier: ToolTier;
}

export interface CraftingRecipe {
    result: ToolTier;
    cost: Map<BlockType, number>;
    requires: ToolTier | null;  // Previous tool tier required
    displayName: string;
}

// Block definitions
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
    [BlockType.Air]: { health: 0, hardness: ToolTier.HAND, name: "Air", color: 0x000000 },
    [BlockType.Grass]: { health: 3, hardness: ToolTier.HAND, name: "Grass", color: 0x5a8c54 },
    [BlockType.Dirt]: { health: 3, hardness: ToolTier.HAND, name: "Dirt", color: 0x76552b },
    [BlockType.Stone]: { health: 10, hardness: ToolTier.WOOD, name: "Stone", color: 0x7d7d7d },
    [BlockType.Water]: { health: 0, hardness: ToolTier.HAND, name: "Water", color: 0x40a4df },
    [BlockType.Wood]: { health: 5, hardness: ToolTier.HAND, name: "Wood", color: 0x6b5130 },
    [BlockType.Leaves]: { health: 1, hardness: ToolTier.HAND, name: "Leaves", color: 0x3d6e32 },
    [BlockType.Bedrock]: { health: 9999, hardness: ToolTier.DIAMOND, name: "Bedrock", color: 0x222222 },
    [BlockType.Sand]: { health: 2, hardness: ToolTier.HAND, name: "Sand", color: 0xdccfa3 },
    [BlockType.Coal]: { health: 12, hardness: ToolTier.WOOD, name: "Coal Ore", color: 0x242424 },
    [BlockType.Iron]: { health: 20, hardness: ToolTier.STONE, name: "Iron Ore", color: 0xd8af93 },
    [BlockType.Gold]: { health: 25, hardness: ToolTier.IRON, name: "Gold Ore", color: 0xfcee4b },
    [BlockType.Diamond]: { health: 35, hardness: ToolTier.GOLD, name: "Diamond Ore", color: 0x4eedd8 },
};

// Tool definitions
export const TOOL_DEFINITIONS: Record<ToolTier, ToolDefinition> = {
    [ToolTier.HAND]: { damage: 1, name: "Hand", tier: ToolTier.HAND },
    [ToolTier.WOOD]: { damage: 2, name: "Wood Pickaxe", tier: ToolTier.WOOD },
    [ToolTier.STONE]: { damage: 3, name: "Stone Pickaxe", tier: ToolTier.STONE },
    [ToolTier.IRON]: { damage: 5, name: "Iron Pickaxe", tier: ToolTier.IRON },
    [ToolTier.GOLD]: { damage: 8, name: "Gold Pickaxe", tier: ToolTier.GOLD },
    [ToolTier.DIAMOND]: { damage: 12, name: "Diamond Pickaxe", tier: ToolTier.DIAMOND },
};

// Crafting recipes
export const CRAFTING_RECIPES: CraftingRecipe[] = [
    {
        result: ToolTier.WOOD,
        cost: new Map([[BlockType.Wood, 10]]),
        requires: null,
        displayName: "Wood Pickaxe",
    },
    {
        result: ToolTier.STONE,
        cost: new Map([[BlockType.Stone, 20], [BlockType.Wood, 10]]),
        requires: ToolTier.WOOD,
        displayName: "Stone Pickaxe",
    },
    {
        result: ToolTier.IRON,
        cost: new Map([[BlockType.Iron, 10], [BlockType.Wood, 5]]),
        requires: ToolTier.STONE,
        displayName: "Iron Pickaxe",
    },
    {
        result: ToolTier.GOLD,
        cost: new Map([[BlockType.Gold, 10], [BlockType.Wood, 5]]),
        requires: ToolTier.IRON,
        displayName: "Gold Pickaxe",
    },
    {
        result: ToolTier.DIAMOND,
        cost: new Map([[BlockType.Diamond, 3], [BlockType.Wood, 5]]),
        requires: ToolTier.GOLD,
        displayName: "Diamond Pickaxe",
    },
];

// Helper functions
export function canMineBlock(blockType: BlockType, toolTier: ToolTier): boolean {
    const blockDef = BLOCK_DEFINITIONS[blockType];
    return toolTier >= blockDef.hardness;
}

export function getDamage(toolTier: ToolTier): number {
    return TOOL_DEFINITIONS[toolTier].damage;
}

export function getBlockHealth(blockType: BlockType): number {
    return BLOCK_DEFINITIONS[blockType].health;
}
