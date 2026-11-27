'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const sandbox = vm.createContext({});
for (const name of ['catalog','scene','world']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist',name+'.js'),'utf8'),sandbox);
}
const {Catalog, World, Forge} = vm.runInContext('({Catalog, World, Forge})',sandbox);
const scene = (text,level='max',seed=42) => World.start(Forge.recipe(text,'',null,{level,seed}));
const run = (s,time) => {for(let i=0;i<Math.ceil(time*60);i++) World.step(s,1/60);};

test('a tap makes a short hop, a hold carries the rocket past the atmosphere, releasing returns to the pad', () => {
  const s=scene('rocket launch');
  assert.equal(s.mechanic,'launch');
  World.press(s,{x:s.x,y:s.y});World.release(s,{x:s.x,y:s.y});run(s,.35);
  assert.ok(s.altitude>3&&s.altitude<22);run(s,2);assert.equal(s.altitude,0);
  World.press(s,{x:s.x,y:s.y});run(s,4);assert.ok(s.altitude>220);
  World.cancel(s);assert.equal(s.thrust,false);run(s,10);assert.equal(s.altitude,0);
});

test('assembly is solvable by dragging each piece into its own socket, and a reopened recipe reproduces the puzzle', () => {
  const s=scene('assemble a rocket');
  assert.equal(s.mechanic,'assemble');
  assert.deepEqual(s.items,World.start(s.recipe).items);
  for(const item of s.items){World.press(s,item);World.move(s,item.dest);World.release(s,item.dest);}
  assert.equal(s.score,4);assert.ok(s.won||s.roundOver);
  World.press(s,{x:158,y:98});assert.equal(s.score,0);assert.equal(s.won,false);
});

test('top-down boat course waits for the player and drag steers in both axes', () => {
  const s=scene('boat dodge rocks in the ocean');assert.equal(s.mechanic,'dodge');
  run(s,4);assert.equal(s.items.length,0);
  const p={x:71,y:94};World.press(s,p);run(s,1.4);World.release(s,p);
  assert.ok(Math.abs(s.x-p.x)<3&&Math.abs(s.y-p.y)<3);
  run(s,1.2);assert.ok(s.items.length>0);
  Object.assign(s.items[0],{x:s.x,y:s.y});World.step(s,1/60);assert.ok(s.over||s.roundOver);
});

test('pirate cannon emits a projectile and registers a struck target',()=>{
  const s=scene('pirate ship cannon');
  World.press(s,{x:s.x,y:s.y});assert.equal(s.shots.length,1);
  const shot=s.shots[0];s.items.push({x:shot.x+1,y:shot.y,phase:0,passed:false});
  World.step(s,1/60);assert.equal(s.score,1);assert.equal(s.shots.length,0);
});

test('low stays still without input and can be repositioned',()=>{
  const s=scene('witch','low');const before={x:s.x,y:s.y};run(s,5);
  assert.equal(s.x,before.x);assert.equal(s.y,before.y);
  const after={x:74,y:128};World.press(s,before);World.move(s,after);World.release(s,after);run(s,1);
  assert.ok(Math.abs(s.x-after.x)<1&&Math.abs(s.y-after.y)<1);
});

test('every published mechanic starts and animates a finite world, and each old activity opens',()=>{
  for(const kind of ['animation','game'])for(const mechanic of Catalog.mechanics(kind)){
    const s=scene('rocket');const style=Catalog.styleFor(kind,mechanic,17);
    const world=World.start({...s.recipe,styleId:style.id,mechanic,activity:kind});
    World.press(world,world);run(world,.6);World.release(world,world);
    assert.ok(Number.isFinite(world.x)&&Number.isFinite(world.y),mechanic);
  }
  for(const activity of ['dodge','jump','pet','animation']){
    const s=World.start({activity,subject:'pirate ship',setting:'island',motion:'glide',prop:'stars'});
    assert.equal(s.kind,activity==='animation'?'animation':'game');
    assert.ok(s.blocks.every(id=>Catalog.block(id)));
  }
});


test('the chapters assembly style requires two completed puzzles and the lifeline style rescues once',()=>{
  const recipe=scene('assemble a rocket').recipe;
  const chapters=Catalog.styles('game').find(st=>st.mechanic==='assemble'&&st.objective==='chapters'&&st.modifier==='steady');
  const s=World.start({...recipe,styleId:chapters.id});
  for(let round=1;round<=2;round++){
    for(const item of s.items){World.press(s,item);World.move(s,item.dest);World.release(s,item.dest);}
    assert.equal(s.rules.rounds,round);assert.equal(s.won,round===2);
    if(round===1){assert.ok(s.roundOver);World.press(s,{x:155,y:100});}
  }
  const safe=Catalog.styles('game').find(st=>st.mechanic==='dodge'&&st.modifier==='lifeline');
  const g=World.start({...recipe,styleId:safe.id});
  for(let attempt=0;attempt<2;attempt++){
    World.press(g,g);g.items.push({x:g.x,y:g.y,phase:0,passed:false});World.step(g,.01);
    assert.equal(g.over,attempt===1);assert.ok(g.rules.rescued);
    if(attempt===0)World.press(g,g);
  }
});
