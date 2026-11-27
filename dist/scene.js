"use strict";
const Forge = (() => {
  const levels = ["low", "medium", "high", "extra high", "max"];
  const settings = ["ocean", "island", "space", "sky", "road", "forest", "garden", "room", "underwater", "mountains"];
  const scenery = {
    ocean: ["rock", "fish", "cloud", "sailboat"], island: ["tree", "flag", "moon", "rock"],
    space: ["planet", "star", "moon", "rocket"], sky: ["cloud", "bird", "star", "moon"],
    road: ["wheel", "flag", "car", "rock"], forest: ["tree", "leaf", "bird", "moon"],
    garden: ["flower", "leaf", "bird", "cloud"], room: ["coin", "gear", "wheel", "star"],
    underwater: ["fish", "rock", "octopus", "leaf"], mountains: ["rock", "cloud", "tree", "moon"]
  };
  const settingsByWord = [
    [/underwater|below the waves|aquarium|reef/, "underwater"], [/island|beach/, "island"],
    [/\b(space|atmosphere|orbit|stars?|planets?|asteroids?|galaxy)\b/, "space"],
    [/ocean|\bsea\b|river|waves|lake/, "ocean"], [/mountain|volcano|peak/, "mountains"],
    [/forest|woods|jungle/, "forest"], [/\b(road|city|street|highway)\b/, "road"],
    [/garden|field|meadow|grass/, "garden"], [/sky|clouds|\b(fly|flying|soar|soaring|airborne)\b/, "sky"], [/room|indoors|house/, "room"]
  ];
  const actorHints = [
    [/\b(pirate( ship)?|galleon|black pearl)\b/, "pirate-ship"],
    [/\b(rocket( ship)?|spaceship|spacecraft|space shuttle)\b/, "rocket"],
    [/\b(boat|sail ?boat|ship|canoe|yacht|dinghy|raft)\b/, "sailboat"],
    [/\b(witch|sorceress|enchantress|wizard)\b/, "witch"],
    [/bag of (gold|money|coins)|money ?bag|sack of (coins|treasure)|purse/, "money-bag"],
    [/\b(automobile|race ?car|sedan|taxi|cars?)\b/, "car"],
    [/\b(kitten|kitty)\b/, "cat"], [/\b(pup|puppies|puppy|hound)\b/, "dog"]
  ];
  const homes = [
    [/boat|ship|canoe|raft|sail|whale|shark|submarine|anchor/, "ocean"],
    [/rocket|planet|moon|star|satellite|astronaut|ufo|comet/, "space"],
    [/fish|octopus|coral|shell|jellyfish|crab|turtle/, "underwater"],
    [/plane|helicopter|kite|wing|bird|cloud|umbrella|balloon|butterfly/, "sky"],
    [/car|wheel|bus|bike|bicycle|truck|train|motor/, "road"],
    [/witch|fox|wolf|tree|leaf|bear|mushroom|owl|deer/, "forest"],
    [/rock|dragon|mountain|eagle|goat/, "mountains"], [/coin|money|gear|key|robot/, "room"]
  ];
  const requests = [
    [/put .* together|fit.{0,45}together|assembl|piece.{0,12}(fit|together)|build|construct|rebuild/, "assemble"],
    [/cannon|fire at|pop.{0,10}target/, "cannon"], [/dodg(e|ing)|avoid|weav(e|ing)|obstacle/, "dodge"],
    [/thrust|blast ?off|take ?off|launch|(rocket|spaceship|spacecraft).{0,24}(climb|lift).{0,35}(press|touch|hold)|hold.{0,24}(fly|climb|lift|rocket)/, "launch"],
    [/collect|gather|treasure hunt|fill.{0,18}(bag|purse)/, "collect"], [/match|pair up/, "match"],
    [/balanc|steady/, "balance"], [/catch|intercept/, "catch"], [/stack|pile up/, "stack"],
    [/explor|discover/, "explore"], [/race|racing|fastest/, "race"], [/steer|drive|pilot/, "steer"],
    [/guide|navigate|lead it/, "guide"], [/sails? (across|on|in|past)|sailing|peaceful.{0,12}boat/, "sail"],
    [/open.{0,12}petal|bloom|blossom/, "bloom"], [/march|parade/, "march"], [/trail|wake/, "trail"],
    [/flock|swarm/, "flock"], [/unfurl|uncurl/, "unfurl"], [/tumble|roll down/, "tumble"],
    [/pulse|pulsat/, "pulse"], [/shimmer|glisten|twinkle/, "shimmer"], [/sway|rocking/, "sway"],
    [/rise|ascend|\b(fly|flying|soar|soaring)\b/, "rise"], [/swirl|circle around/, "swirl"], [/drift|float/, "drift"]
  ];
  const profiles = [
    [/rocket/, ["launch","assemble","explore","dodge","trail","rise"]], [/pirate-ship/, ["cannon","sail","dodge","explore","collect"]],
    [/sailboat/, ["sail","dodge","cannon","assemble","explore"]], [/witch/, ["trail","guide","collect","swirl","flock","catch"]],
    [/money-bag|coin/, ["collect","catch","stack","match","tumble"]], [/car|bike|wheel|truck/, ["steer","race","dodge","assemble","march"]],
    [/bird|fish|butterfly/, ["flock","guide","drift","catch","swirl"]], [/flower|leaf|tree/, ["bloom","unfurl","sway","stack","catch"]],
    [/planet|star|moon/, ["swirl","explore","shimmer","pulse","balance"]]
  ];
  const environmentalWords = new Set(["a","an","the","i","my","me","make","draw","some","please","of","in","and","it","into","something","with","can","you","is","want"]);
  const titles = {
    launch: ["Liftoff","Beyond the Clouds","Departure"], assemble: ["Workshop","Piece by Piece","Reassembly"],
    cannon: ["Target Practice","Harbor Watch","Broadside"], dodge: ["Through the Narrows","Obstacle Run","Passage"],
    sail: ["Passage","Tide Journal","Quiet Crossing"], catch: ["Catch","Falling Treasures","Gathering"],
    collect: ["Treasure Hunt","Little Cache","Collection"], guide: ["Wayfinder","Homeward","Across the Map"],
    explore: ["Expedition","Field Notes","Unknown Shores"], race: ["Time Trial","Dash","Rally"],
    match: ["Pairs","Reflections","Twins"], balance: ["Balancing Act","On the Edge","Equilibrium"],
    steer: ["Course","Switchbacks","Long Road"], stack: ["Tower","Layers","Balancing Stones"]
  };
  function newSeed() {
    if (!Number.isInteger(newSeed.next)) {
      newSeed.next = globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? (Date.now() >>> 0);
    }
    newSeed.next = (newSeed.next + 0x9e3779b9) >>> 0;
    return newSeed.next;
  }
  function stream(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let x = Math.imul(state ^ state >>> 15, state | 1);
      x ^= x + Math.imul(x ^ x >>> 7, x | 61);
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }
  const pick = (list, random) => list[Math.floor(random() * list.length)];
  const pretty = slug => slug.replaceAll("-", " ");
  const capitalize = text => text.replace(/\b[a-z]/g, c => c.toUpperCase());
  const game = mechanic => Catalog.mechanics("game").includes(mechanic);
  const family = text => text ? Catalog.familyFor(text) : null;
  function actorFrom(text) {
    // Preserve the first mentioned object. A later pirate, rock or rocket can be a prop.
    let best = null;
    const consider = (index, result, length) => {
      if (index >= 0 && result && (!best || index < best.index || index === best.index && length > best.length)) best = {index, result, length};
    };
    for (const [pattern, result] of actorHints) {
      const m = pattern.exec(text);
      if (m) consider(m.index, family(result), m[0].length);
    }
    const words = Array.from(text.matchAll(/[a-z0-9]+/g));
    for (let i = 0; i < words.length; i++) {
      for (const n of [3, 2, 1]) {
        const term = words.slice(i, i+n).map(m => m[0]).join("-");
        // Check exact catalog slugs here. Broad semantic aliases are resolved on individual tokens.
        const exact = Catalog.families.includes(term) ? term : null;
        const alias = n === 1 && !environmentalWords.has(term) ? family(term) : null;
        consider(words[i].index, exact || alias, term.length);
      }
    }
    return best?.result || null;
  }
  function sketchFamily(sketch, random) {
    if (!sketch.startsWith("scribble:")) return actorFrom(sketch) || family(sketch);
    const possibilities = {
      loop: ["planet","moon","coin","fish"], zigzag: ["dragon","witch","rocket","leaf"],
      tower: ["tree","rocket","witch","flower"], ribbon: ["fish","sailboat","cloud","bird"],
      cluster: ["flower","cloud","tree","planet"], spark: ["star","leaf","bird","gear"]
    };
    const key = sketch.slice(9);
    const pool = (possibilities[key] || possibilities.spark).map(family).filter(Boolean);
    return pick(pool.length ? pool : Catalog.families, random);
  }
  const historyKey = "lowstim:recent-mechanics:v2";
  const recent = new Map();
  try {
    const entries = JSON.parse(globalThis.localStorage?.getItem(historyKey) || "[]");
    if (Array.isArray(entries)) for (const entry of entries.slice(-160)) {
      if (Array.isArray(entry) && typeof entry[0]==="string" && Array.isArray(entry[1])) {
        recent.set(entry[0],entry[1].slice(-3).filter(item=>typeof item==="string"));
      }
    }
  } catch {}
  function bareActor(text, sketch) {
    if (!text) return sketch && !sketch.startsWith("scribble:") ? actorFrom(sketch) : null;
    const noun = text.toLowerCase().replace(/^[^a-z0-9]*|[.!? ]+$/g,"")
      .replace(/^(?:please |draw |make |create |show |give |me |an? |the |little |my |i want )+/, "");
    if (!noun) return null;
    const canonical = actorFrom(noun);
    if (!canonical) return null;
    if (!noun.includes(" ") || noun===pretty(canonical) || actorHints.some(([re])=>re.exec(noun)?.[0]===noun)) return canonical;
    return null;
  }
  function remember(idea, sketch, created) {
    if (created?.version!==2 || created.level==="low") return;
    const actor = bareActor(String(idea||"").trim(),String(sketch||""));
    if (!actor) return;
    const key = created.level+"/"+actor;
    const choices = (recent.get(key)||[]).filter(item=>item!==created.mechanic);
    recent.delete(key);
    recent.set(key,[...choices.slice(-2),created.mechanic]);
    if (recent.size>160) recent.delete(recent.keys().next().value);
    try {globalThis.localStorage?.setItem(historyKey,JSON.stringify([...recent]));} catch {}
  }
  const paths = () => [...new Set(Catalog.styles("game").map(s=>s.motion))];
  const layouts = () => [...new Set(Catalog.styles("game").map(s=>s.layout))];
  function validPlan(plan) {
    return !!plan && Catalog.families.includes(plan.actor) && Catalog.families.includes(plan.accent) &&
      settings.includes(plan.setting) && (plan.parts === undefined || Array.isArray(plan.parts) && plan.parts.length<=3 &&
        plan.parts.every(part=>Catalog.families.includes(part))) &&
      (plan.variant === undefined || Number.isInteger(plan.variant) && plan.variant>=0 && plan.variant<Catalog.variantsPerFamily) &&
      (!plan.path || paths().includes(plan.path)) && (!plan.layout || layouts().includes(plan.layout)) &&
      (game(plan.mechanic) || Catalog.mechanics("animation").includes(plan.mechanic));
  }
  function recipe(idea = "", sketch = "", prior = null, options = {}) {
    const text = String(idea).slice(0,240).toLowerCase().trim();
    const level = levels.includes(options.level) ? options.level : levels.includes(prior?.level) ? prior.level : "medium";
    const seed = Number.isInteger(options.seed) ? options.seed >>> 0 : newSeed();
    const random = stream(seed);
    const plan = validPlan(options.plan) ? options.plan : null;
    const modifying = !!prior && /^(?:please )?(?:add |give (it|the) |put (it|a|the|some) |place |let it |make (it|that|the same) |turn (it|this) into (a game|an animation)|now (let|add|make) |set (it|the scene) )/.test(text);
    let subjectFamily = modifying ? null : actorFrom(text.split(/\b(?:with|wearing|riding|carrying|holding)\b/)[0]);
    const sketchActor = sketch ? sketchFamily(sketch, random) : null;
    const priorActor = prior?.version === 2 ? Catalog.block(prior.blocks[0])?.family : actorFrom(prior?.subject || "");
    subjectFamily ||= ((sketch.startsWith("scribble:") && plan?.actor) || sketchActor) || (prior && !/\b(new|another|instead|different)\b/.test(text) ? priorActor : null) || plan?.actor;
    // Unfamiliar names get their own title and, without a local model, a novel constructed actor.
    const unknown = !subjectFamily && text;
    subjectFamily ||= pick(Catalog.families.filter(f => !/^(digit|letter)-/.test(f)), random);
    let subject = unknown ? (text.split(/\s+/).filter(w => !environmentalWords.has(w)).slice(0,5).join(" ") || pretty(subjectFamily)) : pretty(subjectFamily);
    const requested = requests.find(([pattern]) => pattern.test(text))?.[1];
    const pool = profiles.find(([pattern]) => pattern.test(subjectFamily))?.[1] ||
      ["drift","explore","guide","assemble","sway","flock","tumble","catch"];
    let mechanic = requested || plan?.mechanic || (priorActor === subjectFamily ? prior?.mechanic : null) || pick(pool, random);
    if (level === "low") mechanic = "drift";
    else if (!requested && /\b(animation|picture|peaceful|quiet|watch)\b/.test(text) && game(mechanic)) {
      mechanic = subjectFamily === family("sailboat") ? "sail" : pick(Catalog.mechanics("animation"),random);
    } else if (!requested && /\b(play|game|challenge)\b/.test(text) && !game(mechanic)) {
      mechanic = pick(pool.filter(game).length ? pool.filter(game) : Catalog.mechanics("game"), random);
    }
    const simple = !requested && bareActor(text,sketch);
    if (simple && level!=="low") {
      const last = recent.get(level+"/"+simple) || [];
      if (last.includes(mechanic)) {
        const fresh = pool.filter(value=>!last.includes(value));
        if(fresh.length) mechanic=pick(fresh,random);
      }
    }
    const isBoat = subjectFamily === family("sailboat") || subjectFamily === family("pirate-ship");
    if (mechanic === "cannon" && isBoat) {
      subjectFamily = family("pirate-ship"); subject = "pirate ship";
    }
    const setting = settingsByWord.find(([pattern]) => pattern.test(text))?.[1] || plan?.setting ||
      (priorActor === subjectFamily && settings.includes(prior?.setting) ? prior.setting : null) ||
      homes.find(([pattern]) => pattern.test(subjectFamily))?.[1] || pick(["garden","room","forest","mountains"],random);
    const targets = /\b(?:dodge|dodging|avoid|avoiding|catch|collect|gather|through|past|among|near|under|beside)\s+(.+)/.exec(text)?.[1];
    const target = targets && actorFrom(targets);
    const requestedAccent = target && target!==subjectFamily ? target : scenery[setting].find(f => new RegExp("\\b"+f+"s?\\b").test(text) && family(f) !== subjectFamily);
    const accent = family(requestedAccent) || plan?.accent || pick(scenery[setting].map(family).filter(Boolean), random) || subjectFamily;
    const activity = game(mechanic) ? "game" : "animation";
    let style = Catalog.styleFor(activity, mechanic, Math.floor(random()*4294967296));
    if (plan?.path || plan?.layout) {
      const matching = Catalog.styles(activity).filter(candidate=>candidate.mechanic===mechanic &&
        (!plan.path || candidate.motion===plan.path) && (!plan.layout || candidate.layout===plan.layout));
      if (matching.length) style=pick(matching,random);
    }
    const families = [subjectFamily, accent];
    const attached = new Set();
    const modifiers = [[/winged|with wings/, "wing"], [/wheeled|on wheels/, "wheel"],
      [/feathered/, "feather"], [/clockwork|geared/, "gear"], [/propeller.powered/, "propeller"],
      [/spring.loaded/, "spring"], [/jet.powered/, "nozzle"]];
    for (const [test,part] of modifiers) if (test.test(text)) attached.add(part);
    if (/on a broom/.test(text)) attached.add("broom");
    const accessories = /\b(?:with|wearing|riding|carrying|holding|attach|add|give it|on a broom|on wheels)\b(.*)/.exec(text)?.[1] || "";
    for (const phrase of accessories.split(/,|\b(?:and|plus|with|wearing|riding|carrying|holding)\b/)) {
      const named = actorFrom(phrase);
      if (named && named!==subjectFamily) attached.add(named);
    }
    for (const named of plan?.parts || []) if (named!==subjectFamily) attached.add(named);
    if (modifying && prior.parts) for (const id of prior.parts) {
      const part = Catalog.block(id);
      if(part) attached.add(part.family);
    }
    const parts = [...attached].slice(0,3).map(f => Catalog.blockId(f,Math.floor(random()*Catalog.variantsPerFamily)));
    const density = levels.indexOf(level) + 1;
    const sceneryFamilies = scenery[setting].map(family).filter(Boolean);
    for (let i=0; i<density; i++) families.push(pick(sceneryFamilies.length ? sceneryFamilies : Catalog.families,random));
    const variantCount = level==="low" || parts.length ? Catalog.firstKit : Catalog.variantsPerFamily;
    const blocks = families.map((f,i) => Catalog.blockId(f, i===0 && plan?.variant!==undefined ?
      plan.variant % variantCount : Math.floor(random()*variantCount)));
    const theme = titles[mechanic] || [capitalize(mechanic),"Study","Sketchbook"];
    const name = (capitalize(subject) + " · " + pick(theme,random)).slice(0,96);
    return {version:2,seed,name,subject,level,activity,setting,prop:pretty(accent),motion:style.motion,styleId:style.id,mechanic,blocks,parts};
  }
  function classify(strokes){
    const model=globalThis.SKETCH_MODEL;
    const points=strokes.flat();
    if(!model||points.length<5)return [];
    let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
    for(const [x,y] of points){x0=Math.min(x,x0);x1=Math.max(x,x1);y0=Math.min(y,y0);y1=Math.max(y,y1);}
    const scale=16/Math.max(1e-9,x1-x0,y1-y0),sx=(19-(x1-x0)*scale)/2,sy=(19-(y1-y0)*scale)/2;
    const pixels=new Float32Array(400);
    for(const line of strokes){
      const p=line.map(([x,y])=>[(x-x0)*scale+sx,(y-y0)*scale+sy]);
      for(let i=0;i<p.length;i++){
        const [ax,ay]=p[i],[bx,by]=p[i+1]||p[i];
        const n=Math.ceil(2*Math.max(Math.abs(bx-ax),Math.abs(by-ay)));
        for(let k=0;k<=n;k++){
          const t=n?k/n:0,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,ix=Math.floor(x),iy=Math.floor(y);
          for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
            const j=(iy+dy)*20+ix+dx;
            pixels[j]=Math.max(pixels[j],(1-Math.abs(ix+dx-x))*(1-Math.abs(iy+dy-y)));
          }
        }
      }
    }
    if(!model.decoded)model.decoded=model.layers.map(([s,data])=>Float32Array.from(atob(data),c=>{
      const b=c.charCodeAt(0);return s*(b>127?b-256:b);
    }));
    const [w1,b1,w2,b2]=model.decoded,h=b1.slice(),out=b2.slice(), size=model.labels.length;
    for(let i=0;i<400;i++)if(pixels[i])for(let j=0;j<h.length;j++)h[j]+=pixels[i]*w1[i*h.length+j];
    for(let i=0;i<h.length;i++)if(h[i]>0)for(let j=0;j<size;j++)out[j]+=h[i]*w2[i*size+j];
    const offset=Math.max(...out),sum=out.reduce((s,k)=>s+Math.exp(k-offset),0);
    return model.labels.map((label,i)=>({label,p:Math.exp(out[i]-offset)/sum})).sort((a,b)=>b.p-a.p).slice(0,3);
  }
  function sketchLabel(strokes) {
    const lines = strokes.filter(s => Array.isArray(s) && s.length);
    const points = lines.flat();
    if (!points.length) return "";
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,turns=0,length=0;
    for (const line of lines) {
      let previousAngle;
      for (let i=0;i<line.length;i++) {
        const [x,y]=line[i];
        left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
        if (!i) continue;
        const dx=x-line[i-1][0],dy=y-line[i-1][1],dist=Math.hypot(dx,dy);
        if (!dist) continue;
        const angle=Math.atan2(dy,dx);
        if (previousAngle!==undefined) {
          const diff=angle-previousAngle;
          if(Math.abs(Math.atan2(Math.sin(diff),Math.cos(diff)))>0.85) turns++;
        }
        length+=dist;previousAngle=angle;
      }
    }
    const [best,next] = classify(lines);
    if (best?.p >= 0.58 && best.p - (next?.p || 0) >= 0.20) return best.label;
    const w=right-left,h=bottom-top,diagonal=Math.max(1,Math.hypot(w,h));
    const first=points[0],last=points[points.length-1];
    const closes=Math.hypot(first[0]-last[0],first[1]-last[1]) < diagonal*.25;
    const shape=length<3?"spark":lines.length>=4?"cluster":closes&&length>diagonal*2?"loop":
      w>h*1.75?"ribbon":h>w*1.75?"tower":turns>4?"zigzag":"spark";
    return "scribble:"+shape;
  }
  const oldSubjects = ["pirate ship","boat","rocket","plane","bird","car","bicycle","fish","octopus","cat","dog","bear","dragon","tree","house","flower","umbrella","cloud","monster"];
  function valid(s) {
    if (!s || typeof s!=="object") return false;
    if (s.version === undefined) {
      return ["animation","dodge","jump","pet"].includes(s.activity) && oldSubjects.includes(s.subject) && settings.includes(s.setting) &&
        ["glide","bounce","orbit","fly","swim","grow"].includes(s.motion) && ["none","moon","stars","island","fish","trees","clouds","rocks"].includes(s.prop);
    }
    if(s.version!==2 || !levels.includes(s.level) || !["animation","game"].includes(s.activity) || !settings.includes(s.setting)) return false;
    const styleCount = Catalog.styleCount(s.activity);
    if(!Number.isSafeInteger(s.styleId) || s.styleId<0 || s.styleId>=styleCount) return false;
    const style=Catalog.style(s.activity,s.styleId);
    return style?.id===s.styleId && s.mechanic===style.mechanic && typeof s.name==="string" && s.name.length>0 && s.name.length<=96 &&
      typeof s.subject==="string" && s.subject.length>0 && s.subject.length<=220 && typeof s.prop==="string" && s.prop.length<=80 &&
      Number.isSafeInteger(s.seed) && s.seed>=0 && s.seed<=4294967295 && Array.isArray(s.blocks) && s.blocks.length>=2 && s.blocks.length<=8 &&
      s.blocks.every(id => Number.isSafeInteger(id) && id>=0 && id<Catalog.blockCount) &&
      (s.parts === undefined || Array.isArray(s.parts) && s.parts.length<=3 && s.parts.every(id => Number.isSafeInteger(id) && id>=0 && id<Catalog.blockCount));
  }
  const system = "Compose a LowStim pixel scene. Call the catalog with JSON only. Choose an actor, mechanic, setting and accent. Keep the requested subject and interaction. Pick an imaginative combination.";
  function modelPrompt(idea, sketch="", prior=null, options={}) {
    const proposal=recipe(idea,sketch,prior,{...options,plan:null});
    const suggested=Catalog.block(proposal.blocks[0]).family;
    const actorPool=[suggested,...scenery[proposal.setting].map(family).filter(Boolean)];
    const descriptive=String(idea).slice(0,240).split(/\W+/).map(s=>family(s.toLowerCase())).filter(Boolean);
    const palette=[...new Set([...actorPool,...descriptive, "witch","astronaut","robot","money-bag","flower","gear","cloud","rocket","bird","fish","leaf","star"])];
    const hints={level:proposal.level, actor:suggested, actorIdeas:palette,
      mechanicIdea:proposal.mechanic,settingIdea:proposal.setting,accentIdea:Catalog.block(proposal.blocks[1]).family};
    if(prior) hints.previous={subject:prior.subject,mechanic:prior.mechanic||prior.activity,setting:prior.setting};
    const input=String(idea).trim().slice(0,240) || (sketch.startsWith("scribble:") ?
      "Imagine something from my "+sketch.slice(9)+" shaped scribble." : "I drew a "+sketch+". Bring it to life.");
    return "<|im_start|>system\n"+system+" Return actor, mechanic, setting, accent. Optional parts (up to 3) attach to the actor. Optional variant selects its sprite cut. Optional path and layout select a style. Suggestions: "+
      JSON.stringify(hints).replace(/[<>|]/g," ")+"<|im_end|>\n<|im_start|>user\n"+input.replace(/[<>|]/g," ")+"<|im_end|>\n<|im_start|>assistant\n";
  }
  function gbnf(idea, sketch="", prior=null, options={}) {
    let actors=Catalog.families, mechanics=[...Catalog.mechanics("game"),...Catalog.mechanics("animation")], candidates=settings;
    if (idea!==undefined) {
      const text=String(idea).slice(0,240).toLowerCase();
      const base=recipe(idea,sketch,prior,options);
      const known=actorFrom(text) || (sketch && !sketch.startsWith("scribble:")) || prior;
      const actor=Catalog.block(base.blocks[0]).family;
      if(known) actors=actor===family("sailboat") ? [actor,family("pirate-ship")] : [actor];
      const explicit=requests.find(([pattern])=>pattern.test(text));
      if (base.level==="low" || explicit) mechanics=[base.mechanic];
      else if(/\b(game|play|challenge)\b/.test(text)) mechanics=Catalog.mechanics("game");
      else if(/\b(animation|peaceful|picture|quiet|watch)\b/.test(text)) mechanics=Catalog.mechanics("animation");
      else {
        const home=profiles.find(([pattern])=>pattern.test(actor))?.[1];
        if(home) mechanics=[...new Set([...home,base.mechanic])];
      }
      const location=settingsByWord.find(([pattern])=>pattern.test(text));
      if(location) candidates=[location[1]];
    }
    const t=JSON.stringify;
    const fields=["actor","mechanic","setting","accent"];
    const stringEnum=items => items.map(v=>t(t(v))).join(" | ");
    return [
      "root ::= "+t("{")+" ws "+fields.map(k=>t(t(k))+" ws "+t(":")+" ws "+k).join(" ws "+t(",")+" ws ")+" extras ws "+t("}"),
      "extras ::= (ws "+t(",")+" ws "+t(t("parts"))+" ws "+t(":")+" ws "+t("[")+" ws (family (ws "+t(",")+" ws family (ws "+t(",")+" ws family)?)?)? ws "+t("]")+")?"+
        ["variant","path","layout"].map(key=>" (ws "+t(",")+" ws "+t(t(key))+" ws "+t(":")+" ws "+(key==="variant"?"cut":key)+")?").join(""),
      "path ::= "+stringEnum(paths()), "layout ::= "+stringEnum(layouts()),
      "cut ::= [0-9] | [1-9] [0-9] | [1-9] [0-9] [0-9] | [1] [0-9] [0-9] [0-9]",
      "ws ::= [ \\t\\n\\r]*","actor ::= "+stringEnum(actors),"accent ::= family","family ::= "+stringEnum(Catalog.families),
      "mechanic ::= "+stringEnum(mechanics),"setting ::= "+stringEnum(candidates)
    ].join("\n");
  }
  return {newSeed,recipe,remember,valid,validPlan,sketchLabel,classify,modelPrompt,gbnf,levels,
    matches:idea=>!!String(idea).trim()};
})();
globalThis.Forge = Forge;
