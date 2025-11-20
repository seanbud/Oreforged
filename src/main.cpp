#include "webview.h"
#include <iostream>
#include <nlohmann/json.hpp>
#include <filesystem>
#include <algorithm>

using json = nlohmann::json;

int main() {
    try {
        webview::webview w(true, nullptr);
        w.set_title("OreForged");
        w.set_size(1280, 720, WEBVIEW_HINT_NONE);

        // Bind a C++ function to be called from JS
        w.bind("logFromUI", [&](std::string seq, std::string req, void* /*arg*/) {
            std::cout << "UI Log: " << req << std::endl;
            w.resolve(seq, 0, "Logged successfully");
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
        w.navigate("file:///" + htmlPathStr); 

        w.run();
    } catch (const std::exception& e) {
        std::cerr << "Exception: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
