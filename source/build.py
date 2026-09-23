import base64,json,re,os,sys
R=os.path.dirname(os.path.abspath(__file__))
F=R+'/fonts/'
os.makedirs(R+'/dist',exist_ok=True)
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
faces=[("Google Sans",400,F+"google-sans-latin-400-normal.woff2"),
("Google Sans",500,F+"google-sans-latin-500-normal.woff2"),
("Google Sans",700,F+"google-sans-latin-700-normal.woff2"),
("Google Sans Flex",400,F+"google-sans-flex-latin-400-normal.woff2"),
("Google Sans Flex",500,F+"google-sans-flex-latin-500-normal.woff2"),
("Roboto",400,F+"roboto-latin-400-normal.woff2"),
("Roboto",500,F+"roboto-latin-500-normal.woff2")]
ff="".join(f'@font-face{{font-family:"{n}";font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b64(p)}) format("woff2")}}\n' for n,w,p in faces)
ff+=f'@font-face{{font-family:"Afacad";font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,{b64(F+"afacad-var.woff2")}) format("woff2-variations")}}\n'
ff+=f'@font-face{{font-family:"Material Symbols Outlined";font-style:normal;font-weight:100 700;font-display:block;src:url(data:font/woff2;base64,{b64(F+"ms-sub.woff2")}) format("woff2")}}\n'
icons=json.load(open(F+'icons.json'))
B=R+'/brand/'
logos={'@@LOGO_BLUE@@':'data:image/png;base64,'+b64(B+'miva-logo-blue.png'),'@@LOGO_WHITE@@':'data:image/png;base64,'+b64(B+'miva-logo-white.png')}
for k,f in (('EKITI','ekiti.svg'),('MIVA_SVG','miva.svg'),('TOF','tof.svg'),('CHEVRONS','chevrons.svg')):
    logos['@@LOGO_%s@@'%k]='data:image/svg+xml;base64,'+b64(B+f)
def brand(s):
    for k,v in logos.items(): s=s.replace(k,v)
    return s
css=brand(open(R+'/styles.css').read().replace('/*@@FONTFACES@@*/',ff))  # the chevron motif is a CSS background
body=brand(open(R+'/body.html').read())
body=re.sub(r'@@I:([a-z_]+)@@',lambda m:f'<span class="ms" aria-hidden="true">&#x{icons[m.group(1)][2:]};</span>',body)
js=brand(open(R+'/app.js').read())
js=js.replace('/*@@ICONS@@*/{}',json.dumps({k:v[2:] for k,v in icons.items()}))
cues=json.load(open(R+'/cues.json')) if os.path.exists(R+'/cues.json') else []
js=js.replace('/*@@CUES@@*/[]',json.dumps(cues))
video=sys.argv[1] if len(sys.argv)>1 else ''
if video:
    js=js.replace('"/*@@VIDEO@@*/"','"data:video/mp4;base64,'+b64(video)+'"')
    webm=video.replace('.mp4','.webm')  # optional: embedded only when it sits next to the mp4
    if os.path.exists(webm): js=js.replace('"/*@@WEBM@@*/"','"data:video/webm;base64,'+b64(webm)+'"')
    else: print('note: no',os.path.basename(webm),'- building with mp4 only')
out=f'<meta charset="utf-8">\n<title>The Sandbox Class</title>\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n'
open(R+'/dist/sandbox-class.html','w').write(out)
# standalone variant with doctype for local testing/recording
open(R+'/dist/local.html','w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+out.replace('<title>','<title>',1)+'</html>')
print(len(out)//1024,'KB')
