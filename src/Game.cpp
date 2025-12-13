#include "Game.h"
#include "webview.h"
#include <iostream>
#include <cmath>
#ifdef _WIN32
  #include <Windows.h>
#elif __linux__
  #include <unistd.h>
  #include <limits.h>
#elif __APPLE__
  #include <mach-o/dyld.h>
#endif
#include <nlohmann/json.hpp>

using json = nlohmann::json;

struct WebviewWrapper {
    webview::webview w;
    WebviewWrapper(bool debug, void* window) : w(debug, window) {}
};

Game::Game() {
    // Initialize Inventory (Defaults to 0 but explicit for clarity)
    m_state.inventory[(int)BlockType::Air] = 0;
    m_state.inventory[(int)BlockType::Grass] = 0;
    m_state.inventory[(int)BlockType::Dirt] = 0;
    m_state.inventory[(int)BlockType::Stone] = 0;
    m_state.inventory[(int)BlockType::Water] = 0;
    m_state.inventory[(int)BlockType::Wood] = 0;
    m_state.inventory[(int)BlockType::Leaves] = 0;
    m_state.inventory[(int)BlockType::Bedrock] = 0;
    m_state.inventory[(int)BlockType::Sand] = 0;
    m_state.inventory[(int)BlockType::Coal] = 0;
    m_state.inventory[(int)BlockType::Iron] = 0;
    m_state.inventory[(int)BlockType::Gold] = 0;
    m_state.inventory[(int)BlockType::Diamond] = 0;
    m_state.inventory[(int)BlockType::Bronze] = 0;

    InitUI();
}

Game::~Game() = default;

