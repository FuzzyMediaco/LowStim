import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../cloud/worker.mjs";

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../cloud/schema.sql",import.meta.url),"utf8"));
  const DB = {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        first() { return stmt.get(...args); },
        all() { return {results: stmt.all(...args)}; },
        run() { return {meta: stmt.run(...args)}; }
      };
    },
    batch(statements) { return statements.map(q => q.run()); }
  };
  const origin = "https://lowstim.example";
  const api = (path, {data, cookie, wrongOrigin} = {}) => worker.fetch(new Request(origin+"/api/"+path,{
    method: data ? "POST" : "GET", headers: {Origin:wrongOrigin || origin,"Content-Type":"application/json", Cookie:cookie || ""},
    body: data && JSON.stringify(data)
  }),{DB});
  return {api,sqlite};
}

test("registration, session, tenant isolation and idempotent cloud saves",async () => {
  const {api} = fixture();
  const creds = {name:"Quiet_Artist",password:"a-long-secret-phrase"};
  const reg = await api("register",{data:creds});
  assert.equal(reg.status,200);
  const a = reg.headers.get("Set-Cookie").split(";")[0], user = (await reg.json()).user;
  const b = (await api("register",{data:{...creds,name:"SecondUser"}})).headers.get("Set-Cookie").split(";")[0];
  assert.equal((await api("register",{data:creds})).status,409);
  assert.equal((await api("login",{data:{...creds,password:"wrong-password"}})).status,401);
  assert.equal((await api("login",{data:creds})).status,200);
  assert.equal((await api("status",{cookie:a})).status,200);
  assert.equal((await api("creations")).status,401);
  const record = {id:"scene-1",owner:user.id,title:"Moonrise",recipe:{subject:"rocket",seed:123}};
  for (let i=0;i<2;i++) assert.equal((await api("creations",{data:record,cookie:a})).status,200);
  assert.equal((await (await api("creations",{cookie:a})).json()).creations.length,1);
  assert.equal((await (await api("creations",{cookie:b})).json()).creations.length,0);
  assert.equal((await api("creations",{data:record,cookie:b})).status,409);
  assert.equal((await api("creations",{data:record,cookie:a,wrongOrigin:"https://elsewhere.example"})).status,403);
  assert.equal((await api("creations",{data:{...record,recipe:"a".repeat(50000)},cookie:a})).status,413);
  await api("logout",{cookie:a,data:{}});
  assert.deepEqual(await (await api("status",{cookie:a})).json(),{user:null});
});
