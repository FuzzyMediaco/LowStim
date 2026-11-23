"use strict";
(() => {
  const $=id=>document.getElementById(id), canvas=$("surface"), c=canvas.getContext("2d",{alpha:false});
  const android=globalThis.SlateDevice;
  const motion=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const storageKey="doodle-forge-slate-scenes-v2";
  let size,scene=null,strokes=[],stroke=null,pointer=null,timer=null,started=0,busy=false,requestId=0,lastFrame=0;
  let speech=null,listening=false,opening=false,stash=[],lastPlanner="";
  try{const list=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(list))stash=list.filter(Forge.valid)}catch{}
  const notice=$("notice"),bar=$("bar"),input=$("idea");
  function controls(show,focus=false){
    bar.hidden=!show;
    $("more").hidden=show||!scene||busy;
    if(focus)input.focus();
  }
  function say(message,buttons=[]){
    notice.replaceChildren();
    if(message){const p=document.createElement("p");p.textContent=message;notice.append(p);}
    for(const [label,action] of buttons){const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=action;notice.append(b);}
    notice.hidden=!notice.childNodes.length;
  }
  function clearTimer(){clearTimeout(timer);timer=null}
  function newSlate(){
    requestId++;clearTimer();
    if(listening){if(android)android.stopVoice();else speech?.abort();setListening(false);}
    strokes=[];stroke=null;scene=null;busy=false;started=0;input.value="";say("");controls(false);$("collection").hidden=true;
    canvas.setAttribute("aria-label","Blank slate. Drag to draw. Tap or press Enter to type or speak.");
  }
  function localVoice(line){
    if(android){android.say(line);return}
    if(!("speechSynthesis" in window))return;
    const voice=speechSynthesis.getVoices().find(v=>v.localService&&v.lang.startsWith("en"));
    if(voice){const utterance=new SpeechSynthesisUtterance(line);utterance.voice=voice;speechSynthesis.speak(utterance);}
  }
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    size={width:r.width,height:r.height,scale:Math.min(r.width/World.W,r.height/World.H)*.97};
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    c.setTransform(dpr,0,0,dpr,0,0);
    size.x=(r.width-World.W*size.scale)/2;size.y=(r.height-World.H*size.scale)/2;
  }
  function frame(time){
    if(!size)resize();
    const {width,height,scale,x,y}=size,dt=Math.min(.05,Math.max(0,(time-lastFrame)/1000));lastFrame=time;
    c.fillStyle="#fff";c.fillRect(0,0,width,height);
    if(scene){
      if(!busy&&$("collection").hidden)World.step(scene,dt);
      c.save();c.translate(x,y);c.scale(scale,scale);c.beginPath();c.rect(0,0,World.W,World.H);c.clip();World.paint(c,scene);c.restore();
    }
    if(strokes.length){
      c.strokeStyle="#000";c.lineWidth=3.5;c.lineCap="round";c.lineJoin="round";
      for(const p of strokes){
        c.beginPath();c.moveTo(p[0][0]*width,p[0][1]*height);
        for(const [px,py] of p.slice(1))c.lineTo(px*width,py*height);
        if(p.length===1)c.lineTo(p[0][0]*width+.01,p[0][1]*height+.01);
        c.stroke();
      }
    }
    if(busy){
      const mx=width*.5,my=height*.5;
      c.fillStyle="#fff";c.fillRect(mx-87,my-59,174,123);
      World.spinup(c,mx-11,my-5,motion?0:(time-started)/1000);
      c.fillStyle="#000";c.font="16px system-ui";c.textAlign="center";c.fillText("You got it!",mx,my+44);c.textAlign="left";
    }
    requestAnimationFrame(frame);
  }
  function drawPoint(e){
    const r=canvas.getBoundingClientRect();
    return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];
  }
  function scenePoint(e){
    const [nx,ny]=drawPoint(e);
    return {x:(nx*size.width-size.x)/size.scale,y:(ny*size.height-size.y)/size.scale};
  }
  canvas.onpointerdown=e=>{
    if(busy||listening||pointer||e.button!==0)return;
    clearTimer();
    pointer={id:e.pointerId,origin:drawPoint(e),start:scenePoint(e)};
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove=e=>{
    if(pointer?.id!==e.pointerId)return;
    if(scene){
      if(scene.recipe.activity==="dodge"&&!scene.over)World.interact(scene,scenePoint(e));
      return;
    }
    const p=drawPoint(e);
    if(!stroke){
      if(Math.hypot((p[0]-pointer.origin[0])*size.width,(p[1]-pointer.origin[1])*size.height)<4)return;
      stroke=[pointer.origin];strokes.push(stroke);say("");controls(true);
    }
    if(stroke.length<3000)stroke.push(p);
  };
  canvas.onpointerup=e=>{
    if(pointer?.id!==e.pointerId)return;
    if(scene){
      const p=scenePoint(e);World.interact(scene,p,{x:p.x-pointer.start.x,y:p.y-pointer.start.y});
    }else if(stroke){
      stroke=null;
      timer=setTimeout(()=>make(),1700);
    }else if(strokes.length){
      controls(true,true);
    }else if(!bar.hidden&&document.activeElement!==input){
      controls(false);say("");
    }else controls(true,true);
    pointer=null;
  };
  canvas.onlostpointercapture=()=>{
    if(stroke){stroke=null;timer=setTimeout(()=>make(),1700);}
    pointer=null;
  };
  function handleKeys(e){
    if(e.key==="Escape"){controls(false);say("");return}
    if(scene&&[" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();World.interact(scene,{y:scene.y+(e.key==="ArrowUp"?-21:e.key==="ArrowDown"?21:0)},{x:e.key==="ArrowLeft"?-40:e.key==="ArrowRight"?40:0});return}
    if(e.key==="Enter"||(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey)){e.preventDefault();controls(true,true);if(e.key.length===1)input.value+=e.key;}
  }
  canvas.onkeydown=handleKeys;
  document.addEventListener("keydown",e=>{if(e.target===document.body)handleKeys(e);});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();make();}});
  bar.onsubmit=e=>{e.preventDefault();make()};
  input.onfocus=clearTimer;
  $("more").onclick=()=>{controls(true,true);say("")};
  $("new").onclick=newSlate;
  $("close").onclick=()=>{$("collection").hidden=true};
  $("menu").onclick=()=>{
    clearTimer();input.blur();$("collection").hidden=false;$("saved").replaceChildren();
    for(const recipe of stash){const b=document.createElement("button");b.type="button";b.textContent=recipe.subject+" · "+recipe.setting;b.onclick=()=>{$("collection").hidden=true;showScene(recipe)};$("saved").append(b);}
    if(!stash.length)$("saved").textContent="Your creations appear here after you make them.";
    if(android){
      $("model").hidden=false;$("modelInfo").hidden=false;
      $("modelInfo").textContent=android.hasModel()?("Qwen is available on this device."+(lastPlanner?" Last scene: "+lastPlanner+".":"")):"Import the Qwen2.5 Instruct GGUF to enable local AI planning.";
    }
  };
  $("model").onclick=()=>android.importModel();
  function showScene(recipe){
    strokes=[];stroke=null;scene=World.start(recipe);busy=false;
    canvas.setAttribute("aria-label",recipe.subject+" in "+recipe.setting+". Interactive "+recipe.activity+".");
    input.value="";input.blur();controls(false);say("");
  }
  function save(recipe){
    stash=[recipe,...stash.filter(item=>JSON.stringify(item)!==JSON.stringify(recipe))];
    try{localStorage.setItem(storageKey,JSON.stringify(stash));}catch{say("Storage is full. This scene is available until you close the slate.");}
  }
  function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
  function plan(idea,label,prior,id){
    if(!android?.hasModel())return Promise.resolve(null);
    return new Promise(resolve=>{
      const timeout=setTimeout(()=>{delete window.slatePlanResult;resolve(null)},35000);
      window.slatePlanResult=(received,value)=>{
        if(received!==id)return;
        clearTimeout(timeout);delete window.slatePlanResult;
        try{const result=JSON.parse(value);resolve(Forge.valid(result)?result:null);}catch{resolve(null);}
      };
      android.plan(id,Forge.modelPrompt(idea,label,prior),Forge.gbnf());
    });
  }
  async function make(override){
    clearTimer();
    if(busy||listening||stroke)return;
    const idea=input.value.trim(),prior=scene?.recipe??null,hadSketch=strokes.length>0;
    if(!idea&&!hadSketch&&!override){controls(true,true);return}
    const results=override?[]:Forge.classify(strokes.map(line=>line.map(([x,y])=>[x*size.width,y*size.height])));
    const best=results[0];
    if(!override&&!idea&&hadSketch&&(!best||best.p<.57||(results[1]&&best.p-results[1].p<.19))){
      controls(true);
      const candidates=results.filter(item=>item.p>.035).map(item=>item.label);
      if(!candidates.length)candidates.push("boat","monster");
      say("What did you draw?",[...candidates.map(label=>[label,()=>make(label)]),["Something else",()=>{say("");controls(true,true)}],["Keep drawing",()=>say("")]]);
      return;
    }
    const label=override||best?.label||"";
    if(!android?.hasModel()&&idea&&!prior&&!label&&!Forge.matches(idea)){
      say("Tell me what to make, like a pirate ship, a cat, or a rocket.");controls(true,true);return;
    }
    busy=true;started=performance.now();const id=++requestId;
    input.blur();controls(false);say("");localVoice("You got it!");
    const fallback=Forge.recipe(idea,label,prior);
    const [generated]=await Promise.all([plan(idea,label,prior,id),sleep(motion?240:800)]);
    if(id!==requestId)return;
    const recipe=generated||fallback;
    lastPlanner=generated?"Qwen":"built-in planner";
    showScene(recipe);save(recipe);
  }
  function setListening(active){
    listening=active;$("mic").textContent=active?"Stop":"Mic";$("mic").setAttribute("aria-label",active?"Stop listening":"Speak");
  }
  window.slateVoiceResult=(phrase,error)=>{
    setListening(false);
    if(error){say(error);return;}
    if(!phrase){say("I didn’t hear an idea. Try again.");return;}
    input.value=phrase.slice(0,200);say("");make();
  };
  window.slateModelResult=(message,available)=>{
    $("modelInfo").textContent=message;
    $("model").disabled=false;
    if(!available)$("modelInfo").removeAttribute("aria-live");
  };
  async function speak(){
    clearTimer();
    if(busy||opening)return;
    if(listening){if(android)android.stopVoice();else speech.stop();return;}
    if(android){input.blur();setListening(true);say("Listening…");android.listen();return;}
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition||!("processLocally" in Recognition.prototype)||typeof Recognition.available!=="function"){
      say("Offline speech is available in the Android app. You can type or draw here.");return;
    }
    opening=true;
    try{
      const supported=await Recognition.available({langs:["en-US"],processLocally:true});
      if(supported!=="available"){say("This browser’s English speech pack is unavailable. You can type or draw here.");return;}
      speech=new Recognition();speech.lang="en-US";speech.processLocally=true;
      speech.onresult=e=>window.slateVoiceResult(e.results[0][0].transcript,"");
      speech.onerror=()=>window.slateVoiceResult("","The browser couldn’t hear you. Try again or type.");
      speech.onend=()=>{if(listening)setListening(false)};
      input.blur();speech.start();setListening(true);say("Listening…");
    }catch{say("Offline speech is unavailable here. You can type or draw.")}
    finally{opening=false;}
  }
  $("mic").onclick=speak;
  window.addEventListener("resize",resize);resize();requestAnimationFrame(frame);
  if(!android&&location.protocol==="https:"&&"serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();
