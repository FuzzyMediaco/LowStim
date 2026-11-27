// Run against a local llama.cpp server started with the distributable quantized base
// and --lora <adapter.gguf>. Both conditions use the app's actual prompt and grammar.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import "../../dist/catalog.js";
import "../../dist/scene.js";

const folder=path.dirname(fileURLToPath(import.meta.url));
const base=process.argv[2] || "http://127.0.0.1:9326";
const output=process.argv[3];
const rows=fs.readFileSync(path.join(folder,"../training-examples.jsonl"),"utf8").trim().split("\n").map(JSON.parse);
const familyMatch=(key, a, b)=>key==="actor"&&["sailboat","pirate-ship"].includes(a)&&["sailboat","pirate-ship"].includes(b)||a===b;
const scores={};
for(const condition of ["tuned","stock"]){
  const correct={actor:0,mechanic:0,setting:0,accent:0};
  let valid=0;
  for(const [i,row] of rows.entries()){
    const input=row.held_out_input;
    const opts={seed:i+100,level:"max"};
    const prompt=Forge.modelPrompt(input,"",null,opts);
    const r=await fetch(base+"/completion",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({prompt,grammar:Forge.gbnf(input,"",null,opts),temperature:0,n_predict:160,cache_prompt:true,lora:[{id:0,scale:condition==="tuned"?1:0}]})});
    if(!r.ok) throw Error(await r.text());
    const data=await r.json();let tool;
    try{tool=JSON.parse(data.content)}catch{}
    if(Forge.validPlan(tool)){
      valid++;
      for(const k of Object.keys(correct)) if(familyMatch(k,tool[k],row.tool[k])) correct[k]++;
    }
    console.log(condition,i,input,JSON.stringify(tool));
  }
  scores[condition]={total:rows.length,valid,...correct};
  if(output) fs.writeFileSync(output,JSON.stringify(scores,null,2)+"\n");
}
console.log(scores);
