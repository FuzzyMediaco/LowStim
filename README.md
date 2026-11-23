# LowStim

A blank, black-and-white slate. Draw a sketch or tap anywhere to type or speak. The app classifies sketches and renders a new interactive drawing from the detected object. A rough boat becomes a pirate ship. The original strokes disappear when the newly drawn scene appears.

## Desktop test

Download the archive for your computer from [LowStim Desktop Releases](https://github.com/FuzzyMediaco/LowStim/releases/tag/desktop-v0.2.1). Extract the entire archive, then open **LowStim.exe** on Windows or **LowStim.app** on macOS. On Linux, open **LowStim** inside the extracted folder. The test releases are unsigned on Windows and ad hoc signed on macOS.

Draw on the blank slate, or click the slate to type or use **Mic**. On desktop, click **Stop** when you've finished speaking. The desktop app includes offline English speech recognition and the sketch classifier. To enable local AI planning, download the [Qwen GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf) and use **··· → Import Qwen GGUF**. No emulator, account, or local server is needed.

## Phone test

1. Download the signed APK from [GitHub Releases](https://github.com/FuzzyMediaco/LowStim/releases) and install it on a 64-bit ARM phone running Android 12 or later. Open the app and draw a boat with a hull, mast, and sail. Pause or tap **Make**.
2. Tap a blank slate and type an idea, or tap **Mic** and allow microphone access. For example, say “Make a rocket dodge rocks in space.” The app bundles Vosk and a small English model. Its first use prepares the speech files locally.
3. To enable Qwen, download the [official Qwen2.5 1.5B Instruct Q4_K_M GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf). Tap the slate, open **···**, tap **Import Qwen GGUF**, and select that file. The file is around 1.1 GB. During import the phone has both the download and an app-private copy, so budget roughly 2.3 GB of free space. After importing, put the phone in airplane mode and make a new scene. Under **···**, model status shows whether the last scene used Qwen or the built-in planner. The imported model is opened on the first request.
4. Tap or swipe the scene to play. Use **···** on the finished scene to make a follow-up request, or open its options for saved creations and a blank slate. A blank slate hides the controls until you interact. Scene recipes save locally.

Speech and drawings stay on the device. Android's optional avatar voice uses an installed speech-synthesis voice flagged as local. The APK has no Internet permission and needs no account, backend, or cloud AI. Some test signing keys differ between builds, so use the same signer for updates if you want to retain local app data.

## Web preview

Serve `dist/` with any static host. No external scripts or assets are needed. The preview uses the bundled sketch classifier and a rule-based scene planner. It uses browser-local speech only when the browser exposes on-device English recognition and the existing language pack is ready. Qwen and the bundled Vosk engine run in the Android app. Touch, drawing, typing, and game controls use the same canvas code on both platforms.

The scene engine composes animated vector drawings, settings, motion, props, and touch interaction. The current vocabulary has 19 rendered subjects and a smaller trained sketch vocabulary. An uncertain sketch asks for a label, and you can give a typed refinement. The model chooses only supported parts through a JSON grammar. This release uses the stock Qwen model with constrained inference. `offline/training-examples.jsonl` holds twenty seed examples for a possible fine-tune.

## Build and publish from GitHub

The included GitHub Actions workflow builds a test-signed ARM64 APK for the main branch and manual runs. GitHub Actions exposes `LowStim-ARM64` as a downloadable artifact for each successful run. Use a persistent release signing key for stable update compatibility. Keep the keystore and its password outside Git. The workflow uses a temporary key for each build. The first successful main-branch build publishes v0.2.0 as a prerelease for phone testing.

For a local Linux build, use [JDK 17](https://adoptium.net/temurin/releases/), [Android SDK](https://developer.android.com/studio) platform 35, build tools 35.0.0, NDK r27c, and SDK CMake 3.22.1. Extract [llama.cpp b6348](https://github.com/ggml-org/llama.cpp/tree/b6348), set `LLAMA_SOURCE` to that directory, and set `ANDROID_HOME`, `ANDROID_NDK_HOME`, `FORGE_KEYSTORE`, and `FORGE_KEYSTORE_PASSWORD`. Run `android/build-apk.sh ./LowStim.apk`. The build fetches pinned Vosk/JNA libraries and the named speech model, compiles the ARM64 inference engine, packages the APK, and verifies its signature and ZIP alignment.

The normal development entry point is the GitHub repo root. For a web preview on Cloudflare Pages, use `dist` as the output directory with no build command. GitHub and the web host are development and distribution services. The phone runs its own copy of the engine and models.

## Verification

- The browser was checked for a blank launch and for rendering the pirate ship scene from a typed request. The sketch unit check identifies an independent rough sailboat and maps it to a pirate ship.
- The exported classifier was trained from 37,928 Quick, Draw! samples and held out 4,215. It scored about 80% on the held-out dataset before int8 quantization. Actual hand-drawn recognition can vary.
- The native engine was compiled for ARM64 and the same C++ engine ran the real Qwen GGUF on a host, generating an allowed pirate ship scene recipe.
- The test APK is for a first on-phone run. Measure cold and warm inference, Vosk microphone capture, thermal behavior, and a full airplane-mode run on the phone before selecting a tablet. A managed kiosk remains a separate hardware rollout step.
