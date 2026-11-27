// Run with Node 24. The database must already exist in the target account.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".zip": "application/zip",
};

export async function collectAssets() {
  const manifest = {};
  const files = new Map();
  for (const entry of await readdir(dist, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const key = "/" + relative(dist, path).split(sep).join("/");
    const { size } = await stat(path);
    if (size > 25 * 1024 * 1024) throw new Error("Exceeds the Workers asset size limit: " + key);
    const type = mime[extname(path)] || "application/octet-stream";
    const digest = createHash("sha256").update(type).update("\0");
    for await (const chunk of createReadStream(path)) digest.update(chunk);
    const hash = digest.digest("hex").slice(0, 32);
    manifest[key] = { hash, size };
    files.set(hash, { path, type });
  }
  return { manifest, files };
}

async function api(account, token, path, method, body) {
  const headers = { Authorization: "Bearer " + token };
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + account + path, {
    headers, method, body,
  });
  const envelope = await response.json();
  if (!response.ok || !envelope.success) {
    const reason = envelope.errors?.map(error => error.message).join(", ");
    throw new Error(method + " " + path + " (" + response.status + "): " + reason);
  }
  return envelope.result;
}

export async function uploadAssets(account, session, files) {
  if (!session.buckets.length) return session.jwt;
  let completion;
  for (const hashes of session.buckets) {
    const form = new FormData();
    for (const hash of hashes) {
      const file = files.get(hash);
      const data = await readFile(file.path);
      const actual = createHash("sha256").update(file.type).update("\0").update(data).digest("hex").slice(0, 32);
      if (actual !== hash) throw new Error("Asset changed during upload: " + file.path);
      form.append(hash, new Blob([data.toString("base64")], { type: file.type }), hash);
    }
    const result = await api(account, session.jwt, "/workers/assets/upload?base64=true", "POST", form);
    if (result?.jwt) completion = result.jwt;
  }
  if (!completion) throw new Error("Cloudflare did not confirm the asset upload.");
  return completion;
}

export function workerMetadata(database, completion) {
  return {
    main_module: "worker.mjs",
    compatibility_date: "2026-11-27",
    bindings: [
      { type: "d1", name: "DB", id: database },
      { type: "assets", name: "ASSETS" },
    ],
    assets: {
      jwt: completion,
      config: {
        _headers: [
          "/*",
          "  Cross-Origin-Opener-Policy: same-origin",
          "  Cross-Origin-Embedder-Policy: require-corp",
          "  X-Content-Type-Options: nosniff",
        ].join("\n"),
        run_worker_first: ["/api/*", "/model-packs/*", "/download/LowStim-complete.zip", "/download/LowStim-Android-ARM64.zip"],
      },
    },
  };
}

export async function validateDownloads(manifest) {
  const index = JSON.parse(await readFile(join(dist, "download/files.json"), "utf8"));
  const models = JSON.parse(await readFile(join(dist, "model-assets.json"), "utf8"));
  const required = ["/download/LowStim-complete.zip", "/download/LowStim-Android-ARM64.zip"];
  for (const model of Object.values(models.weights)) {
    required.push("/model-packs/" + new URL(model.url, "https://lowstim.invalid").pathname.split("/").at(-1));
  }
  for (const key of required) {
    const file = index[key];
    if (!file?.parts?.length) throw new Error("Build the download bundle before deployment. Missing " + key);
    let size = 0;
    for (const part of file.parts) {
      if (!manifest[part.path] || manifest[part.path].size < part.bytes) {
        throw new Error("Missing or incomplete download asset " + part.path);
      }
      size += part.bytes;
    }
    if (size !== file.bytes) throw new Error("Incorrect download size for " + key);
  }
}

async function deploy() {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, LOWSTIM_D1_ID: database } = process.env;
  if (!token || !account || !database) {
    throw new Error("Set CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and LOWSTIM_D1_ID.");
  }
  const root = "/workers/scripts/lowstim";
  const binding = await api(account, token, "/d1/database/" + database, "GET");
  if (binding.name !== "lowstim-accounts") throw new Error("Expected the lowstim-accounts database.");
  const { manifest, files } = await collectAssets();
  await validateDownloads(manifest);
  const code = await readFile(new URL("worker.mjs", import.meta.url));
  const sql = await readFile(new URL("schema.sql", import.meta.url), "utf8");
  await api(account, token, "/d1/database/" + database + "/query", "POST", { sql });
  const session = await api(account, token, root + "/assets-upload-session", "POST", { manifest });
  const completion = await uploadAssets(account, session, files);
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(workerMetadata(database, completion))], { type: "application/json" }));
  form.append("worker.mjs", new Blob([code], { type: "application/javascript+module" }), "worker.mjs");
  await api(account, token, root, "PUT", form);
  await api(account, token, root + "/subdomain", "POST", { enabled: true, previews_enabled: false });
  const domain = await api(account, token, "/workers/subdomain", "GET");
  console.log("Deployed https://lowstim." + domain.subdomain + ".workers.dev");
}

if (import.meta.main) await deploy();
