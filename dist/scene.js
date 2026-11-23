"use strict";
const Forge = (() => {
  const choices = {
    activity:["animation","dodge","jump","pet"], subject:["pirate ship","boat","rocket","plane","bird","car","bicycle","fish","octopus","cat","dog","bear","dragon","tree","house","flower","umbrella","cloud","monster"],
    setting:["island","ocean","space","sky","road","forest","garden","room","underwater","mountains"],
    motion:["glide","bounce","orbit","fly","swim","grow"], prop:["none","moon","stars","island","fish","trees","clouds","rocks"]
  };
  const defaults={
    "pirate ship":["island","glide","moon"],boat:["ocean","glide","island"],rocket:["space","fly","stars"],
    plane:["sky","fly","clouds"],bird:["sky","fly","clouds"],car:["road","glide","rocks"],bicycle:["road","glide","trees"],
    fish:["underwater","swim","rocks"],octopus:["underwater","swim","fish"],cat:["room","bounce","none"],dog:["garden","bounce","trees"],
    bear:["forest","bounce","trees"],dragon:["mountains","fly","clouds"],tree:["forest","grow","none"],
    house:["garden","bounce","clouds"],flower:["garden","grow","none"],umbrella:["sky","glide","clouds"],cloud:["sky","glide","clouds"],monster:["forest","bounce","moon"]
  };
  const words = {
    "pirate ship":/\b(pirate|galleon|black pearl)\b/, boat:/\b(ship|sailboat|boat|raft|canoe|submarine)\b/,
    rocket:/\b(rocket|ufo|spaceship|spacecraft)\b/, plane:/\b(plane|airplane|jet|helicopter)\b/,
    bird:/\b(bird|eagle|owl|duck|penguin)\b/, car:/\b(car|truck|bus|taxi)\b/, bicycle:/\b(bike|bicycle|cycle)\b/,
    octopus:/\b(octopus|squid)\b/,fish:/\b(fish|shark|whale|dolphin)\b/,cat:/\b(cat|kitty|kitten|tiger|lion)\b/,
    dog:/\b(dog|puppy|wolf)\b/,bear:/\b(bear|teddy)\b/,dragon:/\b(dragon|dinosaur|dino)\b/,
    tree:/\b(tree|pine|oak)\b/,house:/\b(house|castle|cabin)\b/,flower:/\b(flower|rose|daisy)\b/,
    umbrella:/\bumbrella\b/,cloud:/\bcloud\b/,monster:/\b(monster|creature|ghost|alien|blob)\b/
  };
  function valid(s){return s&&Object.entries(choices).every(([k,v])=>v.includes(s[k]));}
  function recipe(idea, sketch, prior){
    const text=idea.toLowerCase();
    let subject=Object.keys(words).find(key=>words[key].test(text));
    if(subject==="boat"&&/pirate/.test(text))subject="pirate ship";
    subject=subject||(sketch==="boat"?"pirate ship":sketch)||prior?.subject||"monster";
    if(!choices.subject.includes(subject))subject="monster";
    const [base,movement,detail]=defaults[subject];
    const setting=/\bunderwater\b|below the waves/.test(text)?"underwater":/\bisland\b/.test(text)?"island":
      /\b(space|moon|planet|asteroids?)\b/.test(text)?"space":/\b(ocean|sea)\b/.test(text)?"ocean":
      /\b(mountains?|volcano)\b/.test(text)?"mountains":/\b(forest|woods|jungle)\b/.test(text)?"forest":
      /\b(road|city|street)\b/.test(text)?"road":/\b(garden|field|meadow)\b/.test(text)?"garden":
      /\b(clouds|sky)\b/.test(text)?"sky":prior?.subject===subject?prior.setting:base;
    const activity=/\b(dodge|avoid|obstacles?|collect|race)\b/.test(text)?"dodge":
      /\b(jump|hop|platformer|runner)\b/.test(text)?"jump":/\b(pet|feed|care|treat)\b/.test(text)?"pet":
      /\bgame\b/.test(text)?"dodge":/\b(animation|animate|scene)\b/.test(text)?"animation":prior?.activity||"animation";
    const motion=/\b(orbit|spin|circle)\b/.test(text)?"orbit":/\b(fly|flying|soar)\b/.test(text)?"fly":
      /\b(swim|diving|dive)\b/.test(text)?"swim":/\b(grow|bloom)\b/.test(text)?"grow":
      /\b(bounce|dancing|dance)\b/.test(text)?"bounce":movement;
    const prop=/\bstars\b/.test(text)?"stars":/\bmoon\b/.test(text)?"moon":detail;
    return {activity,subject,setting,motion,prop};
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
  const gbnf=()=>{
    const fields=Object.keys(choices);
    const t=JSON.stringify;
    return ['root ::= ' + t('{')+' ws '+fields.map(key=>t(t(key))+' ws '+t(':')+' ws '+key).join(' ws '+t(',')+' ws ')+' ws '+t('}'),
      'ws ::= [ \t\n\r]*'.replace('\t','\\t').replace('\n','\\n').replace('\r','\\r'),
      ...fields.map(key=>key+' ::= '+choices[key].map(val=>t(t(val))).join(' | '))].join('\n');
  };
  function modelPrompt(idea,sketch,prior){
    return "<|im_start|>system\nYou design monochrome interactive scenes. Map the user's words and sketch label to a JSON recipe. Respect requested edits to the prior recipe. A rough boat drawing should become a pirate ship. Animation is the default; choose a game only if asked. Fields: activity, subject, setting, motion, prop. Allowed values: "+JSON.stringify(choices)+
      "<|im_end|>\n<|im_start|>user\n"+JSON.stringify({idea:idea.replace(/[<>|]/g," "),sketch,prior})+"<|im_end|>\n<|im_start|>assistant\n";
  }
  return {valid,recipe,classify,gbnf,modelPrompt,choices,matches: idea=>Object.values(words).some(pattern=>pattern.test(idea.toLowerCase()))};
})();
