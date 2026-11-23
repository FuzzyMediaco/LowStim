#include "engine.h"
#include "llama.h"

#include <algorithm>
#include <memory>
#include <mutex>
#include <thread>
#include <vector>

namespace {
std::mutex lock;
std::string model_path;
std::unique_ptr<llama_model, decltype(&llama_model_free)> model(nullptr, llama_model_free);
bool started = false;
}

void forge_reset() {
    const std::lock_guard<std::mutex> guard(lock);
    model.reset();
    model_path.clear();
}

std::string forge_generate(const std::string &path, const std::string &prompt,
                           const std::string &grammar) {
    const std::lock_guard<std::mutex> guard(lock);
    if (!started) {
        llama_backend_init();
        started = true;
    }
    if (model_path != path || !model) {
        model.reset();
        auto load = llama_model_default_params();
        load.n_gpu_layers = 0;
        model.reset(llama_model_load_from_file(path.c_str(), load));
        if (!model) return "";
        model_path = path;
    }

    auto params = llama_context_default_params();
    params.n_ctx = 1024;
    params.n_batch = 512;
    params.n_threads = std::clamp(static_cast<int>(std::thread::hardware_concurrency()), 2, 4);
    params.n_threads_batch = params.n_threads;
    std::unique_ptr<llama_context, decltype(&llama_free)> context(
        llama_init_from_model(model.get(), params), llama_free);
    if (!context) return "";

    const auto *vocab = llama_model_get_vocab(model.get());
    std::vector<llama_token> prompt_tokens(768);
    const auto size = llama_tokenize(vocab, prompt.c_str(), prompt.size(), prompt_tokens.data(),
                                     prompt_tokens.size(), false, true);
    if (size <= 0) return "";
    for (int start = 0; start < size; start += params.n_batch) {
        const auto n = std::min(static_cast<int>(params.n_batch), size - start);
        if (llama_decode(context.get(), llama_batch_get_one(prompt_tokens.data() + start, n))) return "";
    }

    std::unique_ptr<llama_sampler, decltype(&llama_sampler_free)> sampler(
        llama_sampler_chain_init(llama_sampler_chain_default_params()), llama_sampler_free);
    auto *constraint = llama_sampler_init_grammar(vocab, grammar.c_str(), "root");
    if (!constraint) return "";
    llama_sampler_chain_add(sampler.get(), constraint);
    llama_sampler_chain_add(sampler.get(), llama_sampler_init_greedy());

    std::string output;
    for (int i = 0; i < 96; i++) {
        llama_token token = llama_sampler_sample(sampler.get(), context.get(), -1);
        if (llama_vocab_is_eog(vocab, token)) break;
        char bytes[128];
        const int n = llama_token_to_piece(vocab, token, bytes, sizeof(bytes), 0, false);
        if (n < 0) return "";
        output.append(bytes, n);
        if (output.find('}') != std::string::npos) return output;
        if (llama_decode(context.get(), llama_batch_get_one(&token, 1))) return "";
    }
    return "";
}
