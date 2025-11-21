#include "Chunk.h"
#include <nlohmann/json.hpp>
#include <cmath>
#include <random>

using json = nlohmann::json;

namespace OreForged {

Chunk::Chunk(int chunkX, int chunkZ)
    : m_chunkX(chunkX)
    , m_chunkZ(chunkZ)
    , m_dirty(true)
{
    // Initialize all blocks to air
    for (int x = 0; x < SIZE; x++) {
        for (int y = 0; y < HEIGHT; y++) {
            for (int z = 0; z < SIZE; z++) {
                m_blocks[x][y][z].type = BlockType::Air;
            }
        }
    }
}

Block Chunk::GetBlock(int x, int y, int z) const {
    if (!IsValidPosition(x, y, z)) {
        return Block{BlockType::Air};
    }
    return m_blocks[x][y][z];
}

void Chunk::SetBlock(int x, int y, int z, BlockType type) {
    if (!IsValidPosition(x, y, z)) return;
    
    m_blocks[x][y][z].type = type;
    m_dirty = true;
}

bool Chunk::IsValidPosition(int x, int y, int z) const {
    return x >= 0 && x < SIZE &&
           y >= 0 && y < HEIGHT &&
           z >= 0 && z < SIZE;
}

void Chunk::Generate(uint32_t seed) {
    // Simple noise-based terrain generation
    std::mt19937 rng(seed + m_chunkX * 1000 + m_chunkZ);
    std::uniform_real_distribution<float> dist(0.0f, 1.0f);
    
    for (int x = 0; x < SIZE; x++) {
        for (int z = 0; z < SIZE; z++) {
            int worldX = m_chunkX * SIZE + x;
            int worldZ = m_chunkZ * SIZE + z;
            
            // Simple noise function (we'll improve this later with proper Perlin noise)
            float noise = dist(rng);
            float heightNoise = std::sin(worldX * 0.1f) * std::cos(worldZ * 0.1f);
            
            // Height varies from 3 to 5 (mostly flat)
            int height = 4 + static_cast<int>(heightNoise * 1.5f);
            height = std::max(3, std::min(5, height));
            
            // Build column from bottom to top
            m_blocks[x][0][z].type = BlockType::Bedrock; // Bedrock at bottom
            
            // Stone layer
            for (int y = 1; y < height - 1; y++) {
                m_blocks[x][y][z].type = BlockType::Stone;
            }
            
            // Dirt layer
            if (height > 1) {
                m_blocks[x][height - 1][z].type = BlockType::Dirt;
            }
            
            // Grass on top
            if (height < HEIGHT) {
                m_blocks[x][height][z].type = BlockType::Grass;
            }
            
            // Occasionally add water in low areas
            if (height == 3 && noise < 0.1f) {
                m_blocks[x][height][z].type = BlockType::Water;
            }
            
            // Everything above is air (already initialized)
        }
    }
    
    m_dirty = true;
}

std::string Chunk::Serialize() const {
    json data;
    data["chunkX"] = m_chunkX;
    data["chunkZ"] = m_chunkZ;
    
    // Flatten 3D array into 1D for efficient transmission
    std::vector<uint8_t> blocks;
    blocks.reserve(SIZE * HEIGHT * SIZE);
    
    for (int y = 0; y < HEIGHT; y++) {
        for (int z = 0; z < SIZE; z++) {
            for (int x = 0; x < SIZE; x++) {
                blocks.push_back(static_cast<uint8_t>(m_blocks[x][y][z].type));
            }
        }
    }
    
    data["blocks"] = blocks;
    data["size"] = SIZE;
    data["height"] = HEIGHT;
    
    return data.dump();
}

} // namespace OreForged
