#pragma once

struct WebviewWrapper;

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <map>
#include <vector>
#include "world/World.h"

// Game Definitions
enum class BlockType {
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
    Bronze = 13
};

enum class ToolTier {
    HAND = 0,
    WOOD_PICK = 1,
    STONE_PICK = 2,
    BRONZE_PICK = 3,
    IRON_PICK = 4,
    GOLD_PICK = 5,
    DIAMOND_PICK = 6,
    FURNACE = 4
};

struct ProgressionState {
    int treeLevel = 0;
    int oreLevel = 0;
    int energyLevel = 0;
    int damageLevel = 0;
    long long totalMined = 0;
};

struct PlayerState {
    ToolTier currentTool = ToolTier::HAND;
    float toolHealth = 100.0f;
    bool isToolBroken = false;
};

struct GameState {
    std::string worldName = "New World";
    int renderDistance = 12;
    long long tickCount = 0;
    bool isGenerating = false;
    
    // Core Game Data
    std::map<int, int> inventory;
    ProgressionState progression;
    PlayerState player;
    
    // Voxel world
    OreForged::World world{12345}; 
};

class Game {
public:
    Game();
    ~Game();

    void Run();

private:
    void InitUI();
    void OnUIReady();
    
    void GameLoop();
    void Update();
    void UpdateFacet(const std::string& id, const std::string& value);
    void UpdateFacetJSON(const std::string& id, const std::string& jsonValue);

    // Game Logic Methods
    void CollectResource(int blockTypeId, int count);
    void TryCraft(const std::string& recipeJson);
    void TryRepair();
    void TryBuyUpgrade(const std::string& type);
    void TryRegenerate(const std::string& seedStr, bool autoRandomize);
    void UnlockCrafting();

    // Helpers
    void PushInventory();
    void PushPlayerStats();
    void PushProgression();
    float GetDamageMultiplier();

    std::unique_ptr<WebviewWrapper> m_webview;
    
    GameState m_state;
    std::atomic<bool> m_isRunning{false};
    std::atomic<bool> m_uiReady{false};
    std::thread m_gameLoopThread;
};
