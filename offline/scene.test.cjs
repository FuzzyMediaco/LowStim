const test = require("node:test");
const assert = require("node:assert/strict");
require("../dist/catalog.js");
require("../dist/sketch-model.js");
require("../dist/scene.js");

const opts = {level:"max", seed:50219};
const plan = {actor:"rocket",mechanic:"launch",setting:"space",accent:"planet"};
const families = recipe => recipe.parts.map(id=>Catalog.block(id).family);
test("drawing, transcribed speech and typing select the same tools when given equivalent input",()=>{
  for (const idea of ["rocket","money bag","witch","car","boat"]) {
    const spoken=Forge.recipe(idea,"",null,opts);
    assert.deepEqual(spoken,Forge.recipe("",idea,null,opts));
    assert.ok(Forge.valid(spoken));
  }
});
test("the confirmed subject and requested loop take precedence over a noisy model",()=>{
  const unrelated={actor:"tree",mechanic:"stack",setting:"forest",accent:"leaf"};
  const r=Forge.recipe("Make a rocket dodge rocks in space","",null,{...opts,plan:unrelated});
  assert.equal(r.subject,"rocket");
  assert.equal(r.mechanic,"dodge");
  assert.equal(r.setting,"space");
  assert.equal(r.prop,"rock");
  assert.equal(Forge.gbnf("Make a rocket dodge rocks in space","",null,opts).split("\n").find(r=>r.startsWith("actor ::=")), 'actor ::= "\\"rocket\\""');
});
test("distinct game behaviors match explicit boat and rocket prompts",()=>{
  for(const [idea,mechanic] of [
    ["a pirate ship with cannons","cannon"],["a peaceful boat sailing across the ocean","sail"],
    ["a sailboat dodging rocks","dodge"],["put rocket pieces together","assemble"],
    ["hold my rocket to launch it","launch"],["a witch flying on her broom","rise"]
  ]) assert.equal(Forge.recipe(idea,"",null,opts).mechanic,mechanic,idea);
  const low=Forge.recipe("launch my rocket","",null,{...opts,level:"low",plan});
  assert.equal(low.activity,"animation");assert.equal(low.mechanic,"drift");
  assert.ok(Catalog.block(low.blocks[0]).variant < Catalog.firstKit);
});
test("hybrids select and save actual part IDs; model selects shape cut and style",()=>{
  const tuned={...plan,parts:["wing","nozzle"],variant:7,path:"ellipse",layout:"ring"};
  const target=Forge.recipe("Rocket","",null,{...opts,plan:tuned});
  assert.deepEqual(families(target),["wing","nozzle"]);
  assert.equal(Catalog.block(target.blocks[0]).variant,7);
  assert.equal(Catalog.style(target.activity,target.styleId).motion,"ellipse");
  assert.equal(Catalog.style(target.activity,target.styleId).layout,"ring");
  for(const [idea,want] of [["winged money bag",["wing"]],["witch on wheels",["wheel"]],["witch riding a broom with a hat",["broom","hat"]]]){
    assert.deepEqual(families(Forge.recipe(idea,"",null,opts)),want);
  }
  const refined=Forge.recipe("add a flag","",target,opts);
  assert.equal(refined.subject,"rocket");
  assert.deepEqual(families(refined),["flag","wing","nozzle"]);
  const saved=JSON.parse(JSON.stringify(target));
  assert.ok(Forge.valid(saved));assert.deepEqual(saved,target);
  assert.ok(!Forge.valid({...saved,parts:[Catalog.blockCount]}));
  assert.ok(!Forge.valid({...saved,styleId:Catalog.styleCount("game")}));
  assert.ok(Forge.valid({activity:"animation",subject:"rocket",setting:"space",motion:"fly",prop:"stars"}));
});
test("scribbles with low confidence become playable or animated scenes without labeling",()=>{
  const lines=[[[3,1],[12,19],[19,1],[3,14],[5,5],[22,2],[0,19]]];
  const interpreted=Forge.sketchLabel(lines);
  assert.ok(interpreted.startsWith("scribble:"));
  const idea=Forge.recipe("",interpreted,null,opts);
  assert.ok(Forge.valid(idea));assert.ok(idea.blocks.length>2);
  assert.equal(Forge.sketchLabel([]),"");
});
test("independent rough rocket, sailboat and witch samples",()=>{
  const rough={
    rocket:[[[12,0],[8,7],[8,18],[16,18],[16,7],[12,0]],[[8,12],[5,20],[9,17]],[[16,12],[19,20],[16,18]],[[10,9],[12,7],[14,9],[12,11],[10,9]]],
    sailboat:[[[2,15],[24,15],[20,21],[7,21],[2,15]],[[13,15],[13,1],[4,13],[13,13]]],
    witch:[[[10,0],[3,10],[18,10],[10,0]],[[1,11],[20,11]],[[7,12],[9,17],[13,17],[16,12]],[[11,17],[6,28],[17,28],[11,17]]]
  };
  for(const [label,lines] of Object.entries(rough)) assert.equal(Forge.sketchLabel(lines),label);
});
test("a repeated bare subject varies committed mechanics and never mutates a save on replay",()=>{
  const opts2={...opts,level:"high",plan};
  const made=[];
  for(let i=0;i<12;i++){
    const r=Forge.recipe("rocket","",null,opts2);
    Forge.modelPrompt("rocket","",null,opts2); Forge.gbnf("rocket","",null,opts2);
    assert.deepEqual(r,Forge.recipe("rocket","",null,opts2),"planning has no history writes");
    assert.ok(!made.slice(-3).map(s=>s.mechanic).includes(r.mechanic));
    Forge.remember("rocket","",r); made.push(r);
  }
  assert.equal(Forge.recipe("launch the rocket","",null,opts2).mechanic,"launch");
  const saved=JSON.stringify(made[0]);assert.ok(Forge.valid(JSON.parse(saved)));
  assert.deepEqual(JSON.parse(saved),made[0]);
});
