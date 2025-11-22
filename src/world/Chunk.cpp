#include "Chunk.h"
#include <iostream>
#include <random>
#include <cmath>
#include <algorithm>

namespace OreForged {

Chunk::Chunk(int chunkX, int chunkZ) 
    : m_chunkX(chunkX), m_chunkZ(chunkZ) {
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
        return Block(); // Return air for out-of-bounds
    }
    return m_blocks[x][y][z];
}

void Chunk::SetBlock(int x, int y, int z, BlockType type) {
    if (IsValidPosition(x, y, z)) {
        m_blocks[x][y][z].type = type;
    }
}

bool Chunk::IsValidPosition(int x, int y, int z) const {
    return x >= 0 && x < SIZE &&
           y >= 0 && y < HEIGHT &&
           z >= 0 && z < SIZE;
}

// ============================================================================
// TERRAIN GENERATION - Island System with Noise
// ============================================================================

namespace {
    const int SEA_LEVEL = 5;
    const int MIN_HEIGHT = 2;
    const int MAX_HEIGHT = 12;
    const float ISLAND_RADIUS = 50.0f;
    
    // Simple hash-based noise function
    float noise2D(int x, int z, uint32_t seed) {
        uint32_t n = seed + x * 374761393 + z * 668265263;
        n = (n ^ (n >> 13)) * 1274126177;
        return ((n ^ (n >> 16)) & 0x7fffffff) / 2147483648.0f;
    }
    
    // Smooth noise with interpolation
    float smoothNoise(float x, float z, uint32_t seed) {
        int intX = static_cast<int>(x);
        int intZ = static_cast<int>(z);
        float fracX = x - intX;
        float fracZ = z - intZ;
        
        // Get corner values
        float v1 = noise2D(intX, intZ, seed);
        float v2 = noise2D(intX + 1, intZ, seed);
        float v3 = noise2D(intX, intZ + 1, seed);
        float v4 = noise2D(intX + 1, intZ + 1, seed);
        
        // Bilinear interpolation
        float i1 = v1 * (1 - fracX) + v2 * fracX;
        float i2 = v3 * (1 - fracX) + v4 * fracX;
        return i1 * (1 - fracZ) + i2 * fracZ;
    }
    
    // Multi-octave noise for natural terrain
    float multiOctaveNoise(float x, float z, uint32_t seed, int octaves) {
        float total = 0.0f;
        float frequency = 1.0f;
        float amplitude = 1.0f;
        float maxValue = 0.0f;
        
        for (int i = 0; i < octaves; i++) {
            total += smoothNoise(x * frequency, z * frequency, seed + i * 1000) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5f;
            frequency *= 2.0f;
        }
        
        return total / maxValue;
    }
    
    // Organic island falloff - irregular, natural shape
    float getIslandFalloff(int worldX, int worldZ) {
        // Base circular falloff
        float distance = std::sqrt(static_cast<float>(worldX * worldX + worldZ * worldZ));
        float baseRadius = 45.0f;
        
        if (distance > baseRadius + 15.0f) {
            return 0.0f;
        }
        
        // Add noise to make the island shape irregular
        float shapeNoise = noise2D(worldX / 15, worldZ / 15, 12345);
        float radiusVariation = (shapeNoise - 0.5f) * 20.0f; // +/- 10 blocks variation
        
        float effectiveRadius = baseRadius + radiusVariation;
        
        if (distance > effectiveRadius) {
            // Smooth falloff
            float fadeDistance = 15.0f;
            float falloff = 1.0f - ((distance - effectiveRadius) / fadeDistance);
            return std::max(0.0f, falloff);
        }
        
        return 1.0f;
    }
    
