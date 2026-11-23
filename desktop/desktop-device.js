"use strict";
(() => {
  const api=window.LowStimDesktop;
  let mic=null;
  const stopTracks=stream=>stream?.getTracks().forEach(track=>track.stop());
  function wav(samples,rate){
    const length=Math.min(160000,Math.floor(samples.length*16000/rate));
    const bytes=new ArrayBuffer(44+length*2), view=new DataView(bytes);
    function ascii(offset,text){for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));}
    ascii(0,"RIFF");view.setUint32(4,36+length*2,true);ascii(8,"WAVE");
    ascii(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
    view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
    ascii(36,"data");view.setUint32(40,length*2,true);
    for(let i=0;i<length;i++){
      const a=Math.floor(i*rate/16000), b=Math.min(samples.length,Math.max(a+1,Math.floor((i+1)*rate/16000)));
      let sum=0;for(let k=a;k<b;k++)sum+=samples[k];
      view.setInt16(44+i*2,32767*Math.max(-1,Math.min(1,sum/(b-a))),true);
    }
    return bytes;
  }
  async function stopVoice(){
    if(!mic)return;
    const m=mic;mic=null;
    clearTimeout(m.timer);
    stopTracks(m.stream);
    if(m.node){m.node.disconnect();m.source.disconnect();}
    if(m.ctx)await m.ctx.close().catch(()=>{});
    if(!m.total){window.slateVoiceResult?.("","No audio was recorded.");return;}
    const samples=new Float32Array(m.total);
    let offset=0;
    for(const part of m.chunks){samples.set(part,offset);offset+=part.length;}
    try{
      const result=await api.transcribe(wav(samples,m.ctx.sampleRate));
      window.slateVoiceResult?.(result.text??"",result.error??"");
    }catch{window.slateVoiceResult?.("","Offline speech is unavailable.");}
  }
  async function listen(){
    if(mic)return;
    const m={chunks:[],total:0};mic=m;
    try{
      m.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1},video:false});
      if(mic!==m){stopTracks(m.stream);return;}
      m.ctx=new AudioContext();await m.ctx.resume();
      if(mic!==m)return;
      m.source=m.ctx.createMediaStreamSource(m.stream);
      m.node=m.ctx.createScriptProcessor(2048,1,1);
      m.node.onaudioprocess=e=>{
        const chunk=e.inputBuffer.getChannelData(0), remaining=Math.round(m.ctx.sampleRate*9)-m.total;
        if(remaining<=0){stopVoice();return;}
        const part=chunk.slice(0,remaining);m.chunks.push(part);m.total+=part.length;
      };
      m.source.connect(m.node);m.node.connect(m.ctx.destination);
      m.timer=setTimeout(stopVoice,9000);
    }catch{
      stopTracks(m.stream);
      if(m.ctx)await m.ctx.close().catch(()=>{});
      if(mic===m){mic=null;window.slateVoiceResult?.("","Microphone access is unavailable. You can still type or draw.");}
    }
  }
  window.SlateDevice={
    hasModel:()=>api.hasModel(),
    importModel:async ()=>{
      const button=document.querySelector("#model"),info=document.querySelector("#modelInfo");
      button.disabled=true;info.textContent="Choose a Qwen model file…";
      try{
        const result=await api.importModel();
        window.slateModelResult?.(result.message,api.hasModel());
      }catch{window.slateModelResult?.("Model import failed.",false);}
    },
    plan:async (id,prompt,grammar)=>{
      try{window.slatePlanResult?.(id,await api.plan(prompt,grammar));}
      catch{window.slatePlanResult?.(id,"");}
    },
    listen,stopVoice,
    say:line=>{
      const voice=window.speechSynthesis?.getVoices().find(v=>v.localService&&/^en/.test(v.lang));
      if(voice){const utterance=new SpeechSynthesisUtterance(line);utterance.voice=voice;speechSynthesis.speak(utterance);}
    },
  };
})();
