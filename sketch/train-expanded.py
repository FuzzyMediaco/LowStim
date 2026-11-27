"""Train the on-device classifier from Google Quick, Draw! and synthetic icon sketches.

Use OPENBLAS_NUM_THREADS=1 python sketch/train-expanded.py /tmp/drawings dist/sketch-model.js.
Quick, Draw! drawings by Google Creative Lab and contributors, CC BY 4.0.
https://github.com/googlecreativelab/quickdraw-dataset
"""
import argparse
import base64
import concurrent.futures
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen, Request

import numpy as np

CLASSES = {
    "sailboat":"sailboat", "boat":"speedboat", "car":"car", "plane":"airplane", "bus":"bus", "bicycle":"bicycle",
    "cat":"cat", "dog":"dog", "bird":"bird", "fish":"fish", "octopus":"octopus", "bear":"bear", "dragon":"dragon",
    "butterfly":"butterfly", "turtle":"sea turtle", "tree":"tree", "flower":"flower", "leaf":"leaf", "mushroom":"mushroom",
    "moon":"moon", "star":"star", "sun":"sun", "cloud":"cloud", "rain":"rain", "snowflake":"snowflake", "mountain":"mountain",
    "house":"house", "bridge":"bridge", "castle":"castle", "hat":"hat", "umbrella":"umbrella", "key":"key", "book":"book",
    "broom":"broom", "ladder":"ladder", "cup":"coffee cup", "square":"square", "circle":"circle", "triangle":"triangle",
    "hexagon":"hexagon", "eye":"eye", "hand":"hand", "foot":"foot", "train":"train", "helicopter":"helicopter",
    "basket":"basket", "clock":"clock", "wheel":"wheel", "feather":"feather",
}
# The public corpus has no rocket, witch or tied money-bag category. Use distinct hand-built
# structurally flexible sketches and render perturbations only for these additional labels.
def handmade(label, rng, alternate=False):
    jitter=lambda n: float(rng.uniform(-n,n))
    def oval(x,y,w,h):
        angles=np.linspace(0,2*np.pi,15)
        return [[x+w*np.cos(a),y+h*np.sin(a)] for a in angles]
    if label=="rocket":
        h=15+jitter(3);w=4+jitter(1); nose=3+jitter(1);fin=3+jitter(1)
        lines=[[[0,0],[-w,nose],[-w,h],[w,h],[w,nose],[0,0]],
               [[-w,h*.55],[-w-fin,h+1],[-w,h]], [[w,h*.55],[w+fin,h+1],[w,h]]]
        if alternate or rng.random()<.75: lines.append(oval(0,h*.5,w*.45,w*.45))
        if rng.random()<.6: lines.append([[-w*.5,h],[0,h+3+jitter(2)],[w*.5,h]])
        if alternate: lines[0]=[[0,0],[-w*.6,nose*.5],[-w,nose*1.5],[-w,h-1],[-w*.65,h],[w*.65,h],[w,h-1],[w,nose*1.5],[w*.6,nose*.5],[0,0]]
    elif label=="money-bag":
        w=7+jitter(1.8);h=10+jitter(1.3)
        lines=[[[-2,2],[-4,-2],[-2,-1],[0,-3],[3,-2],[2,2],[-2,2]], [[-2,2],[-w*.75,h*.45],[-w,h*.9],[-w*.8,h*1.3],[0,h*1.43],[w*.84,h*1.3],[w,h*.94],[w*.76,h*.45],[2,2]], [[-3,2],[3,2]]]
        if rng.random()<.61:lines += [[[2,5],[-1,5],[-2,6.5],[1,8],[2,9.2],[1,10.1],[-2,10.3]],[[0,4],[0,11.2]]]
    else:
        h=8+jitter(2);w=5+jitter(1)
        lines=[[[0,-h],[-w,h*.1],[w,h*.1],[0,-h]], [[-w-2,h*.16],[w+2,h*.16]], oval(0,h*.52,w*.55,h*.35),
               [[0,h*.85],[-w,h*2.2],[w,h*2.2],[0,h*.85]], [[-w*.75,h*2.64],[-w*.45,h*2.2]], [[w*.75,h*2.64],[w*.45,h*2.2]]]
        if rng.random()<.42: lines=lines[:4]
        if alternate or rng.random()<.64: lines.extend([[[0,h],[-w*1.4,h*1.36]],[[0,h],[w*1.4,h*1.36]],[[w*.9,h*2],[w*1.9,h*.55]],[[w*1.8,h*.7],[w*2.15,h*.2],[w*2.3,h*.3],[w*1.9,h*.76]]])
    if label=="witch" and rng.random()<.45:
        lines[2]=[[-w*.5,h*.23],[-w*.44,h*.62],[0,h*.86],[w*.46,h*.65],[w*.55,h*.24]]
    if label=="money-bag" and rng.random()<.45:
        # Squat purses and tall sacks share a narrow, tied neck.
        lines=[np.asarray(line)*[rng.uniform(.85,1.1),rng.uniform(.8,1.25)] for line in lines]
    theta=jitter(.28 if label!="rocket" else .51)
    if label=="rocket" and rng.random()<.18: theta += rng.choice([-1,1])*.9
    rotate=np.array([[np.cos(theta),np.sin(theta)],[-np.sin(theta),np.cos(theta)]])
    return [np.array(line,dtype=np.float32) @ rotate * rng.uniform(.8,1.2,size=2)+rng.normal(0,.28,size=(len(line),2)) for line in lines]

