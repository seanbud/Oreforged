import { BlockType, getBlockHealth } from '../data/GameDefinitions';

// Tracks health of blocks being mined
export class OreHealthSystem {
    private blockHealth: Map<string, number> = new Map();

    // Generate unique key for block position
    private getBlockKey(chunkX: number, chunkZ: number, x: number, y: number, z: number): string {
        return `${chunkX},${chunkZ},${x},${y},${z}`;
    }

    // Add damage to a block and return whether it broke
    addDamage(
        chunkX: number,
        chunkZ: number,
        x: number,
        y: number,
        z: number,
        blockType: BlockType,
        damage: number
    ): { broke: boolean; currentHealth: number } {
        const key = this.getBlockKey(chunkX, chunkZ, x, y, z);

        // Initialize health if first hit
        if (!this.blockHealth.has(key)) {
            const maxHealth = getBlockHealth(blockType);
            this.blockHealth.set(key, maxHealth);
        }

        // Apply damage
        const currentHealth = this.blockHealth.get(key)! - damage;
        this.blockHealth.set(key, currentHealth);

        // Check if block broke
        if (currentHealth <= 0) {
            this.blockHealth.delete(key);
            return { broke: true, currentHealth: 0 };
        }

        return { broke: false, currentHealth };
    }

    // Get current health of a block (returns max health if not damaged)
    getHealth(
        chunkX: number,
        chunkZ: number,
        x: number,
        y: number,
        z: number,
        blockType: BlockType
    ): number {
        const key = this.getBlockKey(chunkX, chunkZ, x, y, z);
        return this.blockHealth.get(key) ?? getBlockHealth(blockType);
    }

    // Remove a block from tracking (e.g., when chunk unloads)
    removeBlock(chunkX: number, chunkZ: number, x: number, y: number, z: number): void {
        const key = this.getBlockKey(chunkX, chunkZ, x, y, z);
        this.blockHealth.delete(key);
    }

    // Clear all tracked blocks
    clear(): void {
        this.blockHealth.clear();
    }
}
