"use strict";
const {app,BrowserWindow,dialog,ipcMain,protocol,session}=require("electron");
const fs=require("node:fs/promises");
const {constants,existsSync}=require("node:fs");
const path=require("node:path");
const {execFile}=require("node:child_process");

const origin="lowstim://app";
const startUrl=origin+"/index.html";
const packagedAssets=path.join(process.resourcesPath,"native");
const assets=path.join(__dirname,"dist");
const modelName="planner.gguf";
const maxModelBytes=3_000_000_000;
const children=new Set();
let win, planning=false, importing=false, transcribing=false;
const smoke=process.argv.includes("--lowstim-smoke-test");
const sampleIndex=process.argv.indexOf("--lowstim-voice-sample");

protocol.registerSchemesAsPrivileged([{scheme:"lowstim",privileges:{standard:true,secure:true,supportFetchAPI:true}}]);

function run(tool,args,timeout){
  const suffix=process.platform==="win32"?".exe":"";
  return new Promise((resolve,reject)=>{
    const child=execFile(path.join(packagedAssets,tool+suffix),args,{
      timeout,maxBuffer:1024*1024,windowsHide:true,encoding:"utf8",
    },(error,stdout)=>{
      children.delete(child);
      if(error)reject(error);
      else resolve(stdout);
    });
    children.add(child);
  });
}

async function withTemporaryFolder(callback){
  const dir=await fs.mkdtemp(path.join(app.getPath("temp"),"lowstim-"));
  try{return await callback(dir);}
  finally{await fs.rm(dir,{recursive:true,force:true}).catch(()=>{});}
}

const modelPath=()=>path.join(app.getPath("userData"),modelName);
const allowed=event=>event.sender===win?.webContents&&event.senderFrame?.url===startUrl;

ipcMain.on("model:present",event=>{event.returnValue=allowed(event)&&existsSync(modelPath());});
ipcMain.handle("model:select",async event=>{
  if(!allowed(event)||planning||importing)return {message:"Wait for the current operation to finish."};
  importing=true;
  const temporary=modelPath()+".import";
  try{
    const chosen=await dialog.showOpenDialog(win,{
      title:"Import Qwen GGUF",properties:["openFile"],filters:[{name:"GGUF model",extensions:["gguf"]}],
    });
    if(chosen.canceled)return {message:"Model import canceled."};
    const source=chosen.filePaths[0];
    const info=await fs.stat(source);
    if(!info.isFile()||info.size<1_000_000||info.size>maxModelBytes){
      return {message:"Choose a complete GGUF model below 3 GB."};
    }
    const file=await fs.open(source,"r");
    const header=Buffer.alloc(4);
    try{await file.read(header);}finally{await file.close();}
    if(header.toString("ascii")!=="GGUF")return {message:"This file is not a GGUF model."};
    await fs.mkdir(path.dirname(temporary),{recursive:true});
    await fs.rm(temporary,{force:true});
    await fs.copyFile(source,temporary,constants.COPYFILE_EXCL);
    await fs.rename(temporary,modelPath());
    return {message:"Model imported. Qwen is ready to make scenes."};
  }catch{
    await fs.rm(temporary,{force:true}).catch(()=>{});
    return {message:"Model import failed. Check that you have enough free storage."};
  }finally{importing=false;}
});

ipcMain.handle("model:plan",async (event,prompt,grammar)=>{
  if(!allowed(event)||planning||importing||!existsSync(modelPath()))return "";
  if(typeof prompt!=="string"||prompt.length>6400||typeof grammar!=="string"||grammar.length>6000)return "";
  planning=true;
  try{return await withTemporaryFolder(async dir=>{
    const input=path.join(dir,"prompt.txt"), rules=path.join(dir,"recipe.gbnf");
    await Promise.all([fs.writeFile(input,prompt),fs.writeFile(rules,grammar)]);
    const args=[modelPath(),input,rules];
    const adapter=path.join(packagedAssets,"lowstim-lora.gguf");
    if(existsSync(adapter))args.push(adapter);
    return await run("lowstim-planner",args,65000);
  });}catch{return "";}
  finally{planning=false;}
});

