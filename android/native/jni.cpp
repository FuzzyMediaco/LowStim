#include "engine.h"
#include <jni.h>

static std::string chars(JNIEnv *env, jstring input) {
    if (!input) return {};
    const char *ptr = env->GetStringUTFChars(input, nullptr);
    if (!ptr) return {};
    const std::string result(ptr);
    env->ReleaseStringUTFChars(input, ptr);
    return result;
}

extern "C" JNIEXPORT jstring JNICALL Java_com_doodleforge_slate_MainActivity_generate(
    JNIEnv *env, jclass, jstring path, jstring prompt, jstring grammar, jstring adapter) {
    try {
        const auto output = forge_generate(chars(env, path), chars(env, prompt), chars(env, grammar), chars(env, adapter));
        return env->NewStringUTF(output.c_str());
    } catch (...) {
        return env->NewStringUTF("");
    }
}

extern "C" JNIEXPORT void JNICALL Java_com_doodleforge_slate_MainActivity_resetModel(
    JNIEnv *, jclass) {
    forge_reset();
}
