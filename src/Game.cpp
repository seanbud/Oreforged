#include "Game.h"
#include "webview.h"
#include <iostream>
#include <filesystem>
#include <algorithm>
#include <Windows.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

struct WebviewWrapper {
    webview::webview w;
    WebviewWrapper(bool debug, void* window) : w(debug, window) {}
};

Game::Game() {
    InitUI();
}

Game::~Game() = default;

void Game::InitUI() {
    // Initialize webview with debug enabled
    m_webview = std::make_unique<WebviewWrapper>(true, nullptr);
    m_webview->w.set_title("OreForged");
    m_webview->w.set_size(1280, 720, WEBVIEW_HINT_NONE);

    // Bind a C++ function to be called from JS
    m_webview->w.bind("logFromUI", [&](std::string seq, std::string req, void* /*arg*/) {
        std::cout << "UI Log: " << req << std::endl;
        m_webview->w.resolve(seq, 0, "Logged successfully");
    }, nullptr);

    m_webview->w.bind("updateState", [&](std::string seq, std::string req, void* /*arg*/) {
        try {
            auto args = json::parse(req);
            if (args.is_array() && args.size() >= 2) {
                std::string key = args[0];
                if (key == "renderDistance") {
                    m_state.renderDistance = args[1];
                    std::cout << "Updated Render Distance: " << m_state.renderDistance << std::endl;
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "JSON Parse Error: " << e.what() << std::endl;
        }
        m_webview->w.resolve(seq, 0, "OK");
    }, nullptr);

    m_webview->w.bind("uiReady", [&](std::string seq, std::string req, void* /*arg*/) {
        OnUIReady();
        m_webview->w.resolve(seq, 0, "OK");
    }, nullptr);

    // Bind quit application
    m_webview->w.bind("quitApplication", [&](std::string seq, std::string req, void* /*arg*/) {
        std::cout << "Quit application requested from UI" << std::endl;
        m_isRunning = false;
        m_webview->w.terminate();
        m_webview->w.resolve(seq, 0, R"({"success": true})");
    }, nullptr);

    // Bind world regeneration
    m_webview->w.bind("regenerateWorld", [&](std::string seq, std::string req, void* /*arg*/) {
        try {
            std::cout << "regenerateWorld called with req: " << req << std::endl;
            
            // Parse the request - bridge.call sends the args as JSON array
            auto parsed = nlohmann::json::parse(req);
            std::cout << "Parsed JSON: " << parsed.dump() << " (type: " << parsed.type_name() << ")" << std::endl;
            
            // Handle nested array issue: bridge.call may send ["[333]"] instead of [333]
            nlohmann::json args;
            if (parsed.is_array() && !parsed.empty() && parsed[0].is_string()) {
                std::cout << "First element is string, parsing it: " << parsed[0].dump() << std::endl;
                args = nlohmann::json::parse(parsed[0].get<std::string>());
            } else {
                args = parsed;
            }
            
            std::cout << "Final args: " << args.dump() << std::endl;
            
            uint32_t seed = 12345;
            if (args.is_array() && !args.empty() && args[0].is_number()) {
                seed = args[0].get<uint32_t>();
                std::cout << "Extracted seed: " << seed << std::endl;
            } else {
                std::cout << "Failed to extract seed, using default: " << seed << std::endl;
                if (args.is_array() && !args.empty()) {
                    std::cout << "args[0] type: " << args[0].type_name() << ", value: " << args[0].dump() << std::endl;
                }
            }
            
            std::cout << "Regenerating world with seed: " << seed << std::endl;
            
            // Signal UI to clear all chunks first
            UpdateFacet("clear_chunks", "true");
            
            // Small delay to let UI process the clear signal
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            
            // Regenerate world
            m_state.world.Regenerate(seed);
            
            // Force immediate update of chunks
            m_state.world.LoadChunksAroundPosition(0, 0, 1);
            
            // Send new chunks to UI with small delays to prevent crash
            auto chunks = m_state.world.GetLoadedChunks();
            std::cout << "Sending " << chunks.size() << " regenerated chunks to UI" << std::endl;
            
            for (const auto* chunk : chunks) {
                std::string chunkData = chunk->Serialize();
                UpdateFacetJSON("chunk_data", chunkData);
                // Small delay to prevent overwhelming the webview
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
            }
            
            m_webview->w.resolve(seq, 0, R"({"success": true})");
        } catch (const std::exception& e) {
            std::cerr << "Error regenerating world: " << e.what() << std::endl;
            m_webview->w.resolve(seq, 1, R"({"error": "Regeneration failed"})");
        }
    }, nullptr);

    // Point to local file relative to executable
    char path[MAX_PATH];
    GetModuleFileNameA(NULL, path, MAX_PATH);
    std::filesystem::path exePath(path);
    auto exeDir = exePath.parent_path();
    auto htmlPath = exeDir / "ui" / "index.html";
    
    // Convert to string and replace backslashes with forward slashes for file:// URL
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

    // Webview has closed, signal game loop to stop
    m_isRunning = false;
    if (m_gameLoopThread.joinable()) {
        m_gameLoopThread.join();
    }
}

void Game::OnUIReady() {
    std::cout << "UI is ready! Sending initial state..." << std::endl;
    m_uiReady = true;

    // Send all loaded chunks to UI
    auto chunks = m_state.world.GetLoadedChunks();
    std::cout << "Sending " << chunks.size() << " chunks to UI" << std::endl;
    
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
    
    // Generate initial chunks on first tick
    if (m_state.tickCount == 1) {
        std::cout << "Generating world chunks..." << std::endl;
        // Load a 3x3 grid of chunks around origin (0, 0)
        m_state.world.LoadChunksAroundPosition(0, 0, 1);
        std::cout << "Generated " << m_state.world.GetLoadedChunks().size() << " chunks" << std::endl;
    }
    
    // Update tick count to UI every 60 ticks
    if (m_uiReady && m_state.tickCount % 60 == 0) {
        UpdateFacet("tick_count", std::to_string(m_state.tickCount));
        // std::cout << "Tick: " << m_state.tickCount << std::endl;
    }
}


void Game::UpdateFacet(const std::string& id, const std::string& value) {
    if (!m_webview) return;

    // Dispatch to UI thread
    m_webview->w.dispatch([=]() {
        if (!m_webview) return; // Safety check
        std::string script = "if(window.OreForged && window.OreForged.updateFacet) window.OreForged.updateFacet('" + id + "', " + value + ");";
        m_webview->w.eval(script);
    });
}

void Game::UpdateFacetJSON(const std::string& id, const std::string& jsonValue) {
    if (!m_webview) return;

    // Dispatch to UI thread
    // For JSON, we pass the JSON string directly (it's already valid JavaScript)
    m_webview->w.dispatch([=]() {
        if (!m_webview) return; // Safety check
        std::string script = "if(window.OreForged && window.OreForged.updateFacet) window.OreForged.updateFacet('" + id + "', " + jsonValue + ");";
        m_webview->w.eval(script);
    });
}
