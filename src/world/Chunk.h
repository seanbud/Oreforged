#pragma once

#include "Block.h"
#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace OreForged {

class Chunk {
public:
    // Dynamic size (passed in constructor)
    Chunk(int chunkX, int chunkZ, int size, int height);
    
    // Get/Set blocks
    Block GetBlock(int x, int y, int z) const;
    void SetBlock(int x, int y, int z, BlockType type);
    
    // World position of this chunk
    int GetChunkX() const { return m_chunkX; }
    int GetChunkZ() const { return m_chunkZ; }
    
    int GetSize() const { return m_size; }
    int GetHeight() const { return m_height; }

    // Generate chunk terrain
    // Config: oreMultiplier, treeMultiplier
    void Generate(uint32_t seed, float oreMult = 1.0f, float treeMult = 1.0f);
    
    // Serialize chunk data for sending to UI
    std::string Serialize() const;
    
    // Check if chunk needs mesh rebuild
    bool IsDirty() const { return m_dirty; }
    void SetDirty(bool dirty) { m_dirty = dirty; }
    
private:
    int m_chunkX;
    int m_chunkZ;
    int m_size;
    int m_height;
    bool m_dirty = true;
    
    // Flat array of blocks: index = y * size * size + z * size + x
    std::vector<Block> m_blocks;
    
    // Helper for array bounds checking
    bool IsValidPosition(int x, int y, int z) const;
    
    // Generation helpers
    void GenerateOres(uint32_t seed, float oreMult);
    void GenerateTrees(uint32_t seed, float treeMult);
    void PlaceTree(int x, int baseY, int z, int trunkHeight);
    int FindSurfaceY(int x, int z) const;
};

} // namespace OreForged
