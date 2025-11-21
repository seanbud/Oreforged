#pragma once

struct WebviewWrapper;

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include "world/World.h"

struct GameState {
    std::string worldName = "New World";
    int renderDistance = 12;
    long long tickCount = 0;
    
    // Voxel world
    OreForged::World world{12345}; // Fixed seed for now
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

    std::unique_ptr<WebviewWrapper> m_webview;
    
    GameState m_state;
    std::atomic<bool> m_isRunning{false};
    std::atomic<bool> m_uiReady{false};
    std::thread m_gameLoopThread;
};
