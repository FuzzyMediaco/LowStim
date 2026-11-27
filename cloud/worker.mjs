const encoder = new TextEncoder();
const sessionSeconds = 60 * 60 * 24 * 30;
const cookieName = "__Host-lowstim";
const maxBodyBytes = 32 * 1024;
const hex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
const random = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const digest = async value => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const cookie = (value, age) => `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;

function json(value, status = 200, headers = {}) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers}});
}

async function readBody(request) {
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
    throw new Response(null, {status: 415});
  }
  if (!request.body || Number(request.headers.get("Content-Length")) > maxBodyBytes) throw new Response(null, {status: 413});
  const reader = request.body.getReader();
  const data = new Uint8Array(maxBodyBytes);
  let offset = 0;
  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    if (offset + value.length > maxBodyBytes) {
      await reader.cancel();
      throw new Response(null, {status: 413});
    }
    data.set(value, offset);
    offset += value.length;
  }
  try {
    const result = JSON.parse(new TextDecoder().decode(data.subarray(0, offset)));
    if (result && typeof result === "object" && !Array.isArray(result)) return result;
  } catch {}
  throw json({error: "The request could not be read."}, 400);
}

async function verifier(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name: "PBKDF2", hash: "SHA-256", iterations: 100000, salt: encoder.encode(salt)}, key, 256));
}

function equalDigest(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function authenticate(request, db, now) {
  const token = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)__Host-lowstim=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  const hash = await digest(token);
  const user = await db.prepare("SELECT accounts.id, accounts.name FROM sessions JOIN accounts ON accounts.id = sessions.account_id WHERE sessions.digest = ? AND sessions.expires > ?").bind(hash, now).first();
  return user && {user, hash};
}

async function credentials(db, request, mode, now) {
  const {name: input, password} = await readBody(request);
  const name = typeof input === "string" ? input.trim() : "";
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(name) || typeof password !== "string" || password.length < 10 || password.length > 128) {
    return json({error: "Use a 3–32 character username (letters, numbers, _ or -) and a 10–128 character password."}, 400);
  }
  const window = Math.floor(now / 600);
  // The provider supplies the connecting address at the edge. Persist only the temporary bucket hash.
  const bucket = await digest([window, request.headers.get("CF-Connecting-IP") || "local", mode].join("/"));
  const rate = await db.prepare("INSERT INTO auth_attempts(bucket, attempts, expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts+1 RETURNING attempts")
    .bind(bucket, (window + 1) * 600).first();
  if (rate.attempts > (mode === "register" ? 10 : 40)) return json({error: "Try again in ten minutes."}, 429);
  if (rate.attempts === 1) await db.batch([
    db.prepare("DELETE FROM auth_attempts WHERE expires <= ?").bind(now),
    db.prepare("DELETE FROM sessions WHERE expires <= ?").bind(now)
  ]);
  const entry = await db.prepare("SELECT * FROM accounts WHERE name = ?").bind(name).first();
  const salt = entry?.salt || random(16);
  const check = await verifier(password, salt);
  let user;
  if (mode === "register") {
    if (entry) return json({error: "That username is taken."}, 409);
    user = {id: crypto.randomUUID(), name};
    const write = await db.prepare("INSERT INTO accounts(id,name,salt,verifier) VALUES (?,?,?,?) ON CONFLICT(name) DO NOTHING")
      .bind(user.id, name, salt, check).run();
    if (!write.meta.changes) return json({error: "That username is taken."}, 409);
  } else {
    if (!entry || !equalDigest(check, entry.verifier)) return json({error: "Check your username and password."}, 401);
    user = {id: entry.id, name: entry.name};
  }
  const token = random(32);
  await db.prepare("INSERT INTO sessions(digest,account_id,expires) VALUES (?,?,?)").bind(await digest(token), user.id, now + sessionSeconds).run();
  return json({user}, 200, {"Set-Cookie": cookie(token, sessionSeconds)});
}

async function api(request, db, url) {
  const now = Math.floor(Date.now() / 1000);
  const method = request.method, path = url.pathname;
  if (!["GET", "POST"].includes(method)) return json({error: "Method unavailable."}, 405);
  if (method === "POST" && request.headers.get("Origin") !== url.origin) return json({error: "Origin unavailable."}, 403);
  if (method === "POST" && (path === "/api/register" || path === "/api/login")) return credentials(db, request, path.slice(5), now);
  const session = await authenticate(request, db, now);
  if (path === "/api/status" && method === "GET") return json({user: session?.user || null});
  if (path === "/api/logout" && method === "POST") {
    if (session) await db.prepare("DELETE FROM sessions WHERE digest=?").bind(session.hash).run();
    return json({user: null}, 200, {"Set-Cookie": cookie("", 0)});
  }
  if (path !== "/api/creations") return json({error: "Unknown route."}, 404);
  if (!session) return json({error: "Sign in to open this library."}, 401);
  if (method === "GET") {
    if (url.searchParams.has("owner") && url.searchParams.get("owner") !== session.user.id) return json({error: "Account changed."}, 409);
    const after = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const {results} = await db.prepare("SELECT id,title,recipe,saved_at AS savedAt FROM creations WHERE account_id=? ORDER BY saved_at DESC, id LIMIT 100 OFFSET ?").bind(session.user.id, after).all();
    return json({creations: results.map(row => ({...row, recipe: JSON.parse(row.recipe)})), more: results.length === 100});
  }
  const {id, title, recipe, owner} = await readBody(request);
  if (owner && owner !== session.user.id) return json({error: "Account changed."}, 409);
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id) || typeof title !== "string" || !title.trim() || title.length > 160 ||
      !recipe || typeof recipe !== "object" || Array.isArray(recipe) || typeof recipe.subject !== "string" || recipe.subject.length > 160) {
    return json({error: "This creation could not be saved."}, 400);
  }
  await db.prepare("INSERT INTO creations(account_id,id,title,recipe,saved_at) VALUES (?,?,?,?,?) ON CONFLICT(account_id,id) DO UPDATE SET title=excluded.title,recipe=excluded.recipe")
    .bind(session.user.id, id, title.trim(), JSON.stringify(recipe), Date.now()).run();
  return json({id});
}

function requestedRange(header, size) {
  if (!header) return {start: 0, end: size - 1};
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size ? {start, end} : null;
}

// The app-only ZIP and verified model chunks are independent static assets. The virtual
// ZIP reuses their exact bytes, including the generated ZIP headers and central directory.
async function copyParts(assets, origin, parts, range, writable) {
  let position = 0;
  try {
    for (const part of parts) {
      const start = Math.max(0, range.start - position), end = Math.min(part.bytes - 1, range.end - position);
      position += part.bytes;
      if (end < start) continue;
      const res = await assets.fetch(new Request(origin + part.path, {headers: {Range: `bytes=${start}-${end}`}}));
      if (!res.ok || !res.body) throw new Error("Missing download part");
      const length = end - start + 1;
      if ((res.status === 206 || start === 0) && Number(res.headers.get("Content-Length")) === length) {
        await res.body.pipeTo(writable, {preventClose: true});
        continue;
      }
      const reader = res.body.getReader(), writer = writable.getWriter();
      let skip = res.status === 206 ? 0 : start, remaining = end - start + 1;
      try {
        while (remaining > 0) {
          const {done, value} = await reader.read();
          if (done) throw new Error("Incomplete download part");
          if (skip >= value.length) { skip -= value.length; continue; }
          const slice = value.subarray(skip, skip + remaining);
          await writer.write(slice);
          remaining -= slice.byteLength;
          skip = 0;
        }
      } finally { writer.releaseLock(); await reader.cancel(); }
      if (position > range.end) break;
    }
    await writable.close();
  } catch (error) { await writable.abort(error).catch(() => {}); }
}

async function download(request, env, url, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, {status: 405});
  const manifest = await env.ASSETS.fetch(new Request(url.origin + "/download/files.json"));
  if (!manifest.ok) return new Response(null, {status: 503});
  const file = (await manifest.json())[url.pathname];
  if (!file?.parts) return new Response(null, {status: 404});
  const zip = url.pathname.endsWith(".zip"), etag = '"' + file.sha256 + '"';
  const rangeHeader = request.headers.get("Range");
  const range = requestedRange(rangeHeader, file.bytes);
  if (!range) return new Response(null, {status: 416, headers: {"Content-Range": "bytes */" + file.bytes}});
  const length = range.end - range.start + 1;
  const headers = new Headers({
    "Content-Type": zip ? "application/zip" : "application/octet-stream", "Content-Length": String(length),
    "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=0, must-revalidate", "ETag": etag,
    "Content-Disposition": 'attachment; filename="' + url.pathname.split("/").at(-1) + '"'
  });
  if (request.headers.get("If-None-Match") === etag && !rangeHeader) return new Response(null, {status: 304, headers: {ETag: etag}});
  if (rangeHeader) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${file.bytes}`);
  const init = {headers, status: rangeHeader ? 206 : 200};
  if (request.method === "HEAD") return new Response(null, init);
  const stream = new FixedLengthStream(length);
  ctx.waitUntil(copyParts(env.ASSETS, url.origin, file.parts, range, stream.writable));
  return new Response(stream.readable, init);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (["/download/LowStim-complete.zip","/download/LowStim-Android-ARM64.zip"].includes(url.pathname) || url.pathname.startsWith("/model-packs/")) return download(request, env, url, ctx);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await api(request, env.DB, url);
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(JSON.stringify({event:"api_error",path:url.pathname,kind:error?.name}));
      return json({error: "The account service is temporarily unavailable."}, 503);
    }
  }
};
