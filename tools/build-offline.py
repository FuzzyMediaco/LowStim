"""Stamp a content-addressed offline shell. Optionally build the downloadable desktop ZIP."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
parser = argparse.ArgumentParser()
parser.add_argument("--archive", type=Path)
parser.add_argument("--go", default="go")
args = parser.parse_args()
assets = sorted(p for p in dist.rglob("*") if p.is_file() and "download" not in p.relative_to(dist).parts and p.name != "sw.js")
paths = ["./" + p.relative_to(dist).as_posix() for p in assets]
version = hashlib.sha256()
for p, path in zip(assets, paths):
    version.update(path.encode())
    version.update(hashlib.sha256(p.read_bytes()).digest())
template = (root / "download/sw-template.js").read_text()
version.update(template.encode())
(dist / "sw.js").write_text(template.replace('"@VERSION@"', json.dumps(version.hexdigest()[:20])).replace('"@ASSETS@"', json.dumps(paths)))
if args.archive:
    args.archive.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        output = Path(tmp) / "lowstim.zip"
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=8) as bundle:
            for file in [*assets, dist / "sw.js"]:
                bundle.write(file, "LowStim/slate/" + file.relative_to(dist).as_posix())
            bundle.write(root / "download/Read me.txt", "LowStim/Read me.txt")
            for platform, arch, name in [
                ("windows", "amd64", "LowStim-Windows-x64.exe"),
                ("darwin", "arm64", "LowStim-Mac-Apple-Silicon"),
                ("darwin", "amd64", "LowStim-Mac-Intel"),
                ("linux", "amd64", "LowStim-Linux-x64")
            ]:
                target = Path(tmp) / name
                subprocess.run([args.go, "build", "-trimpath", "-ldflags=-s -w -buildid=", "-o", str(target), "./download/launcher.go"], check=True, cwd=root,
                               env=dict(os.environ, GOOS=platform, GOARCH=arch, CGO_ENABLED="0", GOTOOLCHAIN="local"))
                bundle.write(target, "LowStim/" + name)
        import shutil
        shutil.copyfile(output, args.archive)
    print(args.archive, args.archive.stat().st_size, "bytes")
