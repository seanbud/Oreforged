#include "Game.h"
#include <iostream>

int main() {
    try {
        Game game;
        game.Run();
    } catch (const std::exception& e) {
        std::cerr << "Exception: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
