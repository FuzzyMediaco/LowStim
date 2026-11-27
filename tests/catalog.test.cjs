"use strict";
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
require("../dist/catalog.js");

// Compare executable behavior using the same seed and event stream. Descriptor
// IDs, textual objective labels, trajectory and placement aren't part of these
// signatures, so renaming styles or moving an identical game cannot pass.
function gameTrace(descriptor) {
  const trace = [];
  let random = 227;
  for(let trial=0;trial<8;trial++) {
    const state=Catalog.gameRules(descriptor,44);
    const outcomes=[];
    for(let i=0;i<24;i++) {
      random=(Math.imul(random,1664525)+1013904223)>>>0;
      const x=(random&255)/255,y=((random>>>8)&255)/255, choice=(random>>>16)%6;
      if(choice===0||choice===1) Catalog.gameInput(state,"press",x,y);
      else if(choice===2) Catalog.gameInput(state,"release",x,y);
      else if(choice===3||choice===4) Catalog.gamePoint(state,x,y);
      const speedAtInput=Catalog.gameSpeed(state);
      Catalog.gameTick(state,(choice+1)*.51,state.isDown);
      if(i===16 && trial%2===0) Catalog.gameFinish(state);
      outcomes.push([speedAtInput,Catalog.gameSpeed(state),Catalog.gameFinish({...state}),Catalog.gameRescue({...state})]);
    }
    trace.push(outcomes);
  }
  return createHash("sha256").update(JSON.stringify(trace)).digest("base64");
}
function animationTrace(descriptor) {
  const poses=[];
  for(const t of [0,1.1,3.3,6.9,9.4]) {
    for(const [taps,age,held] of [[0,0,false],[1,.22,true],[2,1.21,false],[3,.89,false]]) {
      const pose=Catalog.animationFrame(descriptor,t,taps,age,held);
      Object.values(pose).forEach(v=>assert.ok(Number.isFinite(v)));
      poses.push(pose);
    }
  }
  return createHash("sha256").update(JSON.stringify(poses)).digest("base64");
}
function checkStyles(kind) {
  const all = Catalog.styles(kind), signatures = new Set();
  for (const descriptor of all) {
    const seeded = Catalog.style(kind,descriptor.id,887), other=Catalog.style(kind,descriptor.id,111);
    assert.equal(seeded.mechanic,other.mechanic);
    const traced = kind==="game" ? gameTrace(descriptor) : animationTrace(descriptor);
    signatures.add(JSON.stringify([Catalog.rule(descriptor),traced]));
    for (const p of Array.from({length:7}, (_,i) => Catalog.layout(seeded,i,7,23))) {
      assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
    }
    assert.equal(Catalog.style(kind, descriptor.id), descriptor);
    assert.equal(Catalog.styleFor(kind,descriptor.mechanic,5078).mechanic,descriptor.mechanic);
  }
  assert.equal(signatures.size, all.length);
  assert.ok(signatures.size > 1000);
  return signatures.size;
}
function rasterFingerprint(mask, packed) {
  packed.fill(0);
  for (let i = 0; i < mask.length; i++) if (mask[i] === 1) packed[i >> 3] |= 1 << (i & 7);
  // Treat transparent and white as the same. A stamp must look distinct even
  // on a pure white background for it to count towards the visual inventory.
  return createHash("sha256").update(packed).digest("base64");
}
function auditArt(full) {
  const seen = new Set(), kits = new Set(), packed = new Uint8Array(Math.ceil(Catalog.rasterSize**2/8));
  const stride = full ? 1 : 47;
  for (const family of Catalog.families) {
    for (let variant = 0; variant < Catalog.variantsPerFamily; variant += stride) {
      const id = Catalog.blockId(family, variant);
      assert.equal(Catalog.block(id).variant, variant);
      assert.equal(Catalog.block(id).family, family);
      const mask = Catalog.raster(id);
      const signature = rasterFingerprint(mask, packed);
      assert.ok(packed.some(byte => byte > 0), family + " rendered empty");
      seen.add(signature);
      if (variant>=Catalog.firstKit) kits.add(signature);
    }
  }
  if (full) {
    assert.ok(seen.size > 100000);
    // These hashes represent different assemblies drawn at identical geometry
    // and aspect with the same solid pen; aesthetic variants are excluded.
    assert.ok(kits.size > 100000);
    assert.equal(kits.size,Catalog.kitCount);
    assert.equal(seen.size,Catalog.blockCount);
  }
  return {distinctRasters:seen.size, distinctStructuralAssemblies:kits.size};
}
assert.equal(Catalog.familyFor("Please draw a bag of money."), "money-bag");
assert.equal(Catalog.familyFor("a crumpled pirate ship"), "pirate-ship");
assert.equal(Catalog.familyFor("a rocket ship"), "rocket");
assert.equal(Catalog.familyFor("obscure unknown scribble"), null);
const fitted = Catalog.assemble("rocket","wing","nozzle");
assert.deepEqual(Catalog.block(fitted).fittings,["wing","nozzle"]);
assert.notEqual(fitted,Catalog.assemble("rocket","nozzle","wing"));
assert.equal(Catalog.assemble("rocket","unknown","wing"),null);
assert.equal(Catalog.block(-1), null);
assert.equal(Catalog.blockId("unlisted family",2), null);
assert.equal(Catalog.style("game",-1), null);
assert.equal(Catalog.blockId("rocket",2000),Catalog.blockId("rocket",0));
const full = process.argv.includes("--full");
console.log(JSON.stringify({masters:Catalog.families.length, blocks:Catalog.blockCount,
  whiteBackground:auditArt(full), fullInventory:full,
  animationStyles:checkStyles("animation"), gameStyles:checkStyles("game")}, null, 2));
