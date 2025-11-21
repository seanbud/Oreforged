cmake_minimum_required(VERSION 3.14)

project(OreForged LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Dependencies
include(FetchContent)

# Webview library
FetchContent_Declare(
    webview
    GIT_REPOSITORY https://github.com/webview/webview.git
    GIT_TAG 0.11.0 # Pinning a version is good practice
)
FetchContent_MakeAvailable(webview)

# JSON library
FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(json)

# Main executable
add_executable(OreForged 
    src/main.cpp
    src/Game.cpp
    src/Game.h
)


# Link libraries
target_link_libraries(OreForged PRIVATE webview::static nlohmann_json::nlohmann_json)
target_include_directories(OreForged PRIVATE 
    ${webview_SOURCE_DIR}/core/include
    ${CMAKE_BINARY_DIR}/_deps/microsoft_web_webview2-src/build/native/include
)

add_custom_command(TARGET OreForged POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/ui/dist $<TARGET_FILE_DIR:OreForged>/ui
)
