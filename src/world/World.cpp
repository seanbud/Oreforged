#include "World.h"

namespace OreForged {

World::World(uint32_t seed)
    : m_seed(seed)
{
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
    
    auto chunk = std::make_unique<Chunk>(chunkX, chunkZ);
    chunk->Generate(m_seed);
    
    m_chunks[pos] = std::move(chunk);
}

void World::LoadChunksAroundPosition(int centerChunkX, int centerChunkZ, int radius) {
    for (int x = centerChunkX - radius; x <= centerChunkX + radius; x++) {
        for (int z = centerChunkZ - radius; z <= centerChunkZ + radius; z++) {
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

ChunkPos World::WorldToChunk(int worldX, int worldZ) {
    // Integer division (rounds toward zero)
    // We want floor division for negative coordinates
    int chunkX = worldX >= 0 ? worldX / Chunk::SIZE : (worldX - Chunk::SIZE + 1) / Chunk::SIZE;
    int chunkZ = worldZ >= 0 ? worldZ / Chunk::SIZE : (worldZ - Chunk::SIZE + 1) / Chunk::SIZE;
    
    return {chunkX, chunkZ};
}

void World::WorldToLocal(int worldX, int worldZ, int& chunkX, int& chunkZ, int& localX, int& localZ) {
    ChunkPos pos = WorldToChunk(worldX, worldZ);
    chunkX = pos.x;
    chunkZ = pos.z;
    
    localX = worldX - (chunkX * Chunk::SIZE);
    localZ = worldZ - (chunkZ * Chunk::SIZE);
    
    // Ensure local coordinates are positive
    if (localX < 0) localX += Chunk::SIZE;
    if (localZ < 0) localZ += Chunk::SIZE;
}

} // namespace OreForged