def raster(lines):
    points=np.vstack(lines).astype(np.float32)
    low=points.min(0); span=points.max(0)-low; scale=16/max(1e-5,*span)
    points=(points-low)*scale+(19-span*scale)/2
    starts=points; ends=np.roll(points,-1,axis=0)
    boundaries=np.cumsum([len(line) for line in lines])-1
    ends[boundaries]=starts[boundaries]
    steps=np.ceil(np.abs(ends-starts).max(1)*2).astype(int)
    repeats=steps+1
    local=np.arange(repeats.sum())-np.repeat(np.cumsum(repeats)-repeats,repeats)
    xy=np.repeat(starts,repeats,axis=0)+np.repeat((ends-starts)/np.maximum(1,steps[:,None]),repeats,axis=0)*local[:,None]
    ij=xy.astype(int); frac=xy-ij; ix=ij[:,0]+20*ij[:,1]
    pixels=np.zeros(400,np.float32)
    for d,weight in [(0,(1-frac[:,0])*(1-frac[:,1])),(1,frac[:,0]*(1-frac[:,1])),(20,(1-frac[:,0])*frac[:,1]),(21,frac[:,0]*frac[:,1])]:
        np.maximum.at(pixels,ix+d,weight)
    return pixels

def fetch_one(item):
    label,category,folder,count=item
    path=folder/(label+".ndjson")
    if path.exists():return
    url="https://storage.googleapis.com/quickdraw_dataset/full/simplified/"+quote(category)+".ndjson"
    with urlopen(Request(url), timeout=90) as response, path.with_suffix(".part").open("wb") as local:
        found=0
        for line in response:
            row=json.loads(line)
            if row.get("recognized") and row.get("drawing"):
                local.write(line);found+=1
                if found>=count: break
    path.with_suffix(".part").replace(path)

def prepare(args):
    args.datasets.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(fetch_one,[(label,source,args.datasets,args.count) for label,source in CLASSES.items()]))
    rng=np.random.default_rng(2417)
    labels=[*CLASSES,"rocket","money-bag","witch"]
    xs,ys=[],[]
    for idx,label in enumerate(labels):
        rows=[]
        if label in CLASSES:
            for line in (args.datasets/(label+".ndjson")).read_text().splitlines()[:args.count]:
                paths=[np.array(x).T for x in json.loads(line)["drawing"] if x[0]]
                rows.append(raster(paths))
        else:
            for i in range(args.count):
                rows.append(raster(handmade(label,rng,i%10==0)))
        xs.extend(rows);ys.extend([idx]*len(rows))
    x=np.stack(xs);y=np.array(ys)
    select=np.arange(len(y))%10==0
    return labels,x[~select],y[~select],x[select],y[select]

def train(args):
    labels,x,y,test,expected=prepare(args)
    rng=np.random.default_rng(7461);hidden=176
    weights=[rng.normal(0,.064,(400,hidden)).astype("f"),np.zeros(hidden,"f"),
             rng.normal(0,.105,(hidden,len(labels))).astype("f"),np.zeros(len(labels),"f")]
    w,b,u,v=weights; first=[np.zeros_like(p) for p in weights];second=[np.zeros_like(p) for p in weights];step=0
    for epoch in range(args.epochs):
        for indices in np.array_split(rng.permutation(len(x)),max(1,len(x)//128)):
            inp=x[indices]; h=np.maximum(0,inp@w+b); out=h@u+v;out -= out.max(1,keepdims=True)
            grad=np.exp(out);grad/=grad.sum(1,keepdims=True);grad[np.arange(len(inp)),y[indices]]-=1;grad/=len(inp)
            back=(grad@u.T)*(h>0);step+=1
            for p,a,c,g in zip(weights,first,second,[inp.T@back,back.sum(0),h.T@grad,grad.sum(0)]):
                a*=.9;a+=.1*g;c*=.999;c+=.001*g*g
                p-=.0017*np.sqrt(1-.999**step)/(1-.9**step)*a/(np.sqrt(c)+1e-7)
        print("epoch",epoch+1,float(((np.maximum(0,test@w+b)@u+v).argmax(1)==expected).mean()),flush=True)
    encoded=[];decoded=[]
    for values in weights:
        scale=float(np.abs(values).max()/127)
        quant=np.rint(values/scale).astype("i1")
        encoded.append([scale,base64.b64encode(quant.tobytes()).decode()])
        decoded.append(quant.astype("f")*scale)
    w,b,u,v=decoded;pred=(np.maximum(0,test@w+b)@u+v).argmax(1)
    per_label={key:round(float((pred[expected==i]==i).mean()),4) for i,key in enumerate(labels)}
    result={"labels":labels,"hidden":hidden,"layers":encoded}
    args.out.write_text("globalThis.SKETCH_MODEL="+json.dumps(result,separators=(",",":"))+";\n")
    print(json.dumps({"train":len(x),"holdout":len(test),"quantized_accuracy":float((pred==expected).mean()),"per_label":per_label},indent=2),flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("datasets",type=Path);p.add_argument("out",type=Path)
    p.add_argument("--count",type=int,default=1200);p.add_argument("--epochs",type=int,default=20)
    train(p.parse_args())
