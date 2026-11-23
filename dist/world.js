"use strict";
const World = (() => {
  const W=640,H=385;
  const line=(c,...p)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  function shape(c,points,fill="#fff"){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();c.stroke();}
  function oval(c,x,y,w,h,fill="#fff"){c.beginPath();c.ellipse(x,y,w,h,0,0,Math.PI*2);c.fillStyle=fill;c.fill();c.stroke();}
  function arc(c,x,y,rx,ry,start,end){c.beginPath();c.ellipse(x,y,rx,ry,0,start,end);c.stroke()}
  function star(c,x,y,r){line(c,[x-r,y],[x+r,y]);line(c,[x,y-r],[x,y+r]);}
  function cloud(c,x,y,s=1){
    c.save();c.translate(x,y);c.scale(s,s);c.beginPath();c.moveTo(-39,10);
    c.bezierCurveTo(-47,-1,-34,-13,-23,-13);c.bezierCurveTo(-17,-36,15,-32,19,-15);
    c.bezierCurveTo(39,-21,51,2,39,10);c.closePath();c.fillStyle="white";c.fill();c.stroke();c.restore();
  }
  function tree(c,x,y,s=1){
    c.save();c.translate(x,y);c.scale(s,s);shape(c,[[-5,0],[-5,-43],[5,-43],[5,0]],"#000");
    shape(c,[[-29,-25],[-16,-44],[-23,-44],[-11,-61],[-17,-61],[0,-88],[17,-61],[11,-61],[23,-44],[16,-44],[29,-25]]);
    c.restore();
  }
  function boat(c,pirate){
    shape(c,[[-96,12],[-82,26],[-69,44],[54,44],[76,29],[99,1],[67,14],[-71,14]],"#000");
    line(c,[-77,12],[-77,-7],[-57,-7],[-57,12]);
    c.save();c.strokeStyle="#fff";c.lineWidth=1.7;line(c,[-70,26],[63,26]);
    for(let i=-53;i<=45;i+=24)oval(c,i,34,2.7,2.7);
    c.restore();
    line(c,[0,14],[0,-89]);line(c,[-50,14],[-50,-54]);line(c,[46,14],[46,-67]);
    shape(c,[[-50,-53],[-61,-30],[-64,-13],[-24,-13],[-28,-34],[-23,-53]]);
    shape(c,[[-16,-79],[-30,-56],[-32,-26],[34,-26],[25,-48],[32,-79]]);
    shape(c,[[46,-64],[41,-50],[40,-25],[73,-25],[68,-47],[73,-63]]);
    if(pirate){
      shape(c,[[0,-88],[0,-104],[36,-100],[30,-92],[36,-87]],"#000");
      oval(c,14,-95,4,3);oval(c,-1,-52,9,8);
      oval(c,-4,-54,1.5,1.5,"#000");oval(c,2,-54,1.5,1.5,"#000");line(c,[-6,-39],[5,-43]);line(c,[5,-39],[-6,-43]);
    }
  }
  function face(c,key,t){
    if(key==="octopus"){
      for(let i=-3;i<=3;i++){const x=i*11;c.beginPath();c.moveTo(x,-1);c.quadraticCurveTo(x*1.4,25,x*1.8,22+6*Math.sin(t*4+i));c.stroke()}
      oval(c,0,-16,34,28);oval(c,-11,-14,2,3,"#000");oval(c,11,-14,2,3,"#000");arc(c,0,-7,8,5,0,Math.PI);return;
    }
    if(key==="fish"){
      shape(c,[[-14,0],[-46,-22],[-46,18]]);oval(c,10,-1,36,22);oval(c,27,-6,3,3,"#000");arc(c,5,-2,12,18,-1,1);return;
    }
    if(key==="bird"||key==="dragon"){
      oval(c,3,1,37,19);
      shape(c,[[9,1],[-21,-14+12*Math.sin(t*6)],[-39,-47+17*Math.sin(t*6)],[-7,-42+12*Math.sin(t*6)],[24,-12]]);
      oval(c,35,-11,16,15);oval(c,39,-13,2.2,2.2,"#000");
      shape(c,[[49,-14],[64,-9],[50,-4]],key==="dragon"?"#000":"#fff");
      if(key==="dragon"){shape(c,[[-24,3],[-61,-12],[-48,13],[-19,15]]);shape(c,[[27,-24],[23,-35],[38,-25]],"#000");}
      return;
    }
    const earY=-43+(key==="dog"?9:0);
    if(key==="cat"||key==="monster"){
      shape(c,[[-34,-13],[-35,earY-10],[-12,-32]]);
      shape(c,[[34,-13],[35,earY-10],[12,-32]]);
    }else{oval(c,-30,earY+10,12,key==="dog"?21:11,"#000");oval(c,30,earY+10,12,key==="dog"?21:11,"#000");}
    oval(c,0,-11,39,31);oval(c,-13,-14,3,4,"#000");oval(c,13,-14,3,4,"#000");oval(c,0,-2,4,3,"#000");arc(c,0,2,13,8,0,Math.PI);
    if(key==="cat")for(const f of [-1,1])for(let i=0;i<3;i++)line(c,[f*23,2+i*4],[f*45,i*8-2]);
  }
  function drawSubject(c,key,x,y,s,t){
    c.save();c.translate(x,y);c.scale(s,s);c.lineWidth=2.5;c.lineJoin="round";c.lineCap="round";c.strokeStyle="#000";
    switch(key){
      case "pirate ship": case "boat": boat(c,key==="pirate ship");break;
      case "rocket":
        shape(c,[[-8,20],[-24,29],[-20,3],[-9,-8]]);shape(c,[[8,20],[24,29],[20,3],[9,-8]]);
        shape(c,[[0,-65],[13,-46],[16,15],[8,24],[-8,24],[-16,15],[-13,-46]]);oval(c,0,-26,7,7,"#000");
        shape(c,[[-7,28],[0,42+10*Math.sin(t*13)],[7,28]],"#000");break;
      case "plane":
        shape(c,[[-58,1],[-23,1],[-7,-25],[3,-25],[-1,1],[49,1],[63,8],[48,14],[4,14],[-10,40],[-23,40],[-15,14],[-53,14],[-65,2]]);
        for(let i=16;i<45;i+=9)oval(c,i,7,1.8,1.8,"#000");break;
      case "car":
        shape(c,[[-54,15],[-52,-3],[-26,-11],[-14,-27],[18,-27],[35,-7],[55,-2],[55,16]],"#000");
        shape(c,[[-23,-7],[-11,-20],[13,-20],[23,-7]]);
        oval(c,-32,15,10,10);oval(c,32,15,10,10);break;
      case "bicycle":
        oval(c,-35,6,20,20);oval(c,35,6,20,20);line(c,[-35,6],[-15,-19],[10,6],[-35,6]);line(c,[10,6],[24,-21],[35,6]);line(c,[24,-21],[33,-26]);line(c,[-20,-19],[-10,-19]);break;
      case "tree":tree(c,0,22,1);break;
      case "house":
        shape(c,[[-32,20],[-32,-25],[33,-25],[33,20]]);shape(c,[[-44,-23],[0,-58],[44,-23]],"#000");
        shape(c,[[-8,20],[-8,-5],[8,-5],[8,20]],"#000");oval(c,-20,-10,4,4);oval(c,20,-10,4,4);break;
      case "flower":
        line(c,[0,29],[0,-32]);shape(c,[[0,18],[-20,2],[-12,22]]);shape(c,[[0,10],[21,-5],[14,15]]);
        for(let i=0;i<6;i++)oval(c,15*Math.cos(i*Math.PI/3),-31+15*Math.sin(i*Math.PI/3),8,8);oval(c,0,-31,8,8,"#000");break;
      case "umbrella":
        c.beginPath();c.moveTo(-43,-12);c.quadraticCurveTo(0,-83,43,-12);c.quadraticCurveTo(23,-24,0,-12);c.quadraticCurveTo(-23,-24,-43,-12);c.closePath();c.fillStyle="white";c.fill();c.stroke();line(c,[0,-35],[0,20]);arc(c,9,20,9,8,0,Math.PI);break;
      case "cloud":cloud(c,0,0);break;
      default:face(c,key,t);
    }
    c.restore();
  }
  function island(c,x,y){
    shape(c,[[x-77,y+5],[x-51,y-10],[x+25,y-13],[x+77,y+5],[x+49,y+12],[x-49,y+12]]);
    c.beginPath();c.moveTo(x-6,y);c.quadraticCurveTo(x+1,y-18,x+24,y-66);c.stroke();
    const tx=x+24,ty=y-66;
    for(const [dx,dy] of [[-40,12],[-32,-13],[11,-18],[37,-2],[39,17]]){
      c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo(tx+dx*.6,ty+dy-20,tx+dx,ty+dy);c.quadraticCurveTo(tx+dx*.6,ty+dy-6,tx,ty);c.fillStyle="#000";c.fill();
    }
  }
  function water(c,clock,y){
    for(let row=0;row<5;row++)for(let i=0;i<12;i++){
      const x=((i*88+row*53+clock*(8+row*5))%800)-78, yy=y+row*24;
      c.beginPath();c.moveTo(x,yy);c.quadraticCurveTo(x+12,yy-6,x+23,yy);c.quadraticCurveTo(x+34,yy+6,x+47,yy);c.stroke();
    }
  }
  function scenery(c,s,t){
    c.strokeStyle="#000";c.lineWidth=1.45;
    const sky=s.setting==="space"||s.prop==="stars";
    if(sky)for(let i=0;i<39;i++){
      const x=(i*97+45)%W,y=24+(i*73)%320;star(c,x,y,((i%7===0)?3:1)*(.78+.22*Math.cos(i+t)));
    }
    if(s.prop==="moon"||s.setting==="space"){oval(c,511,86,43,43);arc(c,497,78,18,23,-1.5,1.4);oval(c,530,106,5,5);}
    if(s.setting==="sky"||s.prop==="clouds")for(let i=0;i<6;i++)cloud(c,((i*155-t*10+995)%850)-80,54+(i*39)%125,.6+i%3*.13);
    if(s.setting==="ocean"||s.setting==="island"||s.setting==="underwater"){
      const waterline=s.setting==="underwater"?52:256;
      line(c,[1,waterline],[639,waterline]);water(c,t,waterline+22);
      if(s.setting==="island"||s.prop==="island")island(c,483,259);
      if(s.setting==="underwater"){
        for(let i=0;i<10;i++){const x=(i*137+42)%W,y=317-((i*37+t*17)%234);oval(c,x,y,2+i%3,2+i%3);}
        for(let i=0;i<7;i++){const x=48+i*87;line(c,[x,384],[x-12,362],[x-4,343],[x-17,326]);}
      }
    }
    if(["forest","room","garden","road","mountains"].includes(s.setting)){
      const ground=s.setting==="room"?327:312;
      line(c,[0,ground],[640,ground]);
      if(s.setting==="mountains")for(let i=0;i<4;i++){const x=i*176-88,y=110+(i*37)%58;shape(c,[[x,ground],[x+124,y],[x+227,ground]]);line(c,[x+98,y+41],[x+124,y+29],[x+146,y+49]);}
      if(s.setting==="forest"||s.prop==="trees")for(let i=0;i<7;i++)tree(c,23+i*108,ground,.45+(i%4)*.14);
      if(s.setting==="road")for(let i=0;i<14;i++){const x=((i*82-t*85+947)%770)-60;line(c,[x,348],[x+35,348]);}
      if(s.setting==="garden")for(let i=0;i<24;i++){const x=(i*83+7)%640,y=330+(i*37)%54;line(c,[x-4,y-4],[x,y],[x+4,y-5]);}
      if(s.setting==="room"){line(c,[21,43],[21,325]);shape(c,[[465,35],[546,35],[546,121],[465,121]]);line(c,[506,35],[506,121]);line(c,[465,78],[546,78]);}
    }
    if(s.prop==="fish")for(let i=0;i<3;i++)drawSubject(c,"fish",480+i*38+10*Math.sin(t+i),104+i*14,.19,t);
    if(s.prop==="rocks")for(let i=0;i<7;i++){
      const x=(i*101+9)%640,y=(s.setting==="underwater"?368:302)+(i%3)*3;
      shape(c,[[x-9,y],[x-5,y-7],[x+5,y-8],[x+11,y]],"#000");
    }
  }
  function spinup(c,x,y,t){
    c.save();c.translate(x,y);c.scale(1.1,1.1);c.strokeStyle="#000";c.lineWidth=2;
    shape(c,[[-19,-15],[19,-15],[19,14],[-19,14]]);line(c,[0,-15],[0,-26]);oval(c,0,-29,2,2,"#000");
    oval(c,-7,-2,1.8,2.3,"#000");oval(c,7,-2,1.8,2.3,"#000");
    c.save();c.translate(18,7);c.rotate(-.3-.8*Math.sin(t*9));line(c,[0,0],[24,-13]);
    shape(c,[[18,-18],[30,-22],[33,-12],[22,-8]],"#000");c.restore();
    if(Math.sin(t*9)<-.3){star(c,48,8,4);star(c,53,-5,2);}
    c.restore();
  }
  function start(recipe){
    return {recipe,t:0,x:156,y:231,vy:0,dash:0,treats:0,score:0,obstacles:[],next:1.08,hearts:[],over:false};
  }
  function interact(s,position,gesture){
    if(s.over){Object.assign(s,start(s.recipe));return}
    switch(s.recipe.activity){
      case "dodge":
        s.y=Math.min(331,Math.max(43,position.y));break;
      case "jump":
        if(s.y>=268)s.vy=-285;break;
      case "pet":
        s.treats++;s.hearts.push({x:s.x,y:171,life:.9});s.dash=.55;break;
      default:
        s.dash=.6;
        if(gesture)s.x=Math.max(93,Math.min(537,s.x+gesture.x*.62));break;
    }
  }
  function step(s,d){
    if(s.over)return;
    s.t+=d;s.dash=Math.max(0,s.dash-d);s.hearts=s.hearts.filter(h=>(h.life-=d)>0);
    const a=s.recipe.activity;
    if(a==="animation"){s.x+=(320-s.x)*.35*d;return}
    if(a==="pet"){s.x+=(320-s.x)*.7*d;return}
    if(a==="jump"){s.vy+=655*d;s.y=Math.min(268,s.y+s.vy*d);if(s.y>=268)s.vy=0;}
    s.next-=d;
    if(s.next<0){s.next=1.08+(s.t%3)*.14;s.obstacles.push({x:688,y:a==="jump"?295:65+Math.random()*252,hit:false});}
    for(const o of s.obstacles){
      o.x-=d*(145+Math.min(120,s.t*4));
      if(Math.abs(o.x-s.x)<26&&Math.abs(o.y-s.y)<(a==="jump"?39:23))s.over=true;
      if(!o.hit&&o.x<s.x-32){o.hit=true;s.score++;}
    }
    s.obstacles=s.obstacles.filter(o=>o.x>-35);
  }
  function paint(c,s){
    scenery(c,s.recipe,s.t);
    const {activity,subject,setting,motion}=s.recipe;
    const water=["island","ocean"].includes(setting),t=s.t;
    let x=s.x,y=s.y,scale=1;
    if(activity==="animation"){
      y=water?241:setting==="underwater"?196:["space","sky"].includes(setting)?170:266;
      if(motion==="orbit"){x=320+153*Math.cos(t*.83);y-=46*Math.sin(t*.83);}
      else if(motion==="fly"){x+=124*Math.sin(t*.58);y+=26*Math.sin(t*1.8);}
      else if(motion==="swim"){x+=124*Math.sin(t*.7);y+=32*Math.sin(t*1.75);}
      else if(motion==="bounce"){y-=17*Math.abs(Math.sin(t*3));}
      else if(motion==="grow"){scale=.78+.23*Math.sin(t*1.35);}
      else{x+=71*Math.sin(t*.48);y+=4*Math.sin(t*2.9);}
    }
    if(activity==="pet"){y=267-18*Math.abs(Math.sin(s.dash*8));scale=1.45;}
    if(activity==="jump"||activity==="dodge")scale=subject.includes("ship")?.24:.52;
    if(s.dash&&activity==="animation"){x+=8*Math.sin(s.dash*27);y-=s.dash*20}
    drawSubject(c,subject,x,y,scale,t);
    for(const o of s.obstacles){c.lineWidth=2.5;
      if(activity==="jump"){shape(c,[[o.x-17,o.y-8],[o.x+16,o.y-8],[o.x+16,o.y+14],[o.x-17,o.y+14]],"#000");oval(c,o.x+16,o.y+3,5,11);}
      else shape(c,[[o.x-14,o.y-7],[o.x-7,o.y-15],[o.x+7,o.y-13],[o.x+16,o.y-3],[o.x+7,o.y+11],[o.x-9,o.y+12]],"#000");
    }
    for(const h of s.hearts){const yy=h.y-(.9-h.life)*43;shape(c,[[h.x,yy+9],[h.x-10,yy],[h.x-6,yy-7],[h.x,yy-3],[h.x+6,yy-7],[h.x+10,yy]],"#000");}
    c.fillStyle="#000";c.font="bold 16px system-ui";
    if(activity==="jump"||activity==="dodge")c.fillText(String(s.score),22,34);
    if(s.over){
      c.fillStyle="#fff";c.fillRect(208,141,224,75);c.strokeRect(208,141,224,75);c.fillStyle="#000";c.textAlign="center";c.fillText("Tap to try again",320,184);c.textAlign="left";
    }
  }
  return {W,H,paint,step,start,interact,spinup};
})();
