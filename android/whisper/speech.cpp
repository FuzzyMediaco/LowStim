#include <jni.h>
#include "whisper.h"
#include <algorithm>
#include <memory>
#include <string>
#include <vector>

namespace {
// OfflineSpeech serializes all calls onto one Java worker. Release follows its last recording.
thread_local std::unique_ptr<whisper_context, decltype(&whisper_free)> model(nullptr, whisper_free);
}

extern "C" JNIEXPORT jstring JNICALL Java_com_doodleforge_slate_OfflineSpeech_transcribe(
        JNIEnv *env, jclass, jstring model_path, jshortArray source, jint count) {
    if (!model_path || !source || count <= 0 || count > 16000 * 30 || count > env->GetArrayLength(source))
        return nullptr;
    try {
        if (!model) {
            const char *path = env->GetStringUTFChars(model_path, nullptr);
            if (!path) return nullptr;
            auto options = whisper_context_default_params();
            options.use_gpu = false;
            auto *loaded = whisper_init_from_file_with_params(path, options);
            env->ReleaseStringUTFChars(model_path, path);
            model.reset(loaded);
        }
        if (!model) return nullptr;
        std::vector<jshort> audio(count);
        env->GetShortArrayRegion(source, 0, count, audio.data());
        if (env->ExceptionCheck()) return nullptr;
        std::vector<float> samples(count);
        std::transform(audio.begin(), audio.end(), samples.begin(), [](jshort sample) { return sample / 32768.0f; });
        auto params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
        params.language = "en";
        params.n_threads = 3;
        params.no_context = true;
        params.no_timestamps = true;
        params.print_progress = false;
        params.print_realtime = false;
        params.print_timestamps = false;
        params.print_special = false;
        if (whisper_full(model.get(), params, samples.data(), count) != 0) return nullptr;
        std::string text;
        for (int i = 0; i < whisper_full_n_segments(model.get()); i++)
            text += whisper_full_get_segment_text(model.get(), i);
        return env->NewStringUTF(text.c_str());
    } catch (...) { return nullptr; }
}

extern "C" JNIEXPORT void JNICALL Java_com_doodleforge_slate_OfflineSpeech_release(
        JNIEnv *, jclass) {
    model.reset();
}
