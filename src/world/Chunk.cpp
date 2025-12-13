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
        float baseRadius = chunkSize * 2.5f * islandFactor;
        
        // Multi-octave noise for organic, natural edges
        float largeWaves = smoothNoise(worldX / 8.0f, worldZ / 8.0f, 12345) * 0.5f;
        float mediumWaves = smoothNoise(worldX / 4.0f, worldZ / 4.0f, 12345 + 1000) * 0.3f;
        float smallWaves = noise2D(worldX / 2, worldZ / 2, 12345 + 2000) * 0.2f;
        
        float shapeNoise = largeWaves + mediumWaves + smallWaves;
        float radiusVariation = (shapeNoise - 0.5f) * (chunkSize * 0.35f); // Increased variation
        float effectiveRadius = baseRadius + radiusVariation;
        
        if (distFromCenter > effectiveRadius + (chunkSize * 0.3f)) return 0.0f;
        
        if (distFromCenter > effectiveRadius) {
            // Smooth exponential falloff for natural beaches
            float fadeDist = chunkSize * 0.3f;
            float falloff = (effectiveRadius + fadeDist - distFromCenter) / fadeDist;
            falloff = falloff * falloff; // Quadratic for smoother transition
            return std::max(0.0f, std::min(1.0f, falloff));
        }
        return 1.0f;
    }
    
    // Global Island Logic
    int calculateHeight(int worldX, int worldZ, uint32_t seed, int chunkHeight, int chunkSize, int localX, int localZ, float islandFactor, float oreMult) {
        float islandFalloff = 1.0f;
        
        // For standard worlds (Size 32+), create a LARGE island centered at (16,16)
        if (chunkSize >= 32) {
             float centerX = chunkSize / 2.0f;
             float centerZ = chunkSize / 2.0f;
             
             float dx = worldX - centerX;
             float dz = worldZ - centerZ;
             float dist = std::sqrt(dx*dx + dz*dz);
             
             float maxRadius = chunkSize * 2.25f;
             
             if (dist > maxRadius + 10.0f) {
                 return SEA_LEVEL - 1;
             }
             
             if (dist > maxRadius) {
                 float fade = (dist - maxRadius) / 10.0f;
                 islandFalloff = 1.0f - fade;
             }
        }
        else if (chunkSize < 23) {
            islandFalloff = getIslandFalloff(worldX, worldZ, chunkSize, islandFactor);
            if (islandFalloff < 0.05f) return SEA_LEVEL - 1;
        }
        
        // Smooth multi-octave noise
        float largeFeatures = smoothNoise(worldX / 20.0f, worldZ / 20.0f, seed);
        float mediumFeatures = smoothNoise(worldX / 10.0f, worldZ / 10.0f, seed + 1000) * 0.5f;
        float smallDetails = smoothNoise(worldX / 5.0f, worldZ / 5.0f, seed + 2000) * 0.25f;
        
        float combinedNoise = largeFeatures + mediumFeatures + smallDetails;
        float maxValue = 1.0f + 0.5f + 0.25f;
        combinedNoise = combinedNoise / maxValue;
        
        float heightFactor = (combinedNoise - 0.5f) * 2.0f; // -1 to +1
        heightFactor *= islandFalloff;
        heightFactor *= islandFactor;
        
        // Soften peaks
        if (heightFactor > 0.4f) {
            heightFactor = 0.4f + (heightFactor - 0.4f) * 0.3f; 
        }
        
        // Aggressive variance boost - starts very early
        float varianceBoost = 1.0f;
        if (islandFactor > 0.15f) {
            // Start variance at level 1, scale up but cap for large islands
            float scaleFactor = (islandFactor - 0.15f) * 4.5f;
            // Cap the boost at level 6+ to prevent too much mountainousness
            if (islandFactor > 0.45f) {
                scaleFactor = (0.45f - 0.15f) * 4.5f + (islandFactor - 0.45f) * 2.0f;
            }
            varianceBoost += scaleFactor;
        }
        if (oreMult > 1.5f && islandFactor > 0.2f) {
            // Ore adds complexity early
            varianceBoost += (oreMult - 1.5f) * 1.25f;
        }
        
        // Natural height calculation - more dramatic terrain
        float hRatio = chunkHeight / 32.0f;
        float varianceScale = (hRatio < 1.0f) ? hRatio : 1.0f;
        int height = SEA_LEVEL + 1 + static_cast<int>(heightFactor * 5.5f * varianceScale * varianceBoost);
        
        // Center height boost for small-mid+ islands - creates natural elevation
        if (islandFactor > 0.15f) {
            // Use seed-based randomness for consistent variation
            float ellipseScaleX = 0.8f + (noise2D(seed, seed + 1111, seed + 2222) * 0.5f + 0.5f) * 0.4f; // 0.8 to 1.2
            float ellipseScaleZ = 0.8f + (noise2D(seed + 3333, seed + 4444, seed + 5555) * 0.5f + 0.5f) * 0.4f; // 0.8 to 1.2
            
            // Random offset from center (up to 25% of island size)
            float islandRadius = chunkSize * 2.5f * islandFactor;
            float offsetX = (noise2D(seed + 6666, seed + 7777, seed + 8888) * 2.0f - 1.0f) * islandRadius * 0.25f;
            float offsetZ = (noise2D(seed + 9999, seed + 1010, seed + 1212) * 2.0f - 1.0f) * islandRadius * 0.25f;
            
            // Random rotation angle
            float angle = (noise2D(seed + 1313, seed + 1414, seed + 1515) * 0.5f + 0.5f) * 3.14159f * 2.0f;
            float cosA = std::cos(angle);
            float sinA = std::sin(angle);
            
            // Transform world coords to plateau-local coords
            float dx = worldX - offsetX;
            float dz = worldZ - offsetZ;
            
            // Rotate
            float rotatedX = dx * cosA - dz * sinA;
            float rotatedZ = dx * sinA + dz * cosA;
            
            // Apply ellipse scaling
            float ellipseDist = std::sqrt((rotatedX * rotatedX) / (ellipseScaleX * ellipseScaleX) + 
                                          (rotatedZ * rotatedZ) / (ellipseScaleZ * ellipseScaleZ));
            
            // For levels 2-3, create expanding plateau with smooth tapering
            if (islandFactor >= 0.15f && islandFactor <= 0.35f) {
                float plateauRadius = islandRadius * 0.4f;
                
                if (ellipseDist < plateauRadius) {
                    // Flat top of plateau
                    float boost = 2.0f + (islandFactor - 0.15f) * 6.0f;
                    height += static_cast<int>(boost);
                } else if (ellipseDist < islandRadius * 0.7f) {
                    // Smooth exponential rolloff for natural slopes
                    float slopeFactor = (islandRadius * 0.7f - ellipseDist) / (islandRadius * 0.7f - plateauRadius);
                    slopeFactor = slopeFactor * slopeFactor; // Quadratic for gentler slope
                    float boost = (2.0f + (islandFactor - 0.15f) * 6.0f) * slopeFactor;
                    height += static_cast<int>(boost);
                }
                
                // Add occasional secondary "mini island on top" for levels 3-5
                if (islandFactor >= 0.24f && islandFactor <= 0.39f) {
                    float secondaryChance = noise2D(seed + 2020, seed + 2121, seed + 2222) * 0.5f + 0.5f;
                    if (secondaryChance > 0.6f) { // 40% chance
                        // Random secondary peak location (near center)
                        float secOffsetX = (noise2D(seed + 3030, seed + 3131, seed) * 2.0f - 1.0f) * plateauRadius * 0.5f;
                        float secOffsetZ = (noise2D(seed + 4040, seed + 4141, seed) * 2.0f - 1.0f) * plateauRadius * 0.5f;
                        
                        float secDx = worldX - (offsetX + secOffsetX);
                        float secDz = worldZ - (offsetZ + secOffsetZ);
                        float secDist = std::sqrt(secDx * secDx + secDz * secDz);
                        
                        // Small secondary peak
                        float secRadius = plateauRadius * 0.3f;
                        if (secDist < secRadius) {
                            float secFactor = 1.0f - (secDist / secRadius);
                            secFactor = secFactor * secFactor; // Smooth peak
                            float secBoost = secFactor * 3.0f; // Up to +3 blocks
                            height += static_cast<int>(secBoost);
                        }
                    }
                }
            } else {
                // Standard center boost for larger islands
                if (ellipseDist < islandRadius * 0.7f) {
                    float centerFactor = 1.0f - (ellipseDist / (islandRadius * 0.7f));
                    float boostMult = (islandFactor > 0.5f) ? 12.0f : 15.0f;
                    float boost = centerFactor * centerFactor * (islandFactor - 0.15f) * boostMult;
                    height += static_cast<int>(boost);
                }
            }
        }
        
        // Add plateaus on larger islands (level 6+) for flat areas
        if (islandFactor > 0.45f) {
            float plateauNoise = smoothNoise(worldX / 8.0f, worldZ / 8.0f, seed + 9999);
            // Create flat areas in broader zones (expanded from 0.6-0.8 to 0.55-0.85)
            if (plateauNoise > 0.55f && plateauNoise < 0.85f) {
                // Flatten to a moderate height
                int targetHeight = SEA_LEVEL + 3 + static_cast<int>((islandFactor - 0.45f) * 4.0f);
                if (height > targetHeight + 3) {
                    // Smoothly flatten
                    height = targetHeight + static_cast<int>((height - targetHeight) * 0.3f);
                }
            }
        }
        
        // Towers on mid-large islands
        if (islandFactor > 0.45f) {
            float towerNoise = smoothNoise(worldX / 5.0f, worldZ / 5.0f, seed + 8888);
            if (towerNoise > 0.88f) { 
                float towerH = (towerNoise - 0.88f) * 18.0f * varianceScale * islandFactor;
                height += static_cast<int>(towerH);
            } else if (towerNoise > 0.78f) {
                 height += 1;
            }
        }

        // Natural beach transitions - multi-octave for organic shapes
        if (height == SEA_LEVEL + 1 || height == SEA_LEVEL + 2) {
            // Multi-layer noise for organic beach patterns
            float beachLarge = smoothNoise(worldX / 6.0f, worldZ / 6.0f, seed + 3000) * 0.6f;
            float beachMedium = smoothNoise(worldX / 3.0f, worldZ / 3.0f, seed + 3100) * 0.3f;
            float beachSmall = noise2D(worldX, worldZ, seed + 3200) * 0.1f;
            
            float beachNoise = beachLarge + beachMedium + beachSmall;
            
            // More varied threshold - creates irregular beach patterns
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
            
            int height = calculateHeight(worldX, worldZ, seed, m_height, m_size, x, z, islandFactor, oreMult);
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
    int coalCount = 0, ironCount = 0, bronzeCount = 0, goldCount = 0, diamondCount = 0;
    
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
            
            // Ore Find Scaling: Boost effectiveness exponentially for higher tiers
            // oreMult starts at 1.0. 
            // Level 0 (1.0) -> Base rates
            // Level 10 (~6.0) -> High saturation
            
            float effectiveMult = oreMult;
            
            // Higher tiers benefit MORE from the multiplier
            float ironProb = 0.008f * std::pow(effectiveMult, 1.1f);
            float bronzeProb = 0.016f * std::pow(effectiveMult, 1.0f); 
            float goldProb = 0.004f * std::pow(effectiveMult, 1.3f);
            float diamondProb = 0.001f * std::pow(effectiveMult, 1.5f);
            
            // Cap at reasonable max (e.g. 10%)
            ironProb = std::min(0.2f, ironProb);
            goldProb = std::min(0.1f, goldProb);
            diamondProb = std::min(0.05f, diamondProb);

            if (oreNoise > (1.0f - diamondProb)) {
                SetBlock(x, surfaceY + 1, z, BlockType::Diamond);
                diamondCount++;
            } else if (oreNoise > (1.0f - goldProb - diamondProb)) {
                SetBlock(x, surfaceY + 1, z, BlockType::Gold);
                goldCount++;
            } else if (oreNoise > (1.0f - ironProb - goldProb - diamondProb)) {
                SetBlock(x, surfaceY + 1, z, BlockType::Iron);
                ironCount++;
            } else if (oreNoise > (1.0f - bronzeProb - ironProb - goldProb - diamondProb)) {
                 // Bronze is common base
                SetBlock(x, surfaceY + 1, z, BlockType::Bronze);
                bronzeCount++;
            } else if (oreNoise > getThresh(0.03f)) { // Coal remains common
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
    if (bronzeCount < 2) placeOre(BlockType::Bronze, 2);
    if (ironCount < 2) placeOre(BlockType::Iron, 2);
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
    
    // Natural tree spawning across all chunks
    for (int x = 0; x < m_size; x++) {
        for (int z = 0; z < m_size; z++) {
            int surfaceY = FindSurfaceY(x, z);
            if (surfaceY < SEA_LEVEL || GetBlock(x, surfaceY, z).type != BlockType::Grass) continue;
            
            int worldX = m_chunkX * m_size + x;
            int worldZ = m_chunkZ * m_size + z;
            
            float treeNoise = noise2D(worldX, worldZ, seed + 5000);
            float chance = 0.05f * treeMult;
            
            if (treeNoise > (1.0f - chance)) {
                float heightNoise = noise2D(worldX, worldZ, seed + 1234);
                int trunkHeight = 3;
                if (heightNoise > 0.90f) trunkHeight = 4;
                else if (heightNoise < 0.30f) trunkHeight = 2;
                
                if (surfaceY + trunkHeight + 3 < m_height) {
                    PlaceTree(x, surfaceY + 1, z, trunkHeight);
                    treeCount++;
                }
            }
        }
    }
    
    // Only center chunk enforces tree count
    if (m_chunkX == 0 && m_chunkZ == 0) {
        uint32_t chunkSeed = seed + 98765;
        
        // Exact target counts based on tree level
        // Level 0: 2, Level 1: 3, Level 2: 4, Level 3: 5, Level 4: 7, Level 5: 10
        int targetTrees = 2;
        if (treeMult >= 3.0f) targetTrees = 7 + (treeMult - 3.0f) * 3; // Level 4+: 7, 10, 13...
        else if (treeMult >= 2.5f) targetTrees = 5 + (treeMult - 2.5f) * 4; // Level 3: 5
        else targetTrees = 2 + (treeMult - 1.0f) * 2; // Levels 0-2: 2, 3, 4
        
        int bonusHeight = 0; // Extra trunk height if we can't place all trees
        int failedPlacements = 0;
        
        for (int i = treeCount; i < targetTrees && i < 30; i++) {
            bool placed = false;
            
            for (int attempt = 0; attempt < 50; attempt++) {
                int rx = 1 + static_cast<int>((noise2D(i * 10, attempt, chunkSeed + 8000) * 0.5f + 0.5f) * (m_size - 2));
                int rz = 1 + static_cast<int>((noise2D(attempt, i * 10, chunkSeed + 8001) * 0.5f + 0.5f) * (m_size - 2));
                
                int sy = FindSurfaceY(rx, rz);
                
                if (sy >= SEA_LEVEL && sy >= 0 && sy + 6 + bonusHeight < m_height) {
                    if (GetBlock(rx, sy, rz).type == BlockType::Grass) {
                        PlaceTree(rx, sy + 1, rz, 3 + bonusHeight);
                        treeCount++;
                        placed = true;
                        break;
                    }
                }
            }
            
            if (!placed) {
                failedPlacements++;
                // After 2 failed placements, start making trees taller
                if (failedPlacements >= 2) {
                    bonusHeight = std::min(3, failedPlacements / 2);
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
