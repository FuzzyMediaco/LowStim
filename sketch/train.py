"""Train the embedded sketch recognizer on raw Quick, Draw! simplified files."""
import argparse
import json
from pathlib import Path

import numpy as np

CATEGORIES = {
    "boat": ["sailboat", "speedboat", "canoe"],
    "plane": ["airplane", "helicopter"],
    "rocket": ["rocket"],
    "cat": ["cat"],
    "fish": ["fish"],
    "octopus": ["octopus"],
    "car": ["car", "bus"],
    "bicycle": ["bicycle"],
    "house": ["house"],
    "tree": ["tree"],
    "bear": ["teddy_bear"],
    "bird": ["bird"],
    "flower": ["flower"],
    "umbrella": ["umbrella"],
    "dog": ["dog"],
    "cloud": ["cloud"],
}
SIZE = 20
rng = np.random.default_rng(24021)


def raster(strokes):
    points = np.concatenate(strokes)
    lo, hi = points.min(axis=0), points.max(axis=0)
    scale = 16 / max(1, max(hi-lo))
    shift = (19-(hi-lo)*scale)/2
    grid = np.zeros((SIZE, SIZE), np.float32)
    for stroke in strokes:
        stroke = (stroke-lo)*scale+shift
        for a, b in zip(stroke, np.vstack([stroke[1:], stroke[-1:]])):
            path = np.linspace(a, b, int(np.ceil(np.max(np.abs(a-b))*2))+1)
            for x, y in path:
                ix, iy = int(x), int(y)
                for dy in (0, 1):
                    for dx in (0, 1):
                        v = (1-abs(ix+dx-x))*(1-abs(iy+dy-y))
                        grid[iy+dy, ix+dx] = max(grid[iy+dy, ix+dx], v)
    return grid.ravel()


def load(source):
    full, holdout, labels = [], [], []
    for label, sources in CATEGORIES.items():
        files = [source / (name+".ndjson") for name in sources]
        files = [path for path in files if path.exists()]
        if not files:
            continue
        category = len(labels)
        labels.append(label)
        for path in files:
            rows = [json.loads(line) for line in path.read_text().splitlines()]
            rows = [row for row in rows if row.get("recognized") and row.get("drawing")]
            rng.shuffle(rows)
            rows = rows[:max(1050, 3000//len(files))]
            for index, row in enumerate(rows):
                vector = raster([np.asarray(stroke, dtype=np.float32).T for stroke in row["drawing"] if stroke[0]])
                (holdout if index%10==0 else full).append((vector, category))
        print(label, flush=True)
    return full, holdout, labels


def training(params):
    full, holdout, labels = load(params.datasets)
    shapes = [400, 128, len(labels)]
    w1 = (rng.normal(size=(shapes[0], shapes[1]))*np.sqrt(2/shapes[0])).astype("f")
    w2 = (rng.normal(size=(shapes[1], shapes[2]))*np.sqrt(2/shapes[1])).astype("f")
    b1 = np.zeros(shapes[1], np.float32)
    b2 = np.zeros(shapes[2], np.float32)
    weights = [w1, b1, w2, b2]
    first = [np.zeros_like(w) for w in weights]
    second = [np.zeros_like(w) for w in weights]
    xx, yy = np.stack([x for x, _ in full]), np.array([y for _, y in full])
    test, answers = np.stack([x for x, _ in holdout]), np.array([y for _, y in holdout])
    count = 0
    for _ in range(params.epochs):
        for batch in np.array_split(rng.permutation(len(xx)), max(1,len(xx)//128)):
            x, y = xx[batch], yy[batch]
            h = np.maximum(0, x @ w1 + b1)
            ou = h @ w2 + b2
            ou -= ou.max(axis=1, keepdims=True)
            grad = np.exp(ou)
            grad /= grad.sum(axis=1, keepdims=True)
            grad[np.arange(len(y)), y] -= 1
            grad /= len(y)
            back = (grad @ w2.T)*(h>0)
            grads = [x.T@back, back.sum(axis=0), h.T@grad, grad.sum(axis=0)]
            count += 1
            for w, m, v, g in zip(weights, first, second, grads):
                m *= .9
                m += .1*g
                v *= .999
                v += .001*g*g
                w -= (.0015*np.sqrt(1-.999**count)/(1-.9**count))*m/(np.sqrt(v)+1e-7)
        acc=np.mean(np.argmax(np.maximum(0, test@w1+b1)@w2+b2, axis=1)==answers)
        print(f"holdout accuracy {acc:.3f}", flush=True)
    models = []
    for w in weights:
        scale = float(np.abs(w).max()/127)
        import base64
        models.append([scale, base64.b64encode(np.rint(w/scale).astype("i1").tobytes()).decode()])
    payload = dict(labels=labels, hidden=shapes[1], layers=models)
    params.out.write_text("globalThis.SKETCH_MODEL="+json.dumps(payload,separators=(",",":"))+";\n")
    print("Training and holdout counts",len(full),len(holdout), flush=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("datasets", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--epochs", type=int, default=17)
    training(p.parse_args())
