import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloud/worker.mjs";

globalThis.FixedLengthStream = class extends TransformStream { constructor() { super(); } };
const origin = "https://lowstim.test";
const path = "/download/LowStim-complete.zip";
const parts = [{path:"/a",bytes:4},{path:"/b",bytes:3},{path:"/c",bytes:2}];
const data = {"/a":"1234extra slim archive directory","/b":"567","/c":"89"};
const manifest = {[path]:{bytes:9,sha256:"test",parts}};

function fixture(supportsRange) {
  const ASSETS = {async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/download/files.json") return Response.json(manifest);
    let buffer = data[pathname], status = 200;
    if (supportsRange && request.headers.has("Range")) {
      const [a,b] = request.headers.get("Range").slice(6).split("-").map(Number);
      buffer = buffer.slice(a,b+1);
      status = 206;
    }
    return new Response(buffer,{status,headers:{"Content-Length":String(buffer.length)}});
  }};
  return (method = "GET",range = "") => worker.fetch(new Request(origin + path,{method,headers:range?{Range:range}:{}}),{ASSETS},{waitUntil(){}});
}

for (const supportsRange of [true,false]) test("composite download with range support " + supportsRange,async () => {
  const request = fixture(supportsRange);
  const head = await request("HEAD");
  assert.equal(head.headers.get("Content-Length"),"9");
  assert.equal(await head.text(),"");
  assert.equal(await (await request()).text(),"123456789");
  const slice = await request("GET","bytes=3-7");
  assert.equal(slice.status,206);
  assert.equal(slice.headers.get("Content-Range"),"bytes 3-7/9");
  assert.equal(await slice.text(),"45678");
  assert.equal(await (await request("GET","bytes=-3")).text(),"789");
  assert.equal((await request("GET","bytes=19-20")).status,416);
});
