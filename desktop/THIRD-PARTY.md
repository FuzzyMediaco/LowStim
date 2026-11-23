# LowStim desktop third-party components

- [Electron](https://www.electronjs.org/), MIT. Its included notices cover Chromium and other runtime components.
- [llama.cpp b6348](https://github.com/ggml-org/llama.cpp/tree/b6348), MIT. The desktop planner uses the same C++ scene engine as the Android app. Its MIT license is included in the app.
- [whisper.cpp v1.7.6](https://github.com/ggml-org/whisper.cpp/tree/v1.7.6) and the converted [Whisper tiny.en model](https://huggingface.co/ggerganov/whisper.cpp), MIT. LowStim uses the English model locally for speech recognition. The MIT license is included in the app.
- The sketch classifier was trained on a subset of the Google Creative Lab [Quick, Draw! Dataset](https://github.com/googlecreativelab/quickdraw-dataset), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Strokes were rasterized and trained into a small classifier. The desktop app includes the trained parameters.
- [Qwen2.5 1.5B Instruct GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), Apache 2.0. The model weights are distributed separately by Qwen.
