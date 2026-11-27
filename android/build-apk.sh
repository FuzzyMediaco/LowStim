#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
: "${ANDROID_HOME:?Point ANDROID_HOME at the Android SDK with platform and build tools 35 installed}"
: "${ANDROID_NDK_HOME:?Point ANDROID_NDK_HOME at Android NDK r27c}"
: "${LLAMA_SOURCE:?Point LLAMA_SOURCE at the extracted llama.cpp b6348 source}"
: "${FORGE_KEYSTORE:?Point FORGE_KEYSTORE at the Android signing keystore}"
: "${FORGE_KEYSTORE_PASSWORD:?Set the signing keystore password}"
out="${FORGE_BUILD_DIR:-$root/.android-build}"
output="${1:-$out/LowStim.apk}"
cmake="${FORGE_CMAKE:-$ANDROID_HOME/cmake/3.22.1/bin/cmake}"
ninja="${FORGE_NINJA:-$ANDROID_HOME/cmake/3.22.1/bin/ninja}"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
tools="$ANDROID_HOME/build-tools/35.0.0"
mkdir -p "$out"/{java,dex,assets,dependencies,payload/lib/arm64-v8a} "$(dirname "$output")"
"$cmake" -S "$root/android/native" -B "$out/native" -G Ninja \
    -DCMAKE_MAKE_PROGRAM="$ninja" -DLLAMA_SOURCE="$LLAMA_SOURCE" \
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake"     -DANDROID_PLATFORM=android-31 -DANDROID_ABI=arm64-v8a -DANDROID_STL=c++_static \
    -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON
"$cmake" --build "$out/native" --parallel "${FORGE_JOBS:-4}"
host_tools="$(find "$ANDROID_NDK_HOME/toolchains/llvm/prebuilt" -name llvm-strip -print -quit)"
"$host_tools" --strip-unneeded "$out/native/libforge.so" -o "$out/payload/lib/arm64-v8a/libforge.so"
"$tools/aapt2" compile --dir "$root/android/res" -o "$out/resources.zip"
speech="${FORGE_SPEECH_DIR:-$out/dependencies}"
"$root/android/fetch-speech.sh" "$speech"
speech_build="$out/whisper-build"
"$cmake" -S "$root/android/whisper" -B "$speech_build" -G Ninja \
    -DCMAKE_MAKE_PROGRAM="$ninja" -DWHISPER_SOURCE="$speech/whisper-1.7.6" \
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" \
    -DANDROID_PLATFORM=android-31 -DANDROID_ABI=arm64-v8a -DANDROID_STL=c++_static -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON
"$cmake" --build "$speech_build" --target slate_speech --parallel "${FORGE_JOBS:-4}"
"$host_tools" --strip-unneeded "$speech_build/libslate_speech.so" -o "$out/payload/lib/arm64-v8a/libslate_speech.so"
# Older local build folders may contain Vosk binaries and its model.
rm -f "$out/payload/lib/arm64-v8a/libvosk.so" "$out/payload/lib/arm64-v8a/libjnidispatch.so" "$out/assets/speech-model.zip"
# The native APK uses bundled ARM64 inference. Only package the shared UI and its static assets.
for asset in "$root"/dist/*; do
    case "${asset##*/}" in download|model-packs|model-runtime) continue ;; esac
    cp -a "$asset" "$out/assets/"
done
if [[ -f "$root/dist/model-runtime/wllama/lowstim-lora.gguf" ]]; then
    cp "$root/dist/model-runtime/wllama/lowstim-lora.gguf" "$out/assets/"
fi
cp "$speech/tiny.en-q5_1.bin" "$out/assets/"
cp "$speech/whisper-1.7.6/LICENSE" "$out/assets/whisper-cpp-LICENSE.txt"
cp "$root/dist/model-runtime/whisper/whisper-model-LICENSE.txt" "$out/assets/whisper-model-LICENSE.txt"
cp "$root/android/THIRD-PARTY.md" "$out/assets/"
cp "$LLAMA_SOURCE/LICENSE" "$out/assets/llama-cpp-LICENSE.txt"
cp "$root/android/Apache-2.0.txt" "$out/assets/Apache-2.0.txt"
"$tools/aapt2" link -I "$platform" --manifest "$root/android/AndroidManifest.xml" \
    -A "$out/assets" -0 zip -o "$out/base.apk" "$out/resources.zip"
mapfile -t java_src < <(find "$root/android/java" -name '*.java')
if [[ -n "${FORGE_ECJ_JAR:-}" ]]; then
    java -jar "$FORGE_ECJ_JAR" -1.8 -proc:none -bootclasspath "$platform:$tools/core-lambda-stubs.jar" \
        -d "$out/java" "${java_src[@]}"
else
    javac --release 17 -classpath "$platform" -d "$out/java" "${java_src[@]}"
fi
mapfile -t classes < <(find "$out/java" -name '*.class')
"$tools/d8" --lib "$platform" --min-api 31 --output "$out/dex" "${classes[@]}"
cp "$out/dex/classes.dex" "$out/payload/"
(cd "$out/payload" && zip -q -0 "$out/base.apk" classes.dex lib/arm64-v8a/*.so)
"$tools/zipalign" -f -P 16 4 "$out/base.apk" "$out/aligned.apk"
"$tools/apksigner" sign --ks "$FORGE_KEYSTORE" --ks-pass env:FORGE_KEYSTORE_PASSWORD \
    --ks-key-alias "${FORGE_KEY_ALIAS:-androiddebugkey}" --v4-signing-enabled false --out "$output" "$out/aligned.apk"
"$tools/zipalign" -c -P 16 4 "$output"
"$tools/apksigner" verify --print-certs "$output"
