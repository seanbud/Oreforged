#pragma once

#include "Block.h"
#include <array>
#include <cstdint>
#include <string>

namespace OreForged {

class Chunk {
public:
    static constexpr int SIZE = 16;   // 16x16 blocks per chunk
    static constexpr int HEIGHT = 8;  // 8 blocks tall (shallow world)
    
    Chunk(int chunkX, int chunkZ);
    
    // Get/Set blocks
    Block GetBlock(int x, int y, int z) const;
    void SetBlock(int x, int y, int z, BlockType type);
    
    // World position of this chunk
    int GetChunkX() const { return m_chunkX; }
    int GetChunkZ() const { return m_chunkZ; }
    
    // Generate chunk terrain
    void Generate(uint32_t seed);
    
    // Serialize chunk data for sending to UI
    std::string Serialize() const;
    
    // Check if chunk needs mesh rebuild
    bool IsDirty() const { return m_dirty; }
    void SetDirty(bool dirty) { m_dirty = dirty; }
    
private:
    int m_chunkX;
    int m_chunkZ;
    bool m_dirty = true;
    
    // 3D array of blocks [x][y][z]
    std::array<std::array<std::array<Block, SIZE>, HEIGHT>, SIZE> m_blocks;
    
    // Helper for array bounds checking
    bool IsValidPosition(int x, int y, int z) const;
};

} // namespace OreForged
