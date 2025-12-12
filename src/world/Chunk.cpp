#include "Chunk.h"
#include <iostream>
#include <random>
#include <cmath>
#include <algorithm>
#include <vector>
#include <tuple>

namespace OreForged {

Chunk::Chunk(int chunkX, int chunkZ, int size, int height) 
    : m_chunkX(chunkX), m_chunkZ(chunkZ), m_size(size), m_height(height) {
    // Initialize blocks vector
    m_blocks.resize(size * height * size);
    // Default constructor of Block sets type to Air (0)
}

// Indexing: y * (size*size) + z * size + x
// Y-outer, Z-middle, X-inner
int GetIndex(int x, int y, int z, int size) {
    return y * size * size + z * size + x;
}

Block Chunk::GetBlock(int x, int y, int z) const {
    if (!IsValidPosition(x, y, z)) {
        return Block(); // Return air
    }
    return m_blocks[GetIndex(x, y, z, m_size)];
}

void Chunk::SetBlock(int x, int y, int z, BlockType type) {
    if (IsValidPosition(x, y, z)) {
        m_blocks[GetIndex(x, y, z, m_size)].type = type;
    }
}

bool Chunk::IsValidPosition(int x, int y, int z) const {
    return x >= 0 && x < m_size &&
           y >= 0 && y < m_height &&
           z >= 0 && z < m_size;
}

// ============================================================================
// TERRAIN GENERATION
// ============================================================================

namespace {
    const int SEA_LEVEL = 8;
    const int MIN_HEIGHT = 2;
    // MAX_HEIGHT depends on m_height now, dynamic
    const float ISLAND_RADIUS = 35.0f;
    
    // Simple hash-based noise function
    float noise2D(int x, int z, uint32_t seed) {
        uint32_t n = seed + x * 374761393 + z * 668265263;
        n = (n ^ (n >> 13)) * 1274126177;
        return ((n ^ (n >> 16)) & 0x7fffffff) / 2147483648.0f;
    }
    
    // Smooth noise
    float smoothNoise(float x, float z, uint32_t seed) {
        int intX = static_cast<int>(x);
        int intZ = static_cast<int>(z);
        float fracX = x - intX;
        float fracZ = z - intZ;
        
        float v1 = noise2D(intX, intZ, seed);
        float v2 = noise2D(intX + 1, intZ, seed);
        float v3 = noise2D(intX, intZ + 1, seed);
        float v4 = noise2D(intX + 1, intZ + 1, seed);
        
        float i1 = v1 * (1 - fracX) + v2 * fracX;
        float i2 = v3 * (1 - fracX) + v4 * fracX;
        return i1 * (1 - fracZ) + i2 * fracZ;
    }
    
    // Multi-octave
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
    // Island radial falloff (for small chunk sizes loaded in 5x5 grids)
    float getIslandFalloff(int worldX, int worldZ, int chunkSize, float islandFactor) {
        // For small chunks, we load a 5x5 grid centered at chunk (0,0)
        // Center the island at world coordinates (0, 0) for symmetry
        float centerX = 0.0f;
        float centerZ = 0.0f;
        
        float dx = worldX - centerX;
        float dz = worldZ - centerZ;
        float distFromCenter = std::sqrt(dx*dx + dz*dz);
        
        // Scale radius to account for multi-chunk loading (5x5 grid)
        // For a 5x5 grid, we want the radius to be ~2.5 chunks from center
        float baseRadius = chunkSize * 2.5f * islandFactor; // Radius in world blocks
        
        if (distFromCenter > baseRadius + (chunkSize * 0.2f)) return 0.0f;
        
        // Noise for shape variation
        float shapeNoise = noise2D(worldX, worldZ, 12345);
        float radiusVariation = (shapeNoise - 0.5f) * (chunkSize * 0.2f);
        float effectiveRadius = baseRadius + radiusVariation;
        
        if (distFromCenter > effectiveRadius) {
            float fadeDist = chunkSize * 0.2f; // Fade over 20% size
            float falloff = 1.0f - ((distFromCenter - effectiveRadius) / fadeDist);
            return std::max(0.0f, falloff);
        }
        return 1.0f;
    }
    
