"""Fine-tune Qwen's upper attention layers to select typed LowStim catalog tools.

Requires torch, transformers==4.53.3, peft==0.16.0. The JSONL holds one
independently written test utterance per mechanic; those never enter training.
"""
import argparse
import json
import random
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

ROOT = Path(__file__).resolve().parent
SYSTEM = "Compose a LowStim pixel scene. Call the catalog with JSON only. Choose an actor, mechanic, setting and accent. Keep the requested subject and interaction. Pick an imaginative combination."


def read_examples():
    training, testing = [], []
    rows = (ROOT.parent / "training-examples.jsonl").read_text().splitlines()
    for line in rows:
        row = json.loads(line)
        train, test, answer = row["training_input"], row["held_out_input"], row["tool"]
        actor = answer["actor"]
        training.extend([(train, answer), (f"Draw a {actor.replace('-', ' ')}. {train}", answer)])
        testing.append((test, answer))
    return training, testing


def main(args):
    torch.set_num_threads(args.threads)
    torch.manual_seed(7311)
    model = AutoModelForCausalLM.from_pretrained(args.base, torch_dtype=torch.float32)
    tokenizer = AutoTokenizer.from_pretrained(args.base)
    model = get_peft_model(model, LoraConfig(
        task_type="CAUSAL_LM", r=8, lora_alpha=16, lora_dropout=0.0,
        target_modules=["q_proj", "v_proj"], layers_to_transform=list(range(16, 24)),
    ))
    model.print_trainable_parameters()
    train, test = read_examples()
    def encode(pair):
        idea, selection = pair
        prefix = tokenizer.apply_chat_template([dict(role="system", content=SYSTEM),
            dict(role="user", content=idea)], tokenize=True, add_generation_prompt=True)
        target = tokenizer.encode(json.dumps(selection, separators=(",", ":")) + "<|im_end|>", add_special_tokens=False)
        return torch.tensor([prefix + target[:-1]]), torch.tensor(target), len(prefix)-1

    train, test = list(map(encode, train)), list(map(encode, test))
    def objective(batch):
        ids, target, start = batch
        base = model.get_base_model()
        states = base.model(ids, use_cache=False).last_hidden_state[0, start:]
        logits = base.lm_head(states)
        return torch.nn.functional.cross_entropy(logits, target), (logits.argmax(-1) == target).float().mean().item()
    @torch.no_grad()
    def evaluate():
        model.eval()
        results = [objective(item) for item in test]
        return {"loss": round(sum(loss.item() for loss, _ in results)/len(results), 4),
                "teacher_forced_token_accuracy": round(sum(acc for _, acc in results)/len(results), 4)}

    random.seed(7311)
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=0.001)
    baseline = evaluate()
    print("Initial", baseline, flush=True)
    best = baseline["loss"]
    report = {"model": "Qwen/Qwen2.5-0.5B-Instruct", "revision": "7ae557604adf67be50417f59c2c2f167def9a775",
              "training_examples": len(train), "held_out_examples": len(test), "seed": 7311,
              "hardware": "CPU", "baseline": baseline, "epochs": []}
    args.output.mkdir(parents=True, exist_ok=True)
    for epoch in range(1, args.epochs + 1):
        random.shuffle(train)
        model.train()
        for i, item in enumerate(train):
            loss, _ = objective(item)
            (loss / 4).backward()
            if (i + 1) % 4 == 0 or i + 1 == len(train):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                optimizer.zero_grad()
        score = evaluate()
        print("Epoch", epoch, score, flush=True)
        report["epochs"].append(score)
        if score["loss"] < best:
            model.save_pretrained(args.output, save_embedding_layers=False)
            best = score["loss"]
            report["selected_epoch"] = epoch
        (args.output / "metrics.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("base", help="the local model directory or a Hugging Face model ID")
    p.add_argument("output", type=Path)
    p.add_argument("--epochs", type=int, default=2)
    p.add_argument("--threads", type=int, default=2)
    main(p.parse_args())
