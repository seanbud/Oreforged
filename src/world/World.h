#pragma once

#include "Chunk.h"
#include <memory>
#include <unordered_map>
#include <vector>

namespace OreForged {

struct WorldConfig {
    int size = 32;    // Standard chunk size (32x32)
    int height = 32;  // Increased height for better terrain
    float oreMult = 1.0f;
    float treeMult = 1.0f;
    // float damageMult stored/handled in App.tsx? No, maybe World needs to know for Block Health?
    // Actually Block Health is handled in UI for now (VoxelRenderer/App).
    // So WorldConfig just needs generation params.
};

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
    
    // Regenerate world with new seed and config
    void Regenerate(uint32_t seed, const WorldConfig& config);
    
    const WorldConfig& GetConfig() const { return m_config; }

private:
    uint32_t m_seed;
    WorldConfig m_config;
    std::unordered_map<ChunkPos, std::unique_ptr<Chunk>, ChunkPosHash> m_chunks;
    
    // Convert world coordinates to chunk coordinates
    // Now instance methods to access m_config.size
    ChunkPos WorldToChunk(int worldX, int worldZ) const;
    void WorldToLocal(int worldX, int worldZ, int& chunkX, int& chunkZ, int& localX, int& localZ) const;
};

} // namespace OreForged
