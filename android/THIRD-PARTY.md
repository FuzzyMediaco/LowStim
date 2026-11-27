# LowStim third-party components

- [llama.cpp b6348](https://github.com/ggml-org/llama.cpp/tree/b6348), MIT. This APK packages code compiled from this upstream source. The full MIT notice is included as llama-cpp-LICENSE.txt.
- [whisper.cpp v1.7.6](https://github.com/ggml-org/whisper.cpp/tree/v1.7.6), MIT. The APK includes an ARM64 CPU build and the OpenAI Whisper tiny.en English model, quantized to Q5_1. The model and code license notices are packaged in the assets.
- The embedded sketch classifier was trained on a subset of the Google Creative Lab [Quick, Draw! Dataset](https://github.com/googlecreativelab/quickdraw-dataset), CC BY 4.0. Strokes were rasterized and trained into a small classifier. The APK includes trained parameters. The [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/) applies to the original dataset.
- [Qwen2.5-1.5B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), Apache License 2.0. The model’s weights are imported by the user and distributed by Qwen.
