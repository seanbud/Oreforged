#pragma once

#include "Chunk.h"
#include <memory>
#include <unordered_map>
#include <vector>

namespace OreForged {

// Hash function for chunk coordinates
struct ChunkPos {
    int x, z;
    
    bool operator==(const ChunkPos& other) const {
        return x == other.x && z == other.z;
    }
};

struct ChunkPosHash {
    std::size_t operator()(const ChunkPos& pos) const {
        return std::hash<int>()(pos.x) ^ (std::hash<int>()(pos.z) << 1);
    }
};

class World {
public:
    World(uint32_t seed = 12345);
    
    // Get block at world coordinates
    Block GetBlock(int x, int y, int z) const;
    void SetBlock(int x, int y, int z, BlockType type);
    
    // Chunk management
    Chunk* GetChunk(int chunkX, int chunkZ);
    const Chunk* GetChunk(int chunkX, int chunkZ) const;
    
    void GenerateChunk(int chunkX, int chunkZ);
    void LoadChunksAroundPosition(int centerChunkX, int centerChunkZ, int radius);
    
    // Get all loaded chunks for rendering
    std::vector<const Chunk*> GetLoadedChunks() const;
    
    uint32_t GetSeed() const { return m_seed; }
    
    // Regenerate world with new seed
    void Regenerate(uint32_t seed);
    
private:
    uint32_t m_seed;
    std::unordered_map<ChunkPos, std::unique_ptr<Chunk>, ChunkPosHash> m_chunks;
    
    // Convert world coordinates to chunk coordinates
    static ChunkPos WorldToChunk(int worldX, int worldZ);
    static void WorldToLocal(int worldX, int worldZ, int& chunkX, int& chunkZ, int& localX, int& localZ);
};

} // namespace OreForged