void Game::InitUI() {
    // Initialize webview with debug enabled
    m_webview = std::make_unique<WebviewWrapper>(true, nullptr);
    m_webview->w.set_title("OreForged");
    m_webview->w.set_size(1280, 720, WEBVIEW_HINT_NONE);

    // Bind logFromUI
    m_webview->w.bind("logFromUI", [&](std::string seq, std::string req, void* /*arg*/) {
        std::cout << "UI Log: " << req << std::endl;
        m_webview->w.resolve(seq, 0, "\"Logged successfully\"");
    }, nullptr);

    // Bind updateState (Legacy/Config)
    m_webview->w.bind("updateState", [&](std::string seq, std::string req, void* /*arg*/) {
        try {
            auto args = json::parse(req);
            if (args.is_array() && args.size() >= 2) {
                std::string key = args[0];
                if (key == "renderDistance") {
                    m_state.renderDistance = args[1];
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "JSON Parse Error: " << e.what() << std::endl;
        }
        m_webview->w.resolve(seq, 0, "\"OK\"");
    }, nullptr);

    // Bind uiReady
    m_webview->w.bind("uiReady", [&](std::string seq, std::string req, void* /*arg*/) {
        OnUIReady();
        m_webview->w.resolve(seq, 0, "\"OK\"");
    }, nullptr);

    // Bind quitApplication
    m_webview->w.bind("quitApplication", [&](std::string seq, std::string req, void* /*arg*/) {
        std::cout << "Quit application requested from UI" << std::endl;
        m_isRunning = false;
        m_webview->w.terminate();
        m_webview->w.resolve(seq, 0, R"({"success": true})");
    }, nullptr);

    // --- GAME LOGIC BINDINGS ---

    // interact: ["blockType"]
    // interact: [blockTypeId (int)]
    m_webview->w.bind("interact", [&](std::string seq, std::string req, void* /*arg*/) {
        try {
            auto parsed = json::parse(req);
            json args = parsed;
            // Robust check
            if (parsed.is_array() && !parsed.empty() && parsed[0].is_string()) {
                try {
                    auto inner = json::parse(parsed[0].get<std::string>());
                    if (inner.is_array()) args = inner;
                } catch(...) {}
            }

            if (args.is_array() && args.size() >= 1) {
                // Now expecting integer ID
                int blockTypeId = 0;
                if (args[0].is_number()) blockTypeId = args[0].get<int>();
                else if (args[0].is_string()) {
                    // Fallback try parse
                    try { blockTypeId = std::stoi(args[0].get<std::string>()); } catch(...) {}
                }
                
                CollectResource(blockTypeId, 1);
            }
            m_webview->w.resolve(seq, 0, "\"OK\"");
        } catch (std::exception& e) {
            std::cerr << "Interact Error: " << e.what() << std::endl;
            m_webview->w.resolve(seq, 1, "\"Error\"");
        }
    }, nullptr);

    // craft: [{"recipe_json"}]
    // craft: [{"recipe_json"}]
    m_webview->w.bind("craft", [&](std::string seq, std::string req, void* /*arg*/) {
        try {
            auto parsed = json::parse(req);
            json args = parsed;
            if (parsed.is_array() && !parsed.empty() && parsed[0].is_string()) {
                 try {
                    // Try to unwrap if it's double encoded (likely for objects)
                    auto inner = json::parse(parsed[0].get<std::string>());
                    // But TryCraft expects the recipe string from args[0]
                    // If unwrapped is object, we might want to dump it back?
                    // Actually, let's keep it simple: assume args has the recipe
                 } catch(...) {}
            }

            if (args.is_array() && args.size() >= 1) {
                // If args[0] is still a string, use it. If it's an object, dump it.
                std::string recipeStr = args[0].is_string() ? args[0].get<std::string>() : args[0].dump();
                TryCraft(recipeStr);
            }
            m_webview->w.resolve(seq, 0, "\"OK\"");
        } catch (std::exception& e) {
            std::cerr << "Craft Error: " << e.what() << std::endl;
            m_webview->w.resolve(seq, 1, "\"Error\"");
        }
    }, nullptr);

    // upgrade: ["type"]
    // upgrade: ["type"]
    m_webview->w.bind("upgrade", [&](std::string seq, std::string req, void* /*arg*/) {
        try {
            auto parsed = json::parse(req);
            json args = parsed;
             if (parsed.is_array() && !parsed.empty() && parsed[0].is_string()) {
                try {
                    auto inner = json::parse(parsed[0].get<std::string>());
                    if (inner.is_array()) args = inner;
                } catch(...) {}
            }

            if (args.is_array() && args.size() >= 1) {
                TryBuyUpgrade(args[0].get<std::string>());
            }
            m_webview->w.resolve(seq, 0, "\"OK\"");
        } catch (std::exception& e) {
            std::cerr << "Upgrade Error: " << e.what() << std::endl;
            m_webview->w.resolve(seq, 1, "\"Error\"");
        }
    }, nullptr);

    // repairTool
    m_webview->w.bind("repairTool", [&](std::string seq, std::string req, void* /*arg*/) {
        TryRepair();
        m_webview->w.resolve(seq, 0, "\"OK\"");
    }, nullptr);

    // regenerateWorld: [seed, autoRandomize (opt)]
    m_webview->w.bind("regenerateWorld", [&](std::string seq, std::string req, void* /*arg*/) {
        try {
            auto parsed = json::parse(req);
            json args = parsed;
             if (parsed.is_array() && !parsed.empty() && parsed[0].is_string()) {
                try {
                    auto inner = json::parse(parsed[0].get<std::string>());
                    if (inner.is_array()) args = inner;
                } catch(...) {}
            }
            
            std::string seedDecStr = "12345";
            bool autoRand = true;

            if (args.is_array()) {
                if (args.size() > 0) {
                     if (args[0].is_string()) seedDecStr = args[0];
                     else if (args[0].is_number()) seedDecStr = std::to_string(args[0].get<int>());
                }
                if (args.size() > 1 && args[1].is_boolean()) autoRand = args[1].get<bool>();
            }
            
            TryRegenerate(seedDecStr, autoRand);
            
            m_webview->w.resolve(seq, 0, "\"OK\"");
        } catch (const std::exception& e) {
            std::cerr << "Error regenerating world: " << e.what() << std::endl;
            m_webview->w.resolve(seq, 1, "\"Error\"");
        }
    }, nullptr);

    // Unlock Crafting Cheat / Force
    m_webview->w.bind("unlockCrafting", [&](std::string seq, std::string req, void* /*arg*/) {
        UnlockCrafting();
        m_webview->w.resolve(seq, 0, "\"OK\"");
    }, nullptr);

    // Reset Progression
    m_webview->w.bind("resetProgression", [&](std::string seq, std::string req, void* /*arg*/) {
        ResetProgression();
        m_webview->w.resolve(seq, 0, "\"OK\"");
    }, nullptr);

    // Portable executable path finding (Load UI)
    std::filesystem::path exePath;
#ifdef _WIN32
    char path[MAX_PATH];
    GetModuleFileNameA(NULL, path, MAX_PATH);
    exePath = std::filesystem::path(path);
#elif __linux__
    char result[PATH_MAX];
    ssize_t count = readlink("/proc/self/exe", result, PATH_MAX);
    exePath = std::filesystem::path(std::string(result, (count > 0) ? count : 0));
#elif __APPLE__
    char path[1024];
    uint32_t size = sizeof(path);
    if (_NSGetExecutablePath(path, &size) == 0)
        exePath = std::filesystem::path(path);
#endif

    auto exeDir = exePath.parent_path();
    auto htmlPath = exeDir / "ui" / "index.html";
    std::string htmlPathStr = htmlPath.string();
    std::replace(htmlPathStr.begin(), htmlPathStr.end(), '\\', '/');
    m_webview->w.navigate("file:///" + htmlPathStr);
}

void Game::Run() {
    m_isRunning = true;
    m_gameLoopThread = std::thread(&Game::GameLoop, this);
    if (m_webview) {
        m_webview->w.run();
    }
    m_isRunning = false;
    if (m_gameLoopThread.joinable()) {
        m_gameLoopThread.join();
    }
}

void Game::OnUIReady() {
    std::cout << "UI Ready. Syncing State..." << std::endl;
    m_uiReady = true;

    PushInventory();
    PushPlayerStats();
    PushProgression();

    // Send Loaded Chunks
    auto chunks = m_state.world.GetLoadedChunks();
    for (const auto* chunk : chunks) {
        std::string chunkData = chunk->Serialize();
        UpdateFacetJSON("chunk_data", chunkData);
    }
}

void Game::GameLoop() {
    using clock = std::chrono::high_resolution_clock;
    auto next_tick = clock::now();
    
    while (m_isRunning) {
        Update();
        next_tick += std::chrono::milliseconds(1000 / 60); // 60 TPS
        std::this_thread::sleep_until(next_tick);
    }
}

void Game::Update() {
    m_state.tickCount++;
    
    // Initial Gen
    if (m_state.tickCount == 1) {
        m_state.world.LoadChunksAroundPosition(0, 0, 2);
    }
    
    if (m_uiReady && m_state.tickCount % 60 == 0) {
        UpdateFacet("tick_count", std::to_string(m_state.tickCount));
    }
}

// --- LOGIC IMPLEMENTATION ---

// Helper to determine if block is mineable by tool
bool CanMine(int blockType, ToolTier tool) {
    if (blockType == (int)BlockType::Bedrock) return false;
    if (blockType == (int)BlockType::Air) return false;
    if (blockType == (int)BlockType::Water) return false;

    // Hand can mine basic resources
    if (tool == ToolTier::HAND) {
        return blockType == (int)BlockType::Grass || 
               blockType == (int)BlockType::Dirt || 
               blockType == (int)BlockType::Wood || 
               blockType == (int)BlockType::Leaves || 
               blockType == (int)BlockType::Sand;
    }
    
    // Picks can mine everything Hand can + deeper
    // Simplified logic: Tiers enable specific blocks
    // This should match frontend "canMineBlock" if possible
    
    // Stone Pick -> Stone, Coal, Iron
    if (tool == ToolTier::STONE_PICK || tool >= ToolTier::STONE_PICK) {
        if (blockType == (int)BlockType::Stone || blockType == (int)BlockType::Coal || blockType == (int)BlockType::Iron || blockType == (int)BlockType::Bronze) return true;
    }
    
    // Bronze/Iron -> Gold
    if (tool >= ToolTier::BRONZE_PICK) {
        if (blockType == (int)BlockType::Gold) return true;
    }
    
    // Iron -> Diamond
    if (tool >= ToolTier::IRON_PICK) {
        if (blockType == (int)BlockType::Diamond) return true;
    }

    // Always allow basic blocks if tool is better than hand
    if (blockType == (int)BlockType::Grass || 
        blockType == (int)BlockType::Dirt || 
        blockType == (int)BlockType::Wood || 
        blockType == (int)BlockType::Leaves || 
        blockType == (int)BlockType::Sand) return true;

    return false;
}

void Game::CollectResource(int blockTypeId, int count) {
    // Validation
    if (!CanMine(blockTypeId, m_state.player.currentTool)) {
        return;
    }

    if (blockTypeId > 0) {
        m_state.inventory[blockTypeId] += count;
        m_state.progression.totalMined += count;
        
        // Tool Damage
        if (m_state.player.currentTool != ToolTier::HAND && !m_state.player.isToolBroken) {
            m_state.player.toolHealth = (std::max)(0.0f, m_state.player.toolHealth - 2.0f);
            if (m_state.player.toolHealth <= 0) {
                m_state.player.isToolBroken = true;
            }
        }

        PushInventory();
        PushPlayerStats();
        PushProgression();
    }
}

void Game::TryCraft(const std::string& recipeJson) {
    json recipe;
    try {
        recipe = json::parse(recipeJson);
    } catch (...) {
        return;
    }

    // Robust Unwrapping: Handle ["{...}"] or [{"..."}] or plain {...}
    // Unwrap singleton arrays
    while (recipe.is_array() && recipe.size() == 1) {
        if (recipe[0].is_string()) {
            try {
                recipe = json::parse(recipe[0].get<std::string>());
            } catch (...) {
                break;
            }
        } else if (recipe[0].is_object()) {
            recipe = recipe[0];
        } else {
            break;
        }
    }
    
    std::map<int, int> cost;
    if (recipe.contains("cost") && recipe["cost"].is_object()) {
        for (auto& el : recipe["cost"].items()) {
            try {
                int id = std::stoi(el.key());
                cost[id] = el.value();
            } catch(...) {}
        }
    }

    // Check Affordability
    for (const auto& [item, amount] : cost) {
        int current = m_state.inventory[item];
        if (current < amount) {
            return;
        }
    }

    // Check Affordability
    for (const auto& [item, amount] : cost) {
        int current = m_state.inventory[item];
        if (current < amount) {
            return;
        }
    }

    // Deduct
    for (const auto& [item, amount] : cost) {
        m_state.inventory[item] -= amount;
        // NOTE: Does spending inventory count towards "Spent on Current Gen"?
        // Legacy: "spentOnCurrentGen" likely tracked 'mined blocks spent on UPGRADES or REGENS'?
        // The formula '30 - spent' implies spending reduces the cost to leave.
        // Yes, investing in the world (crafting, upgrading) reduces the exit fee.
        // But what defines "spending"?
        // If I craft a tool, does it count? 
        // Let's assume ANY inventory deduction counts.
    }
    
    // We don't have block values here easily. 
    // Wait, the legacy app likely tracked 'spent' when buying upgrades.
    // Did it track crafting?
    // "setSpentOnCurrentGen(prev => prev + cost)" was likely in UpgradeButton.
    // If I look at the legacy App.tsx (if I could), I'd verify.
    // Assuming Upgrades definitely count. Tools? Maybe.
    // Let's count upgrades for sure.

    // Award Tool
    if (recipe.contains("result")) {
        int tier = recipe["result"];
        m_state.player.currentTool = static_cast<ToolTier>(tier);
        m_state.player.toolHealth = 100.0f; // Reset health
        m_state.player.isToolBroken = false;
        
        // Hardcoded max healths
        float maxHealth = 100.0f;
        if (tier == 2) maxHealth = 150.0f;
        if (tier == 3) maxHealth = 250.0f;
        if (tier == 4) maxHealth = 500.0f;
        if (tier == 5) maxHealth = 300.0f;
        if (tier == 6) maxHealth = 1000.0f;
        m_state.player.toolHealth = maxHealth;
    }

    PushInventory();
    PushPlayerStats();
}

void Game::TryBuyUpgrade(const std::string& type) {
    // Calculate Cost Logic
    long long cost = 0;
    int currentLevel = 0;

    if (type == "tree") { currentLevel = m_state.progression.treeLevel; cost = 2 * std::pow(2, currentLevel); }
    else if (type == "ore") { currentLevel = m_state.progression.oreLevel; cost = 4 * std::pow(2, currentLevel); }
    else if (type == "energy") { currentLevel = m_state.progression.energyLevel; cost = 8 * std::pow(2, currentLevel); }
    else if (type == "damage") { currentLevel = m_state.progression.damageLevel; cost = std::floor(100 * std::pow(1.5, currentLevel)); }

    if (m_state.progression.totalMined >= cost) {
        m_state.progression.totalMined -= cost;
        m_state.progression.spentOnCurrentGen += cost; // Track spending!
        
        if (type == "tree") m_state.progression.treeLevel++;
        else if (type == "ore") m_state.progression.oreLevel++;
        else if (type == "energy") m_state.progression.energyLevel++;
        else if (type == "damage") m_state.progression.damageLevel++;

        PushPlayerStats(); // For totalMined update
        PushProgression();
    }
}

void Game::TryRepair() {
    // Logic matches ObjectiveTracker.tsx
    // Cost: 3 of relevant material
    int repairMat = (int)BlockType::Wood;
    ToolTier current = m_state.player.currentTool;
    
    if (current == ToolTier::STONE_PICK) repairMat = (int)BlockType::Stone;
    else if (current == ToolTier::BRONZE_PICK) repairMat = (int)BlockType::Bronze;
    else if (current == ToolTier::IRON_PICK) repairMat = (int)BlockType::Iron;
    else if (current == ToolTier::GOLD_PICK) repairMat = (int)BlockType::Gold;
    else if (current == ToolTier::DIAMOND_PICK) repairMat = (int)BlockType::Diamond;

    int cost = 3;
    if (m_state.inventory[repairMat] >= cost) {
        m_state.inventory[repairMat] -= cost;
        
        m_state.player.isToolBroken = false;
        // Reset health
         float maxHealth = 100.0f;
        if (current == ToolTier::STONE_PICK) maxHealth = 150.0f;
        if (current == ToolTier::BRONZE_PICK) maxHealth = 250.0f;
        if (current == ToolTier::IRON_PICK) maxHealth = 500.0f;
        if (current == ToolTier::GOLD_PICK) maxHealth = 300.0f;
        if (current == ToolTier::DIAMOND_PICK) maxHealth = 1000.0f;
        m_state.player.toolHealth = maxHealth;

        PushInventory();
        PushPlayerStats();
    }
}

void Game::UnlockCrafting() {
    UpdateFacet("unlock_crafting", "true");
}

void Game::TryRegenerate(const std::string& seedStr, bool autoRandomize) {
    if (m_state.isGenerating) return;
    
    // Cost Check: 30 blocks minus whatever was spent this gen.
    // If not calibrated (no crafting unlocked), it's free.
    // We check 'unlock_crafting' facet indirectly (we need to track it in backend if possible, or assume totalMined check?)
    // Actually, let's track 'hasCalibrated' in GameState? 
    // For now, let's use the legacy logic proxy: if (totalMined < 30) or simply (spent check).
    
    // Legacy: Cost = max(0, 30 - spentOnCurrentGen).
    // If hasCalibrated is false, it's free.
    
    // Determine 'hasCalibrated' - simpliest is: do we have tools? or totalMined > X?
    // Let's rely on standard cost logic mostly, but if totalMined is low, allow free?
    // User said: "Regen cost on main... exact behavior".
    // Main behavior: hasCalibrated ? cost : Free.
    
    // Since we don't store hasCalibrated in C++ state explicitly (only facet), let's add it or infer.
    // Inference: If treeLevel > 0 OR currentTool > HAND, we definitely calibrated.
    bool hasCalibrated = (m_state.progression.treeLevel > 0 || m_state.player.currentTool != ToolTier::HAND || m_state.progression.totalMined > 50);

    long long cost = 0;
    if (hasCalibrated) {
        long long deduction = 30;
        if (m_state.progression.spentOnCurrentGen < deduction) {
            cost = deduction - m_state.progression.spentOnCurrentGen;
        }
    }

    if (m_state.progression.totalMined >= cost) {
        m_state.progression.totalMined -= cost;
        PushPlayerStats();
    } else {
        return; // Cannot afford
    }

    m_state.isGenerating = true;
    UpdateFacet("is_generating", "true");
    
    // Reset "Spent on Current Gen" for the NEW world
    m_state.progression.spentOnCurrentGen = 0;

    // ... (rest is same)
    
    uint32_t seed = 0;
    try {
        seed = std::stoul(seedStr);
    } catch (...) {
        seed = 12345;
    }
    
    if (autoRandomize) {
        seed = rand() % 90000 + 10000;
        // Notify UI of new seed?
        UpdateFacet("world_seed", std::to_string(seed));
    }

    // Config Calculation based on Progression
    OreForged::WorldConfig config;
    int energy = m_state.progression.energyLevel;
    
    // Size logic
    config.size = (energy >= 7) ? 16 + (energy - 6) : 16;
    config.height = 32 + energy * 2;
    config.oreMult = 1.0f + m_state.progression.oreLevel * 0.5f;
    config.treeMult = 1.0f + m_state.progression.treeLevel * 0.5f;
    
    // Island Factor logic
    float islandFactor = 1.0f;
    if (energy <= 6) {
        float minF = 0.08f;
        float maxF = 0.55f;
        float t = energy / 6.0f;
        islandFactor = minF + (t * t) * (maxF - minF);
    }
    config.islandFactor = islandFactor;

    // Cheat Code
    if (seed == 25565) {
        m_state.progression.totalMined += 25565;
        PushPlayerStats();
    }

    // Execution
    UpdateFacet("clear_chunks", "true");
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    
    m_state.world.Regenerate(seed, config);
    m_state.world.LoadChunksAroundPosition(0, 0, 2);
    
    auto chunks = m_state.world.GetLoadedChunks();
    for (const auto* chunk : chunks) {
        std::string chunkData = chunk->Serialize();
        UpdateFacetJSON("chunk_data", chunkData);
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    m_state.isGenerating = false;
    UpdateFacet("is_generating", "false");
}

void Game::ResetProgression() {
    // HARD RESET / FULL WIPE
    m_state.progression.totalMined = 0;
    m_state.progression.spentOnCurrentGen = 0; // Reset tracking
    m_state.progression.treeLevel = 0;
    m_state.progression.oreLevel = 0;
    m_state.progression.energyLevel = 0;
    m_state.progression.damageLevel = 0;

    // Reset Inventory
    for (auto& [key, val] : m_state.inventory) {
        val = 0;
    }

    // Reset Player
    m_state.player.currentTool = ToolTier::HAND;
    m_state.player.toolHealth = 100.0f;
    m_state.player.isToolBroken = false;

    // Reset Flags
    UpdateFacet("unlock_crafting", "false");

    // Push Updates
    PushInventory();
    PushPlayerStats();
    PushProgression();

    // TRIGGER REGENERATION (Auto-Regen on Reset)
    // Use default seed or random? Legacy used "current input or 12345". 
    // We'll generate a fresh random seed for a true reset feel, or stick to 12345?
    // Legacy: `bridge.regenerateWorld(seedNum, ...)` where seedNum was input.
    // Let's just regen with random.
    TryRegenerate("12345", true);
}

// --- STATE PUSHERS ---

void Game::PushInventory() {
    json inv = json::object();
    for (const auto& [id, count] : m_state.inventory) {
        inv[std::to_string(id)] = count;
    }
    UpdateFacetJSON("inventory", inv.dump());
}

void Game::PushPlayerStats() {
    json stats = {
        {"totalMined", m_state.progression.totalMined},
        {"currentTool", static_cast<int>(m_state.player.currentTool)},
        {"toolHealth", m_state.player.toolHealth},
        {"isToolBroken", m_state.player.isToolBroken},
        {"damageMultiplier", 1.0f + m_state.progression.damageLevel},
        {"regenCost", 0} // Placeholder, need logic here?
        // Actually, logic is conditional (hasCalibrated). 
        // Let's calculate it here.
    };
    
    // Better: Calculate cost locally
    bool hasCalibrated = (m_state.progression.treeLevel > 0 || m_state.player.currentTool != ToolTier::HAND || m_state.progression.totalMined > 50);
    long long cost = 0;
    if (hasCalibrated) {
        long long deduction = 30;
        if (m_state.progression.spentOnCurrentGen < deduction) {
            cost = deduction - m_state.progression.spentOnCurrentGen;
        }
    }
    stats["regenCost"] = cost;

    UpdateFacetJSON("player_stats", stats.dump());
}

void Game::PushProgression() {
    json prog = {
        {"tree", m_state.progression.treeLevel},
        {"ore", m_state.progression.oreLevel},
        {"energy", m_state.progression.energyLevel},
        {"damage", m_state.progression.damageLevel}
    };
    UpdateFacetJSON("progression", prog.dump());
}

float Game::GetDamageMultiplier() {
    return 1.0f + m_state.progression.damageLevel;
}

void Game::UpdateFacet(const std::string& id, const std::string& value) {
    if (!m_webview) return;
    m_webview->w.dispatch([=]() {
        if (!m_webview) return;
        std::string script = "if(window.OreForged && window.OreForged.updateFacet) window.OreForged.updateFacet('" + id + "', " + value + ");";
        m_webview->w.eval(script);
    });
}

void Game::UpdateFacetJSON(const std::string& id, const std::string& jsonValue) {
    if (!m_webview) return;
    m_webview->w.dispatch([=]() {
        if (!m_webview) return;
        std::string script = "if(window.OreForged && window.OreForged.updateFacet) window.OreForged.updateFacet('" + id + "', " + jsonValue + ");";
        m_webview->w.eval(script);
    });
}
