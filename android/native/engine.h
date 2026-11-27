#pragma once
#include <string>
std::string forge_generate(const std::string &path, const std::string &prompt,
                           const std::string &grammar, const std::string &adapter_path = {});
void forge_reset();
