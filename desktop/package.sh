#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
platform="${1:?Pass win32, darwin, or linux}"
arch="${2:?Pass x64 or arm64}"
work="${3:?Pass a build directory}"
output="${4:?Pass an output directory}"
version="45.4.1"
mkdir -p "$work" "$output"
work="$(cd "$work" && pwd -P)"
output="$(cd "$output" && pwd -P)"
cd "$root"

fetch_source() {
    local url="$1" dir="$2"
    if [[ ! -f "$dir/CMakeLists.txt" ]]; then
        mkdir -p "$dir"
        curl --fail --silent --show-error --location --retry 3 "$url" |
            tar -xz -C "$dir" --strip-components=1
    fi
}
fetch_source https://codeload.github.com/ggml-org/llama.cpp/tar.gz/refs/tags/b6348 "$work/llama"
fetch_source https://codeload.github.com/ggml-org/whisper.cpp/tar.gz/refs/tags/v1.7.6 "$work/whisper"
model="$work/tiny.en.bin"
if [[ ! -f "$model" ]]; then
    curl --fail --silent --show-error --location --retry 3 \
        https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin -o "$model.part"
    mv "$model.part" "$model"
fi
python - "$model" <<'PY'
import hashlib
import sys
with open(sys.argv[1], "rb") as model:
    digest = hashlib.file_digest(model, "sha256").hexdigest()
if digest != "921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f":
    raise SystemExit("The bundled speech model failed its checksum.")
PY

common=(-DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=OFF -DGGML_OPENMP=OFF -DGGML_METAL=OFF -DBUILD_SHARED_LIBS=OFF)
if [[ "$platform" == win32 ]]; then
    common+=('-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded$<$<CONFIG:Debug>:Debug>')
fi
cmake -S android/native -B "$work/planner-build" "${common[@]}" -DLLAMA_SOURCE="$work/llama"
cmake --build "$work/planner-build" --config Release --target forge-smoke --parallel 4
cmake -S "$work/whisper" -B "$work/whisper-build" "${common[@]}" \
    -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF
cmake --build "$work/whisper-build" --config Release --target whisper-cli --parallel 4

stage="$work/app"
native="$work/native"
mkdir -p "$native" "$stage/dist"
rm -rf "$stage/native"
cp desktop/package.json desktop/main.cjs desktop/preload.cjs "$stage/"
cp -a dist/. "$stage/dist/"
cp desktop/desktop-device.js "$stage/dist/"
python - "$stage/dist/index.html" <<'PY'
from pathlib import Path
import sys
index = Path(sys.argv[1])
page = index.read_text(encoding="utf-8")
marker = '<script src="slate.js" defer></script>'
if marker not in page:
    raise SystemExit("The shared canvas entry point is missing.")
index.write_text(page.replace(marker, '<script src="desktop-device.js" defer></script>\n'+marker),encoding="utf-8")
PY
suffix=""
if [[ "$platform" == win32 ]]; then suffix=".exe"; fi
planner="$(find "$work/planner-build" -type f -name "forge-smoke$suffix" -print -quit)"
speech="$(find "$work/whisper-build" -type f -name "whisper-cli$suffix" -print -quit)"
cp "$planner" "$native/lowstim-planner$suffix"
cp "$speech" "$native/whisper-cli$suffix"
cp "$model" "$native/tiny.en.bin"
cp "$work/llama/LICENSE" "$native/llama-LICENSE.txt"
cp "$work/whisper/LICENSE" "$native/whisper-LICENSE.txt"
cp desktop/THIRD-PARTY.md "$stage/"
if [[ "$platform" != win32 ]]; then
    chmod +x "$native/lowstim-planner" "$native/whisper-cli"
fi
flags=()
if [[ "$platform" == darwin ]]; then
    flags+=(--extend-info="$root/desktop/mac-info.plist" --app-bundle-id=com.fuzzymediaco.lowstim.desktop)
fi
npx --yes @electron/packager@20.3.0 "$stage" LowStim --platform="$platform" --arch="$arch" \
    --electron-version="$version" --out="$output" --extra-resource="$native" --overwrite "${flags[@]}"