    // Global Island Logic
    int calculateHeight(int worldX, int worldZ, uint32_t seed, int chunkHeight, int chunkSize, int localX, int localZ, float islandFactor) {
        float islandFalloff = 1.0f;
        
        // For standard worlds (Size 32+), create a LARGE island centered at (16,16)
        // that spans across neighbor chunks (Radius ~70-80 blocks)
        if (chunkSize >= 32) {
             float centerX = chunkSize / 2.0f; // Approx center of chunk 0,0
             float centerZ = chunkSize / 2.0f;
             
             // worldX/Z are correct global coords.
             float dx = worldX - centerX;
             float dz = worldZ - centerZ;
             float dist = std::sqrt(dx*dx + dz*dz);
             
             // Scale island to be large relative to chunk size, but fit within 5x5 view
             // View radius = 2.5 chunks. 
             // Factor 2.25 creates island almost reaching the edge (2.25 < 2.5)
             float maxRadius = chunkSize * 2.25f;
             
             if (dist > maxRadius + 10.0f) {
                 return SEA_LEVEL - 1; // Deep ocean
             }
             
             if (dist > maxRadius) {
                 float fade = (dist - maxRadius) / 10.0f;
                 islandFalloff = 1.0f - fade;
             }
        }
        else if (chunkSize < 23) {
            // Standard scaling islands (up to Level 12, Size 22)
            islandFalloff = getIslandFalloff(worldX, worldZ, chunkSize, islandFactor);
            if (islandFalloff < 0.05f) return SEA_LEVEL - 1;
        }
        
        // Terrain Layers
        float largeHills = multiOctaveNoise(worldX / 16.0f, worldZ / 16.0f, seed, 2);
        float mediumFeatures = multiOctaveNoise(worldX / 8.0f, worldZ / 8.0f, seed + 1000, 2);
        float smallDetails = noise2D(worldX / 4, worldZ / 4, seed + 2000);
        
        float combinedNoise = largeHills * 0.5f + mediumFeatures * 0.3f + smallDetails * 0.2f;
        float heightFactor = (combinedNoise - 0.5f) * 2.0f; // -1 to +1
        heightFactor *= islandFalloff;
        
        // Scale height variation with island size (smaller islands = flatter)
        heightFactor *= islandFactor;
        
        // Flatten tops
        if (heightFactor > 0.3f) {
            heightFactor = 0.3f + (heightFactor - 0.3f) * 0.5f; 
        }
        
        // Base Height calculation - flatter for small islands
        float hRatio = chunkHeight / 32.0f;
        float varianceScale = (hRatio < 1.0f) ? hRatio : 1.0f;
        // Reduce base height variation (was 5.0f)
        int height = SEA_LEVEL + 1 + static_cast<int>(heightFactor * 3.0f * varianceScale);
        
        // Pillars/Towers - only on larger islands (islandFactor > 0.5)
        if (islandFactor > 0.5f) {
            float towerNoise = smoothNoise(worldX / 5.0f, worldZ / 5.0f, seed + 8888);
            if (towerNoise > 0.90f) { 
                float towerH = (towerNoise - 0.90f) * 15.0f * varianceScale * islandFactor;
                height += static_cast<int>(towerH);
            } else if (towerNoise > 0.80f) {
                 height += 1;
            }
        }

        // Beach - only at edges near water
        if (height == SEA_LEVEL + 1 || height == SEA_LEVEL + 2) {
            float beachNoise = noise2D(worldX / 3, worldZ / 3, seed + 3000);
            if (beachNoise < 0.45f) height = SEA_LEVEL;
        }
        
        return std::max(MIN_HEIGHT, height);
    }
    
