"use strict";

// All artwork lives on this integer grid, including text and interaction feedback.
const World = (() => {
  const W = 320, H = 192;
  const INK = "#272727", MID = "#888888", PALE = "#c6c6c6", MIST = "#e6e6e6", PAPER = "#ffffff";
  const levels = ["low", "medium", "high", "extra high", "max"];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mod = (value, span) => ((value % span) + span) % span;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const round = Math.round;

  function hash(text) {
    let h = 2166136261;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function prng(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let n = Math.imul(state ^ (state >>> 15), 1 | state);
      n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rect(c, x, y, w, h, color = INK) {
    c.fillStyle = color;
    c.fillRect(round(x), round(y), Math.max(1, round(w)), Math.max(1, round(h)));
  }
  function line(c, ax, ay, bx, by, color = INK, dotted = false) {
    if(!Number.isFinite(ax+ay+bx+by))return;
    let x = round(ax), y = round(ay);
    const endX = round(bx), endY = round(by), dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy, count = 0;
    c.fillStyle = color;
    for (;;) {
      if (!dotted || count++ % 3 === 0) c.fillRect(x, y, 1, 1);
      if (x === endX && y === endY) break;
      const e = 2 * error;
      if (e >= dy) { error += dy; x += sx; }
      if (e <= dx) { error += dx; y += sy; }
    }
  }
  function disk(c, x, y, r, color, outline) {
    for (let yy = -r; yy <= r; yy++) {
      const half = Math.floor(Math.sqrt(r*r - yy*yy));
      rect(c, x-half, y+yy, 2*half+1, 1, color);
      if (outline) {
        rect(c, x-half, y+yy, 1, 1, outline);
        rect(c, x+half, y+yy, 1, 1, outline);
      }
    }
  }
  function cloud(c, x, y, size, color = PALE) {
    const s = size;
    line(c,x-10*s,y,x+10*s,y,color);
    line(c,x-7*s,y-2*s,x-3*s,y-2*s,color);
    line(c,x-3*s,y-2*s,x-1*s,y-5*s,color);
    line(c,x-1*s,y-5*s,x+3*s,y-5*s,color);
    line(c,x+3*s,y-5*s,x+5*s,y-2*s,color);
    line(c,x+5*s,y-2*s,x+8*s,y-2*s,color);
  }
  function pine(c, x, ground, h, color) {
    for (let y = 0; y < h-2; y++) {
      const radius = Math.floor((y + (y % 5) * .9) * .19);
      rect(c,x-radius,ground-h+y,radius*2+1,1,color);
    }
    rect(c,x,ground-3,1,4,color);
  }
  const font = {
    A:"25755",B:"65656",C:"34443",D:"65556",E:"74647",F:"74644",G:"34753",H:"55755",I:"72227",J:"11152",K:"55655",L:"44447",M:"57755",N:"57555",O:"25552",P:"65644",Q:"25573",R:"65655",S:"34216",T:"72222",U:"55553",V:"55552",W:"55775",X:"55255",Y:"55222",Z:"71347",
    0:"75557",1:"26227",2:"71247",3:"71217",4:"55711",5:"74617",6:"74657",7:"71222",8:"75757",9:"75717","-":"00700","/":"11244",".":"00002", " ":"00000"
  };
  function caption(c, text, x, y, color = MID) {
    const str = text.toUpperCase();
    let cursor = round(x - (str.length * 4 - 1) / 2);
    for (const ch of str) {
      const glyph = font[ch] || font[' '];
      for (let row=0; row<5; row++) for (let col=0; col<3; col++) {
        if (Number(glyph[row]) & (4 >> col)) rect(c,cursor+col,y+row,1,1,color);
      }
      cursor += 4;
    }
  }

  function themeFor(recipe) {
    const key = String(recipe.setting || '').toLowerCase();
    if (/ocean|island|sea|harbou?r|coast|lake|river/.test(key)) return 'coast';
    if (/space|orbit|star|moon|cosmos/.test(key)) return 'space';
    if (/underwater|reef|deep/.test(key)) return 'reef';
    if (/room|workshop|studio|library|attic/.test(key)) return 'room';
    if (/road|street|city|rail|village/.test(key)) return 'city';
    if (/sky|cloud|air/.test(key)) return 'sky';
    return 'hills';
  }
  function layout(s, i, count) {
    const p = Catalog.layout(s.style, i, count, s.seed);
    return {x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1)};
  }
  function subjectBlock(subject, seed) {
    const name = {trees:'tree',rocks:'rock',clouds:'cloud',stars:'star',boat:'sailboat'}[subject] || subject;
    return Catalog.blockId(Catalog.familyFor(name) || 'star', seed);
  }
  function start(recipe) {
    const seed = Number.isInteger(recipe.seed) ? recipe.seed >>> 0 : hash(JSON.stringify(recipe));
    const random = prng(seed), tier = levels.indexOf(recipe.level);
    const legacyMechanic = {jump:'jump',pet:'pet',dodge:'dodge'}[recipe.activity];
    const kind = recipe.activity === 'game' || legacyMechanic ? 'game' : 'animation';
    const style = Number.isInteger(recipe.styleId) ? Catalog.style(kind, recipe.styleId,seed) : Catalog.styleFor(kind, legacyMechanic === 'dodge' ? 'dodge' : kind==='game'?'guide':'drift', seed);
    const intensity = tier >= 0 ? tier : 2;
    const mechanic = intensity === 0 ? 'still' : legacyMechanic || style.mechanic;
    const blocks = recipe.blocks?.length ? recipe.blocks : [subjectBlock(recipe.subject,seed),subjectBlock(recipe.prop === 'none' ? 'star' : (recipe.prop || 'star'),seed+3)];
    const s = {
      recipe, seed, random, style, mechanic, theme:themeFor(recipe), blocks, intensity, kind,
      rules:kind==='game'&&recipe.version===2&&Catalog.gameRules?Catalog.gameRules(style,seed):null,
      round:0,roundOver:false,taps:0,lastTap:-1e6,nextMilestone:1,
      heroBlock:Catalog.block(blocks[0]),
      fittings: (Array.isArray(recipe.parts)?recipe.parts:[]).slice(0,3).map(id=>({id,family:Catalog.block(id)?.family})).filter(part=>part.family),
      t:0,x:160,y:98,target:{x:160,y:98},down:null,started:false,over:false,won:false,
      score:0,goal:4+intensity,velocity:0,altitude:0,next:1,sequence:0,items:[],effects:[],shots:[],
      selected:-1,flash:0,scroll:0,balance:0,torque:0,elapsed:0,leg:0,wind:random()*6, art:null,
      horizon:92+Math.floor(random()*23),lightX:42+Math.floor(random()*235),
      marks:Array.from({length:72},()=>({x:random()*W,y:random()*H,n:random(),phase:random()*Math.PI*2})),
    };
    s.landmarks=Array.from({length:6+intensity*2},(_,i)=>layout(s,i,6+intensity*2));
    // A generation's composition also governs the actual course, landing pad,
    // balance point and workshop bench. Motion fields steer moving game pieces.
    const anchor=layout(s,0,5);
    s.homeX=112+anchor.x*92;
    s.homeY=142+anchor.y*8;
    s.field=Catalog.motion(style,0,1);
    if (mechanic==='launch') {s.y=s.homeY;s.x=s.homeX;}
    if (mechanic==='cannon') {s.x=65+random()*24;s.y=s.horizon+17;}
    if (mechanic==='dodge'||mechanic==='steer'||mechanic==='race') {s.x=W/2;s.y=142;}
    if (mechanic==='jump') {s.x=72;s.y=143;}
    if (mechanic==='catch') {s.y=152;}
    if (mechanic==='assemble'||mechanic==='match') buildPuzzle(s);
    if (mechanic==='collect'||mechanic==='guide'||mechanic==='explore'||mechanic==='steer'||mechanic==='race') buildRoute(s);
    if (mechanic==='stack') s.items.push({x:s.homeX,y:s.homeY,w:58+anchor.y*20});
    s.target={x:s.x,y:s.y};
    return s;
  }
  function buildPuzzle(s) {
    const count = s.mechanic==='assemble' ? 4 : 3+Number(s.intensity>=3);
    const order = Array.from({length:count}, (_,i)=>i);
    for(let i=count-1;i>0;i--){const j=Math.floor(s.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    s.goal=count;
    for (let i=0;i<count;i++) {
      const p=layout(s,i,count), a=order[i];
      const dx=(s.homeX-158)*.44,dy=(s.homeY-146)*2;
      const dest = s.mechanic==='assemble' ? {x:218+dx+(i%2)*28,y:78+dy+Math.floor(i/2)*28} : {x:215+dx+(i%2)*30,y:68+dy+Math.floor(i/2)*37};
      s.items.push({x:56+(a%2)*43+p.x*9,y:66+Math.floor(a/2)*48+p.y*7,dest,
        block:s.mechanic==='assemble'?s.blocks[0]:s.blocks[(i+1)%s.blocks.length],i,locked:false});
      const loose=s.items.at(-1);loose.rest={x:loose.x,y:loose.y};
    }
  }
  function buildRoute(s) {
    for (let i=0;i<s.goal;i++) {
      const p=layout(s,i,s.goal);
      // Keep stops navigable even for layouts that deliberately align their centers.
      const x=34+(mod(p.x+.11*Math.sin(i*3+s.wind),1))*252;
      const y=36+(mod(p.y+.10*Math.cos(i*4+s.wind),1))*100;
      s.items.push({x,y,baseX:x,baseY:y,i,done:false,block:s.blocks[(i+1)%s.blocks.length]});
    }
  }
  function emit(s,x,y,count=4) {
    for(let i=0;i<count;i++) s.effects.push({x,y,vx:(s.random()-.5)*17,vy:-4-s.random()*11,life:.35+s.random()*.5});
  }
  function finishRound(s){
    if(s.rules&&Catalog.gameFinish(s.rules)==='retry')s.roundOver=true;
    else s.won=true;
    cancel(s);
  }
  function success(s,x,y) {
    if(s.rules)Catalog.gamePoint(s.rules,x/W,y/H);
    s.score++;s.flash=.4;emit(s,x,y);if(s.score>=s.goal)finishRound(s);
  }
  function nextRound(s){
    const {recipe,rules}=s,round=s.round+1;
    Object.assign(s,start({...recipe,seed:(s.seed+0x9e3779b9)>>>0}),{recipe,rules,round});
  }
  function miss(s){
    if(s.rules&&Catalog.gameRescue?.(s.rules))s.roundOver=true;
    else s.over=true;
    cancel(s);
  }
  function restart(s) {Object.assign(s,start(s.recipe));}
  function pin(p) {return {x:clamp(p.x,4,W-4),y:clamp(p.y,7,H-14)};}
  function aimed(s,p) {return Math.hypot(p.x-s.x,p.y-(s.y-(s.mechanic==='launch'?15:0)))<=(s.mechanic==='launch'?55:44);}
  function press(s,position) {
    if (!Number.isFinite(position?.x)||!Number.isFinite(position?.y)) return;
    if(s.roundOver){nextRound(s);return;}
    if(s.over||s.won||s.roundOver){restart(s);return;}
    const p=pin(position);s.down=p;s.started=true;s.taps++;s.lastTap=s.t;
    if(s.rules)Catalog.gameInput(s.rules,'press',p.x/W,p.y/H);
    switch(s.mechanic){
      case 'launch':
        if(aimed(s,p)){s.velocity=Math.max(s.velocity,48);s.thrust=true;}
        break;
      case 'assemble':case 'match': {
        let nearest=-1, radius=22;
        for(let i=0;i<s.items.length;i++){
          const d=distance(p,s.items[i]);if(!s.items[i].locked&&d<radius){nearest=i;radius=d;}
        }
        s.selected=nearest;if(nearest>=0)s.items[nearest].touched=true;break;
      }
      case 'stack': {
        const last=s.items.at(-1),x=stackX(s),left=Math.max(x-last.w/2,last.x-last.w/2),right=Math.min(x+last.w/2,last.x+last.w/2);
        if(right-left<3){miss(s);break;}
        s.items.push({x:(left+right)/2,y:last.y-9,w:right-left});success(s,(left+right)/2,last.y-10);break;
      }
      case 'jump':if(s.y>=142)s.velocity=-108;break;
      case 'pet':success(s,s.x,s.y);break;
      case 'cannon': {
        const origin={x:s.x+26,y:s.y+14};
        const dx=aimed(s,p)?84:p.x-origin.x,dy=aimed(s,p)?-34:p.y-origin.y;
        const length=Math.max(1,Math.hypot(dx,dy));
        s.shots.push({...origin,vx:108*dx/length,vy:108*dy/length,life:3});s.flash=.15;break;
      }
      case 'balance':s.target=p;break;
      default:s.target=p;if(s.kind==='animation'&&s.mechanic!=='still')emit(s,s.x,s.y,2);
    }
  }
  function move(s,position) {
    if(!s.down||!Number.isFinite(position?.x)||!Number.isFinite(position?.y))return;
    const p=pin(position);
    if(s.selected>=0){const item=s.items[s.selected];item.x=p.x;item.y=p.y;}
    else s.target=p;
  }
  function release(s,position) {
    if(!s.down)return;
    if(position)move(s,position);
    if(s.rules){const p=pin(position||s.down);Catalog.gameInput(s.rules,'release',p.x/W,p.y/H);}
    if(s.selected>=0){const item=s.items[s.selected];if(distance(item,item.dest)<20){Object.assign(item,item.dest);item.locked=true;success(s,item.x,item.y);}}
    cancel(s);
  }
  function cancel(s){s.down=null;s.thrust=false;s.selected=-1;}
  function interact(s,position,gesture) {
    const p={x:Number.isFinite(position?.x)?position.x:s.x+(gesture?.x||0),y:Number.isFinite(position?.y)?position.y:s.y};
    press(s,p);release(s,p);
  }
  function stackX(s){
    const m=Catalog.motion(s.style,s.t*.65,s.items.length);
    return s.homeX+Math.sin(s.t*(.8+s.intensity*.13)+s.wind+s.items.length*1.8)*61+m.x*20;
  }
  function approach(s,d,speed=8) {
    const amount=Math.min(1,speed*d);s.x+=(s.target.x-s.x)*amount;s.y+=(s.target.y-s.y)*amount;
  }
  function advanceObjects(s,d) {
    s.next-=d;
    if(s.next<=0){
      const p=layout(s,s.sequence++%13,13);
      const jump=s.mechanic==='jump', side=s.mechanic==='cannon';
      s.items.push({x:jump?W+8:side?W+8:clamp(24+p.x*265+(s.random()-.5)*32,15,W-15),
        y:jump?147:side?s.horizon-8-p.y*50:-10,phase:s.random()*7,block:s.blocks[1+(s.sequence-1)%Math.max(1,s.blocks.length-1)]??s.blocks[0],passed:false});
      s.next=clamp(2.3-s.intensity*.16+s.field.y*.22+(s.random()-.5)*.75,1,3);
    }
    const pace=23+s.intensity*5+s.field.y*4;
    for(const item of s.items){
      const flow=Catalog.motion(s.style,s.t*.6,item.phase);
      if(s.mechanic==='jump'||s.mechanic==='cannon'){
        item.x-=pace*d;if(s.mechanic==='cannon')item.y+=flow.y*d*3;
      }else{item.y+=pace*d;item.x+=flow.x*d*(4+s.intensity*1.5);}
      if(item.passed)continue;
      if(s.mechanic==='catch'&&distance(item,s)<20){item.passed=true;success(s,item.x,item.y);}
      if(s.mechanic==='dodge'||s.mechanic==='jump'){
        if(distance(item,s)<12){miss(s);return;}
        if(s.mechanic==='jump'?item.x<s.x-12:item.y>s.y+12){item.passed=true;success(s,s.x,s.y);}
      }
    }
    s.items=s.items.filter(item=>item.y<H+15&&item.x> -14&&!(s.mechanic==='catch'&&item.passed));
  }
  function step(s,delta) {
    if(!Number.isFinite(delta)||delta<=0||s.over||s.won||s.roundOver)return;
    const real=Math.min(.08,delta);
    if(s.rules&&s.started)Catalog.gameTick(s.rules,real,Boolean(s.down));
    const d=real*(s.rules?Catalog.gameSpeed(s.rules):1);s.t+=d;s.flash=Math.max(0,s.flash-d);
    for(const p of s.effects){p.x+=p.vx*d;p.y+=p.vy*d;p.life-=d;}
    s.effects=s.effects.filter(p=>p.life>0);
    if(!s.started&&s.kind==='game')return;
    s.elapsed+=d;
    s.field=Catalog.motion(s.style,s.t*.6,1);
    switch(s.mechanic){
      case 'still':approach(s,d,16);break;
      case 'launch':
        s.velocity=clamp(s.velocity+(s.thrust?80:-72)*d,-86,126);
        s.altitude=Math.max(0,s.altitude+s.velocity*d);
        if(!s.altitude)s.velocity=0;
        s.y=s.homeY-Math.min(70,s.altitude*.52);
        s.x=s.homeX+s.field.x*Math.min(12,s.altitude*.035);
        if(s.rules&&s.altitude>=s.nextMilestone*30){s.nextMilestone++;Catalog.gamePoint(s.rules,s.x/W,s.y/H);}
        break;
      case 'dodge':case 'catch':case 'jump':case 'cannon':
        if(s.mechanic==='dodge')approach(s,d);
        if(s.mechanic==='catch'){s.target.y=152;approach(s,d);}
        if(s.mechanic==='jump'){s.velocity+=195*d;s.y=Math.min(143,s.y+s.velocity*d);if(s.y>=143)s.velocity=0;}
        advanceObjects(s,d);
        for(const shot of s.shots){shot.x+=shot.vx*d;shot.y+=shot.vy*d;shot.vy+=23*d;shot.life-=d;
          for(const item of s.items){if(!item.passed&&distance(shot,item)<12){item.passed=true;shot.life=0;success(s,item.x,item.y);break;}}
        }
        s.shots=s.shots.filter(p=>p.life>0&&p.x>-3&&p.x<W+3);break;
      case 'collect':case 'explore':case 'guide':case 'steer':case 'race': {
        const fast=s.mechanic==='race', ordered=fast||s.mechanic==='guide'||s.mechanic==='steer';
        if(s.mechanic==='steer'){
          const dx=s.target.x-s.x,dy=s.target.y-s.y,len=Math.hypot(dx,dy),travel=Math.min(d*(23+s.intensity*4),len);
          if(len>.1){s.x+=dx/len*travel;s.y+=dy/len*travel;}
        }else approach(s,d,fast?8:s.mechanic==='guide'?2.2:5);
        for(const item of s.items){
          if(item.done)continue;
          const field=Catalog.motion(s.style,s.t*.45,item.i);item.x=item.baseX+field.x*4;item.y=item.baseY+field.y*3;
          if(ordered&&item.i!==s.score)continue;
          if(distance(item,s)<16){item.done=true;success(s,item.x,item.y);}
        }
        if(fast&&s.elapsed>10+s.goal*3&&!s.won&&!s.roundOver)miss(s);break;
      }
      case 'balance': {
        const bias=(s.down?(s.target.x-W/2)/(W/2):0)*.72;
        s.torque+=(Math.sin(s.t*.7+s.wind)*.14+s.field.x*.19+bias-s.balance*.3)*d;s.torque*=Math.exp(-.6*d);
        s.balance+=s.torque*d;s.x=s.homeX+s.balance*66;s.y=97+s.balance*s.balance*6;
        if(s.rules&&s.elapsed>=s.nextMilestone){s.nextMilestone++;Catalog.gamePoint(s.rules,s.x/W,s.y/H);}
        if(Math.abs(s.balance)>1.3)miss(s);
        else if(s.elapsed>=4+s.intensity*1.5)finishRound(s);
        break;
      }
      case 'assemble':case 'match':
        for(const part of s.items){
          if(part.locked||part.touched)continue;
          const bob=Catalog.motion(s.style,s.t*.43,part.i);
          part.x=part.rest.x+bob.x*2;part.y=part.rest.y+bob.y*2;
        }
        break;
      case 'stack':case 'pet':break;
      default:approach(s,d,3);
    }
  }

  function stars(c,s,offset=0) {
    for(let i=0;i<18+s.intensity*7;i++){
      const p=s.marks[i],y=mod(p.y+offset*(.09+p.n*.18),H);
      rect(c,p.x,y,1,1,i%3===0?MID:PALE);
      if(i%11===0){line(c,p.x-2,y,p.x+2,y,PALE);line(c,p.x,y-2,p.x,y+2,PALE);rect(c,p.x,y,1,1,MID);}
    }
  }
  function planet(c,x,y,r,ring=false) {
    if(ring)line(c,x-r*1.7,y+r*.49,x+r*1.7,y-r*.49,PALE);
    disk(c,x,y,r,PAPER,MID);
    for(let j=-r+2;j<r-1;j++){
      const w=Math.sqrt(r*r-j*j),left=x-w+1;
      for(let i=1;i<w*.48;i++)if((round(left+i)+j)%4===0)rect(c,left+i,y+j,1,1,PALE);
    }
    if(ring){line(c,x-r*1.7,y+r*.49,x+r*1.7,y-r*.49,MID);line(c,x-r*1.7,y+r*.49+1,x+r*.65,y-r*.18+1,PALE);}
    else{line(c,x+r*.11,y-r*.36,x+r*.38,y-r*.42,PALE);line(c,x+r*.16,y+r*.43,x+r*.34,y+r*.47,PALE);}
  }
  function ridge(s,x,wave) {
    return Math.sin(x*.024+s.wind)*.50+Math.sin(x*.057+wave+s.wind)*.24+Math.cos(x*.009-s.wind)*.26;
  }
  function mountains(c,s,baseline,height,color) {
    let prev=baseline;
    for(let x=0;x<W;x+=2){const y=baseline-height*Math.abs(ridge(s,x,3));line(c,x-2,prev,x,y,color);prev=y;}
  }
  function rocks(c,x,y,size,color=MID) {
    const w=size,h=size*.55;
    for(let i=0;i<h;i++){
      const left=round(-w*.25-i*.65),right=round(w*.17+i*.9);
      rect(c,x+left,y-h+i,right-left,1,i===0?color:PAPER);
      rect(c,x+left,y-h+i,1,1,color);rect(c,x+right,y-h+i,1,1,color);
      if(i%2===0)rect(c,x+left+2,y-h+i,1,1,PALE);
    }
    line(c,x-w*.6,y,x+w*.66,y,color);
  }
  function grass(c,x,y,color) {line(c,x,y,x-2,y-3,color);line(c,x,y,x+2,y-5,color);}
  function sky(c,s) {
    const n=2+s.intensity;
    for(let i=0;i<n;i++){
      const p=s.marks[20+i];cloud(c,mod(p.x+s.t*(.4+p.n),W+40)-18,19+p.y*.25,.55+p.n*.4);
    }
    const sx=s.lightX,sy=24+s.marks[9].y*.13;
    disk(c,sx,sy,7,PAPER,PALE);
    if(s.seed%3===0)for(let k=0;k<5;k++)line(c,sx-4+k,sy+5-k,sx+k,sy+5-k,MIST,true);
  }
  function coast(c,s) {
    const h=s.horizon;sky(c,s);mountains(c,s,h-1,10,MIST);
    line(c,0,h,W,h,PALE);
    const headland=s.seed%2===0?1:-1;
    for(let x=0;x<57;x++){
      const edge=6*(1-x/56)+Math.abs(Math.sin(x*.2+s.wind))*2;
      rect(c,headland===1?x:W-1-x,h-edge,1,edge+1,PALE);
    }
    const lx=headland===1?23:W-23;
    rect(c,lx-2,h-16,4,13,PAPER);line(c,lx-2,h-16,lx-2,h-3,MID);line(c,lx+2,h-16,lx+2,h-3,MID);
    rect(c,lx-3,h-18,7,2,MID);rect(c,lx-1,h-21,3,3,MID);rect(c,lx-2,h-12,5,2,PALE);
    const quay=lx+headland*13;
    rect(c,quay-4,h-6,9,5,PAPER);line(c,quay-5,h-6,quay,h-10,MID);line(c,quay,h-10,quay+5,h-6,MID);
    line(c,quay-4,h-6,quay-4,h-1,PALE);rect(c,quay,h-4,2,3,MID);
    const jetty=quay+headland*10;
    line(c,jetty,h,jetty+headland*14,h+2,MID);line(c,jetty+headland*5,h+1,jetty+headland*5,h+4,PALE);
    line(c,jetty+headland*13,h+1,jetty+headland*13,h+5,PALE);
    for(let i=0;i<23+s.intensity*6;i++){
      const p=s.marks[i],y=h+3+p.y/H*(H-h-8),span=2+(y-h)*.105*p.n;
      const x=mod(p.x+s.t*(1+p.n*2),W+20)-9;
      line(c,x,y,x+span,y,i%5===0?MID:PALE);
      if(i%4===0)line(c,x+span+2,y-1,x+span+5,y-1,PALE);
    }
  }
  function birdseye(c,s) {
    const water=s.theme==='coast'||s.theme==='reef';
    for(let i=0;i<20+4*s.intensity;i++){
      const p=s.marks[i],y=mod(p.y+s.elapsed*(7+p.n*6),H);
      line(c,p.x,y,p.x+(water?3:0),y+(water?-1:3),PALE);
      if(water&&i%4===0)line(c,p.x+4,y-1,p.x+6,y,PALE);
    }
    for(let y=0;y<H;y++){
      const extent=round(6+4*Math.sin(y*.033+s.wind+s.elapsed*.19)+4*Math.cos(y*.021+s.wind));
      const right=round(7+4*Math.sin(y*.041-s.wind+s.elapsed*.23));
      rect(c,0,y,extent,1,MIST);rect(c,W-right,y,right,1,MIST);
      if(y%3!==0){rect(c,extent,y,1,1,PALE);rect(c,W-right-1,y,1,1,PALE);}
    }
  }
  function hills(c,s) {
    sky(c,s);
    const g=s.horizon+26;mountains(c,s,g-13,31,PALE);mountains(c,s,g+1,17,MID);
    for(let i=0;i<s.landmarks.length;i++){
      const p=s.landmarks[i],x=10+p.x*297,y=g+1-15*Math.abs(ridge(s,x,3));
      pine(c,x,y,5+round(p.y*12),i%3===0?MID:PALE);
    }
    for(let i=0;i<15;i++){const p=s.marks[i],y=g+5+p.y/H*(H-g-12);if(i%5===0)grass(c,p.x,y,PALE);else rect(c,p.x,y,3,1,MIST);}
  }
  function city(c,s){
    sky(c,s);const ground=s.horizon+21;
    for(let i=0;i<15;i++){
      const p=s.marks[i],x=i*24-10,w=17+round(p.n*9),h=10+round(p.y*.16);
      rect(c,x,ground-h,w,h,PAPER);line(c,x,ground-h,x+w,ground-h,PALE);line(c,x,ground-h,x,ground,PALE);
      if(i%2===0){rect(c,x+w/2,ground-h-3,4,3,PALE);}
      for(let yy=ground-h+4;yy<ground-2;yy+=5)for(let xx=x+4;xx<x+w-1;xx+=6)rect(c,xx,yy,2,2,MIST);
    }
    line(c,0,ground,W,ground,MID);line(c,0,ground+3,W,ground+3,PALE);line(c,0,ground+35,W,ground+35,PALE);
    for(let i=0;i<11;i++){const x=mod(i*34-s.t*3,W+32)-12;rect(c,x,ground+19,11,1,PALE);}
  }
  function skyRoom(c,s){
    const x=s.lightX<160?41:248,y=36;
    rect(c,x-1,y-1,32,38,PALE);rect(c,x+1,y+1,28,34,PAPER);cloud(c,x+14,y+14,.65,MIST);
    line(c,x+15,y,x+15,y+36,PALE);line(c,x,y+18,x+30,y+18,PALE);rect(c,x-3,y+36,36,2,PALE);
    line(c,0,142,W,142,PALE);line(c,0,146,W,146,MIST);
    for(let i=0;i<8;i++)line(c,i*48-12,149,i*51-23,166,MIST);
  }
  function backdrop(c,s) {
    if(s.mechanic==='still'){
      for(let x=8;x<W;x+=12)for(let y=8;y<H;y+=12)rect(c,x,y,1,1,MIST);
      return;
    }
    if(s.mechanic==='launch'){
      const a=s.altitude;
      if(a<210){
        const descent=Math.min(104,a*.5),ground=s.homeY+12+descent;
        for(let i=0;i<5;i++){const p=s.marks[i];cloud(c,p.x,18+p.y*.31+descent*(i*.12+.3),.7+p.n*.6,i%2?MIST:PALE);}
        mountains(c,s,ground-2,19,MIST);line(c,0,ground,W,ground,MID);
        rect(c,s.homeX-31,ground-2,63,3,MID);rect(c,s.homeX-29,ground+1,58,3,PALE);
        const gx=s.homeX-30;line(c,gx,ground-47,gx,ground-2,MID);line(c,gx+6,ground-47,gx+6,ground-2,MID);
        rect(c,gx-1,ground-49,9,2,MID);line(c,gx+5,ground-48,gx+17,ground-41,MID);
        line(c,gx+17,ground-41,gx+17,ground-37,PALE);rect(c,gx-3,ground-40,12,2,MID);
        const base=gx-33;rect(c,base,ground-8,20,7,MIST);line(c,base-1,ground-9,base+20,ground-9,MID);
        line(c,base,ground-8,base,ground-2,MID);rect(c,base+3,ground-6,5,2,MID);rect(c,base+13,ground-6,3,5,PALE);
        line(c,base+7,ground-10,base+7,ground-18,MID);line(c,base+3,ground-16,base+11,ground-19,MID);
        line(c,base+21,ground-4,gx-2,ground-2,PALE);
        for(let k=0;k<6;k++){line(c,gx,ground-45+k*7,gx+6,ground-38+k*7,PALE);line(c,gx,ground-38+k*7,gx+6,ground-45+k*7,PALE);}
        line(c,gx,ground-36,gx+15,ground-36,MID);
      }
      if(a>90)stars(c,s,a-90);
      if(a>188){
        const p=layout(s,1,s.blocks.length),nearby=mod(-54+(a-188)*.4,330)-38;
        if(nearby<H+12&&nearby>-12)stamp(c,s.blocks[1]??s.blocks[0],23+p.x*270,nearby,14+round(p.y*9));
        for(let i=0;i<5;i++){const p=s.marks[15+i],y=mod(20-i*160+(a-188)*.48,800)-39; if(y>-35&&y<H+32)planet(c,25+p.x*.83,y,12+round(p.n*12),i%2===0);}
      }
      return;
    }
    if(s.mechanic==='assemble'||s.mechanic==='match'||s.mechanic==='stack'){
      for(let x=12;x<W;x+=14)for(let y=15;y<H-14;y+=14)rect(c,x,y,1,1,MIST);
      return;
    }
    if(s.mechanic==='dodge'||s.mechanic==='steer'||s.mechanic==='race') {birdseye(c,s);return;}
    switch(s.theme){
      case 'coast':coast(c,s);break;
      case 'city':city(c,s);break;
      case 'room':skyRoom(c,s);break;
      case 'space':stars(c,s,s.t*2);planet(c,s.lightX,32+s.marks[0].y*.1,12+s.seed%7,true);break;
      case 'sky':sky(c,s);mountains(c,s,163,18,MIST);break;
      case 'reef':
        for(let i=0;i<14+s.intensity;i++){const p=s.marks[i],y=mod(p.y-s.t*2,H);disk(c,p.x,y,1+round(p.n),PAPER,PALE);}
        for(let i=0;i<14;i++){const p=s.marks[i];line(c,p.x,H-15,p.x-2,H-24-p.n*10,PALE);line(c,p.x-2,H-24-p.n*10,p.x+1,H-33-p.n*10,PALE);}
        break;
      default:hills(c,s);
    }
  }
  function stamp(c,id,x,y,size) {Catalog.draw(c,id,round(x),round(y),Math.max(4,round(size)));}
  // Semantic sockets keep a selected component in contact with its actor as it
  // moves. They use fractions of the actor's square, so the very same composite
  // can be previewed, played, cropped into puzzle pieces and saved by recipe.
  function fittings(c,s,x,y,size) {
    s.fittings.forEach(({id,family},i)=>{
      let dx=.29,dy=.12,ratio=.43;
      if(/hat|crown|flower|antenna/.test(family)){dx=0;dy=-.34;ratio=.54;}
      else if(/wing|fin/.test(family)){
        stamp(c,id,x-size*.25,y+size*.06,size*.60);
        c.save();c.translate(round(x+size*.25),round(y+size*.06));c.scale(-1,1);stamp(c,id,0,0,size*.60);c.restore();return;
      }else if(/wheel|axle|foot/.test(family)){dy=.30;dx=.19;stamp(c,id,x-size*dx,y+size*dy,size*.38);ratio=.38;}
      else if(/broom|board|hull|canoe|bicycle|sailboat/.test(family)){dx=.02;dy=.25;ratio=.86;}
      else if(/nozzle|flame|spring/.test(family)){dx=0;dy=.34;ratio=.42;}
      else if(/sail|flag/.test(family)){dx=.09;dy=-.35;ratio=.55;}
      else if(i%2===1){dx=-.29;dy=-.14;}
      stamp(c,id,x+size*dx,y+size*dy,size*ratio);
    });
  }
  // Larger actors use the geometry of their selected catalog block for an
  // illustrated hull or airframe. Cargo, fittings and scenery still use the
  // regular modular tiles; this keeps the cockpit and rigging legible on phones.
  function illustrated(c,s,x,y,size) {
    const b=s.heroBlock,rocket=b?.family==='rocket',pirate=b?.family==='pirate-ship';
    if(!rocket&&!pirate&&b?.family!=='sailboat')return false;
    const {width=33,height=35,slant=0,nib=1,finish=0}=b;
    const sx=size/80*(.94+(width-27)*.009),sy=size/80*(.96+(height-29)*.008);
    const point=([px,py])=>[round(x+(px+py*slant*.24)*sx),round(y+py*sy)];
    function pen(points,color=INK){const pts=points.map(point);for(let i=1;i<pts.length;i++)line(c,...pts[i-1],...pts[i],color);}
    function panel(points,fill=PAPER,edge=INK){
      const pts=points.map(point),ys=pts.map(p=>p[1]);
      for(let row=Math.min(...ys);row<=Math.max(...ys);row++){
        const hits=[];
        for(let i=0,j=pts.length-1;i<pts.length;j=i++){
          const [x1,y1]=pts[i],[x2,y2]=pts[j];
          if((y1<=row&&row<y2)||(y2<=row&&row<y1))hits.push(x1+(row-y1)*(x2-x1)/(y2-y1));
        }
        hits.sort((a,b)=>a-b);
        for(let i=0;i+1<hits.length;i+=2){const left=Math.ceil(hits[i]);rect(c,left,row,Math.max(1,Math.floor(hits[i+1])-left+1),1,fill);}
      }
      pen([...points,points[0]],edge);
    }
    function windowAt(px,py,r){const pt=point([px,py]);disk(c,...pt,Math.max(1,round(r*sx)),INK);disk(c,pt[0]-1,pt[1]-1,Math.max(1,round(r*sx*.57)),MIST);}
    if(rocket){
      const fin=16+nib, tip=-33-finish;
      panel([[-8,6],[-fin,15],[-fin-2,29],[-8,23]],MID);
      panel([[8,6],[fin,15],[fin+2,29],[8,23]],PALE);
      pen([[-fin,24],[-11,16]],PAPER);pen([[11,17],[fin,23]],PAPER);
      panel([[-6,21],[6,21],[9,29],[-9,29]],MID);pen([[-7,27],[7,27]],INK);
      panel([[0,tip],[-5,tip+6],[-9,-18],[-10,-7],[-10,15],[-7,24],[7,24],[10,15],[10,-7],[9,-18],[5,tip+6]]);
      panel([[0,tip],[5,tip+6],[9,-18],[3,-19]],MIST,MID);
      pen([[-8,-17],[0,-19],[8,-17]],MID);pen([[-8,-15],[0,-17],[8,-15]],PALE);
      panel([[6,-14],[9,-12],[9,14],[6,22],[4,22],[6,14]],MIST,PALE);
      windowAt(0,-6,5);pen([[-6,6],[6,6]],MID);
      panel([[-8,10],[8,10],[8,13],[-8,13]],finish%2?MID:PALE,MID);
      for(let i=0;i<4;i++)pen([[-5+i*3,16],[-5+i*3,19]],i%2?MID:PALE);
      pen([[0,9],[-1,24],[1,30],[2,21]],INK);
      return true;
    }
    const deck=15, mast=pirate?0:5;
    // Taut standing rigging behind the canvas, spars further forward.
    pen([[-32,deck],[mast,-29],[29,deck]],MID);
    if(pirate){
      pen([[-16,deck],[-18,-16]],INK);pen([[16,deck],[17,-19]],INK);
      panel([[-27,-14],[-10,-14],[-12,-8],[-11,-3],[-28,-2],[-25,-9]],PAPER);
      panel([[12,-17],[25,-17],[23,-12],[24,-7],[11,-6],[14,-13]],MIST);
      panel([[-12,-24],[10,-24],[8,-19],[10,-14],[-13,-14],[-11,-19]]);
      panel([[-15,-11],[12,-11],[9,-3],[11,4],[-17,4],[-14,-4]]);
      pen([[-11,-23],[9,-23]],MID);pen([[-13,-10],[10,-10]],MID);
      for(const xx of [-8,3])pen([[xx,-8],[xx-1,-3],[xx,2]],PALE);
      pen([[mast,-34],[mast,deck]],INK);
      panel([[mast,-34],[15,-32],[11,-29],[14,-26],[mast,-28]],INK);
      pen([[5,-31],[8,-30]],PAPER);pen([[5,-29],[8,-31]],PAPER);
      panel([[-34,9],[-25,9],[-25,13],[-34,13]],MID);
    }else{
      pen([[mast,-30],[mast,15]],INK);
      panel([[mast-2,-26],[-25,7],[-12,5],[mast-2,6]],PAPER);
      panel([[mast+2,-21],[22,4],[mast+2,6]],MIST);
      pen([[mast-5,-18],[-17,2],[mast-3,1]],PALE);
      pen([[mast+5,-12],[16,0]],PALE);pen([[-24,9],[mast-1,8]],MID);
      panel([[mast,-30],[mast+9,-28],[mast,-26]],INK);
      pen([[-14,12],[-10,8],[-2,8],[3,13]],INK);
    }
    pen([[-36,10],[-29,deck],[27,14],[38,7]],INK);
    panel([[-36,11],[-22,15],[13,15],[32,12],[37,8],[28,20],[20,24],[-19,24],[-29,20]],pirate?INK:MIST);
    pen([[-28,17],[-19,20],[16,20],[26,17]],pirate?PALE:MID);
    if(pirate){for(let i=0;i<5;i++){const pt=point([-19+i*8,17]);rect(c,...pt,Math.max(1,sx*2),Math.max(1,sy*2),PAPER);}}
    else pen([[-18,23],[15,23],[24,19]],INK);
    return true;
  }
  function actor(c,s,x,y,size) {
    if(illustrated(c,s,x,y,size)){
      // A structural tile carries two physical sockets even without explicit
      // model attachments. Retain these selected parts on its larger illustration.
      s.heroBlock.fittings?.forEach((family,i)=>{
        const id=Catalog.blockId(family,0);
        stamp(c,id,x+(i?1:-1)*size*.16,y+size*.17,size*.19);
      });
    }else stamp(c,s.blocks[0],x,y,size);
    fittings(c,s,x,y,size);
  }
  function overheadBoat(c,s){
    const x=round(s.x),y=round(s.y);
    for(let j=-13;j<=12;j++){
      const half=round(Math.min((j+13)*.55,5,(16-j)*.55));
      rect(c,x-half,y+j,half*2+1,1,INK);if(half>1)rect(c,x-half+1,y+j,half*2-1,1,PAPER);
    }
    for(let j=-4;j<6;j+=4)rect(c,x-3,y+j,7,1,MID);
    rect(c,x,y-9,1,15,INK);fittings(c,s,x,y,24);line(c,x-6,y+12,x-10,y+18,PALE);line(c,x+6,y+12,x+10,y+18,PALE);
  }
  function cropPiece(c,s,item,x,y,ghost=false){
    const size=28, col=item.i%2,row=Math.floor(item.i/2);
    c.save();c.beginPath();c.rect(round(x-size/2),round(y-size/2),size,size);c.clip();
    if(ghost)c.globalAlpha=.22;
    actor(c,s,x+(col?-1:1)*14,y+(row?-1:1)*14,56);c.restore();
  }
  function puzzle(c,s){
    const assembly=s.mechanic==='assemble';
    for(const item of s.items){
      const {x,y}=item.dest;
      if(assembly)cropPiece(c,s,item,x,y,true);
      else {c.save();c.globalAlpha=.23;stamp(c,item.block,x,y,22);c.restore();}
      if(!item.locked){corners(c,x,y,15,PALE);if(!assembly)caption(c,String(item.i+1),x,y+13,PALE);}
    }
    for(const item of s.items){
      if(assembly)cropPiece(c,s,item,item.x,item.y);
      else {stamp(c,item.block,item.x,item.y,22);if(!item.locked)caption(c,String(item.i+1),item.x,item.y+13,MID);}
      if(!item.locked&&assembly)corners(c,item.x,item.y,15,PALE);
    }
  }
  function corners(c,x,y,r,color) {
    for(const a of [-1,1])for(const b of [-1,1]){
      line(c,x+a*r,y+b*r,x+a*(r-3),y+b*r,color);line(c,x+a*r,y+b*r,x+a*r,y+b*(r-3),color);
    }
  }
  function anim(c,s) {
    const power=s.intensity, style=s.style, baseSize=69+power*4;
    const beat=Catalog.animationFrame?.(style,s.t,s.taps,s.t-s.lastTap,Boolean(s.down))||{dx:0,dy:0,scale:1,spread:1,angle:0,echo:0,phase:0};
    const phase=beat.phase*(.5+power*.13),movement=Catalog.motion(style,phase,0);
    const place=layout(s,0,Math.max(s.blocks.length,2));
    let x=clamp(s.x+(place.x-.5)*43,24,W-24),y=clamp(s.y+(place.y-.5)*15,36,H-34);
    let scale=movement.scale*beat.scale, sway=movement.x*(4+power)+beat.dx, lift=movement.y*(3+power)+beat.dy;
    const mechanic=s.mechanic;
    if(mechanic==='still'){actor(c,s,s.x,s.y,85);return;}
    if(mechanic==='sail'||s.theme==='coast'){y+=s.horizon+9-98;sway+=Math.sin(phase*.43+s.wind)*(9+power);lift+=Math.sin(phase*1.8)*1.5;}
    if(mechanic==='bloom')scale*=.75+.25*(1+Math.sin(phase));
    if(mechanic==='tumble'){sway+=Math.sin(phase)*21;lift-=Math.abs(Math.sin(phase))*14;}
    if(mechanic==='rise')lift-=mod(phase*6,24);
    if(mechanic==='sway')sway+=Math.sin(phase*.8)*17;
    if(mechanic==='swirl'){sway+=Math.cos(phase)*19;lift+=Math.sin(phase)*11;}
    if(mechanic==='pulse')scale*=1+.11*Math.sin(phase*2);
    if(mechanic==='unfurl')scale*=.85+.15*Math.sin(phase*.9);
    const count=Math.min(s.blocks.length-1,1+power*2);
    for(let i=0;i<count;i++){
      const b=s.blocks[i+1],p=layout(s,i+1,count+1),m=Catalog.motion(style,phase,i+1);
      let px=20+p.x*279+m.x*8,py=43+p.y*91+m.y*6;
      const size=10+((s.seed+i*7)%8);
      if(mechanic==='trail'||mechanic==='march'||mechanic==='flock'){
        px=x-((i+1)*19)+m.x*12;py=y+(mechanic==='flock'?(i%2?9:-12):3)+m.y*5;
      }else if(mechanic==='swirl'||mechanic==='bloom'){
        const a=phase*.42+i*2.4;px=x+Math.cos(a)*(31+i*4);py=y+Math.sin(a)*(17+i*3);
      }else if(mechanic==='unfurl'){px=x+(p.x-.5)*(74+Math.sin(phase)*32);py=y+(p.y-.5)*39;}
      px=x+(px-x)*beat.spread;py=y+(py-y)*beat.spread;
      c.save();c.globalAlpha=mechanic==='shimmer'?.55+.35*(1+Math.sin(phase+i))*.5:.72;stamp(c,b,clamp(px,8,W-8),clamp(py,14,H-27),size*m.scale);c.restore();
    }
    const hx=clamp(x+sway,22,W-22),hy=clamp(y+lift,24,H-30);
    for(let i=1;i<=Math.min(3,Math.round(beat.echo));i++){
      c.save();c.globalAlpha=.18/(1+i*.4);actor(c,s,hx-i*7,hy+i*2,baseSize*scale*(1-.08*i));c.restore();
    }
    c.save();c.translate(round(hx),round(hy));c.rotate(beat.angle+movement.angle*.23);actor(c,s,0,0,baseSize*scale);c.restore();
    if(mechanic==='sail'){
      line(c,hx-baseSize/2+1,hy+baseSize*.4,hx-baseSize/2-9,hy+baseSize*.4+1,PALE);
      line(c,hx-baseSize/2-15,hy+baseSize*.4+2,hx-baseSize/2-20,hy+baseSize*.4+2,PALE);
    }
  }
  function launch(c,s) {
    actor(c,s,s.x,s.y-18,76);
    if(s.thrust||s.velocity>24){
      const y=s.y+8,extension=3+(s.thrust?Math.floor(s.t*9)%4:0);
      line(c,s.x-3,y,s.x,y+extension+4,MID);line(c,s.x+3,y,s.x,y+extension+4,MID);rect(c,s.x,y+2,1,extension,INK);
    }
    if(s.altitude>25&&!s.domHints)caption(c,round(s.altitude)+' M',s.x+36,s.y,PALE);
  }
  function play(c,s){
    if(s.mechanic==='still'||s.kind==='animation'){anim(c,s);return;}
    switch(s.mechanic){
      case 'launch':launch(c,s);break;
      case 'assemble':case 'match':puzzle(c,s);break;
      case 'stack':{
        for(const item of s.items){rect(c,item.x-item.w/2,item.y,item.w,8,INK);rect(c,item.x-item.w/2+1,item.y+1,item.w-2,5,PAPER);line(c,item.x-item.w/2+3,item.y+4,item.x+item.w/2-3,item.y+4,PALE,true);}
        const last=s.items.at(-1),x=stackX(s);rect(c,x-last.w/2,last.y-14,last.w,7,MID);actor(c,s,x,last.y-23,21);break;
      }
      case 'balance':{
        const slope=s.balance*16;line(c,s.homeX-96,108-slope,s.homeX+96,108+slope,MID);line(c,s.homeX-8,120,s.homeX,108,INK);line(c,s.homeX+8,120,s.homeX,108,INK);line(c,s.homeX-8,120,s.homeX+8,120,INK);actor(c,s,s.x,s.y,34);break;
      }
      case 'collect':case 'guide':case 'explore':case 'steer':case 'race':{
        const sequential=['guide','steer','race'].includes(s.mechanic);
        for(const item of s.items){
          if(item.done||s.mechanic==='explore'&&distance(item,s)>93&&item.i!==s.score)continue;
          const current=!sequential||item.i===s.score;
          if(sequential&&item.i>0&&!s.items[item.i-1].done)line(c,s.items[item.i-1].x,s.items[item.i-1].y,item.x,item.y,PALE,true);
          c.save();c.globalAlpha=current?1:.4;stamp(c,item.block,item.x,item.y,21);c.restore();
          if(current)corners(c,item.x,item.y,12,MID);
        }
        actor(c,s,s.x,s.y,34);break;
      }
      default:{
        for(const item of s.items){
          if(s.mechanic==='cannon'&&item.passed)continue;
          if(s.mechanic==='dodge'&&s.theme==='coast'&&round(item.phase)%2===0)rocks(c,item.x,item.y+4,14);
          else stamp(c,item.block,item.x,item.y,23);
        }
        if(s.mechanic==='dodge'&&s.theme==='coast'&&/boat|ship/.test(s.recipe.subject))overheadBoat(c,s);
        else actor(c,s,s.x,s.y,s.mechanic==='cannon'?81:s.mechanic==='pet'?77:38);
        for(const shot of s.shots){rect(c,shot.x-1,shot.y-1,3,3,INK);rect(c,shot.x-shot.vx*.04,shot.y-shot.vy*.04,1,1,MID);}
        if(s.mechanic==='catch')line(c,s.x-15,s.y+12,s.x+15,s.y+12,MID);
      }
    }
  }
  const hints={still:'Drag to move',launch:'Hold the rocket to fly',assemble:'Fit the pieces together',dodge:'Drag to dodge',collect:'Gather the little pieces',match:'Pair the matching pieces',guide:'Follow the marked stops',balance:'Hold either side to balance',catch:'Slide to catch',stack:'Tap to stack',explore:'Explore and find the pieces',race:'Reach each gate in time',steer:'Point to steer',cannon:'Tap to fire',jump:'Tap to jump',pet:'Tap to play',sail:'Drag to sail'};
  function hint(s){return s.roundOver?'Tap for the next round':s.over?'Tap to try again':s.won?'Tap to play again':hints[s.mechanic]||'Drag to play';}
  function statusLabel(s){
    const status=s.rules?Catalog.gameStatus(s.rules):'';
    if(s.over||s.won||s.roundOver)return s.won?'Completed':s.roundOver?'Next round':'';
    const count=s.mechanic==='launch'&&s.altitude>10?round(s.altitude)+' m':s.kind==='game'&&s.started&&!['launch','still','balance'].includes(s.mechanic)?s.score+' / '+s.goal:'';
    return [count,status].filter(Boolean).join(' · ');
  }
  function draw(c,s){
    c.imageSmoothingEnabled=false;rect(c,0,0,W,H,PAPER);backdrop(c,s);play(c,s);
    for(const p of s.effects)rect(c,p.x,p.y,1,1,p.life>.35?MID:PALE);
    if(s.domHints)return;
    if(s.over||s.won||s.roundOver){
      rect(c,96,75,128,30,PAPER);line(c,107,76,213,76,PALE);line(c,107,103,213,103,PALE);
      caption(c,s.roundOver?'NEXT ROUND':s.won?'WELL DONE':'TRY AGAIN',W/2,82,INK);caption(c,hint(s),W/2,94,MID);
    }else{
      if(!s.started||s.mechanic==='assemble'&&s.score===0)caption(c,hint(s),W/2,s.rules?H-17:H-9,MID);
      if(s.rules)caption(c,Catalog.gameStatus(s.rules),W/2,H-8,MID);
      if(s.kind==='game'&&s.started&&!['launch','still','balance'].includes(s.mechanic))caption(c,s.score+'/'+s.goal,17,H-10,MID);
    }
  }
  function paint(c,s){
    // The UI normally provides a real 320 × 192 surface. Preserve hard pixels
    // for older hosts that apply their layout transform directly to the context.
    if(c.canvas?.width===W&&c.canvas?.height===H||typeof document==='undefined'){draw(c,s);return;}
    if(!s.art){s.art=document.createElement('canvas');s.art.width=W;s.art.height=H;}
    draw(s.art.getContext('2d',{alpha:false}),s);c.imageSmoothingEnabled=false;c.drawImage(s.art,0,0,W,H);
  }
  function spinup(c,x,y,t){
    const tick=Math.floor(t*2)%3;
    for(let i=0;i<3;i++)rect(c,x-6+i*6,y,3,3,i===tick?INK:PALE);
  }
  return {W,H,start,press,move,release,cancel,interact,step,paint,hint,statusLabel,spinup};
})();
