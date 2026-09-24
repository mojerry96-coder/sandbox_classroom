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
    cl=lambda: pg.evaluate("(()=>{const s=__sandbox.state();return s.classes.find(c=>c.id===s.activeId)||null})()")
    s0=await st()
    ok("nothing is set up in advance",s0["classes"]==[] and s0["user"]["role"] is None and s0["activeId"] is None,str(s0))
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
    await pg.click("#beginBtn"); await pg.wait_for_timeout(300)
    # ROLE PICKER, then the teacher sets the class up (SPEC §2, §6.1-6.3)
    ok("Begin Practice opens the role picker",await pg.is_visible("#role") and await pg.is_visible("#roleTeacher") and await pg.is_visible("#roleStudent"))
    await pg.click("#roleTeacher"); await pg.wait_for_timeout(300)
    ok("teacher lands on an empty Home with no classes",await pg.is_visible("#homeCreate") and (await st())["classes"]==[] and (await st())["user"]["role"]=="teacher")
    await pg.click("#homeCreate"); await pg.wait_for_timeout(250)
    ok("first Create class raises the consumer gate","Using Classroom at a school with students?" in await pg.inner_text("#cdT"))
    ok("gate Continue is disabled until the box is ticked",await pg.is_disabled("#gateGo"))
    await pg.check("#gateBox"); await pg.wait_for_timeout(100)
    ok("ticking the box enables Continue",not await pg.is_disabled("#gateGo"))
    await pg.click("#gateGo"); await pg.wait_for_timeout(250)
    ok("gate hands over to Create class","Create class" in await pg.inner_text("#cdT") and await pg.is_disabled("#ccCreate"))
    opts=await pg.eval_on_selector_all("#ccForm input","els=>els.map(e=>e.id)")
    ok("Create class has the five fields",opts==["className","section","level","subject","room"],str(opts))
    await pg.fill("#className","EDU 101"); await pg.fill("#section","Sandbox Class")
    await pg.click("#ccCreate"); await pg.wait_for_timeout(150)
    ok("submitting state: fields grey out and the button reads Creating…",
       await pg.evaluate("document.querySelector('#ccCreate').textContent")=="Creating…" and await pg.is_disabled("#className") and await pg.is_disabled("#ccCancel"))
    await pg.wait_for_timeout(900)
    c=await cl()
    ok("the new class is empty, as Classroom makes it",c["name"]=="EDU 101" and c["section"]=="Sandbox Class" and c["role"]=="owner"
       and c["posts"]==[] and c["topics"]==[] and c["assignments"]==[] and c["students"]==[] and len(c["teachers"])==1,str(c))
    import re as _re
    ok("the class gets a generated code",bool(_re.fullmatch(r"[A-Z2-9]{3}-[A-Z2-9]{3}",c["code"])),c["code"])
    ok("creating the class lands on its Stream",await pg.evaluate("document.querySelector('#tab-stream').getAttribute('aria-selected')")=="true")
    ok("the gate is shown only once",await pg.evaluate("__sandbox.state().flags.gateSeen")==True)
    # TAB INTROS (Classroom-style feature-intro card, silent animation)
    sBefore=json.dumps(await st())
    ok("Stream intro shows on first visit",await pg.is_visible(".dlg.tabcard") and "Stream" in await pg.inner_text("#cdT"))
    ok("intro focuses Got it",await pg.evaluate("document.activeElement.id")=="introOk")
    ok("intro illustration has a text alternative",bool(await pg.get_attribute(".iv[role=img]","aria-label")))
    await pg.click("#introOk"); await pg.wait_for_timeout(100)
    ok("intro closes, focus returns to tab, state untouched",await pg.evaluate("document.activeElement.id")=="tab-stream" and json.dumps(await st())==sBefore)
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
    # CLASS SHELL + STREAM to the reference (SPEC §4.4, §6.3, §6.5, §7.3)
    tabs=await pg.eval_on_selector_all(".ctab","els=>els.map(e=>e.textContent)")
    ok("the class page has the four tabs in order",tabs==["Stream","Classwork","People","Grades"],str(tabs))
    ok("tab bar carries the class actions",await pg.is_visible("#tbCal") and await pg.is_visible("#tbDrive") and await pg.is_visible("#tbSettings"))
    ok("banner has Customize and class information",await pg.is_visible("#customBtn") and await pg.is_visible("#classInfo"))
    ok("sidebar shows Meet, the class code and Upcoming",await pg.is_visible(".lcard.meet") and await pg.is_visible("#streamCode") and "Woohoo" in await pg.inner_text(".lcol"))
    ok("a new class opens on the Stream empty state","This is where you can talk to your class" in await pg.inner_text("#panel"))
    ok("the composer row is a tonal pill plus Repost",await pg.is_visible("#annOpen") and await pg.is_visible("#repostBtn"))
    await pg.click("#annOpen"); await pg.wait_for_timeout(250)
    comp=await pg.evaluate("""(()=>({w:Math.round(document.querySelector('.dlg.comp').getBoundingClientRect().width),
      title:document.querySelector('#cdT').textContent,
      toolbar:[...document.querySelectorAll('.rtbar [data-rt]')].map(b=>b.getAttribute('aria-label')),
      attach:[...document.querySelectorAll('.attachrow [data-att]')].map(b=>b.getAttribute('aria-label')),
      caret:!!document.querySelector('#annMore')}))()""")
    ok("the composer is the modal the pack describes",comp["title"]=="Announcement" and comp["w"]==930 and comp["caret"]
       and comp["toolbar"]==["Bold","Italic","Underline","Bulleted list","Remove formatting"]
       and comp["attach"]==["Add Google Drive file","Add YouTube video","Upload file","Add link"],str(comp))
    await pg.fill("#annText","Layering check"); await pg.wait_for_timeout(100)
    await pg.click("#annMore"); await pg.wait_for_timeout(150)
    ok("the Post split menu opens above its own dialog",
       await pg.evaluate("""(()=>{const m=document.querySelector('.menu [role=menuitem]');if(!m)return false;
         const r=m.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
         return !!el&&(el===m||m.contains(el))})()"""))
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
    # STREAM
    await pg.click("#annOpen")
    ok("Post disabled when empty",await pg.is_disabled("#annPost"))
    await pg.fill("#annText","   ")
    ok("Post disabled for whitespace",await pg.is_disabled("#annPost"))
    await pg.fill("#annText","Welcome, everyone. Our first class begins on Monday.")
    await pg.click("#annPost"); await pg.wait_for_timeout(100)
    s=await cl()
    ok("post appears at top as You/Just now",s["posts"][0]["author"]=="You" and s["posts"][0]["when"]=="Just now" and len(s["posts"])==1)
    await pg.fill("#annText","x") if await pg.query_selector("#annText") else None
    # second post, then delete it
    await pg.click("#annOpen"); await pg.fill("#annText","<b>Second</b> post"); await pg.click("#annPost")
    txt=await pg.inner_text(".post >> nth=0")
    ok("user text rendered safely",("<b>Second</b>" in txt) and await pg.evaluate("!document.querySelector('.post-b b')"))
    pid=(await cl())["posts"][0]["id"]
    await pg.click(f'[data-post-menu="{pid}"]'); await pg.click("#mDeletePost")
    s=await cl(); ok("own post removed",len(s["posts"])==1)
    # edit own post
    pid=(await cl())["posts"][0]["id"]
    await pg.click(f'[data-post-menu="{pid}"]'); await pg.click("#mEditPost"); await pg.fill("#annText","  ")
    ok("edit save disabled when empty",await pg.is_disabled("#annPost"))
    await pg.fill("#annText","Edited text"); await pg.click("#annPost")
    ok("post edited",(await cl())["posts"][0]["text"]=="Edited text")
    # CLASSWORK
    await pg.click("#tab-classwork"); await pg.wait_for_timeout(100)
    ok("Classwork intro shows on first visit","topics" in (await pg.inner_text(".dlg.tabcard")).lower())
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
    ok("Escape closes intro",not await pg.query_selector(".dlg.tabcard"))
    # CLASSWORK: the Create menu and the editor (SPEC §6.6, §6.7)
    await pg.click("#createBtn"); await pg.wait_for_timeout(150)
    cm=await pg.evaluate("""(()=>({items:[...document.querySelectorAll('.menu [role=menuitem]')].map(b=>b.textContent.replace(/[^ -~]/g,'').trim()),
      width:Math.round(document.querySelector('.menu').getBoundingClientRect().width),
      sep:document.querySelectorAll('.menu hr').length}))()""")
    ok("Create menu lists the five types and Topic after a separator",
       cm["items"]==["Assignment","Quiz assignment","Question","Material","Reuse post","Topic"] and cm["sep"]==1 and cm["width"]==202,str(cm))
    await pg.click("#mAssignment"); await pg.wait_for_timeout(300)
    edi=await pg.evaluate("""(()=>({title:document.querySelector('#edT').textContent,
      invalid:document.querySelector('#aTitle').getAttribute('aria-invalid'),
      helpErr:document.querySelector('#aTitleHelp').classList.contains('err'),
      assign:document.querySelector('#aAssign').disabled,
      attach:[...document.querySelectorAll('.att5 .l')].map(e=>e.textContent),
      rail:[...document.querySelectorAll('.ed-side .k')].map(e=>e.textContent.trim()),
      points:document.querySelector('#aPoints').value,rubric:!!document.querySelector('#aRubric'),
      caret:!!document.querySelector('#aMore')}))()""")
    ok("the editor opens with the title already in its error state",edi["invalid"]=="true" and edi["helpErr"] and edi["assign"],str(edi))
    ok("editor has the attach row and the full right rail",
       edi["attach"]==["Drive","YouTube","Create","Upload","Link"] and edi["rail"]==["For","Assign to","Points","Due","Topic"]
       and edi["points"]=="100" and edi["rubric"] and edi["caret"],str(edi))
    await pg.wait_for_selector(".scrim .dlg",timeout=5000); await pg.wait_for_timeout(400)
    ok("the first-run promo appears over the editor, once","Schedule across multiple classes" in await pg.inner_text(".scrim .dlg"))
    await pg.click(".scrim .dlg .acts .tb >> nth=1"); await pg.wait_for_timeout(250)
    await pg.click("#aDue"); await pg.wait_for_timeout(200)
    ok("Due opens the date popover, with Time hidden until a date is set",
       "Due date & time" in await pg.inner_text(".menu.due") and await pg.evaluate("document.querySelector('#timeWrap').hidden"))
    await pg.fill("#dueDate","10/06/2026"); await pg.wait_for_timeout(150)
    ok("choosing a date reveals the Time field",not await pg.evaluate("document.querySelector('#timeWrap').hidden"))
    await pg.click("#dueSave"); await pg.wait_for_timeout(150)
    await pg.click("#ptsMenu"); await pg.wait_for_timeout(150)
    ok("Points offers the Ungraded suggestion",(await pg.inner_text(".menu [role=menuitem]")).strip()=="Ungraded")
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
    await pg.fill("#aTitle","Draft assignment"); await pg.wait_for_timeout(100)
    ok("typing a title clears the error state",await pg.evaluate("document.querySelector('#aTitle').getAttribute('aria-invalid')")=="false" and not await pg.is_disabled("#aAssign"))
    # layering: a dialog opened from inside the editor must sit above it, and menus above dialogs
    await pg.select_option("#aTopic","__new"); await pg.wait_for_timeout(300)
    ok("Create topic from the editor opens above it, and is clickable",
       await pg.evaluate("""(()=>{const i=document.querySelector('#topicName');if(!i)return false;
         const r=i.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===i})()"""))
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
    await pg.click("#edClose"); await pg.wait_for_timeout(200)
    for menu_id,name,checks in (("#mQuestion","Question","answer"),("#mMaterial","Material","rail"),("#mQuiz","Quiz assignment","quiz")):
        await pg.click("#createBtn"); await pg.click(menu_id); await pg.wait_for_timeout(250)
        v=await pg.evaluate("""(()=>({title:document.querySelector('#edT').textContent,
          answer:!!document.querySelector('#qType'),checks:document.querySelectorAll('.qopts .cbrow').length,
          rail:[...document.querySelectorAll('.ed-side .k')].map(e=>e.textContent.trim()),
          quiz:!!document.querySelector('.quizrow'),importing:!!document.querySelector('#qImport')}))()""")
        if checks=="answer": ok("Question adds an answer type and its two checkboxes",v["title"]=="Question" and v["answer"] and v["checks"]==2,str(v))
        if checks=="rail": ok("Material drops Points, Due and Rubric",v["title"]=="Material" and v["rail"]==["For","Assign to","Topic"],str(v))
        if checks=="quiz": ok("Quiz attaches a Blank Quiz and offers grade importing",v["quiz"] and v["importing"],str(v))
        await pg.click("#edClose"); await pg.wait_for_timeout(200)
    await pg.click("#createBtn"); await pg.click("#mTopic")
    ok("topic Add disabled when empty",await pg.is_disabled("#topicAdd"))
    await pg.fill("#topicName","   "); ok("topic Add disabled for spaces",await pg.is_disabled("#topicAdd"))
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
    ok("dialog Escape returns focus to Create",await pg.evaluate("document.activeElement.id")=="createBtn")
    await pg.click("#createBtn"); await pg.click("#mTopic"); await pg.fill("#topicName","Week 1"); await pg.click("#topicAdd")
    await pg.click("#createBtn"); await pg.click("#mAssignment")
    ok("Assign disabled without title",await pg.is_disabled("#aAssign"))
    opts=await pg.eval_on_selector_all("#aTopic option","els=>els.map(e=>e.textContent)")
    ok("topic selector from state, with Create topic last",opts==["No topic","Week 1","Create topic"],str(opts))
    await pg.fill("#aTitle","Introduce yourself"); await pg.select_option("#aTopic",label="Week 1"); await pg.click("#aAssign")
    s=await cl(); ok("assignment filed under Week 1",s["assignments"][0]["topicId"]==s["topics"][0]["id"])
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
    aid=[a for a in (await cl())["assignments"] if a["title"]=="Loose C"][0]["id"]
    await pg.click(f'[data-item-menu="{aid}"]'); await pg.click("#mMove"); await pg.select_option("#moveTopic",label="Week 1"); await pg.click("#moveGo")
    ok("move to topic",[a for a in (await cl())["assignments"] if a["id"]==aid][0]["topicId"] is not None)
    # editing an assignment and changing its topic in one commit is one logged action
    l0=await lg()
    await pg.click(f'[data-item-menu="{aid}"]'); await pg.click(".menu [role=menuitem]")
    await pg.fill("#aTitle","Loose C renamed"); await pg.select_option("#aTopic",label="No topic"); await pg.click("#aAssign")
    l1=await lg()
    ok("edit that also changes topic counts once",(l1["assignmentsEdited"]+l1["assignmentsMoved"])-(l0["assignmentsEdited"]+l0["assignmentsMoved"])==1,
       f'edited {l0["assignmentsEdited"]}->{l1["assignmentsEdited"]}, moved {l0["assignmentsMoved"]}->{l1["assignmentsMoved"]}')
    ok("summary total matches actions",[a for a in (await cl())["assignments"] if a["id"]==aid][0]["topicId"] is None)
    # the Stream shows posted work as a condensed notification, and the setting can change that
    await pg.click("#tab-stream"); await pg.wait_for_timeout(200)
    ok("posting work adds a condensed notification to the Stream",
       "posted a new assignment" in await pg.inner_text(".cpost") and len(await pg.query_selector_all(".cpost"))>=1)
    ok("announcements stay full cards",len(await pg.query_selector_all(".post"))>=1)
    await pg.click("#tbSettings"); await pg.wait_for_timeout(250)
    ok("class settings is a full-screen dialog with Save disabled until dirty",
       await pg.is_visible(".cset") and await pg.is_disabled("#csSave"))
    await pg.check("input[name=csStream][value=hidden]"); await pg.wait_for_timeout(100)
    ok("changing a setting enables Save",not await pg.is_disabled("#csSave"))
    await pg.click("#csSave"); await pg.wait_for_timeout(250)
    ok("hiding classwork notifications clears them from the Stream",len(await pg.query_selector_all(".cpost"))==0)
    await pg.click("#tbSettings"); await pg.wait_for_timeout(200)
    await pg.check("input[name=csStream][value=condensed]"); await pg.click("#csSave"); await pg.wait_for_timeout(250)
    # PEOPLE
    await pg.click("#tab-people"); await pg.wait_for_timeout(100)
    ok("People intro shows on first visit",await pg.is_visible(".dlg.tabcard")); await pg.click("#introOk")
    await pg.click("#inviteBtn"); await pg.fill("#invEmail","not-an-email"); await pg.click("#invSubmit")
    ok("invalid email rejected",len((await cl())["teachers"])==1 and await pg.get_attribute("#invEmail","aria-invalid")=="true")
    await pg.fill("#invEmail","tutor@example.com"); await pg.click("#invSubmit")
    s=await cl(); ok("co-teacher pending",s["teachers"][1]["status"]=="pending" and "Pending" in await pg.inner_text("#panel"))
    ok("owner has no remove control",await pg.evaluate("!document.querySelector('.prow .b-owner').parentElement.querySelector('[data-teacher-menu]')"))
    # PEOPLE: invite students (SPEC §6.8)
    ok("empty roster offers Invite students and the practice shortcut",
       "Add students to this class" in await pg.inner_text("#panel") and await pg.is_visible("#peopleInvite") and await pg.is_visible("#peopleAdd"))
    await pg.click("#peopleInvite"); await pg.wait_for_timeout(250)
    inv=await pg.evaluate("""(()=>({title:document.querySelector('#cdT').textContent,
      link:document.querySelector('#invUrl').textContent,contacts:document.querySelectorAll('.contact').length,
      disabled:document.querySelector('#invGo').disabled}))()""")
    ok("invite dialog shows the invite link and a contact list",inv["title"]=="Invite students" and inv["link"].startswith("https://classroom.google.com/c/")
       and "?cjc=" in inv["link"] and inv["contacts"]>=4 and inv["disabled"],str(inv))
    await pg.fill("#invSearch","ada"); await pg.wait_for_timeout(150)
    ok("the search field filters the contacts",len(await pg.query_selector_all(".contact"))==1)
    await pg.fill("#invSearch",""); await pg.wait_for_timeout(150)
    await pg.click(".contact >> nth=0"); await pg.click(".contact >> nth=1"); await pg.wait_for_timeout(150)
    ok("Invite enables once people are picked",not await pg.is_disabled("#invGo"))
    await pg.click("#invGo"); await pg.wait_for_timeout(300)
    st_c=await cl()
    ok("invited students arrive as Invited, not Active",len(st_c["students"])==2 and all(x["status"]=="invited" for x in st_c["students"]),str(st_c["students"]))
    ok("the roster shows the Invited badge","Invited" in await pg.inner_text("#panel"))
    sid0=st_c["students"][0]["id"]
    await pg.click(f'[data-student-menu="{sid0}"]'); await pg.wait_for_timeout(150)
    await pg.click(".menu [role=menuitem] >> nth=0"); await pg.wait_for_timeout(250)
    ok("the practice shortcut accepts an invitation",(await cl())["students"][0]["status"]=="active")
    for s_id in [x["id"] for x in (await cl())["students"]]:
        await pg.click(f'[data-student-menu="{s_id}"]'); await pg.click('.menu [role=menuitem]:last-child'); await pg.wait_for_timeout(200)
    ok("removing them empties the roster again",len((await cl())["students"])==0)
    await pg.click("#peopleAdd"); ok("Add student disabled when empty",await pg.is_disabled("#stuSubmit"))
    await pg.fill("#stuName","Ada Okafor"); await pg.click("#stuSubmit")
    ok("student added, headcount 1",len((await cl())["students"])==1 and "1 student" in await pg.inner_text("#headcount"))
    sid=(await cl())["students"][0]["id"]
    await pg.click(f'[data-student-menu="{sid}"]'); await pg.click(".menu [role=menuitem]")
    ok("student removed, roster back to empty",len((await cl())["students"])==0 and "0 students" in await pg.inner_text("#headcount"))
    # GRADES, the fourth tab (needs a student on the roster and work to mark)
    await pg.click("#tab-people"); await pg.wait_for_timeout(200)
    await pg.click("#addStudentBtn"); await pg.fill("#stuName","Chidi Nwosu"); await pg.click("#stuSubmit"); await pg.wait_for_timeout(250)
    await pg.click("#tab-grades"); await pg.wait_for_timeout(250)
    ok("Grades shows its table once there are students and work",await pg.is_visible("table.grades"))
    grades=await pg.evaluate("""(()=>({cols:[...document.querySelectorAll('table.grades thead th')].length,
      rows:document.querySelectorAll('table.grades tbody tr').length,
      unmarked:document.querySelectorAll('.nomark').length}))()""")
    ok("every student has an unmarked cell for each piece of work",grades["rows"]>=1 and grades["cols"]>=2 and grades["unmarked"]>=1,str(grades))
    # THE OTHER VIEWS (phase 5): they are views over the classes that exist
    await pg.click("#brandLink"); await pg.wait_for_timeout(250)
    home=await pg.evaluate("""(()=>({sections:[...document.querySelectorAll('.home .scard h2')].map(h=>h.textContent),
      cards:document.querySelectorAll('.ccard').length,menu:!!document.querySelector('[data-card-menu]'),
      due:document.querySelector('.cbody .due')?document.querySelector('.cbody .due').textContent:null}))()""")
    ok("Home (Teaching) shows Recently due and Classes",home["sections"]==["Recently due","Classes"] and home["cards"]==1 and home["menu"],str(home))
    ok("the class card carries its due line",home["due"] in ("No work due soon","Woohoo, no work due soon!"),str(home))
    for nav,expect in (("Calendar","Calendar"),("To review","To review"),("Archived classes","Archived classes"),("Settings","Settings")):
        await pg.click(f'#drawer [data-nav="{nav}"]'); await pg.wait_for_timeout(250)
        ok(f"{nav} is a real screen",expect in await pg.inner_text(".vbody, .viewpage"))
    await pg.click('#drawer [data-nav="To review"]'); await pg.wait_for_timeout(250)
    ok("To review has its two tabs",len(await pg.query_selector_all('[data-vtab]'))==2)
    await pg.click('#drawer [data-nav="Settings"]'); await pg.wait_for_timeout(200)
    sw=await pg.evaluate("""(()=>{const s=document.querySelector('.sw');const r=s.getBoundingClientRect();
      return {w:Math.round(r.width),h:Math.round(r.height),groups:document.querySelectorAll('.notegrp').length}})()""")
    ok("Settings has the notification groups with 52x32 switches",sw["w"]==52 and sw["h"]==32 and sw["groups"]==5,str(sw))
    # archive a class from its card menu, find it under Archived, restore it
    await pg.click("#brandLink"); await pg.wait_for_timeout(200)
    await pg.click("[data-card-menu]"); await pg.wait_for_timeout(150)
    await pg.click('.menu [role=menuitem]:last-child'); await pg.wait_for_timeout(200)
    await pg.click("#arGo"); await pg.wait_for_timeout(300)
    ok("archiving takes the class out of Home",len(await pg.query_selector_all(".ccard"))==0)
    await pg.click('#drawer [data-nav="Archived classes"]'); await pg.wait_for_timeout(250)
    ok("the archived class is listed under Archived classes",len(await pg.query_selector_all(".ccard"))==1)
    await pg.click("[data-card-menu]"); await pg.click('.menu [role=menuitem]'); await pg.wait_for_timeout(300)
    ok("restoring puts it back on Home",len(await pg.query_selector_all(".ccard"))==1 and await pg.evaluate("!document.querySelector('#main').textContent.includes('None of your classes')"))
    await pg.click("#drawer [data-class]"); await pg.wait_for_timeout(250)   # back into the class
    await pg.click("#tab-people"); await pg.wait_for_timeout(200)   # the class code control lives on People
    codes=set();prev=(await cl())["code"];same=False
    for i in range(40):
        await pg.click("#regenBtn"); c=(await cl())["code"]; same|=(c==prev); prev=c
    ok("regenerate never repeats previous code",not same)
    # tab switching retains state
    await pg.click("#tab-stream"); ok("stream posts retained",len(await pg.query_selector_all(".post"))==1)
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
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)   # close the composer the guide opened
    await pg.click("#dWatch"); await pg.wait_for_timeout(200); await pg.keyboard.press("Escape")
    ok("walkthrough doesn't alter state",json.dumps(await st())==before)
    # summary
    await pg.click("#dEnd"); await pg.wait_for_timeout(200)
    t=await pg.inner_text("#summary")
    ok("summary says Not a score","Not a score" in t)
    ok("summary separates current vs actions","Your class right now" in t and "Actions you tried" in t)
    l=await lg(); ok("log counts committed actions",l["postsCreated"]==2 and l["postsRemoved"]==1 and l["topicsCreated"]==1 and l["assignmentsCreated"]==4 and l["invitesSent"]==1 and l["studentsAdded"]==2 and l["studentsRemoved"]==3 and l["studentsInvited"]==2 and l["invitesAccepted"]==1,str(l))
    await pg.click("#sc-people-2"); await pg.fill("#transfer","Create topics before posting.")
    await pg.click("[data-cont='classwork']")
    ok("continue returns with state",len((await cl())["assignments"])==4 and await pg.evaluate("document.querySelector('#tab-classwork').getAttribute('aria-selected')")=="true")
    await pg.click("#dEnd"); await pg.click("#sumFinish")
    ok("finish shows transfer sentence","Create topics before posting." in await pg.inner_text("#finish"))
    await pg.click("#finAgain"); await pg.wait_for_timeout(300); s=await st(); l=await lg()
    ok("reset clears the sandbox and returns to the role picker",await pg.is_visible("#role") and s["classes"]==[] and s["user"]["role"] is None and s["flags"]["unfiledNudgeShown"]==False,str(s))
    ok("reset clears log",l["postsCreated"]==0 and l["invitesSent"]==0 and l["codeRegenerations"]==0)
    # JOIN A CLASS AS A STUDENT (SPEC §6.9) and the student's view of it
    await pg.click("#roleStudent"); await pg.wait_for_timeout(250)
    await pg.click("#homeCreate"); await pg.wait_for_timeout(250)
    ok("student Home offers Join class","Join class" in await pg.inner_text("#cdT"))
    ok("Join is disabled until a code is typed",await pg.is_disabled("#jcJoin"))
    await pg.fill("#jcCode","ab1"); await pg.click("#jcJoin"); await pg.wait_for_timeout(150)
    ok("a code under 5 characters is rejected",await pg.get_attribute("#jcCode","aria-invalid")=="true" and (await st())["classes"]==[])
    await pg.fill("#jcCode","zk4m9q"); await pg.click("#jcJoin"); await pg.wait_for_timeout(400)
    c=await cl()
    ok("joining puts the learner in the class as a student",c["role"]=="student" and c["code"]=="ZK4M9Q" and len(c["posts"])==1)
    ok("students get no composer, Create or invite controls",
       not await pg.query_selector("#annOpen") and not await pg.query_selector("#createBtn") and not await pg.query_selector("#addStudentBtn"))
    await pg.click(f'[data-post-menu="{c["posts"][0]["id"]}"]'); await pg.wait_for_timeout(100)
    items=await pg.eval_on_selector_all(".menu [role=menuitem]","els=>els.map(e=>e.textContent)")
    ok("a student cannot edit or delete the teacher's post",not any("Delete" in i or "Edit" in i for i in items),str(items))
    await pg.keyboard.press("Escape")
    ok("no localStorage used",await pg.evaluate("localStorage.length")==0)
    ok("no JS errors",not errs,str(errs))
    await b.close()
asyncio.run(main())
for r in res: print(*r)
print(sum(r[0]=="PASS" for r in res),"/",len(res))
