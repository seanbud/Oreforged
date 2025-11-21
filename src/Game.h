#pragma once

struct WebviewWrapper;

#include <string>
#include <memory>
#include <thread>
#include <atomic>

struct GameState {
    std::string worldName = "New World";
    int renderDistance = 12;
    long long tickCount = 0;
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

    std::unique_ptr<WebviewWrapper> m_webview;
    
    GameState m_state;
    std::atomic<bool> m_isRunning{false};
    std::thread m_gameLoopThread;
};
