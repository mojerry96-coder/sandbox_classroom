from fontTools.ttLib import TTFont
from fontTools import subset
import json,sys
# the full Material Symbols variable font: npm pack @fontsource-variable/material-symbols-outlined,
# unpack it here as pkgtmp/ (git-ignored), or point MS_FULL at the woff2
import os
src=os.environ.get("MS_FULL","pkgtmp/package/files/material-symbols-outlined-latin-fill-normal.woff2")
f=TTFont(src)
bc=f.getBestCmap()
cmap={}
for k,v in bc.items(): cmap.setdefault(v,k)
g2c={v:k for k,v in bc.items() if k<128}
names={}
for lk in f['GSUB'].table.LookupList.Lookup:
    for st in lk.SubTable:
        st=getattr(st,'ExtSubTable',st)
        if hasattr(st,'ligatures'):
            for first,ligs in st.ligatures.items():
                for lg in ligs:
                    comps=[first]+lg.Component
                    # glyph names of letters -> chars
                    s=''.join(chr(g2c.get(g,63)) for g in comps)
                    if lg.LigGlyph in cmap: names[s]=cmap[lg.LigGlyph]
want=sys.argv[1].split(',')
out={}
miss=[]
for w in want:
    if w in names: out[w]=names[w]
    else: miss.append(w)
print("missing",miss)
json.dump({k:hex(v) for k,v in out.items()},open('icons.json','w'))
opts=subset.Options(); opts.flavor='woff2'; opts.layout_features=[]; opts.notdef_outline=True
s=subset.Subsetter(opts); s.populate(unicodes=list(out.values())); s.subset(f)
f.flavor='woff2'; f.save('ms-sub.woff2')
import os;print(os.path.getsize('ms-sub.woff2'))
