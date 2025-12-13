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
    Bronze = 13,
}

export enum ToolTier {
    HAND = 0,
    WOOD_STICK = 1,
    WOOD_PICK = 2,
    STONE_PICK = 3,
    FURNACE = 4, // Not a tool, but a gate
    BRONZE_PICK = 5,
    IRON_PICK = 6,
    GOLD_PICK = 7,
    DIAMOND_PICK = 8,
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

export interface ModLevels {
    energy: number;
    ore: number;
    tree: number;
    damage: number;
}

export interface Modifier {
    damage: number;
}

// Block definitions
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
    [BlockType.Air]: { health: 0, hardness: ToolTier.HAND, name: "Air", color: 0x000000 },
    [BlockType.Grass]: { health: 3, hardness: ToolTier.HAND, name: "Grass", color: 0x5a8c54 },
    [BlockType.Dirt]: { health: 3, hardness: ToolTier.HAND, name: "Dirt", color: 0x76552b },
    [BlockType.Stone]: { health: 10, hardness: ToolTier.WOOD_PICK, name: "Stone", color: 0x7d7d7d },
    [BlockType.Water]: { health: 0, hardness: ToolTier.HAND, name: "Water", color: 0x40a4df },
    [BlockType.Wood]: { health: 5, hardness: ToolTier.HAND, name: "Wood", color: 0x6b5130 },
    [BlockType.Leaves]: { health: 1, hardness: ToolTier.HAND, name: "Leaves", color: 0x3d6e32 },
    [BlockType.Bedrock]: { health: 9999, hardness: ToolTier.DIAMOND_PICK, name: "Bedrock", color: 0x222222 },
    [BlockType.Sand]: { health: 2, hardness: ToolTier.HAND, name: "Sand", color: 0xdccfa3 },
    [BlockType.Coal]: { health: 12, hardness: ToolTier.WOOD_PICK, name: "Coal Ore", color: 0x242424 },
    [BlockType.Iron]: { health: 20, hardness: ToolTier.BRONZE_PICK, name: "Iron Ore", color: 0xd8af93 },
    [BlockType.Gold]: { health: 25, hardness: ToolTier.IRON_PICK, name: "Gold Ore", color: 0xfcee4b },
    [BlockType.Diamond]: { health: 35, hardness: ToolTier.GOLD_PICK, name: "Diamond Ore", color: 0x4eedd8 },
    [BlockType.Bronze]: { health: 15, hardness: ToolTier.STONE_PICK, name: "Bronze Ore", color: 0xcd7f32 }, // New Block
};

// Tool definitions
export const TOOL_DEFINITIONS: Record<ToolTier, ToolDefinition> = {
    [ToolTier.HAND]: { damage: 1, name: "Hand", tier: ToolTier.HAND },
    [ToolTier.WOOD_STICK]: { damage: 2, name: "Wood Stick", tier: ToolTier.WOOD_STICK },
    [ToolTier.WOOD_PICK]: { damage: 2, name: "Wood Pickaxe", tier: ToolTier.WOOD_PICK },
    [ToolTier.STONE_PICK]: { damage: 3, name: "Stone Pickaxe", tier: ToolTier.STONE_PICK },
    [ToolTier.FURNACE]: { damage: 3, name: "Furnace (Installed)", tier: ToolTier.FURNACE }, // No damage boost
    [ToolTier.BRONZE_PICK]: { damage: 4, name: "Bronze Pickaxe", tier: ToolTier.BRONZE_PICK },
    [ToolTier.IRON_PICK]: { damage: 5, name: "Iron Pickaxe", tier: ToolTier.IRON_PICK },
    [ToolTier.GOLD_PICK]: { damage: 8, name: "Gold Pickaxe", tier: ToolTier.GOLD_PICK },
    [ToolTier.DIAMOND_PICK]: { damage: 12, name: "Diamond Pickaxe", tier: ToolTier.DIAMOND_PICK },
};

// Crafting recipes
// Hand -> Wood Stick -> Wood Pick -> Stone Pick -> Furnace -> Bronze Pick -> Iron Pick -> Gold -> Diamond
export const CRAFTING_RECIPES: CraftingRecipe[] = [
    {
        result: ToolTier.WOOD_STICK,
        cost: new Map([[BlockType.Wood, 6]]),
        requires: null,
        displayName: "Wood Stick",
    },
    {
        result: ToolTier.WOOD_PICK,
        cost: new Map([[BlockType.Wood, 10]]),
        requires: ToolTier.WOOD_STICK,
        displayName: "Wood Pickaxe",
    },
    {
        result: ToolTier.STONE_PICK,
        cost: new Map([[BlockType.Stone, 20], [BlockType.Wood, 10]]),
        requires: ToolTier.WOOD_PICK,
        displayName: "Stone Pickaxe",
    },
    {
        result: ToolTier.FURNACE,
        cost: new Map([[BlockType.Stone, 6]]),
        requires: ToolTier.STONE_PICK,
        displayName: "Furnace",
    },
    {
        result: ToolTier.BRONZE_PICK,
        cost: new Map([[BlockType.Bronze, 10], [BlockType.Wood, 5]]),
        requires: ToolTier.FURNACE, // Requires Furnace Tier
        displayName: "Bronze Pickaxe",
    },
    {
        result: ToolTier.IRON_PICK,
        cost: new Map([[BlockType.Iron, 10], [BlockType.Wood, 5]]),
        requires: ToolTier.BRONZE_PICK,
        displayName: "Iron Pickaxe",
    },
    {
        result: ToolTier.GOLD_PICK,
        cost: new Map([[BlockType.Gold, 10], [BlockType.Wood, 5]]),
        requires: ToolTier.IRON_PICK,
        displayName: "Gold Pickaxe",
    },
    {
        result: ToolTier.DIAMOND_PICK,
        cost: new Map([[BlockType.Diamond, 3], [BlockType.Wood, 5]]),
        requires: ToolTier.GOLD_PICK,
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

export const UPGRADES = {
    energy: { name: "Fuel Efficiency", desc: "Reduces energy cost of upgrades" },
    ore: { name: "Ore Hunter", desc: "Increases ore spawn rate" },
    tree: { name: "Deforestation", desc: "Increases tree spawn rate" },
    damage: { name: "Sharpness", desc: "Increases tool damage" }
};

export function getEnergyCost(level: number): number {
    return Math.floor(10 * Math.pow(1.5, level));
}
