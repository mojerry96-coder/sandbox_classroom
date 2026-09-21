import json, os, subprocess, math, numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont
# Run from the video work dir (default source/video): needs timeline.json (record.py), sched.json
# (schedule.py), gs500.ttf, and the narration in source/narration/s<i>.wav.
SCH=json.load(open('sched.json'))
M=json.load(open('timeline.json')); FPS=30; W,H=1920,1080
DUR=max(90.0,round(max(o['s']+o['d'] for o in SCH)+0.8,2))
imgs=sorted(M['images'],key=lambda x:x[0]); keys=M['keys']; clicks=M['clicks']
OFF=[0.6,10.4,28.4,48.4,66.4,77.4]
LINES=[
"Welcome to your sandbox class. Everything here is practice. Nothing you do reaches real students.",
"Use Stream to share announcements. Write a message, post it, and see where it appears. You can remove your own post and try again.",
"Classwork keeps learning materials organised. Create a topic, then file an assignment beneath it so students can find their work.",
"Practise managing people here. A co-teacher invitation appears as Pending, while this sandbox adds a student as Active. You can also regenerate the class code.",
"Need support? Open Practice Help for an explanation, guided steps, or this walkthrough.",
"Review what you tried and decide what needs more practice. There is no score. Return to any tab, explore in your own order, and reset whenever you want."]
cues=[{"s":o['s'],"e":round(o['s']+o['d']+0.35,2),"t":o['t']} for o in SCH]
for i in range(len(cues)-1): cues[i]['e']=min(cues[i]['e'],cues[i+1]['s'])
cues[-1]['e']=min(cues[-1]['e'],DUR)
json.dump(cues,open('cues.json','w'),indent=1)
def ts(x,sep=','): h=int(x//3600);m=int(x%3600//60);s=x%60; return f"{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s-int(s))*1000)):03d}"
open('captions.srt','w').write("\n".join(f"{i+1}\n{ts(c['s'])} --> {ts(c['e'])}\n{c['t']}\n" for i,c in enumerate(cues)))
open('captions.vtt','w').write("WEBVTT\n\n"+"\n".join(f"{ts(c['s'],'.')} --> {ts(c['e'],'.')}\n{c['t']}\n" for c in cues))
# ---- audio: narration + soft clicks
sr=24000; audio=np.zeros(int(DUR*sr),dtype=np.float32)
for o in SCH:
    a,r=sf.read(os.path.join(os.path.dirname(os.path.abspath(__file__)),"narration",f"s{o['i']}.wav"),dtype='float32'); assert r==sr
    st=int(o['s']*sr); audio[st:st+len(a)]+=a[:len(audio)-st]
tick=np.exp(-np.linspace(0,40,int(.03*sr)))*np.sin(2*np.pi*1900*np.linspace(0,.03,int(.03*sr)))*0.05
for t,_,_ in clicks:
    s=int(t*sr); audio[s:s+len(tick)]+=tick[:max(0,len(audio)-s)]
audio=np.clip(audio/ max(1e-6,np.abs(audio).max())*0.89,-1,1)
sf.write('mix.wav',audio,sr)
# ---- cursor
def ease(x): return x*x*(3-2*x)
def cursor_at(t):
    prev=keys[0]
    for k in keys:
        if k[0]>=t:
            if k[0]==prev[0]: return k[1],k[2]
            u=ease((t-prev[0])/(k[0]-prev[0])); return prev[1]+(k[1]-prev[1])*u, prev[2]+(k[2]-prev[2])*u
        prev=k
    return prev[1],prev[2]
arrow=[(0,0),(0,34),(9,26),(15,40),(21,37),(15,24),(26,24)]
cur_img=Image.new('RGBA',(40,48),(0,0,0,0)); d=ImageDraw.Draw(cur_img)
d.polygon([(x+3,y+3) for x,y in arrow],fill=(0,0,0,70)); d.polygon([(x+1,y+1) for x,y in arrow],fill='white',outline='black',width=2)
font=ImageFont.truetype('gs500.ttf',36)
def draw_caption(im,text):
    dr=ImageDraw.Draw(im,'RGBA'); maxw=1500
    words=text.split(); lines=[]; cur=''
    for w in words:
        tt=(cur+' '+w).strip()
        if dr.textlength(tt,font=font)>maxw and cur: lines.append(cur); cur=w
        else: cur=tt
    lines.append(cur); lh=50; bh=lh*len(lines)+24; y0=950-bh
    bw=max(dr.textlength(l,font=font) for l in lines)+48
    dr.rounded_rectangle([W/2-bw/2,y0,W/2+bw/2,y0+bh],radius=10,fill=(0,0,0,205))
    for i,l in enumerate(lines):
        dr.text((W/2,y0+12+i*lh+lh/2),l,font=font,fill='white',anchor='mm')
def ff(out,extra):
    return subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i','mix.wav']+extra+['-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-tune','animation','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',out],stdin=subprocess.PIPE)
p1=ff('clean.mp4',[]); p2=ff('burned.mp4',[])
cache={}; endc=Image.open(imgs[-1][1]).convert('RGB'); ET=M['endcard_t']
def base(t):
    path=[p for tt,p in imgs if tt<=t+1e-6 and p!=imgs[-1][1]][-1]
    if path not in cache: cache.clear(); cache[path]=Image.open(path).convert('RGB')
    return cache[path]
last=None
for f in range(int(DUR*FPS)):
    t=f/FPS
    fr=base(t).copy()
    if t<ET:
        cx,cy=cursor_at(t)
        for ct,x,y in clicks:
            dt=t-ct
            if 0<=dt<0.45:
                ov=Image.new('RGBA',(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov); r=14+40*dt/0.45; a=int(150*(1-dt/0.45))
                od.ellipse([x-r,y-r,x+r,y+r],outline=(11,87,208,a),width=5); od.ellipse([x-10,y-10,x+10,y+10],fill=(11,87,208,int(a*.5)))
                fr=Image.alpha_composite(fr.convert('RGBA'),ov).convert('RGB')
        fr.paste(cur_img,(int(cx)-1,int(cy)-1),cur_img)
    else:
        u=min(1,(t-ET)/0.45); fr=Image.blend(fr,endc,u)
    p1.stdin.write(fr.tobytes())
    c=[c for c in cues if c['s']<=t<c['e']]
    if c: fr=fr.copy(); draw_caption(fr,c[-1]['t'])
    p2.stdin.write(fr.tobytes())
p1.stdin.close(); p2.stdin.close(); p1.wait(); p2.wait(); print('done')
