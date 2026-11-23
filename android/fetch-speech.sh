#!/usr/bin/env bash
set -euo pipefail
out="${1:?Pass a download directory}"
mkdir -p "$out"
download() {
    local target="$out/$1"
    if [[ ! -s "$target" ]]; then
        curl --fail --silent --show-error --location --retry 3 "$2" -o "$target.part"
        mv "$target.part" "$target"
    fi
}
download vosk.aar https://repo.maven.apache.org/maven2/com/alphacephei/vosk-android/0.3.75/vosk-android-0.3.75.aar
download jna.aar https://repo.maven.apache.org/maven2/net/java/dev/jna/jna/5.18.1/jna-5.18.1.aar
download speech-model.zip https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
