"""Split verified weights into Worker assets and index the full zero-compression model bundle."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import zipfile
from urllib.parse import urlparse

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
dest = dist / "download"
parser = argparse.ArgumentParser()
parser.add_argument("model_dir", type=Path, help="Directory with the two weight files named as in model-assets.json")
parser.add_argument("--complete", type=Path, help="Assemble this ZIP after building dist/download/LowStim-offline.zip")
parser.add_argument("--android", type=Path, help="Optionally publish a signed native Android ZIP alongside the desktop download")
args = parser.parse_args()
weights = json.loads((dist / "model-assets.json").read_text())["weights"]
index = {}
parts = {}
(dest / "packs").mkdir(parents=True, exist_ok=True)
for kind, model in weights.items():
    filename = Path(urlparse(model["url"]).path).name
    path = args.model_dir / filename
    pieces = []
    hasher = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(20 * 1024**2):
            hasher.update(chunk)
            part = dest / "packs" / f"{kind}-{len(pieces):02d}.bin"
            if not part.exists() or hashlib.sha256(part.read_bytes()).digest() != hashlib.sha256(chunk).digest():
                part.write_bytes(chunk)
            pieces.append({"path": "/" + str(part.relative_to(dist)), "bytes": len(chunk)})
    if hasher.hexdigest() != model["sha256"] or path.stat().st_size != model["bytes"]:
        raise ValueError("Weight verification failed for " + filename)
    index["/model-packs/" + filename] = {"bytes": model["bytes"], "sha256": model["sha256"], "parts": pieces}
    parts[filename] = pieces

if args.complete:
    slim = dest / "LowStim-offline.zip"
    args.complete.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(slim, args.complete)
    with zipfile.ZipFile(slim) as base:
        prefix = base.start_dir
    with zipfile.ZipFile(args.complete, "a") as full:
        for name in parts:
            # Keep model bytes seekable, hashable and reusable for individual model downloads.
            full.write(args.model_dir / name, "LowStim/slate/model-packs/" + name, compress_type=zipfile.ZIP_STORED)
    pieces = [{"path": "/download/LowStim-offline.zip", "bytes": prefix}]
    with zipfile.ZipFile(args.complete) as bundle, args.complete.open("rb") as data:
        for i, (name, chunks) in enumerate(parts.items()):
            info = bundle.getinfo("LowStim/slate/model-packs/" + name)
            assert data.seek(info.header_offset) == info.header_offset
            header = data.read(30)
            size = int.from_bytes(header[26:28], "little") + int.from_bytes(header[28:30], "little")
            header += data.read(size)
            segment = dest / f"zip-header-{i}.bin"
            segment.write_bytes(header)
            pieces.append({"path": "/download/" + segment.name, "bytes": len(header)})
            pieces.extend(chunks)
        data.seek(bundle.start_dir)
        tail = data.read()
        (dest / "zip-end.bin").write_bytes(tail)
        pieces.append({"path": "/download/zip-end.bin", "bytes": len(tail)})
    size = args.complete.stat().st_size
    assert size == sum(piece["bytes"] for piece in pieces)
    with args.complete.open("rb") as contents:
        checksum = hashlib.file_digest(contents, "sha256").hexdigest()
    index["/download/LowStim-complete.zip"] = {"bytes": size, "sha256": checksum, "parts": pieces}
    print(args.complete, size, "bytes", checksum)
if args.android:
    with zipfile.ZipFile(args.android) as apk_archive:
        if apk_archive.namelist() != ["LowStim.apk"] or apk_archive.testzip() is not None:
            raise ValueError("Expected a tested ZIP containing LowStim.apk")
    pieces = []
    hasher = hashlib.sha256()
    with args.android.open("rb") as source:
        while chunk := source.read(20 * 1024**2):
            hasher.update(chunk)
            part = dest / "packs" / f"android-{len(pieces):02d}.bin"
            part.write_bytes(chunk)
            pieces.append({"path": "/" + str(part.relative_to(dist)), "bytes": len(chunk)})
    index["/download/LowStim-Android-ARM64.zip"] = {"bytes": args.android.stat().st_size, "sha256": hasher.hexdigest(), "parts": pieces}
(dest / "files.json").write_text(json.dumps(index, separators=(",", ":")))
