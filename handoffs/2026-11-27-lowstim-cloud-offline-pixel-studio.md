# LowStim cloud and offline pixel studio handoff

**November 27, 2026 · Release 0.3.1 · First hardware target: Pixel 9 Pro**

LowStim is running on Brigham’s Cloudflare account. The hosted studio, installed web app and downloadable desktop edition share the same canvas, planner, catalog, game engine, trained adapter and Whisper runtime. The desktop ZIP includes both base models. The production application source is on `main` at `c9f3d3e`, tagged `v0.3.1`. This handoff follows the application commit. [Open the studio](https://lowstim.fuzzymedia.workers.dev/) · [GitHub release](https://github.com/FuzzyMediaco/LowStim/releases/tag/v0.3.1) · [Application source](https://github.com/FuzzyMediaco/LowStim/tree/c9f3d3e8929ce1674ded3d14618d53a9f03489d4)

## What Brigham asked for

- Use this chat for ongoing LowStim work. Preserve the quiet, offline creative slate. **Doodle Forge** is its former name. The private Sites prototype has a separate source and deployment. The latest request specified Cloudflare first.
- Open on white paper with subtle gray graph-paper dots. Drawing works immediately. A long press or double tap should offer microphone and keyboard icons at that point. Carry the monochrome Kindle/calculator pixel look through the ink, artwork, menus, font, icons and transcription.
- Use a local small language model and a local copy of OpenAI Whisper. Drawing, speech and typing should reach the same creative system. A rough or unintelligible scribble should still produce something imaginative.
- Let the model build with more than 100,000 reusable parts across shapes, fragments, glyphs, people, animals, machines, vehicles, weather and celestial objects. Supply more than 1,000 reusable animation styles and more than 1,000 game styles. Each style should support different creations on repeated prompts. Train the model to use the parts.
- Examples included a pirate ship with tap-activated cannons, a peaceful sailboat, an overhead obstacle course, a witch, a money bag and a car. A rocket might hop on a tap, climb into space while held, or become an assembly puzzle on a later request.
- Include five stimulation levels from Low to Max. Low should allow a quiet movable picture. Higher levels should enable richer motion, goals and interaction. Give each creation a name and an explicit top-right save button. Hosted accounts save to the cloud. A signed-in downloadable edition should save on its device.
- Make the online and offline editions equally capable at generation. Support 64-bit devices. The implementation interprets “64 bit” as the requested retro pixel aesthetic plus real 64-bit native executables. It uses an integer grid and grayscale art. Hardware selection and performance targets follow a physical Pixel test.
- At wrap-up, finish the in-progress work, test it, push verified work to `main`, deploy and verify the stable version, and leave a dated, resumable record. No additional product work was requested during wrap-up.

## What shipped

| Area | Current implementation |
| --- | --- |
| Canvas and input | Dotted white opening, pixel ink and font, anchored gesture chooser, keyboard access, drawing after a pause, editable speech transcript, and a brief sketch-to-scene transition that respects reduced motion. Speech generates automatically after about 3.2 seconds. Focusing the transcript pauses generation. Closing it, tapping outside, or pressing Escape discards that dictation. |
| Recognition and planning | A quantized 52-category sketch classifier interprets strokes. An uncertain result uses the mark’s shape as creative input. Text, transcript and sketch evidence feed one planner. Qwen generates constrained catalog requests. Explicit subject and mechanic requests ground the result. A local procedural planner also works before model setup or after an inference failure. |
| Building blocks | 153 master silhouettes yield 306,000 individually addressable pixel blocks. Of these, 156,672 are structural assemblies made by mounting two fittings. The other 149,328 vary ink or geometry. The exhaustive test found 306,000 distinct 48×48 rasters on white. The planner can select actor families, accents, attached parts and variants. |
| Game and animation styles | 1,300 game styles combine 13 mechanics, ten goals and ten input or timing rules. 1,300 animation styles combine 13 behaviors, ten story sequences and ten touch responses. Placement, path and scene seed can vary within a style. Interaction code implements launch physics, assembly, steering, dodge, sailing, matching, catching and other loops. |
| Variation and replay | New scenes get fresh seeds. Recent choices help rotate mechanics for repeated bare subjects. Explicit instructions retain priority. Saves keep the seed, style, parts, setting and generated title so reopening a creation reproduces it. |
| Accounts and saves | Usernames and passwords authenticate against a Worker backed by D1. Passwords use salted PBKDF2, sessions use HTTP-only cookies, and cloud libraries are scoped by account ID. The bookmark control commits the save. Guests and installed editions use device storage. Hosted saves can queue locally while offline. The library imports compatible original guest saves. |
| Local models | Qwen2.5-0.5B-Instruct Q4_K_M (491,400,032 bytes), a 723,648-byte LowStim LoRA adapter, and English Whisper tiny.en Q5_1 (32,166,155 bytes). Browser inference uses local WebAssembly. Setup verifies model hashes before persisting them. The complete desktop bundle can provision both models from disk with networking disabled. |
| Native builds | The portable desktop ZIP has unsigned 64-bit Windows, Linux, Intel Mac and Apple silicon launchers. The launcher opens the shared studio on a fixed loopback origin. A separate test-signed ARM64 Android package uses native Whisper and imports Qwen. Electron remains a separate native packaging path. |

## Releases and deployment

| Surface | Where to get it and how it behaves |
| --- | --- |
| Hosted studio | [Cloudflare production](https://lowstim.fuzzymedia.workers.dev/). For account-backed cloud saves, sign in and use the regular browser tab. |
| Offline on Pixel | Open the hosted site in Chrome. Open **Menu → Offline → Keep offline**, enable Qwen and Whisper, then install the web app. Sign in while connected. Use a regular browser profile to retain saves and verified weights. |
| Complete offline desktop | [Download ZIP, 539,740,504 bytes](https://lowstim.fuzzymedia.workers.dev/download/LowStim-complete.zip). Extract the entire folder, open the launcher for the OS and enable both included models in the Offline menu. It serves on `127.0.0.1:41731`. Its account proxy permits authentication only. Creations stay in the device library. |
| Smaller desktop download | [App-only ZIP, 16,173,953 bytes](https://lowstim.fuzzymedia.workers.dev/download/LowStim-offline.zip). Model setup can download the verified files or import them from disk. |
| Native Pixel test package | [Android ARM64 ZIP](https://lowstim.fuzzymedia.workers.dev/download/LowStim-Android-ARM64.zip). Extract `LowStim.apk`. Version 0.3.1, code 4, minimum Android 12. Bundles Whisper and the adapter, needs a compatible Qwen GGUF import for native planning, has no Internet permission and keeps saves local. Use the installed web edition for account sign-in on Pixel. |

The Worker is `lowstim` on the `fuzzymedia.workers.dev` subdomain. Production deployment identifier: `c9a2111897914a1c97fd758b0b91d38a`. Its bindings are `ASSETS` for static assets and `DB` for the dedicated `lowstim-accounts` D1 database (`f48f82e6-ef40-4e65-956c-f71ac4f6fd2e`). There is no cloud generation dependency. The Worker streams large downloads from verified chunks and supports HTTP byte ranges. Direct Cloudflare distribution also resolved a GitHub release-asset upload authentication failure. The GitHub release links to the verified Cloudflare assets.

| Verified output | SHA-256 |
| --- | --- |
| Complete desktop ZIP | `336cd50fcc57c5f666c329c9d55d4b170e8221f0cd3ec4e92fa50d9f6b489be2` |
| App-only desktop ZIP | `3bc09b261a05f24eb1a2fe2d536889489e4502bd730b75f070aba6f3b9893ce6` |
| Android ZIP | `bc9717ee3aeadc1133fcc13124481f5bef4335a4ece9205df32dc01a1400f071` |
| Extracted APK | `9b9c993415936a85dc4735967fef1315963b6f1393782c0d4a46e03c0ef9cb09` |

## Where to work

| Files | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/slate.css`, `dist/slate.js`, `dist/studio-menu.js`, `dist/fonts/` | Canvas, gestures, input state, transcript lifecycle, reduced motion, menus, setup, levels and explicit saving. |
| `dist/catalog.js`, `dist/scene.js`, `dist/world.js` | Addressable parts and executable style rules, recipe construction and validation, renderer, simulation, pointer input and legacy replay. |
| `dist/sketch-model.js`, `sketch/train-expanded.py` | Bundled classifier and reproducible training. The rocket, witch and tied money-bag training categories use synthetic strokes. |
| `offline/scene.schema.json`, `offline/training-examples.jsonl`, `offline/tuning/` | Scene schema, training examples, training and evaluation scripts, metrics and limitations. The trained adapter ships in `dist/model-runtime/wllama/lowstim-lora.gguf`. |
| `dist/local-models.js`, `dist/mic-worklet.js`, `dist/model-assets.json`, `dist/model-runtime/` | Verified model setup, CPU inference, microphone audio, pinned upstreams, bundled runtimes and licenses. |
| `dist/account.js`, `cloud/worker.mjs`, `cloud/schema.sql`, `cloud/deploy.mjs` | Device library, account APIs and D1 schema, asset routing, resumable download assembly and deployment. |
| `dist/offline.js`, `download/sw-template.js`, `download/launcher.go`, `tools/build-offline.py`, `tools/model-downloads.py` | Offline installation, generated service worker, loopback launchers and package generation. `dist/download/` is generated and intentionally excluded from Git. |
| `android/`, `desktop/`, `.github/workflows/` | Native packaging, Android model and speech bridges, Electron protocol and resources, CI build and smoke tests. |
| `tests/`, `offline/scene.test.cjs` | Accounts, byte ranges, catalog, world mechanics, planner, offline models and transcript lifecycle regression tests. |

The prior verified baseline was `07d2fe8`. The studio, local models, accounts and download pipeline landed in `392b44f`. Commit `f549168` added native Android distribution on Cloudflare. Commits `1d846b4` and `c9f3d3e` added editable transcripts and fixed cancellation. All are ancestors of `main`. The local development branch `lowstim/cloud-offline-studio` points to already-integrated work. There is no unfinished implementation on a separate branch. The old `v0.2.0`, `desktop-v0.2.1` and private Sites builds are historical.

## Verification and evidence

- The 18 fast planner, catalog, world, account and download checks passed. The exhaustive catalog audit rendered all blocks against white. A Chromium sweep started, interacted with and painted all 2,600 style IDs. Targeted tests exercised rocket tap vs hold and landing, assembly completion/replay, boat dodging, cannon hits, still pictures, scoring and legacy scenes.
- Production returned the expected shell, CSS, fonts, JavaScript and WebAssembly. The complete ZIP, app-only ZIP, native ZIP and extracted APK matched the checksums above after a live download. HEAD and cross-part range requests passed. The production root and runtime assets served the cross-origin isolation headers.
- Two temporary accounts on production confirmed registration, sign-in, cookie sessions, saved-library isolation and recovery after signing in again. A separate temporary account signed in through the downloaded loopback launcher, kept its identity offline, and saved a creation that remained absent from its hosted library. All QA accounts, sessions and associated cloud records were removed.
- Chromium installed both real models, went offline, reopened the PWA and produced a playable rocket launch using the local Qwen adapter. Whisper transcribed a reference WAV and a simulated microphone. In the final release a simulated voice saying “pirate ship” was heard as “fire and ship.” Editing the visible transcript offline produced the intended pirate ship sailing on the ocean. The live UI regression also verified auto-submit, edit, Escape, outside tap and dismissal before another drawing.
- A rough three-stroke boat drawn directly on the hosted mobile viewport produced a sailboat assembly game. The Linux launcher opened the extracted complete ZIP and provisioned its bundled weights, generated a rocket, saved it and reopened the same recipe without external requests.
- The final Android APK passed v3 signature, ARM64 ABI, version, ZIP integrity and alignment checks. GitHub’s Android build for the application commit succeeded. The final desktop packaging and launch/speech checks passed on all four runners: Windows x64, Linux x64, Apple silicon and Intel Mac. The portable desktop ZIP on Cloudflare is a separate, verified four-launcher distribution. [Android run](https://github.com/FuzzyMediaco/LowStim/actions/runs/46073488228) · [Desktop run](https://github.com/FuzzyMediaco/LowStim/actions/runs/46073488179)

## Training results and known limits

- The expanded classifier trained on 56,160 examples and scored **68.88%** on 6,240 held-out examples across 52 categories. Uncertain scribbles can generate a playful interpretation. Arbitrary drawings can receive the wrong label. Synthetic icon accuracy does not establish accuracy on Brigham’s handwriting.
- The Qwen adapter trained on 52 utterances covering 26 authored tool examples, with 26 held-out paraphrases. Teacher-forced token accuracy increased from 63.91% to 87.57%. In actual constrained decoding both tuned and stock models produced 26 valid plans. The tuned model matched 20 intended actors, 14 mechanics, 20 settings and 11 accents. Stock matched eight accents. The app’s explicit-request handling and validated fallback remain important. [Training report](../offline/tuning/README.md)
- The shipped library and creative space are finite. Seeds, composition and recent-history rotation provide variation. Similar outputs remain possible. The five levels and authored rules need real play feedback.
- **Physical Pixel 9 Pro testing is still open.** There is no confirmed physical installation, real microphone pass, thermal test, first/warm inference timing, or full airplane-mode run on Brigham’s phone. Browser automation used a mobile viewport and simulated audio. Other browser profiles, device storage pressure and real desktop microphones also need field feedback.
- The Android test signer can differ from earlier builds or future CI runs. Before promising in-place updates that preserve local saves, establish a durable signing-key arrangement. Keep all signing material outside Git. The loopback desktop launchers are unsigned. The native wrappers and installed web edition have different account capabilities as described above.
- A sub-$100 tablet, kiosk rollout, 60 fps and a two-to-three-second response were earlier targets. No purchase, performance guarantee or kiosk deployment is recorded.

## Resume in this order

1. **Start with Brigham’s Pixel.** Open the hosted slate, draw a boat, try a rocket hop and sustained flight, then try assembly and one ambiguous scribble. Use Offline to enable both models and install the web app. Sign in once, turn on airplane mode, speak a prompt, check the transcript and planner label, save, close and reopen. Record actual timing, heat, microphone permissions, failures and which interactions felt calm or fun. Record whether any APK issue happens during download, extraction or installation.
2. **Use observed misses to guide improvements.** Preserve the input or sketch only with Brigham’s permission. Distinguish errors in transcription, classification, intent selection and rendering before retraining. Grow held-out hand-drawn and spoken examples independently of training data. Compare decoded tool fields and playable outcomes. Keep exact replay of old saved recipes.
3. **Reproduce a release before changing distribution.** Fetch current `main`, check `git status`, then serve `dist/` locally. Run the commands below. Build final shell and Android assets from the same source revision. Include the verified Android ZIP when generating the final download index used by the production deploy guard. The [README](../README.md) covers prerequisites, launchers, model basenames, D1 bindings and deployment credentials.
4. **Verify what actually shipped.** After an authorized deployment, fully download the files, compare SHA-256 and test byte ranges. Check `/api/status`, cloud account isolation, offline shell reload, models and on-device saves. Update release links and this record when status changes. A successful native workflow can still leave an old fixed prerelease tag untouched.

```sh
git fetch origin main
git status -sb
node --test tests/*.mjs tests/*.test.cjs offline/scene.test.cjs
node tests/catalog.test.cjs --full
python3 tests/transcript_ui.py
```

The transcript UI test uses Python Playwright and Chromium. The real-model offline test uses Node Playwright, Chromium, the two pinned weight files and a sample WAV. Run `node tests/browser-models.cjs QWEN_FILE WHISPER_FILE JFK_WAV` with `CHROMIUM_PATH` set when using system Chromium. The base model files are large and stay outside Git. Preserve the small trained adapter, pinned hashes, offline shell stamping and APK verification steps. Service-worker updates must continue to preserve the independently cached user models.
