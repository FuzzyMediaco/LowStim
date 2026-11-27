# LowStim catalog adapter

LowStim ships an F16 GGUF LoRA adapter for Qwen2.5-0.5B-Instruct. The adapter trains 180,224 attention parameters (rank 8, with query and value projections in layers 16–23). Its paired base checkpoint is revision `7ae557604adf67be50417f59c2c2f167def9a775`. Importing a different model requires a compatible adapter. The app also offers a procedural planner.

The 26 authored tool examples in `../training-examples.jsonl` each have one training input and an independently worded evaluation input. Training adds one drawing-prefixed phrasing per training input. The resulting 52 training utterances cover 13 animation and 13 game mechanics. The supervised targets name an actor family, mechanic, setting and accent family. The application grammar additionally supports attached parts, a sprite variant, a motion path and a layout. The engine combines these selections with a seeded style and validates the recipe before rendering.

Training and validation used CPU PyTorch 2.8.0, Transformers 4.53.3 and PEFT 0.16.0. The run trained two epochs. The saved second epoch reduced validation token loss from 1.7430 to 0.6307. Teacher-forced token accuracy increased from 63.91% to 87.57%. Validation was used to select the epoch. The examples share tool targets with training. This metric measures catalog vocabulary learning on paraphrases. Sketch recognition, novelty and play quality need separate evaluations. The model base is licensed under Apache 2.0. [Qwen model card](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct)

## Reproducing the adapter

Download the pinned base checkpoint into a directory, set `QWEN_BASE` to the directory, and set `LLAMA_SRC` to a checkout of llama.cpp tag `b6348` with its Python conversion dependencies installed.

```sh
python offline/tuning/train.py "$QWEN_BASE" /tmp/lowstim-adapter --epochs 2 --threads 2
python "$LLAMA_SRC/convert_lora_to_gguf.py" --base "$QWEN_BASE" --outtype f16 \
  --outfile dist/model-runtime/wllama/lowstim-lora.gguf /tmp/lowstim-adapter
```

The shipped adapter is 723,648 bytes. SHA-256 is `0023310d04f7324992d2fe73548fcc534f309f5d182a2947d8bfd1c2ac086848`. Conversion metadata can affect the byte digest on a repeat build.

To compare decoded tools, launch a local llama.cpp server with the supported Q4_K_M GGUF and `--lora dist/model-runtime/wllama/lowstim-lora.gguf`. Run `node offline/tuning/evaluate.mjs http://127.0.0.1:9327 /tmp/decoded.json`. It exercises the real app prompt and GBNF, then measures validated responses and individual field matches with and without the adapter. A valid alternative under a creative prompt can differ from the reference. The sailboat and pirate ship families count as equivalent in the actor score.

Both quantized runs produced 26 valid tool calls from 26 validation prompts. Stock matched 20 actors, 14 mechanics, 20 settings and 8 accents. Tuned matched 20 actors, 14 mechanics, 20 settings and 11 accents. See `decoded.json` for the counts.

## Sketch recognizer

The separate embedded sketch classifier has a 400-input, 176-hidden-unit ReLU network, quantized to int8. The 52 labels cover 49 categories from the [Google Quick, Draw! dataset](https://github.com/googlecreativelab/quickdraw-dataset), plus procedurally varied authored sketches for rockets, witches and money bags. Training used 56,160 examples and held out 6,240. Post-quantization top-1 accuracy was 68.88% across all 52 classes. The synthetic categories have no human-drawn training examples in this run. A drawing outside this vocabulary can still produce a creation through the scribble interpreter.

Google Quick, Draw! drawings are by Google Creative Lab and contributors under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Training downloads simplified strokes, normalizes them, rasterizes them, and fits local weights.

```sh
OPENBLAS_NUM_THREADS=1 python sketch/train-expanded.py /tmp/lowstim-quickdraw dist/sketch-model.js
node --test offline/scene.test.cjs
```
