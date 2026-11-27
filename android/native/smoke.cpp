#include "engine.h"
#include <fstream>
#include <iostream>
#include <iterator>

static std::string read(const char *path) {
    std::ifstream f(path);
    return {std::istreambuf_iterator<char>(f), std::istreambuf_iterator<char>()};
}

int main(int argc, char **argv) {
    if (argc != 4 && argc != 5) return 2;
    const auto result = forge_generate(argv[1], read(argv[2]), read(argv[3]), argc == 5 ? argv[4] : "");
    std::cout << result << '\n';
    return result.empty();
}