ipcMain.handle("voice:transcribe",async (event,audio)=>{
  if(!allowed(event)||transcribing)return {error:"Microphone is busy."};
  if(!(audio instanceof ArrayBuffer)||audio.byteLength<64||audio.byteLength>320044)return {error:"The recording was empty or too long."};
  const bytes=Buffer.from(audio);
  if(bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WAVE")return {error:"The recording could not be read."};
  transcribing=true;
  try{return await withTemporaryFolder(async dir=>{
    const clip=path.join(dir,"mic.wav"), output=path.join(dir,"transcript");
    await fs.writeFile(clip,bytes);
    await run("whisper-cli",["-m",path.join(packagedAssets,"tiny.en.bin"),"-f",clip,
      "-of",output,"-otxt","-nt","-l","en","-t","4","-ng"],25000);
    const text=(await fs.readFile(output+".txt","utf8")).trim();
    return {text:/^(\[.*\]|\(.*\))$/.test(text)?"":text.slice(0,200)};
  });}catch{return {error:"Offline speech could not read the recording. Try again or type."};}
  finally{transcribing=false;}
});

app.whenReady().then(async ()=>{
  protocol.handle("lowstim",async request=>{
    const url=new URL(request.url);
    const name=url.pathname.slice(1);
    const mimeByExtension={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",
      ".ttf":"font/ttf",".woff2":"font/woff2",".json":"application/json",".webmanifest":"application/manifest+json"};
    const mime=mimeByExtension[path.extname(name)];
    if(url.host!=="app"||!mime||!/^(?:fonts\/)?[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(name))return new Response(null,{status:404});
    try{return new Response(await fs.readFile(path.join(assets,name)),{headers:{
      "Content-Type":mime,
      "Content-Security-Policy":"default-src 'none'; script-src 'self'; img-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "X-Content-Type-Options":"nosniff",
    }});}catch{return new Response(null,{status:404});}
  });
  const ownTrustedFrame=(contents,url)=>contents===win?.webContents&&(url===origin||url===startUrl);
  session.defaultSession.setPermissionCheckHandler((contents,permission,url,details)=>
    permission==="media"&&details.mediaType==="audio"&&ownTrustedFrame(contents,url));
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>
    callback(permission==="media"&&details.isMainFrame&&details.mediaTypes?.length===1&&
      details.mediaTypes[0]==="audio"&&ownTrustedFrame(contents,details.requestingUrl)));
  session.defaultSession.webRequest.onBeforeRequest({urls:["http://*/*","https://*/*","ws://*/*","wss://*/*"]},
    (_details,callback)=>callback({cancel:true}));
  if(process.platform!=="darwin")app.setAppUserModelId("com.fuzzymediaco.lowstim.desktop");
  function open(){
    win=new BrowserWindow({title:"LowStim",width:1100,height:760,minWidth:370,minHeight:290,
      backgroundColor:"#ffffff",show:!smoke,autoHideMenuBar:true,webPreferences:{
        preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false,
      }});
    win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
    win.webContents.on("will-navigate",event=>event.preventDefault());
    win.webContents.on("will-attach-webview",event=>event.preventDefault());
    win.on("closed",()=>{win=null;});
    const loading=win.loadURL(startUrl);
    if(smoke){
      loading.then(async ()=>{
        const result=await win.webContents.executeJavaScript(
          "!!document.querySelector('#surface') && document.querySelector('#bar').hidden && Boolean(globalThis.LowStimDesktop && globalThis.SlateDevice && navigator.mediaDevices?.getUserMedia)");
        const suffix=process.platform==="win32"?".exe":"";
        const required=["lowstim-planner"+suffix,"whisper-cli"+suffix,"tiny.en.bin"];
        if(!result||!required.every(name=>existsSync(path.join(packagedAssets,name))))throw Error("Desktop launch check failed");
        if(sampleIndex>0){
          await withTemporaryFolder(async dir=>{
            const output=path.join(dir,"verify");
            await run("whisper-cli",["-m",path.join(packagedAssets,"tiny.en.bin"),
              "-f",process.argv[sampleIndex+1],"-of",output,"-otxt","-nt","-l","en","-t","4","-ng"],25000);
            const transcript=await fs.readFile(output+".txt","utf8");
            if(!/ask not what your country/i.test(transcript))throw Error("Bundled speech recognition check failed");
          });
        }else await run("whisper-cli",["--help"],5000);
        app.exit(0);
      }).catch(error=>{console.error(error.message);app.exit(1);});
    }else loading.catch(error=>console.error(error.message));
  }
  open();
  app.on("activate",()=>{if(!win)open();});
}).catch(error=>{console.error(error.message);app.exit(1);});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
app.on("before-quit",()=>{for(const child of children)child.kill();});