    // Calculate terrain height for a world position
    int calculateHeight(int worldX, int worldZ, uint32_t seed) {
        // Get island falloff
        float islandFalloff = getIslandFalloff(worldX, worldZ);
        
        if (islandFalloff < 0.05f) {
            return SEA_LEVEL - 1; // Deep water
        }
        
        // Layer 1: Large rolling hills (base terrain)
        float largeHills = multiOctaveNoise(worldX / 16.0f, worldZ / 16.0f, seed, 2);
        
        // Layer 2: Medium features (plateaus and valleys)
        float mediumFeatures = multiOctaveNoise(worldX / 8.0f, worldZ / 8.0f, seed + 1000, 2);
        
        // Layer 3: Small details
        float smallDetails = noise2D(worldX / 4, worldZ / 4, seed + 2000);
        
        // Combine layers with different weights
        float combinedNoise = largeHills * 0.5f + mediumFeatures * 0.3f + smallDetails * 0.2f;
        
        // Create some dramatic height variation
        // Center the noise around 0.5, then scale
        float heightFactor = (combinedNoise - 0.5f) * 2.0f; // -1 to +1
        
        // Apply island falloff to make edges lower
        heightFactor *= islandFalloff;
        
        // Add some "plateau" effect - flatten high areas slightly
        if (heightFactor > 0.3f) {
            heightFactor = 0.3f + (heightFactor - 0.3f) * 0.5f;
        }
        
        // Calculate final height
        // Sea level is 5, island ranges from 5 to 11 (6 blocks of variation)
        int height = SEA_LEVEL + static_cast<int>(heightFactor * 6.0f);
        
        // Ensure beaches exist - areas just above water should be flatter
        if (height == SEA_LEVEL || height == SEA_LEVEL + 1) {
            // Beach area - make it flatter
            float beachNoise = noise2D(worldX / 3, worldZ / 3, seed + 3000);
            if (beachNoise < 0.6f) {
                height = SEA_LEVEL + 1; // Flat beach
            }
        }
        
        return std::max(MIN_HEIGHT, std::min(MAX_HEIGHT, height));
    }
    
    // Check if position should be sand (beach)
    bool shouldBeSand(int worldX, int worldZ, int height, uint32_t seed) {
        // Only sand near water level
        if (height < SEA_LEVEL - 1 || height > SEA_LEVEL + 1) {
            return false;
        }
        
        // Check if near water (check neighbors)
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                if (dx == 0 && dz == 0) continue;
                int neighborHeight = calculateHeight(worldX + dx, worldZ + dz, seed);
                if (neighborHeight <= SEA_LEVEL) {
                    return true; // Near water
                }
            }
        }
        
        return false;
    }
}

void Chunk::Generate(uint32_t seed) {
    std::cout << "Chunk::Generate(" << m_chunkX << "," << m_chunkZ << ") using seed: " << seed << std::endl;
    
    for (int x = 0; x < SIZE; x++) {
        for (int z = 0; z < SIZE; z++) {
            int worldX = m_chunkX * SIZE + x;
            int worldZ = m_chunkZ * SIZE + z;
            
            // Calculate terrain height
            int height = calculateHeight(worldX, worldZ, seed);
            
            // Determine surface block type
            bool isSand = shouldBeSand(worldX, worldZ, height, seed);
            BlockType surfaceType = isSand ? BlockType::Sand : BlockType::Grass;
            
            // Build column from bottom to top
            m_blocks[x][0][z].type = BlockType::Bedrock; // Bedrock at bottom
            
            // Stone layer (underground) - reduced by 1
            for (int y = 1; y < height - 1 && y < HEIGHT; y++) {
                m_blocks[x][y][z].type = BlockType::Stone;
            }
            
            // Dirt layer (just below surface) - only 1 layer now
            if (height > 1 && height - 1 < HEIGHT) {
                m_blocks[x][height - 1][z].type = BlockType::Dirt;
            }
            
            // Surface block
            if (height < HEIGHT) {
                m_blocks[x][height][z].type = surfaceType;
            }
            
            // Fill with water if below sea level
            for (int y = height + 1; y <= SEA_LEVEL && y < HEIGHT; y++) {
                m_blocks[x][y][z].type = BlockType::Water;
            }
        }
    }
}

std::string Chunk::Serialize() const {
    std::string json = "{";
    json += "\"chunkX\":" + std::to_string(m_chunkX) + ",";
    json += "\"chunkZ\":" + std::to_string(m_chunkZ) + ",";
    json += "\"size\":" + std::to_string(SIZE) + ",";
    json += "\"height\":" + std::to_string(HEIGHT) + ",";
    json += "\"blocks\":[";
    
    // Flatten 3D array to 1D: index = y * SIZE * SIZE + z * SIZE + x
    bool first = true;
    for (int y = 0; y < HEIGHT; y++) {
        for (int z = 0; z < SIZE; z++) {
            for (int x = 0; x < SIZE; x++) {
                if (!first) json += ",";
                json += std::to_string(static_cast<int>(m_blocks[x][y][z].type));
                first = false;
            }
        }
    }
    
    json += "]}";
    return json;
}

} // namespace OreForged

