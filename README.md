# LowStim

[Open the slate on Cloudflare](https://lowstim.fuzzymedia.workers.dev/)

Draw directly on the dotted paper. Double-tap or hold anywhere on a blank slate to reveal the microphone, keyboard and menu. On a keyboard, press Enter to open the tools or start typing an idea. Pause after a drawing to create a scene. After you speak, tap the transcript to correct it or let it generate automatically. Try “hold the rocket to launch,” “assemble a rocket,” or “steer a boat around rocks.” The floppy disk in the upper right saves the current creation, including its seed and assembled parts, under an automatic title. Open the menu to replay it or choose a stimulation level for your next creation.

## Hosted and offline editions

The Cloudflare site, installed web app and downloadable desktop edition run the same browser scene engine and local model runtimes. The paper, text, icons, artwork and animation use a monochrome pixel style. “64-bit” describes the native launcher architectures. The canvas uses an integer pixel grid and a limited grayscale palette.

- **On Pixel or another mobile device**, open the Cloudflare site and use **Menu → Offline → Keep offline**. Set up Qwen and Whisper in the same tab. In Chrome, install the app to the home screen. Some browsers prompt to install from the menu. Use a regular browser profile so model storage survives closing the app.
- **For a computer with offline setup**, [download the complete desktop ZIP](https://lowstim.fuzzymedia.workers.dev/download/LowStim-complete.zip). Extract the whole folder, launch the executable for your operating system and choose **Offline → Enable Qwen / Enable Whisper**. This copies and verifies the two included weights locally, even with Wi-Fi disabled. Launchers support Windows x64, macOS arm64, macOS x64 and Linux x64. The binaries are unsigned. They start a local HTTP server and open the default browser at a fixed loopback address so that the same browser profile can reopen the same library.
- **For a smaller download**, the [app-only ZIP](https://lowstim.fuzzymedia.workers.dev/download/LowStim-offline.zip) includes the shared engine, runtimes and launchers. Enable the models online once or import the corresponding verified model files.
- **Cloud saves** use username/password accounts backed by Cloudflare D1, with an HTTP-only session cookie. Guest saves are on-device. The downloaded desktop and home-screen installed editions save to local browser storage under the signed-in identity. Sign in once while online. With connectivity off, the local library and models remain usable. Hosted saves made during an outage can sync when the account reconnects.

## How generation works

The embedded sketch classifier covers 52 categories and scored 68.88% on 6,240 held-out samples. Boat, rocket and witch have additional independent sketch smoke examples in the test suite. The sketch classifier, Whisper transcript and typed prompt lead into one planner. Uncertain marks can become a scene based on the stroke shape. The planner requests catalog actors, parts, accents, settings and mechanics. The runtime validates the plan and assembles a deterministic, replayable scene from it. A local built-in planner works before model setup and handles a failed model request. New creations receive fresh seeds. Recognition and novelty depend on the learned vocabulary and the available parts.

The catalog has 153 master silhouettes and 306,000 individually addressable 48×48 pixel blocks. Among them, 156,672 are two-part structural assemblies. The remaining variations change a silhouette's proportions or ink treatment. Each activity family has 1,300 reusable styles. Game styles combine 13 mechanics with ten goals and ten input or time rules. Animation styles combine 13 behaviors with ten narrative sequences and ten touch responses. Layout, motion path, scenery and individual blocks can vary inside a style. The exhaustive test renders every block against white and checks uniqueness. It also exercises the style rules.

The language model is Qwen2.5-0.5B-Instruct Q4_K_M (491,400,032 bytes). English dictation uses OpenAI Whisper tiny.en Q5_1 (32,166,155 bytes). The included LowStim LoRA adapter teaches Qwen the catalog request format. Training data, evaluation and scripts are in `offline/`. Both models run locally in WebAssembly on the web and desktop download. The app verifies the exact model hashes before making them available. Installing the web app caches the shell independently of installing the two weights. Model runtimes and fonts ship in the app. Sources and hashes are in `dist/model-assets.json`, with notices in `dist/licenses` and `dist/model-runtime`.

## Development and deployment

Serve `dist/` from localhost, for example `python3 -m http.server 8000 --bind 127.0.0.1 --directory dist`. A plain static server supports drawing, typing, local model inference and device saves. Cloud account endpoints run in `cloud/worker.mjs`.

The Worker binds a dedicated D1 database as `DB` and static assets as `ASSETS`. It serves the verified model files and complete ZIP from separately addressable binary chunks. HTTP range requests support resumable downloads. To reproduce the production assets, use Python 3.11+, Go 1.22+ and Node 24.

1. Place the two model files, with the original basenames in `dist/model-assets.json`, in a directory outside the repository.
2. Run `python3 tools/build-offline.py --archive dist/download/LowStim-offline.zip` to stamp the offline shell and cross-compile the 64-bit launchers.
3. Run `python3 tools/model-downloads.py PATH_TO_MODELS --complete /tmp/LowStim-complete.zip` to verify both weights and generate the asset chunks, ZIP directory and checksums. Pass `--android PATH_TO_ANDROID_ZIP` in the same command to publish the native test package.
4. Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `LOWSTIM_D1_ID` for the target account, then run `node cloud/deploy.mjs`. The downloaded launcher uses the production Cloudflare account origin in `download/launcher.go`.
5. Run `node --test tests/*.mjs tests/*.test.cjs offline/scene.test.cjs`. The catalog test supports an additional exhaustive raster check.

A separate [native Android ARM64 test ZIP](https://lowstim.fuzzymedia.workers.dev/download/LowStim-Android-ARM64.zip) bundles Whisper and accepts a local Qwen import. It uses an Android test signer and keeps saves on the phone. The Android and Electron directories contain the standalone native packaging paths. The web/PWA and downloadable loopback edition are the shared account-enabled product. The native wrappers keep their own device storage, speech engine and model import.

The Android build uses JDK 17, Android SDK 35 (build tools 35.0.0), NDK r27c and CMake 3.22.1. The CI workflow pins llama.cpp and provisions the other build inputs. Use the same Android signing key for in-place upgrades. The desktop workflow packages Electron and native model/speech executables for each matching worker.
