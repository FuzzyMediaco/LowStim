#!/usr/bin/env bash
set -euo pipefail
out="${1:?Pass a download directory}"
mkdir -p "$out"
fetch() {
    local name="$1" url="$2" digest="$3"
    if ! [[ -s "$out/$name" ]] || ! printf '%s  %s\n' "$digest" "$out/$name" | sha256sum -c --status; then
        curl --fail --silent --show-error --location --retry 3 "$url" -o "$out/$name.part"
        printf '%s  %s\n' "$digest" "$out/$name.part" | sha256sum --check
        mv "$out/$name.part" "$out/$name"
    fi
}
fetch whisper-1.7.6.tar.gz https://codeload.github.com/ggml-org/whisper.cpp/tar.gz/refs/tags/v1.7.6 166140e9a6d8a36f787a2bd77f8f44dd64874f12dd8359ff7c1f4f9acb86202e
fetch tiny.en-q5_1.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.en-q5_1.bin c77c5766f1cef09b6b7d47f21b546cbddd4157886b3b5d6d4f709e91e66c7c2b
mkdir -p "$out/whisper-1.7.6"
tar -xzf "$out/whisper-1.7.6.tar.gz" -C "$out/whisper-1.7.6" --strip-components=1
