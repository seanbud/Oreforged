#pragma once

#include <cstdint>

namespace OreForged {

// Block types for the voxel world
enum class BlockType : uint8_t {
    Air = 0,
    Grass = 1,
    Dirt = 2,
    Stone = 3,
    Water = 4,
    Wood = 5,
    Leaves = 6,
    Bedrock = 7,
    Sand = 8,
    Coal = 9,
    Iron = 10,
    Gold = 11,
    Diamond = 12,
    
    // Add more block types as needed
    Count // Keep this last - represents total number of block types
};

// Simple block structure
struct Block {
    BlockType type = BlockType::Air;
    
    bool IsAir() const { return type == BlockType::Air; }
    bool IsSolid() const { return type != BlockType::Air && type != BlockType::Water; }
    bool IsTransparent() const { return type == BlockType::Air || type == BlockType::Water; }
};

} // namespace OreForged
