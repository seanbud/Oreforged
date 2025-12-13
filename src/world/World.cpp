#include "World.h"
#include <iostream>

namespace OreForged {

World::World(uint32_t seed)
    : m_seed(seed)
{
    // Default config - Size 9 as requested ("Try 9")
    m_config.size = 9;
    m_config.height = 32;
    m_config.oreMult = 1.0f; 
    m_config.treeMult = 1.0f;
}

Block World::GetBlock(int x, int y, int z) const {
    int chunkX, chunkZ, localX, localZ;
    WorldToLocal(x, z, chunkX, chunkZ, localX, localZ);
    
    const Chunk* chunk = GetChunk(chunkX, chunkZ);
    if (!chunk) {
        return Block{BlockType::Air};
    }
    
    return chunk->GetBlock(localX, y, localZ);
}

void World::SetBlock(int x, int y, int z, BlockType type) {
    int chunkX, chunkZ, localX, localZ;
    WorldToLocal(x, z, chunkX, chunkZ, localX, localZ);
    
    Chunk* chunk = GetChunk(chunkX, chunkZ);
    if (!chunk) {
        // Generate chunk if it doesn't exist
        GenerateChunk(chunkX, chunkZ);
        chunk = GetChunk(chunkX, chunkZ);
    }
    
    if (chunk) {
        chunk->SetBlock(localX, y, localZ, type);
    }
}

Chunk* World::GetChunk(int chunkX, int chunkZ) {
    auto it = m_chunks.find({chunkX, chunkZ});
    if (it != m_chunks.end()) {
        return it->second.get();
    }
    return nullptr;
}

const Chunk* World::GetChunk(int chunkX, int chunkZ) const {
    auto it = m_chunks.find({chunkX, chunkZ});
    if (it != m_chunks.end()) {
        return it->second.get();
    }
    return nullptr;
}

void World::GenerateChunk(int chunkX, int chunkZ) {
    ChunkPos pos{chunkX, chunkZ};
    
    // Don't regenerate if already exists
    if (m_chunks.find(pos) != m_chunks.end()) {
        return;
    }
    
    // Create new chunk with current config
    auto chunk = std::make_unique<Chunk>(chunkX, chunkZ, m_config.size, m_config.height);
    chunk->Generate(m_seed, m_config.oreMult, m_config.treeMult, m_config.islandFactor);
    
    m_chunks[pos] = std::move(chunk);
}

void World::Regenerate(uint32_t seed, const WorldConfig& config) {
    std::cout << "World::Regenerate called with seed: " << seed << std::endl;
    m_seed = seed;
    m_config = config; // Update config
    
    m_chunks.clear();
    std::cout << "Chunks cleared" << std::endl;
}

void World::LoadChunksAroundPosition(int centerChunkX, int centerChunkZ, int radius) {
    // Asymmetric range to visually center the island (which generates at world 0,0)
    // Load one extra chunk on the negative side
    for (int x = centerChunkX - radius - 1; x <= centerChunkX + radius; x++) {
        for (int z = centerChunkZ - radius - 1; z <= centerChunkZ + radius; z++) {
            GenerateChunk(x, z);
        }
    }
}

std::vector<const Chunk*> World::GetLoadedChunks() const {
    std::vector<const Chunk*> chunks;
    chunks.reserve(m_chunks.size());
    
    for (const auto& pair : m_chunks) {
        chunks.push_back(pair.second.get());
    }
    
    return chunks;
}

ChunkPos World::WorldToChunk(int worldX, int worldZ) const {
    int s = m_config.size;
    int chunkX = worldX >= 0 ? worldX / s : (worldX - s + 1) / s;
    int chunkZ = worldZ >= 0 ? worldZ / s : (worldZ - s + 1) / s;
    
    return {chunkX, chunkZ};
}

void World::WorldToLocal(int worldX, int worldZ, int& chunkX, int& chunkZ, int& localX, int& localZ) const {
    ChunkPos pos = WorldToChunk(worldX, worldZ);
    chunkX = pos.x;
    chunkZ = pos.z;
    
    int s = m_config.size;
    localX = worldX - (chunkX * s);
    localZ = worldZ - (chunkZ * s);
    
    // Ensure local coordinates are positive
    if (localX < 0) localX += s;
    if (localZ < 0) localZ += s;
}

} // namespace OreForged