    bool shouldBeSand(int worldX, int worldZ, int height, uint32_t seed) {
        // ONLY exact sea level is sand (beaches)
        if (height != SEA_LEVEL) return false;
        return true; 
    }
}

void Chunk::Generate(uint32_t seed, float oreMult, float treeMult, float islandFactor) {
    // Determine effective max height (leave 1 block for trees/player?)
    const int GEN_MAX_HEIGHT = std::min(30, m_height - 1); 

    for (int x = 0; x < m_size; x++) {
        for (int z = 0; z < m_size; z++) {
            int worldX = m_chunkX * m_size + x; // Use m_size for coordinate projection
            int worldZ = m_chunkZ * m_size + z;
            
            // Note: If size changes, the world coordinates scale differently if we use 
            // chunkX * size. This matches "Smaller Levels" visually.
            
            int height = calculateHeight(worldX, worldZ, seed, m_height, m_size, x, z, islandFactor);
            height = std::min(height, GEN_MAX_HEIGHT);

            bool isSand = shouldBeSand(worldX, worldZ, height, seed);
            BlockType surfaceType = isSand ? BlockType::Sand : BlockType::Grass;
            
            // Fix: Underwater surface should be Sand or Stone, not Grass
            if (height <= SEA_LEVEL) {
                 surfaceType = BlockType::Sand; // Or Gravel/Stone
            }
            // VISUAL UPGRADE: Energy (Height) > 5 exposes more rock
            // High energy worlds are more mountainous/rugged
            else if (m_height > 40) { // Energy ~4+
                 float rockExposureNoise = noise2D(worldX, worldZ, seed + 4444);
                 // The higher the world, the more rock exposed
                 float threshold = 0.7f - ((m_height - 40) * 0.02f); 
                 if (rockExposureNoise > threshold) {
                     surfaceType = BlockType::Stone;
                 }
            }
            
            // Fill
            SetBlock(x, 0, z, BlockType::Bedrock);
            
            for (int y = 1; y < height - 1 && y < m_height; y++) {
                SetBlock(x, y, z, BlockType::Stone);
            }
            if (height > 1 && height - 1 < m_height) {
                SetBlock(x, height - 1, z, BlockType::Dirt);
            }
            if (height < m_height) {
                SetBlock(x, height, z, surfaceType);
            }
            
            // Water
            for (int y = height + 1; y <= SEA_LEVEL && y < m_height; y++) {
                SetBlock(x, y, z, BlockType::Water);
            }
            
            // VISUAL UPGRADE: Ore Find sprinkles loose rocks on surface
            if (surfaceType == BlockType::Grass && height > SEA_LEVEL && height + 1 < m_height) {
                float surfaceRockNoise = noise2D(worldX, worldZ, seed + 5555);
                // Chance scales with Ore Mult (1% to 5% ish)
                if (surfaceRockNoise < (0.01f * oreMult)) {
                    SetBlock(x, height + 1, z, BlockType::Stone);
                }
            }
        }
    }
    
    GenerateOres(seed, oreMult);
    GenerateTrees(seed, treeMult);
}

void Chunk::GenerateOres(uint32_t seed, float oreMult) {
    // Track counts for guarantees
    int coalCount = 0, ironCount = 0, goldCount = 0, diamondCount = 0;
    
    auto getThresh = [&](float baseFreq) {
        float freq = baseFreq * oreMult;
        return 1.0f - freq;
    };

    // Natural generation pass
    for (int x = 0; x < m_size; x++) {
        for (int z = 0; z < m_size; z++) {
            int surfaceY = FindSurfaceY(x, z);
            if (surfaceY < 0 || GetBlock(x, surfaceY, z).type != BlockType::Grass) continue;
            if (surfaceY + 1 >= m_height) continue;
            
            int worldX = m_chunkX * m_size + x;
            int worldZ = m_chunkZ * m_size + z;
            
            float oreNoise = noise2D(worldX, worldZ, seed + 6000);
            
            if (oreNoise > getThresh(0.001f)) {        // 0.1% Diamond
                SetBlock(x, surfaceY + 1, z, BlockType::Diamond);
                diamondCount++;
            } else if (oreNoise > getThresh(0.004f)) { // 0.4% Gold
                SetBlock(x, surfaceY + 1, z, BlockType::Gold);
                goldCount++;
            } else if (oreNoise > getThresh(0.01f)) {  // 1.0% Iron
                SetBlock(x, surfaceY + 1, z, BlockType::Iron);
                ironCount++;
            } else if (oreNoise > getThresh(0.02f)) {  // 2.0% Coal (Sprinkling)
                 SetBlock(x, surfaceY + 1, z, BlockType::Coal);
                 coalCount++;
            }
        }
    }
    
    // Guarantee minimums
    // Guarantee minimums - Use CHUNK SEED to prevent grid patterns
    uint32_t chunkSeed = seed + (m_chunkX * 4567) ^ (m_chunkZ * 8901);
    
    auto placeOre = [&](BlockType ore, int needed) {
        for (int i = 0; i < needed; i++) {
            for (int attempt = 0; attempt < 20; attempt++) {
                int rx = (noise2D(i, attempt, chunkSeed + 7000) * 0.5f + 0.5f) * m_size;
                int rz = (noise2D(attempt, i, chunkSeed + 7001) * 0.5f + 0.5f) * m_size;
                rx = std::max(0, std::min(m_size - 1, rx));
                rz = std::max(0, std::min(m_size - 1, rz));
                
                int sy = FindSurfaceY(rx, rz);
                
                // Only place on land?
                if (sy < SEA_LEVEL) continue; // Prevent underwater ores
                
                if (sy >= 0 && sy + 1 < m_height) {
                    if (GetBlock(rx, sy, rz).type == BlockType::Grass) {
                        SetBlock(rx, sy + 1, rz, ore);
                        break;
                    }
                }
            }
        }
    };
    
    if (coalCount < 1) placeOre(BlockType::Coal, 2);
    if (ironCount < 3) placeOre(BlockType::Iron, 3 - ironCount);
    if (goldCount < 1) placeOre(BlockType::Gold, 1);
    
    // 30% chance for diamond if none generated
    if (diamondCount == 0) {
        float dRoll = noise2D(seed, seed + 123, seed + 456) * 0.5f + 0.5f;
        if (dRoll < 0.3f) {
            placeOre(BlockType::Diamond, 1);
        }
    }
}

void Chunk::GenerateTrees(uint32_t seed, float treeMult) {
    int treeCount = 0;
    
    // Guarantee minimum 15 trees regardless of size
    // Simple "Sprinkling" Logic - No zones, just random chance
    // Iterate FULL chunk (no margins) to prevent grid lines
    for (int x = 0; x < m_size; x++) {
        for (int z = 0; z < m_size; z++) {
            int surfaceY = FindSurfaceY(x, z);
            if (surfaceY < 0 || GetBlock(x, surfaceY, z).type != BlockType::Grass) continue;
            
            // Ensure tree is ON LAND (Above Sea Level)
            if (surfaceY < SEA_LEVEL) continue;
            
            int worldX = m_chunkX * m_size + x;
            int worldZ = m_chunkZ * m_size + z;
            
            float treeNoise = noise2D(worldX, worldZ, seed + 5000);
            
            // Base chance 5% + modifier (Boosted from 2% to ensure trees on island)
            float chance = 0.05f * treeMult;
            
            if (treeNoise < (1.0f - chance)) continue;
            
            float heightNoise = noise2D(worldX, worldZ, seed + 1234);
            int trunkHeight = 3;
            if (heightNoise > 0.90f) trunkHeight = 4;
            else if (heightNoise < 0.30f) trunkHeight = 2;
            
            if (surfaceY + trunkHeight + 3 >= m_height) continue;
            
            PlaceTree(x, surfaceY + 1, z, trunkHeight);
            treeCount++;
        }
    }
    
    // Guarantee minimum 15 trees regardless of size
    // Use CHUNK-SPECIFIC SEED to avoid repeating patterns
    int minTrees = 15;
    if (treeCount < minTrees) {
        uint32_t chunkSeed = seed + (m_chunkX * 73856093) ^ (m_chunkZ * 19349663);
        
        for (int i = 0; i < minTrees - treeCount; i++) {
            for (int attempt = 0; attempt < 30; attempt++) {
                int rx = 2 + static_cast<int>((noise2D(i, attempt, chunkSeed + 8000) * 0.5f + 0.5f) * (m_size - 5));
                int rz = 2 + static_cast<int>((noise2D(attempt, i, chunkSeed + 8001) * 0.5f + 0.5f) * (m_size - 5));
                
                int sy = FindSurfaceY(rx, rz);
                
                // Ensure on land
                if (sy < SEA_LEVEL) continue;
                
                if (sy >= 0 && sy + 6 < m_height) {
                    if (GetBlock(rx, sy, rz).type == BlockType::Grass) {
                        PlaceTree(rx, sy + 1, rz, 3);
                        break;
                    }
                }
            }
        }
    }
}

void Chunk::PlaceTree(int x, int baseY, int z, int trunkHeight) {
    for (int y = 0; y < trunkHeight; y++) {
        SetBlock(x, baseY + y, z, BlockType::Wood);
    }
    
    int topY = baseY + trunkHeight;
    // Leaves... (Simplified reuse of logic)
    // Bottom Ring
    for (int dx = -1; dx <= 1; dx++) {
        for (int dz = -1; dz <= 1; dz++) {
            if (dx == 0 && dz == 0) continue;
            int ly = topY - 1;
            if (IsValidPosition(x + dx, ly, z + dz)) {
                if (GetBlock(x+dx,ly,z+dz).type == BlockType::Air) SetBlock(x+dx,ly,z+dz, BlockType::Leaves);
            }
        }
    }
    // Top Layer
    for (int dx = -1; dx <= 1; dx++) {
        for (int dz = -1; dz <= 1; dz++) {
            if (IsValidPosition(x + dx, topY, z + dz)) {
                 if (GetBlock(x+dx,topY,z+dz).type == BlockType::Air) SetBlock(x+dx,topY,z+dz, BlockType::Leaves);
            }
        }
    }
    // Top
    if (IsValidPosition(x, topY+1, z)) SetBlock(x, topY+1, z, BlockType::Leaves);
}

int Chunk::FindSurfaceY(int x, int z) const {
    for (int y = m_height - 1; y >= 0; y--) {
        Block b = GetBlock(x, y, z);
        if (b.type != BlockType::Air && b.type != BlockType::Water) return y;
    }
    return -1;
}

std::string Chunk::Serialize() const {
    std::string json = "{";
    json += "\"chunkX\":" + std::to_string(m_chunkX) + ",";
    json += "\"chunkZ\":" + std::to_string(m_chunkZ) + ",";
    json += "\"size\":" + std::to_string(m_size) + ",";
    json += "\"height\":" + std::to_string(m_height) + ",";
    json += "\"blocks\":[";
    
    // Flatten 3D array to 1D: index = y * size * size + z * size + x
    // Our vector is already in this order!
    bool first = true;
    for (const auto& block : m_blocks) {
        if (!first) json += ",";
        json += std::to_string(static_cast<int>(block.type));
        first = false;
    }
    
    json += "]}";
    return json;
}

} // namespace OreForged
