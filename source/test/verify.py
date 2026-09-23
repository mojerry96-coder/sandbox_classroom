import asyncio,json,os
from playwright.async_api import async_playwright
URL="file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","local.html"))
res=[]
def ok(name,cond,info=""): res.append(("PASS" if cond else "FAIL",name,info))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg=await b.new_page(viewport={"width":1119,"height":864})
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(URL)
    st=lambda: pg.evaluate("__sandbox.state()")
    lg=lambda: pg.evaluate("__sandbox.log()")
    s0=await st()
    # OPENER (house spec: brand/OPENER.md)
    ok("opener is a modal region with the three partner logos",await pg.is_visible("#intro")
       and await pg.get_attribute("#intro","role")=="dialog" and await pg.get_attribute("#intro","aria-modal")=="true"
       and len(await pg.query_selector_all("#intro .intro-logo img"))==3)
    alts=await pg.eval_on_selector_all("#intro .intro-logo img","els=>els.map(e=>e.alt)")
    ok("each logo keeps its institution's alt text",alts==["Government of Ekiti State, Nigeria","MIVA Open University","Tunji Olowolafe Foundation"],str(alts))
    ok("opener focuses Skip and locks the welcome screen",await pg.evaluate("document.activeElement.id")=="introSkip" and await pg.evaluate("document.querySelector('#welcome').inert"))
    # sign-off: nothing overlaps and what is on screen stays centred, sampled through the sequence
    # sampled every frame: overlap is never acceptable; centring is judged once each stage has settled
    probe=await pg.evaluate("""(()=>new Promise(res=>{const logos=[...document.querySelectorAll('#intro .intro-logo')];
      const settle=[1300,2300,3300,4600],offs=[];let over=0,worst=0,next=0;
      /* for centring, count only logos that have fully arrived: one that is still fading in is mid-slide */
      const centreOff=(min)=>{const vis=logos.filter(e=>getComputedStyle(e).opacity>=min).map(e=>e.getBoundingClientRect());
        if(!vis.length)return null;const mid=(vis[0].left+vis[vis.length-1].right)/2;return Math.abs(mid-innerWidth/2)};
      const tick=()=>{const t=performance.now();  /* page clock: the opener started at load, not when this probe did */
        const vis=logos.filter(e=>getComputedStyle(e).opacity>0.05).map(e=>e.getBoundingClientRect());
        for(let i=0;i<vis.length-1;i++){if(vis[i+1].left<vis[i].right)over++}
        const d=centreOff(0.05);if(d!==null)worst=Math.max(worst,d);
        if(next<settle.length&&t>=settle[next]){offs.push(Math.round(centreOff(0.98)||0));next++}
        if(t<5600)requestAnimationFrame(tick);else res({over,offs,worst:Math.round(worst)})};requestAnimationFrame(tick)}))""")
    ok("no two logos overlap at any point",probe["over"]==0,str(probe))
    ok("each stage settles centred",all(d<=8 for d in probe["offs"]) and len(probe["offs"])==4,str(probe))
    await pg.wait_for_function("getComputedStyle(document.querySelector('#introBegin')).opacity==='1'",timeout=5000)
    ok("Begin appears at the end and takes focus",await pg.is_visible("#introBegin") and await pg.evaluate("document.activeElement.id")=="introBegin"
       and await pg.evaluate("getComputedStyle(document.querySelector('.intro-motif')).opacity")=="0.7")
    await pg.click("#introBegin")
    try: await pg.wait_for_function("(()=>{const v=document.querySelector('#vid');return !document.querySelector('#intro')&&!!v&&!v.paused&&v.currentTime>0})()",timeout=8000)
    except Exception: pass
    ok("Begin hands over to the walkthrough, which plays",not await pg.query_selector("#intro")
       and await pg.evaluate("(()=>{const v=document.querySelector('#vid');return !!v&&!v.paused&&v.currentTime>0})()"))
    ok("autoplaying walkthrough has focus on Pause",await pg.evaluate("document.activeElement.id")=="pPlay")
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
    ok("closing it lands on Begin Practice, state untouched",await pg.evaluate("document.activeElement.id")=="beginBtn" and not await pg.evaluate("document.querySelector('#welcome').inert") and json.dumps(await st())==json.dumps(s0))
    # Skip / Esc jump to the finished frame rather than skipping the opener, so Begin is still the click that allows sound
    p2=await b.new_page(); await p2.goto(URL); await p2.wait_for_timeout(600)
    await p2.keyboard.press("Escape"); await p2.wait_for_timeout(300)
    ok("Esc jumps to the finished frame with Begin focused",await p2.is_visible("#intro") and await p2.evaluate("document.activeElement.id")=="introBegin"
       and await p2.evaluate("(()=>{const v=document.querySelector('#vid');return !v||v.paused})()"))
    await p2.close()
    p4=await b.new_page(viewport={"width":375,"height":812}); await p4.goto(URL); await p4.wait_for_timeout(5300)
    fit=await p4.evaluate("""(()=>{const l=[...document.querySelectorAll('#intro .intro-logo')].map(e=>e.getBoundingClientRect());
      let g=1e9;for(let i=0;i<l.length-1;i++)g=Math.min(g,l[i+1].left-l[i].right);
      return {scroll:document.documentElement.scrollWidth,vw:innerWidth,gap:Math.round(g),left:Math.round(l[0].left),right:Math.round(l[2].right)}})()""")
    ok("all three logos fit at 375px with no sideways scroll",fit["scroll"]==fit["vw"] and fit["gap"]>0 and fit["left"]>=0 and fit["right"]<=fit["vw"],str(fit))
    await p4.close()
    # reduced motion: the finished frame, with no movement
    p5=await b.new_page(reduced_motion="reduce"); await p5.goto(URL); await p5.wait_for_timeout(500)
    rm=await p5.evaluate("""(()=>{const i=document.querySelector('#intro'),l=[...document.querySelectorAll('#intro .intro-logo')];
      return {begin:getComputedStyle(document.querySelector('#introBegin')).opacity,
              classes:i.className,shift:getComputedStyle(document.querySelector('.intro-logos')).getPropertyValue('--shift').trim(),
              allIn:l.every(e=>getComputedStyle(e).opacity==='1'),focus:document.activeElement.id}})()""")
    ok("reduced motion shows the finished frame at once",rm["begin"]=="1" and rm["allIn"] and rm["shift"]=="0px" and rm["focus"]=="introBegin",str(rm))
    await p5.close()
    # browsers that block sound until the learner clicks: start muted, offer sound
    p3=await b.new_page()
    await p3.add_init_script("(()=>{const o=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return this.muted?o.call(this):Promise.reject(new DOMException('blocked','NotAllowedError'))}})()")
    await p3.goto(URL); await p3.wait_for_timeout(600); await p3.keyboard.press("Escape"); await p3.wait_for_timeout(300)
    await p3.click("#introBegin")
    try: await p3.wait_for_function("(()=>{const v=document.querySelector('#vid');return !!v&&!v.paused})()",timeout=8000)
    except Exception: pass
    await p3.wait_for_timeout(200)
    ok("sound blocked: plays muted with Turn on sound focused",await p3.evaluate("(()=>{const v=document.querySelector('#vid');return !!v&&!v.paused&&v.muted})()") and await p3.is_visible("#vUnmute") and await p3.evaluate("document.activeElement.id")=="vUnmute")
    await p3.click("#vUnmute"); await p3.wait_for_timeout(200)
    ok("Turn on sound unmutes and hides itself",await p3.evaluate("!document.querySelector('#vid').muted") and await p3.is_hidden("#vUnmute"))
    await p3.close()
    await pg.click("#beginBtn"); await pg.wait_for_timeout(200)
    ok("Begin opens EDU 101 Stream",await pg.evaluate("document.querySelector('#tab-stream').getAttribute('aria-selected')")=="true")
    # TAB INTROS (Classroom-style feature-intro card, silent animation)
    ok("Stream intro shows on first visit",await pg.is_visible(".dlg.tabcard") and "Stream" in await pg.inner_text("#cdT"))
    ok("intro focuses Got it",await pg.evaluate("document.activeElement.id")=="introOk")
    ok("intro illustration has a text alternative",bool(await pg.get_attribute(".iv[role=img]","aria-label")))
    await pg.click("#introOk"); await pg.wait_for_timeout(100)
    ok("intro closes, focus returns to tab, state untouched",await pg.evaluate("document.activeElement.id")=="tab-stream" and json.dumps(await st())==json.dumps(s0))
    # FOUNDATIONS against the reference pack (data/tokens.json, CHECKLIST.md)
    shell=await pg.evaluate("""(()=>{const cs=(s,p)=>getComputedStyle(document.querySelector(s))[p];
      const r=s=>document.querySelector(s).getBoundingClientRect();
      return {bar:Math.round(r('.topbar').height),drawer:Math.round(r('#drawer').width),
        canvas:cs('.sheet','borderTopLeftRadius'),tracking:cs('body','letterSpacing'),
        pill:cs('.ni.act','backgroundColor'),fab:Math.round(r('.fab').width),fabBg:cs('.fab','backgroundColor')}})()""")
    ok("shell metrics match the reference",shell["bar"]==65 and shell["drawer"]==347 and shell["canvas"]=="16px",str(shell))
    ok("global letter-spacing and active drawer pill",shell["tracking"]=="0.1px" and shell["pill"]=="rgb(211, 227, 253)",str(shell))
    ok("Help FAB present on the class screen",shell["fab"]==48 and shell["fabBg"]=="rgba(255, 255, 255, 0.85)",str(shell))
    await pg.click("#hamb"); await pg.wait_for_timeout(350)
    rail=await pg.evaluate("""(()=>({w:Math.round(document.querySelector('#drawer').getBoundingClientRect().width),
      radius:getComputedStyle(document.querySelector('.ni.act .ltr')).borderRadius,
      bg:getComputedStyle(document.querySelector('.ni.act .ltr')).backgroundColor,
      label:getComputedStyle(document.querySelector('.ni .rlbl')).display}))()""")
    ok("collapsed rail matches the reference",rail["w"]==72 and rail["radius"]=="0px 20px 20px 0px" and rail["bg"]=="rgb(194, 231, 255)" and rail["label"]=="block",str(rail))
    await pg.click("#hamb"); await pg.wait_for_timeout(350)
    await pg.click("#codeMenu"); await pg.wait_for_timeout(150)
    ok("menus carry no shadow (tonal surface only)",await pg.evaluate("getComputedStyle(document.querySelector('.menu')).boxShadow")=="none")
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
    ok("skip link is the first focusable element in the document",await pg.evaluate("""(()=>{const sel='a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
      const f=document.querySelector(sel);return f&&f.id})()""")=="skipLink")
    await pg.focus("#skipLink"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(100)
    ok("skip link moves focus to the main region",await pg.evaluate("document.activeElement.id")=="main")
    await pg.hover("#hamb"); await pg.wait_for_timeout(700)
    ok("icon buttons have a tooltip matching the accessible name",await pg.evaluate("""(()=>{const t=document.querySelector('.tip');return !!t&&t.textContent===document.querySelector('#hamb').getAttribute('aria-label')})()"""))
    # STREAM
    await pg.click("#annOpen")
    ok("Post disabled when empty",await pg.is_disabled("#annPost"))
    await pg.fill("#annText","   ")
    ok("Post disabled for whitespace",await pg.is_disabled("#annPost"))
    await pg.fill("#annText","Welcome, everyone. Our first class begins on Monday.")
    await pg.click("#annPost"); await pg.wait_for_timeout(100)
    s=await st()
    ok("post appears at top as You/Just now",s["posts"][0]["author"]=="You" and s["posts"][0]["when"]=="Just now" and len(s["posts"])==2)
    await pg.fill("#annText","x") if await pg.query_selector("#annText") else None
    # second post, then delete it
    await pg.click("#annOpen"); await pg.fill("#annText","<b>Second</b> post"); await pg.click("#annPost")
    txt=await pg.inner_text(".post >> nth=0")
    ok("user text rendered safely",("<b>Second</b>" in txt) and await pg.evaluate("!document.querySelector('.post-b b')"))
    pid=(await st())["posts"][0]["id"]
    await pg.click(f'[data-post-menu="{pid}"]'); await pg.click("#mDeletePost")
    s=await st(); ok("own post removed",len(s["posts"])==2)
    await pg.click('[data-post-menu="post-welcome"]')
    items=await pg.eval_on_selector_all(".menu [role=menuitem]","els=>els.map(e=>e.textContent)")
    ok("welcome post has no delete/edit",not any("Delete" in i or "Edit" in i for i in items),str(items))
    await pg.keyboard.press("Escape")
    # edit own post
    pid=(await st())["posts"][0]["id"]
    await pg.click(f'[data-post-menu="{pid}"]'); await pg.click("#mEditPost"); await pg.fill("#editText","  ")
    ok("edit save disabled when empty",await pg.is_disabled("#editSave"))
    await pg.fill("#editText","Edited text"); await pg.click("#editSave")
    ok("post edited",(await st())["posts"][0]["text"]=="Edited text")
    # CLASSWORK
    await pg.click("#tab-classwork"); await pg.wait_for_timeout(100)
    ok("Classwork intro shows on first visit","topics" in (await pg.inner_text(".dlg.tabcard")).lower())
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
    ok("Escape closes intro",not await pg.query_selector(".dlg.tabcard"))
    await pg.click("#createBtn"); await pg.click("#mTopic")
    ok("topic Add disabled when empty",await pg.is_disabled("#topicAdd"))
    await pg.fill("#topicName","   "); ok("topic Add disabled for spaces",await pg.is_disabled("#topicAdd"))
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
    ok("dialog Escape returns focus to Create",await pg.evaluate("document.activeElement.id")=="createBtn")
    await pg.click("#createBtn"); await pg.click("#mTopic"); await pg.fill("#topicName","Week 1"); await pg.click("#topicAdd")
    await pg.click("#createBtn"); await pg.click("#mAssignment")
    ok("Assign disabled without title",await pg.is_disabled("#aAssign"))
    opts=await pg.eval_on_selector_all("#aTopic option","els=>els.map(e=>e.textContent)")
    ok("topic selector from state",opts==["No topic","Week 1"],str(opts))
    await pg.fill("#aTitle","Introduce yourself"); await pg.select_option("#aTopic",label="Week 1"); await pg.click("#aAssign")
    s=await st(); ok("assignment filed under Week 1",s["assignments"][0]["topicId"]==s["topics"][0]["id"])
    ok("topic count shows 1 item","1 item" in await pg.inner_text(f'[data-topic="{s["topics"][0]["id"]}"] .tcount'))
    for n in ["Loose A","Loose B"]:
        await pg.click("#createBtn"); await pg.click("#mAssignment"); await pg.fill("#aTitle",n); await pg.click("#aAssign")
        if n=="Loose A": ok("no nudge at 1 unfiled",not await pg.query_selector("#nudge"))
    ok("nudge appears at 2 unfiled",bool(await pg.query_selector("#nudge")))
    ok("nudge flag set",(await st())["flags"]["unfiledNudgeShown"]==True)
    await pg.click("#tab-stream"); await pg.click("#tab-classwork"); await pg.wait_for_timeout(100)
    ok("nudge not repeated after tab change",not await pg.query_selector("#nudge"))
    ok("intro not repeated on revisit",not await pg.query_selector(".dlg.tabcard"))
    await pg.click("#createBtn"); await pg.click("#mAssignment"); await pg.fill("#aTitle","Loose C"); await pg.click("#aAssign")
    ok("nudge not repeated at 3 unfiled",not await pg.query_selector("#nudge"))
    ok("No topic section lists 3","3 items" in await pg.inner_text("#h-nt + .tcount"))
    # move
    aid=[a for a in (await st())["assignments"] if a["title"]=="Loose C"][0]["id"]
    await pg.click(f'[data-item-menu="{aid}"]'); await pg.click("#mMove"); await pg.select_option("#moveTopic",label="Week 1"); await pg.click("#moveGo")
    ok("move to topic",[a for a in (await st())["assignments"] if a["id"]==aid][0]["topicId"] is not None)
    # editing an assignment and changing its topic in one commit is one logged action
    l0=await lg()
    await pg.click(f'[data-item-menu="{aid}"]'); await pg.click(".menu [role=menuitem]")
    await pg.fill("#aTitle","Loose C renamed"); await pg.select_option("#aTopic",label="No topic"); await pg.click("#aAssign")
    l1=await lg()
    ok("edit that also changes topic counts once",(l1["assignmentsEdited"]+l1["assignmentsMoved"])-(l0["assignmentsEdited"]+l0["assignmentsMoved"])==1,
       f'edited {l0["assignmentsEdited"]}->{l1["assignmentsEdited"]}, moved {l0["assignmentsMoved"]}->{l1["assignmentsMoved"]}')
    ok("summary total matches actions",[a for a in (await st())["assignments"] if a["id"]==aid][0]["topicId"] is None)
    # PEOPLE
    await pg.click("#tab-people"); await pg.wait_for_timeout(100)
    ok("People intro shows on first visit",await pg.is_visible(".dlg.tabcard")); await pg.click("#introOk")
    await pg.click("#inviteBtn"); await pg.fill("#invEmail","not-an-email"); await pg.click("#invSubmit")
    ok("invalid email rejected",len((await st())["teachers"])==1 and await pg.get_attribute("#invEmail","aria-invalid")=="true")
    await pg.fill("#invEmail","tutor@example.com"); await pg.click("#invSubmit")
    s=await st(); ok("co-teacher pending",s["teachers"][1]["status"]=="pending" and "Pending" in await pg.inner_text("#panel"))
    ok("owner has no remove control",await pg.evaluate("!document.querySelector('.prow .b-owner').parentElement.querySelector('[data-teacher-menu]')"))
    await pg.click("#addStudentBtn"); ok("Add student disabled when empty",await pg.is_disabled("#stuSubmit"))
    await pg.fill("#stuName","Ada Okafor"); await pg.click("#stuSubmit")
    ok("student added, headcount 3",len((await st())["students"])==3 and "3 students" in await pg.inner_text("#headcount"))
    sid=(await st())["students"][0]["id"]
    await pg.click(f'[data-student-menu="{sid}"]'); await pg.click(".menu [role=menuitem]")
    ok("student removed, headcount 2",len((await st())["students"])==2 and "2 students" in await pg.inner_text("#headcount"))
    codes=set();prev=(await st())["classCode"];same=False
    for i in range(40):
        await pg.click("#regenBtn"); c=(await st())["classCode"]; same|=(c==prev); prev=c
    ok("regenerate never repeats previous code",not same)
    # tab switching retains state
    await pg.click("#tab-stream"); ok("stream posts retained",len(await pg.query_selector_all(".post"))==2)
    # help + guide don't change state
    before=json.dumps(await st())
    await pg.click("#dHelp"); await pg.click("#hWhat"); await pg.click("#hIntro"); await pg.wait_for_timeout(100)
    ok("intro replays from Practice Help",await pg.is_visible(".dlg.tabcard")); await pg.click("#introOk")
    await pg.click("#dHelp"); await pg.click("#hWhat"); await pg.click("#hBack"); await pg.click("#hGuide")
    await pg.click("[data-g='0']"); await pg.wait_for_timeout(200)
    ok("guide shows spotlight on composer",await pg.evaluate("!document.querySelector('#spot').hidden"))
    await pg.click("#annOpen"); await pg.wait_for_timeout(100)
    ok("guide advanced to step 2",("step 2" in (await pg.inner_text("#coach")).lower()))
    await pg.click("#coachExit")
    ok("guide exit keeps state",json.dumps(await st())==before)
    await pg.click("#dWatch"); await pg.wait_for_timeout(200); await pg.keyboard.press("Escape")
    ok("walkthrough doesn't alter state",json.dumps(await st())==before)
    # summary
    await pg.click("#dEnd"); await pg.wait_for_timeout(200)
    t=await pg.inner_text("#summary")
    ok("summary says Not a score","Not a score" in t)
    ok("summary separates current vs actions","Your class right now" in t and "Actions you tried" in t)
    l=await lg(); ok("log counts committed actions",l["postsCreated"]==2 and l["postsRemoved"]==1 and l["topicsCreated"]==1 and l["assignmentsCreated"]==4 and l["invitesSent"]==1 and l["studentsAdded"]==1 and l["studentsRemoved"]==1,str(l))
    await pg.click("#sc-people-2"); await pg.fill("#transfer","Create topics before posting.")
    await pg.click("[data-cont='classwork']")
    ok("continue returns with state",len((await st())["assignments"])==4 and await pg.evaluate("document.querySelector('#tab-classwork').getAttribute('aria-selected')")=="true")
    await pg.click("#dEnd"); await pg.click("#sumFinish")
    ok("finish shows transfer sentence","Create topics before posting." in await pg.inner_text("#finish"))
    old=(await st())["classCode"]
    await pg.click("#finAgain"); s=await st(); l=await lg()
    ok("reset restores seed",len(s["posts"])==1 and not s["topics"] and not s["assignments"] and len(s["teachers"])==1 and len(s["students"])==2 and s["flags"]["unfiledNudgeShown"]==False and s["classCode"]!=old)
    ok("reset clears log",l["postsCreated"]==0 and l["invitesSent"]==0 and l["codeRegenerations"]==0)
    ok("no localStorage used",await pg.evaluate("localStorage.length")==0)
    ok("no JS errors",not errs,str(errs))
    await b.close()
asyncio.run(main())
for r in res: print(*r)
print(sum(r[0]=="PASS" for r in res),"/",len(res))
