(function(){
"use strict";
/* =====================================================================
   The Sandbox Class — EDU 101
   One central in-memory sandbox state (S) + separate practice log (L).
   No backend, no storage, no network. Refresh or Reset = fresh sandbox.
   ===================================================================== */
const ICONS=/*@@ICONS@@*/{};
const VIDEO_SRC="/*@@VIDEO@@*/";
const VIDEO_WEBM="/*@@WEBM@@*/";
const CUES=/*@@CUES@@*/[];

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const I=(n,c="")=>`<span class="ms ${c}" aria-hidden="true">${ICONS[n]?String.fromCodePoint(parseInt(ICONS[n],16)):""}</span>`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const excerpt=(s,n=36)=>{s=String(s).replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s};
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const reduceMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- class code ---------------- */
const ALPH="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(prev){let c;do{c="";for(let i=0;i<6;i++){c+=ALPH[Math.floor(Math.random()*ALPH.length)];if(i===2)c+="-"}}while(c===prev);return c}
function spellCode(c){return c.replace("-"," dash ").split("").join(" ").replace(/ +/g," ")}

/* ---------------- state ---------------- */
let S,L,UI,seq;
const nid=p=>p+(++seq);
function seed(){
  seq=0;
  S={
    cls:{name:"EDU 101",section:"Sandbox Class"},
    posts:[{id:"post-welcome",author:"Miva Learning Team",when:"Sep 15",edited:false,protected:true,
      text:"Welcome to EDU 101! This sandbox class is yours to practise in. Post, organise, invite and reset as often as you like. Nothing here reaches a real student."}],
    topics:[],        // {id,name}
    assignments:[],   // {id,title,instructions,topicId|null,edited}
    teachers:[{id:"t-owner",name:"You",email:"",status:"owner"}],
    students:[{id:nid("u"),name:"Amina Bello",placeholder:true},{id:nid("u"),name:"Tobi Adeyemi",placeholder:true}],
    classCode:genCode(null),
    flags:{unfiledNudgeShown:false}
  };
  L={tabsVisited:[],tabOpens:{stream:0,classwork:0,people:0},
     postsCreated:0,postsEdited:0,postsRemoved:0,
     topicsCreated:0,topicsRenamed:0,topicsRemoved:0,
     assignmentsCreated:0,createdFiled:0,createdUnfiled:0,assignmentsEdited:0,assignmentsMoved:0,assignmentsRemoved:0,
     nudgeShown:false,
     invitesSent:0,invitesCancelled:0,studentsAdded:0,studentsRemoved:0,codeRegenerations:0};
  UI={view:"class",tab:"stream",composerOpen:false,draft:"",editingPost:null,editDraft:"",nudgeVisible:false,
      enrolledOpen:true,self:{},transfer:"",placeholder:null};
}
seed();
const unfiled=()=>S.assignments.filter(a=>!a.topicId);
const inTopic=id=>S.assignments.filter(a=>a.topicId===id);
const pendingTeachers=()=>S.teachers.filter(t=>t.status==="pending");

/* ---------------- feedback ---------------- */
function announce(m){const l=$("#live");l.textContent="";setTimeout(()=>{l.textContent=m},40)}
let snackT;
function snack(m){$$(".snack").forEach(s=>s.remove());const d=document.createElement("div");d.className="snack";d.setAttribute("role","status");d.textContent=m;document.body.appendChild(d);clearTimeout(snackT);snackT=setTimeout(()=>d.remove(),4000);announce(m)}

/* ---------------- event bus (guided practice listens) ---------------- */
function emit(e){Guide.on(e)}

/* ======================================================================
   SCREENS
   ====================================================================== */
function showScreen(name){
  $("#welcome").hidden=name!=="welcome";
  $("#shell").hidden=name!=="shell";
  $("#dock").hidden=name!=="shell";
  $("#summary").hidden=name!=="summary";
  $("#finish").hidden=name!=="finish";
  if(name!=="shell")Guide.exit(true);
}
$("#beginBtn").onclick=()=>{showScreen("shell");openClass("stream");focusTab()};
$("#welcomeWatch").onclick=e=>openPlayer(e.currentTarget);

/* ======================================================================
   CLASSROOM SHELL
   ====================================================================== */
function renderAll(){renderDrawer();renderTop();renderMain()}
function renderTop(){
  const c=$("#crumb");
  const t=UI.view==="class"?S.cls.name:UI.view==="placeholder"?UI.placeholder:"";
  c.innerHTML=t?`${I("chevron_right")}<span class="t">${esc(t)}</span>`:"";
  $("#topact").innerHTML=UI.view==="home"?`<button class="ib" id="plusBtn" aria-label="Create or join a class" aria-haspopup="menu" aria-expanded="false">${I("add")}</button>`:"";
  const pb=$("#plusBtn");
  if(pb)pb.onclick=e=>{e.stopPropagation();openMenu(pb,[{label:"Join class",fn:()=>notInPractice(pb)},{label:"Create class",fn:()=>notInPractice(pb)}],{alignRight:true})};
}
function notInPractice(trigger){simDialog(`<div class="hd"><div><span class="eb">Practice note</span><h2 id="sdT">EDU 101 is already set up for you</h2></div></div>
  <div class="bd"><p>Joining or creating classes isn't part of this practice. Open EDU 101 to practise Stream, Classwork and People.</p>
  <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button class="simbtn ghost" data-close>Close</button><button class="simbtn" id="goEdu">${I("arrow_forward")}Open EDU 101</button></div></div>`,
  (d,close)=>{d.querySelector("#goEdu").onclick=()=>{close(true);openClass("stream")}},trigger)}
$("#brandLink").onclick=e=>{e.preventDefault();goHome()};
$("#hamb").onclick=()=>{
  if(matchMedia("(max-width:1023px)").matches){document.body.classList.toggle("drawer-open");$("#hamb").setAttribute("aria-expanded",document.body.classList.contains("drawer-open"))}
  else{document.body.classList.toggle("rail");$("#hamb").setAttribute("aria-expanded",!document.body.classList.contains("rail"))}
};
function closeMobileDrawer(){document.body.classList.remove("drawer-open")}
function renderDrawer(){
  const act=k=>{if(UI.view==="home"&&k==="home")return"act";if(UI.view==="class"&&k==="edu")return"act";if(UI.view==="placeholder"&&UI.placeholder===k)return"act";return""};
  $("#drawer").innerHTML=`
   <button class="ni ${act("home")}" data-nav="home" ${act("home")?'aria-current="page"':""}>${I("home",act("home")?"fill":"")}<span class="lbl">Home</span></button>
   <button class="ni ${act("Calendar")}" data-nav="Calendar">${I("calendar_today")}<span class="lbl">Calendar</span></button>
   <div class="gap"></div>
   <button class="ni hdr" id="teachHdr" aria-expanded="${UI.enrolledOpen}">${I("group")}<span class="lbl">Teaching</span>${I(UI.enrolledOpen?"expand_less":"expand_more","chev")}</button>
   <div class="sub" ${UI.enrolledOpen?"":"hidden"}>
     <button class="ni ${act("To review")}" data-nav="To review">${I("checklist")}<span class="lbl">To review</span></button>
     <button class="ni ${act("edu")}" data-nav="edu" ${act("edu")?'aria-current="page"':""}><span class="ltr" aria-hidden="true">E</span><span class="lbl">EDU 101</span></button>
   </div>
   <div class="gap"></div>
   <button class="ni ${act("Archived classes")}" data-nav="Archived classes">${I("archive")}<span class="lbl">Archived classes</span></button>
   <button class="ni ${act("Settings")}" data-nav="Settings">${I("settings")}<span class="lbl">Settings</span></button>`;
  $$("#drawer [data-nav]").forEach(b=>b.onclick=()=>{closeMobileDrawer();const n=b.dataset.nav;if(n==="home")goHome();else if(n==="edu")openClass(UI.tab||"stream");else{UI.view="placeholder";UI.placeholder=n;renderAll();$("#main").focus()}});
  $("#teachHdr").onclick=()=>{UI.enrolledOpen=!UI.enrolledOpen;renderDrawer();$("#teachHdr").focus()};
}
function goHome(){UI.view="home";renderAll();$("#main").focus()}
function openClass(tab){UI.view="class";setTab(tab||"stream",true);renderDrawer();renderTop()}
$("#main").addEventListener("scroll",()=>$("#topbar").classList.toggle("scrolled",$("#main").scrollTop>4));

function renderMain(){
  const m=$("#main");
  if(UI.view==="home")return renderHome(m);
  if(UI.view==="placeholder"){m.innerHTML=`<div class="sheet"><div class="placeholder-page">${I("explore")}<b>${esc(UI.placeholder)} isn't part of this practice</b>This sandbox focuses on the Stream, Classwork and People tabs in EDU 101.<div style="margin-top:20px"><button class="fb" id="phGo">Open EDU 101</button></div></div></div>`;$("#phGo").onclick=()=>openClass("stream");return}
  renderClass(m);
}

/* ---------------- Home (reference-backed: Home screenshot) ---------------- */
function renderHome(m){
  m.innerHTML=`<div class="home"><section class="scard" aria-labelledby="clsH"><div class="shead"><h2 id="clsH">Classes</h2></div>
   <ul class="grid"><li class="ccard"><div class="cban"><canvas class="cvs" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%"></canvas><a href="#" id="cardLink" style="position:relative">${esc(S.cls.name)}</a><div style="position:relative">${esc(S.cls.section)}</div></div>
   <span class="cav" aria-hidden="true">Y</span><div class="cbody"></div>
   <div class="cfoot"><button class="ib" aria-label="Open Classwork for EDU 101" id="cardCw">${I("assignment_ind")}</button><button class="ib" aria-label="Open People for EDU 101" id="cardPpl">${I("group")}</button></div></li></ul></section></div>`;
  paintBanners();
  $("#cardLink").onclick=e=>{e.preventDefault();openClass("stream")};
  $("#cardCw").onclick=()=>openClass("classwork");$("#cardPpl").onclick=()=>openClass("people");
}

/* ---------------- banner art (generic, no Google illustration) ---------------- */
function paintBanners(){$$("canvas.cvs").forEach(c=>{const r=c.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,r.width*dpr);c.height=Math.max(1,r.height*dpr);const x=c.getContext("2d");x.scale(dpr,dpr);const w=r.width,h=r.height;
  const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,"#1A4A8C");g.addColorStop(1,"#2F6BC4");x.fillStyle=g;x.fillRect(0,0,w,h);
  x.globalAlpha=.16;x.fillStyle="#fff";const u=h/240;
  [[.78,.30,90],[.93,.85,120],[.62,.95,54]].forEach(([a,b,rad])=>{x.beginPath();x.arc(w*a,h*b,rad*u*1.4,0,Math.PI*2);x.fill()});
  x.globalAlpha=.22;x.strokeStyle="#fff";x.lineWidth=2*u;for(let i=0;i<5;i++){x.beginPath();x.moveTo(w*.55+i*22*u,h);x.lineTo(w*.70+i*22*u,h*.2);x.stroke()}
  x.globalAlpha=1})}
window.addEventListener("resize",()=>{paintBanners();Guide.place()});

/* ---------------- Class view with semantic tabs ---------------- */
const TABS=[["stream","Stream"],["classwork","Classwork"],["people","People"]];
function renderClass(m){
  m.innerHTML=`<div class="sheet"><div class="ctabs" role="tablist" aria-label="EDU 101">${TABS.map(([k,l])=>`<button class="ctab" role="tab" id="tab-${k}" data-tab="${k}" aria-selected="${UI.tab===k}" aria-controls="panel" tabindex="${UI.tab===k?0:-1}">${l}</button>`).join("")}</div>
   <div class="col" id="panel" role="tabpanel" aria-labelledby="tab-${UI.tab}"></div></div>`;
  $$(".ctab").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $(".ctabs").addEventListener("keydown",e=>{const i=TABS.findIndex(t=>t[0]===UI.tab);let n=null;if(e.key==="ArrowRight")n=(i+1)%3;if(e.key==="ArrowLeft")n=(i+2)%3;if(e.key==="Home")n=0;if(e.key==="End")n=2;if(n!==null){e.preventDefault();setTab(TABS[n][0]);focusTab()}});
  renderPanel();
}
function focusTab(){const t=$("#tab-"+UI.tab);t&&t.focus()}
function setTab(t,silent){
  if(UI.view!=="class"){UI.view="class";renderDrawer();renderTop()}
  if(t!==UI.tab)UI.nudgeVisible=false;
  UI.tab=t;
  if(!L.tabsVisited.includes(t))L.tabsVisited.push(t);
  L.tabOpens[t]++;
  renderClass($("#main"));
  emit("tab:"+t);
  if(!silent)announce(`${TABS.find(x=>x[0]===t)[1]} tab selected.`);
  maybeIntro(t);
}
function renderPanel(){({stream:renderStream,classwork:renderClasswork,people:renderPeople})[UI.tab]($("#panel"))}

/* ======================================================================
   STREAM
   ====================================================================== */
function renderStream(p,freshId){
  p.innerHTML=`<section class="banner" aria-label="Class banner"><canvas class="cvs" aria-hidden="true"></canvas><h1>${esc(S.cls.name)}</h1><div class="secn">${esc(S.cls.section)}</div></section>
  <div class="slay">
   <div class="lcol">
    <section class="lcard" aria-labelledby="ccH"><h3 id="ccH">Class code<button class="ib" id="codeMenu" aria-label="Class code options" aria-haspopup="menu" aria-expanded="false">${I("more_vert")}</button></h3>
      <div class="codebig" id="streamCode">${esc(S.classCode)}</div></section>
    <section class="lcard" aria-labelledby="upH"><h3 id="upH">Upcoming</h3><p>No work due soon</p><div class="va"><button class="tb" id="viewAll" style="padding:0 8px">View all</button></div></section>
   </div>
   <div class="feed">
    <div class="composer">${UI.composerOpen?`
     <form class="open" id="annForm" aria-label="New announcement">
      <div class="forrow"><span class="lab">For</span><span class="chipsel" aria-label="For EDU 101">EDU 101${I("arrow_drop_down")}</span><span class="chipsel" aria-label="All students">${I("group")}All students</span></div>
      <div class="ta-wrap"><label for="annText">Announce something to your class</label><textarea id="annText" aria-describedby="annHint">${esc(UI.draft)}</textarea></div>
      <div class="crow"><span class="hint" id="annHint">${UI.draft.trim()?"Ready to post.":"Post becomes available when your announcement has text."}</span>
       <button type="button" class="tb" id="annCancel">Cancel</button><button type="submit" class="fb" id="annPost" ${UI.draft.trim()?"":"disabled"}>Post</button></div>
     </form>`:`
     <button class="collapsed" id="annOpen"><span class="avatar" aria-hidden="true" style="width:40px;height:40px">Y</span>Announce something to your class</button>`}
    </div>
    ${S.posts.map(post=>postCard(post,post.id===freshId)).join("")}
   </div></div>`;
  paintBanners();
  $("#viewAll").onclick=()=>snack("No work is due in EDU 101.");
  $("#codeMenu").onclick=e=>{e.stopPropagation();openMenu($("#codeMenu"),[{icon:"content_copy",label:"Copy class code",fn:()=>snack("Class code copied (simulated).")},{icon:"autorenew",label:"Regenerate class code",fn:()=>regenerate($("#codeMenu"))}])};
  const ao=$("#annOpen");if(ao)ao.onclick=()=>{UI.composerOpen=true;renderStream(p);$("#annText").focus();emit("composer:open")};
  const f=$("#annForm");
  if(f){const ta=$("#annText");
    ta.oninput=()=>{UI.draft=ta.value;const ok=!!ta.value.trim();$("#annPost").disabled=!ok;$("#annHint").textContent=ok?"Ready to post.":"Post becomes available when your announcement has text.";if(ok)emit("composer:text")};
    $("#annCancel").onclick=()=>{UI.composerOpen=false;UI.draft="";renderStream(p);$("#annOpen").focus();emit("composer:cancel")};
    f.onsubmit=e=>{e.preventDefault();const t=ta.value.trim();if(!t)return;const id=nid("post-");
      S.posts.unshift({id,author:"You",when:"Just now",edited:false,protected:false,text:t});L.postsCreated++;UI.draft="";UI.composerOpen=false;
      renderStream(p,id);$("#annOpen").focus();snack("Posted to Stream.");emit("post:created")};
  }
  // inline post editing
  const ef=$("#editForm");
  if(ef){const ta=$("#editText");ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
    ta.oninput=()=>{UI.editDraft=ta.value;$("#editSave").disabled=!ta.value.trim()};
    $("#editCancel").onclick=()=>{const id=UI.editingPost;UI.editingPost=null;renderStream(p);const b=document.querySelector(`[data-post-menu="${id}"]`);b&&b.focus()};
    ef.onsubmit=e=>{e.preventDefault();const t=ta.value.trim();if(!t)return;const post=S.posts.find(x=>x.id===UI.editingPost);post.text=t;post.edited=true;L.postsEdited++;const id=post.id;UI.editingPost=null;renderStream(p);const b=document.querySelector(`[data-post-menu="${id}"]`);b&&b.focus();snack("Post updated.");emit("post:edited")};
  }
  $$("[data-post-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const post=S.posts.find(x=>x.id===b.dataset.postMenu);
    const items=post.protected?[{icon:"content_copy",label:"Copy link",fn:()=>snack("Link copied (simulated).")}]
      :[{icon:"edit",label:"Edit",id:"mEditPost",fn:()=>{UI.editingPost=post.id;UI.editDraft=post.text;renderStream(p)}},{icon:"delete",label:"Delete",id:"mDeletePost",fn:()=>removePost(post,p)},"-",{icon:"content_copy",label:"Copy link",fn:()=>snack("Link copied (simulated).")}];
    openMenu(b,items);emit("postmenu:open")});
}
function postCard(post,fresh){
  const editing=UI.editingPost===post.id;
  return `<article class="post ${fresh?"fresh":""}" aria-labelledby="ph-${post.id}" data-post="${post.id}">
   <div class="post-h"><span class="av" style="background:${post.protected?"#1E8E3E":"#5C6BC0"}" aria-hidden="true">${post.protected?"M":"Y"}</span>
    <div class="meta"><div class="who" id="ph-${post.id}">${esc(post.author)}${post.protected?`<span class="simtag" style="margin-left:8px">${I("lock")}Protected welcome post</span>`:""}</div><div class="when">${esc(post.when)}${post.edited?" (Edited)":""}</div></div>
    <button class="ib" data-post-menu="${post.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Options for post: ${esc(excerpt(post.text))}">${I("more_vert")}</button></div>
   ${editing?`<form id="editForm" style="padding:16px 24px 20px"><div class="ta-wrap"><label for="editText">Edit announcement</label><textarea id="editText">${esc(UI.editDraft)}</textarea></div>
     <div class="crow"><button type="button" class="tb" id="editCancel">Cancel</button><button class="fb" id="editSave" ${UI.editDraft.trim()?"":"disabled"}>Save</button></div></form>`
    :`<div class="post-b">${esc(post.text)}</div>`}
  </article>`;
}
function removePost(post,p){S.posts=S.posts.filter(x=>x!==post);L.postsRemoved++;if(UI.editingPost===post.id)UI.editingPost=null;renderStream(p);($("#annOpen")||$("#annText")).focus();snack("Post deleted.");emit("post:removed")}

/* ======================================================================
   CLASSWORK
   ====================================================================== */
function renderClasswork(p){
  const unf=unfiled(),any=S.topics.length||S.assignments.length;
  p.innerHTML=`<div class="cwbar"><button class="create" id="createBtn" aria-haspopup="menu" aria-expanded="false">${I("add")}Create</button></div>
   ${UI.nudgeVisible?`<div class="nudge" id="nudge" role="status">${I("lightbulb")}<p><b>Getting crowded?</b> Items filed under a topic are much easier for students to find than a long unfiled list.</p><button id="nudgeOk">Dismiss</button></div>`:""}
   ${!any?`<div class="cw-empty">${EMPTY_CW}<b>This is where you'll assign work</b><span>You can add assignments and other work for the class, then organise it into topics</span></div>`:""}
   ${unf.length?`<section class="topic" aria-labelledby="h-nt"><div class="thead nt"><h2 id="h-nt">No topic</h2><span class="tcount">${plural(unf.length,"item")}</span></div>${unf.map(rowHTML).join("")}</section>`:""}
   ${S.topics.map(t=>{const its=inTopic(t.id);return `<section class="topic" aria-labelledby="h-${t.id}" data-topic="${t.id}"><div class="thead"><h2 id="h-${t.id}">${esc(t.name)}</h2><span class="tcount">${plural(its.length,"item")}</span>
     <button class="ib" data-topic-menu="${t.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Topic options for ${esc(t.name)}">${I("more_vert")}</button></div>
     ${its.length?its.map(rowHTML).join(""):`<div class="empty-t">No work in this topic yet</div>`}</section>`}).join("")}`;
  $("#createBtn").onclick=e=>{e.stopPropagation();openMenu($("#createBtn"),[{icon:"assignment",label:"Assignment",id:"mAssignment",fn:()=>openAssignmentEditor(null,$("#createBtn"))},"-",{icon:"topic",label:"Topic",id:"mTopic",fn:()=>openTopicDialog(null,$("#createBtn"))}]);emit("create:open")};
  const nb=$("#nudgeOk");if(nb)nb.onclick=()=>{UI.nudgeVisible=false;renderClasswork(p);$("#createBtn").focus()};
  $$("[data-topic-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const t=S.topics.find(x=>x.id===b.dataset.topicMenu);
    openMenu(b,[{icon:"edit",label:"Rename",fn:()=>openTopicDialog(t,b)},{icon:"delete",label:"Delete",fn:()=>confirmDeleteTopic(t,b)}],{alignRight:true})});
  $$("[data-item-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const a=S.assignments.find(x=>x.id===b.dataset.itemMenu);
    openMenu(b,[{icon:"edit",label:"Edit",fn:()=>openAssignmentEditor(a,b)},{icon:"drive_file_move",label:"Move to topic",id:"mMove",fn:()=>openMoveDialog(a,b)},{icon:"delete",label:"Delete",fn:()=>{S.assignments=S.assignments.filter(x=>x!==a);L.assignmentsRemoved++;renderClasswork(p);$("#createBtn").focus();snack(`Assignment “${excerpt(a.title,30)}” deleted.`);emit("assign:removed")}}],{alignRight:true});emit("itemmenu:open")});
}
function rowHTML(a){return `<div class="row" data-item="${a.id}"><span class="icon" aria-hidden="true">${I("assignment")}</span><span class="t">${esc(a.title)}</span><span class="d">${a.edited?"Edited":"Posted"} just now</span>
  <button class="ib" data-item-menu="${a.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Options for assignment ${esc(excerpt(a.title))}">${I("more_vert")}</button></div>`}
const EMPTY_CW=`<svg width="240" height="150" viewBox="0 0 240 150" aria-hidden="true"><rect x="40" y="20" width="160" height="110" rx="10" fill="#E9EEF6"/><rect x="58" y="38" width="80" height="10" rx="5" fill="#A8C7FA"/><rect x="58" y="60" width="124" height="8" rx="4" fill="#fff"/><rect x="58" y="76" width="124" height="8" rx="4" fill="#fff"/><rect x="58" y="92" width="90" height="8" rx="4" fill="#fff"/><circle cx="186" cy="118" r="20" fill="#0B57D0"/><path d="M186 108v20M176 118h20" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;

function maybeNudge(){
  if(unfiled().length>=2&&!S.flags.unfiledNudgeShown){S.flags.unfiledNudgeShown=true;L.nudgeShown=true;UI.nudgeVisible=true;return true}
  return false}
function openTopicDialog(topic,trigger){
  cDialog(`<h2 id="cdT">${topic?"Rename topic":"Add topic"}</h2>
   <form id="tForm" novalidate><div class="field of"><input id="topicName" autocomplete="off" maxlength="100" value="${topic?esc(topic.name):""}" aria-describedby="topicHelp"><label for="topicName">Topic</label></div>
   <div class="help" id="topicHelp">Required</div>
   <div class="acts"><button type="button" class="tb" data-close>Cancel</button><button class="tb" id="topicAdd" ${topic?"":"disabled"}>${topic?"Rename":"Add"}</button></div></form>`,
  (d,close)=>{const i=d.querySelector("#topicName"),b=d.querySelector("#topicAdd");i.select();
    i.oninput=()=>{b.disabled=!i.value.trim();if(i.value.trim())emit("topic:text")};
    d.querySelector("#tForm").onsubmit=e=>{e.preventDefault();const n=i.value.trim();if(!n)return;
      if(topic){topic.name=n;L.topicsRenamed++;close();renderPanel();snack(`Topic renamed to “${excerpt(n,30)}”.`);$("#createBtn").focus();return}
      const t={id:nid("topic-"),name:n};S.topics.unshift(t);L.topicsCreated++;close();renderPanel();$("#createBtn").focus();snack(`Topic “${excerpt(n,30)}” created.`);emit("topic:created")}},trigger,()=>emit("topic:cancel"));
  emit("topic:dialog");
}
function confirmDeleteTopic(t,trigger){const n=inTopic(t.id).length;
  cDialog(`<h2 id="cdT">Delete topic?</h2><p>“${esc(t.name)}” will be deleted.${n?` Its ${plural(n,"item")} won't be deleted. They'll move to No topic.`:""}</p>
   <div class="acts"><button class="tb" data-close>Cancel</button><button class="tb" id="delTopic">Delete</button></div>`,
  (d,close)=>{d.querySelector("#delTopic").onclick=()=>{S.assignments.forEach(a=>{if(a.topicId===t.id)a.topicId=null});S.topics=S.topics.filter(x=>x!==t);L.topicsRemoved++;
    const nud=maybeNudge();close(true);renderPanel();$("#createBtn").focus();snack(`Topic deleted.${n?` ${plural(n,"item")} moved to No topic.`:""}`);if(nud)announceNudge()}},trigger)}
function announceNudge(){setTimeout(()=>announce("Getting crowded? Items filed under a topic are much easier for students to find than a long unfiled list."),1400)}
function topicOptions(sel){return `<option value="">No topic</option>${S.topics.map(t=>`<option value="${t.id}" ${sel===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}`}
function openMoveDialog(a,trigger){
  cDialog(`<h2 id="cdT">Move to topic</h2><div class="simnote">${I("info")}<span><b>Practice shortcut.</b> In Classroom you change an assignment's topic by editing it. Both routes work here.</span></div>
   <p style="overflow-wrap:anywhere">${esc(a.title)}</p>
   <form id="mvForm"><div class="field of"><select id="moveTopic">${topicOptions(a.topicId)}</select>${I("arrow_drop_down","dd")}<label for="moveTopic">Topic</label></div>
   <div class="acts"><button type="button" class="tb" data-close>Cancel</button><button class="tb" id="moveGo">Move</button></div></form>`,
  (d,close)=>{d.querySelector("#mvForm").onsubmit=e=>{e.preventDefault();const v=d.querySelector("#moveTopic").value||null;
    if(v===a.topicId){close();return}
    a.topicId=v;L.assignmentsMoved++;const nud=maybeNudge();close(true);renderPanel();$("#createBtn").focus();
    snack(v?`Moved to “${excerpt(S.topics.find(t=>t.id===v).name,30)}”.`:"Moved to No topic.");if(nud)announceNudge();emit("assign:moved")}},trigger);
  emit("move:dialog")}

/* Assignment editor (full-screen, mirrors Classroom's editor; provisional fidelity) */
function openAssignmentEditor(a,trigger){
  closeMenus();
  const ed=document.createElement("div");ed.className="editor";ed.setAttribute("role","dialog");ed.setAttribute("aria-modal","true");ed.setAttribute("aria-labelledby","edT");
  ed.innerHTML=`<form id="aForm" style="display:contents" novalidate>
   <div class="ed-bar"><button type="button" class="ib" id="edClose" aria-label="Close">${I("close")}</button><span class="ic" aria-hidden="true">${I("assignment")}</span><h2 id="edT">Assignment</h2>
    <button class="fb" id="aAssign" ${a?"":"disabled"}>${a?"Save":"Assign"}</button></div>
   <div class="ed-body"><div class="ed-main"><div class="ed-card">
     <div class="filled"><label for="aTitle">Title*</label><input id="aTitle" autocomplete="off" maxlength="150" value="${a?esc(a.title):""}" aria-required="true" aria-describedby="aTitleHelp"></div>
     <div class="help" id="aTitleHelp">*Required</div>
     <div class="filled"><label for="aInstr">Instructions (optional)</label><textarea id="aInstr">${a?esc(a.instructions||""):""}</textarea></div>
   </div></div>
   <aside class="ed-side" aria-label="Assignment details">
     <div class="st"><div class="k">For</div><div class="v">EDU 101${I("arrow_drop_down")}</div></div>
     <div class="st"><div class="k">Assign to</div><div class="v">All students${I("arrow_drop_down")}</div></div>
     <div class="st"><div class="k">Points</div><div class="v">100${I("arrow_drop_down")}</div></div>
     <div class="st"><div class="k">Due</div><div class="v">No due date${I("arrow_drop_down")}</div></div>
     <div><div class="st"><div class="k" id="aTopicK">Topic</div></div><div class="field of" style="margin:0"><select id="aTopic" aria-labelledby="aTopicK">${topicOptions(a?a.topicId:null)}</select>${I("arrow_drop_down","dd")}</div>
      ${S.topics.length?"":`<div class="help" style="margin-left:0;margin-top:8px">No topics yet. Create one from Create › Topic.</div>`}</div>
   </aside></div></form>`;
  document.body.appendChild(ed);
  const ti=ed.querySelector("#aTitle"),as=ed.querySelector("#aAssign"),sel=ed.querySelector("#aTopic");
  ti.focus();
  const close=(done)=>{ed.remove();document.removeEventListener("keydown",esck,true);if(trigger&&document.body.contains(trigger))trigger.focus();else($("#createBtn")||$("#main")).focus();if(!done)emit("assign:cancel")};
  const esck=e=>{if(e.key==="Escape"&&!document.querySelector(".menu")){e.stopPropagation();close()}};document.addEventListener("keydown",esck,true);
  trapFocus(ed);
  ed.querySelector("#edClose").onclick=()=>close();
  ti.oninput=()=>{as.disabled=!ti.value.trim();if(ti.value.trim())emit("assign:title")};
  sel.onchange=()=>emit("assign:topic");
  ed.querySelector("#aForm").onsubmit=e=>{e.preventDefault();const title=ti.value.trim();if(!title){ti.focus();return}
    const topicId=sel.value||null,instructions=ed.querySelector("#aInstr").value;
    /* One commit is one logged action: an edit that also changes the topic counts as an edit only,
       so the summary's "moved or edited" total never double-counts it. */
    if(a){a.title=title;a.instructions=instructions;a.topicId=topicId;a.edited=true;L.assignmentsEdited++}
    else{S.assignments.unshift({id:nid("asg-"),title,instructions,topicId,edited:false});L.assignmentsCreated++;topicId?L.createdFiled++:L.createdUnfiled++}
    const nud=maybeNudge();
    ed.remove();document.removeEventListener("keydown",esck,true);
    if(UI.view!=="class"||UI.tab!=="classwork"){UI.view="class";UI.tab="classwork"}
    renderPanel();$("#createBtn").focus();
    const tn=topicId?S.topics.find(t=>t.id===topicId).name:null;
    snack(a?"Assignment updated.":tn?`Assignment filed under “${excerpt(tn,30)}”.`:"Assignment added to No topic.");
    if(nud)announceNudge();emit(a?"assign:edited":"assign:created")};
  emit("assign:editor");
}

/* ======================================================================
   PEOPLE
   ====================================================================== */
const LA=["#1E8E3E","#8E24AA","#E8710A","#1967D2","#D01884","#12848F","#5F6368"];
const laColor=n=>{let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%997;return LA[h%LA.length]};
function renderPeople(p){
  const n=S.students.length;
  p.innerHTML=`<section aria-labelledby="tH"><div class="ph"><h2 id="tH">Teachers</h2><button class="ib" id="inviteBtn" aria-label="Invite teachers" style="color:var(--pri)">${I("person_add")}</button></div>
   ${S.teachers.map(t=>t.status==="owner"?`<div class="prow"><span class="la" style="background:#5C6BC0" aria-hidden="true">Y</span><div class="n">You<small>Class owner · can't be removed</small></div><span class="badge b-owner">${I("key")}Owner</span><span style="width:44px" aria-hidden="true"></span></div>`
     :`<div class="prow"><span class="la" style="background:#9AA0A6" aria-hidden="true">${esc(t.email[0].toUpperCase())}</span><div class="n">${esc(t.email)}<small>Co-teacher · invitation not accepted yet</small></div><span class="badge b-pending">${I("schedule")}Pending</span>
       <button class="ib" data-teacher-menu="${t.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Options for ${esc(t.email)}">${I("more_vert")}</button></div>`).join("")}
  </section>
  <section aria-labelledby="sH" style="margin-top:24px"><div class="ph"><h2 id="sH">Students</h2><span class="count" id="headcount" aria-live="off">${plural(n,"student")}</span><button class="ib" id="addStudentBtn" aria-label="Add practice student" style="color:var(--pri)">${I("person_add")}</button></div>
   ${n?S.students.map(s=>`<div class="prow"><span class="la" style="background:${laColor(s.name)}" aria-hidden="true">${esc(s.name.trim()[0].toUpperCase())}</span><div class="n">${esc(s.name)}<small>${s.placeholder?"Fictional placeholder student":"Fictional student added by you"}</small></div><span class="badge b-active">${I("check")}Active</span>
     <button class="ib" data-student-menu="${s.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Options for ${esc(s.name)}">${I("more_vert")}</button></div>`).join("")
     :`<div class="empty-t">No students yet. Add a practice student to see the roster change.</div>`}
  </section>
  <section class="codecard" aria-labelledby="pcH"><span class="lbl" id="pcH">Class code</span><span class="codebig" id="peopleCode">${esc(S.classCode)}</span>
   <span class="simtag">${I("science")}Practice shortcut</span><button class="ob" id="regenBtn">${I("autorenew")}Regenerate code</button></section>`;
  $("#inviteBtn").onclick=()=>openInvite($("#inviteBtn"));
  $("#addStudentBtn").onclick=()=>openAddStudent($("#addStudentBtn"));
  $("#regenBtn").onclick=()=>regenerate($("#regenBtn"));
  $$("[data-teacher-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const t=S.teachers.find(x=>x.id===b.dataset.teacherMenu);
    openMenu(b,[{icon:"close",label:"Cancel invitation",fn:()=>{S.teachers=S.teachers.filter(x=>x!==t);L.invitesCancelled++;renderPeople(p);$("#inviteBtn").focus();snack(`Invitation for ${t.email} cancelled.`)}}],{alignRight:true})});
  $$("[data-student-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const s=S.students.find(x=>x.id===b.dataset.studentMenu);
    openMenu(b,[{icon:"person_remove",label:"Remove",fn:()=>{S.students=S.students.filter(x=>x!==s);L.studentsRemoved++;renderPeople(p);$("#addStudentBtn").focus();snack(`Removed ${s.name}. ${plural(S.students.length,"student")} in EDU 101.`);emit("student:removed")}}],{alignRight:true})});
}
function regenerate(trigger){
  const prev=S.classCode;S.classCode=genCode(prev);L.codeRegenerations++;
  if(UI.view==="class")renderPanel();
  const again=$("#regenBtn")||$("#codeMenu")||trigger;again&&again.focus();
  snack(`New class code generated: ${S.classCode}.`);announce(`New class code generated: ${spellCode(S.classCode)}.`);emit("code:regenerated")}
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function openInvite(trigger){
  cDialog(`<h2 id="cdT">Invite teachers</h2><div class="simnote">${I("science")}<span><b>Simulated invitation.</b> No email is sent. The co-teacher stays Pending because nobody can accept it here.</span></div>
   <form id="invForm" novalidate><div class="field of"><input id="invEmail" type="email" inputmode="email" autocomplete="off" placeholder=" " aria-describedby="invHelp"><label for="invEmail">Email address</label></div>
   <div class="help" id="invHelp">For example, tutor@example.com</div>
   <p style="margin-top:16px;color:var(--onv)">Teachers you add can do everything you can, except delete the class.</p>
   <div class="acts"><button type="button" class="tb" data-close>Cancel</button><button class="tb" id="invSubmit" disabled>Invite</button></div></form>`,
  (d,close)=>{const i=d.querySelector("#invEmail"),b=d.querySelector("#invSubmit"),h=d.querySelector("#invHelp");
    const setErr=m=>{if(m){i.setAttribute("aria-invalid","true");h.textContent=m;h.classList.add("err")}else{i.removeAttribute("aria-invalid");h.textContent="For example, tutor@example.com";h.classList.remove("err")}};
    i.oninput=()=>{b.disabled=!i.value.trim();if(i.getAttribute("aria-invalid"))setErr(EMAIL.test(i.value.trim())?"":"Enter a valid email address, such as tutor@example.com.");if(EMAIL.test(i.value.trim()))emit("invite:valid")};
    d.querySelector("#invForm").onsubmit=e=>{e.preventDefault();const v=i.value.trim();
      if(!v)return;
      if(!EMAIL.test(v)){setErr("Enter a valid email address, such as tutor@example.com.");i.focus();return}
      if(S.teachers.some(t=>t.email&&t.email.toLowerCase()===v.toLowerCase())){setErr("This person has already been invited.");i.focus();return}
      S.teachers.push({id:nid("t-"),email:v,status:"pending"});L.invitesSent++;close(true);renderPanel();$("#inviteBtn").focus();snack(`Invite sent to ${v}.`);emit("invite:sent")}},trigger);
  emit("invite:dialog")}
function openAddStudent(trigger){
  cDialog(`<h2 id="cdT">Add practice student</h2><div class="simnote">${I("science")}<span><b>Simplified for practice.</b> In Classroom, students join through an invitation, an invite link or the class code. Here they are added directly and show as Active.</span></div>
   <form id="stuForm" novalidate><div class="field of"><input id="stuName" autocomplete="off" maxlength="60" placeholder=" " aria-describedby="stuHelp"><label for="stuName">Student name</label></div>
   <div class="help" id="stuHelp">Use a fictional name, for example Ada Okafor</div>
   <div class="acts"><button type="button" class="tb" data-close>Cancel</button><button class="tb" id="stuSubmit" disabled>Add</button></div></form>`,
  (d,close)=>{const i=d.querySelector("#stuName"),b=d.querySelector("#stuSubmit");
    i.oninput=()=>{b.disabled=!i.value.trim();if(i.value.trim())emit("student:text")};
    d.querySelector("#stuForm").onsubmit=e=>{e.preventDefault();const v=i.value.trim();if(!v)return;
      S.students.push({id:nid("u"),name:v,placeholder:false});L.studentsAdded++;close(true);renderPanel();$("#addStudentBtn").focus();snack(`${v} added to EDU 101 as Active. ${plural(S.students.length,"student")}.`);emit("student:added")}},trigger);
  emit("student:dialog")}

/* ======================================================================
   MENUS + DIALOGS (focus management, Escape, return focus to trigger)
   ====================================================================== */
function closeMenus(){$$(".menu").forEach(m=>{m._anchor&&m._anchor.setAttribute("aria-expanded","false");m.remove()})}
document.addEventListener("click",e=>{if(!e.target.closest(".menu"))closeMenus()});
function openMenu(anchor,items,opt={}){
  closeMenus();const m=document.createElement("div");m.className="menu";m.setAttribute("role","menu");m._anchor=anchor;
  m.innerHTML=items.map((it,i)=>it==="-"?"<hr>":`<button role="menuitem" data-i="${i}" ${it.id?`id="${it.id}"`:""} tabindex="-1">${it.icon?I(it.icon):""}${esc(it.label)}</button>`).join("");
  document.body.appendChild(m);
  const r=anchor.getBoundingClientRect(),mw=m.offsetWidth,mh=m.offsetHeight,vw=document.documentElement.clientWidth,vh=window.innerHeight;
  let left=opt.alignRight?r.right-mw:r.left;left=Math.max(8,Math.min(left,vw-mw-8));
  let top=r.bottom+4;if(top+mh>vh-80)top=Math.max(8,r.top-mh-4);
  m.style.left=left+"px";m.style.top=top+"px";anchor.setAttribute("aria-expanded","true");
  const btns=[...m.querySelectorAll("[role=menuitem]")];
  btns.forEach(b=>b.onclick=ev=>{ev.stopPropagation();const it=items[+b.dataset.i];closeMenus();it.fn()});
  m.addEventListener("keydown",e=>{const i=btns.indexOf(document.activeElement);
    if(e.key==="ArrowDown"){e.preventDefault();btns[(i+1)%btns.length].focus()}
    else if(e.key==="ArrowUp"){e.preventDefault();btns[(i-1+btns.length)%btns.length].focus()}
    else if(e.key==="Home"){e.preventDefault();btns[0].focus()}else if(e.key==="End"){e.preventDefault();btns[btns.length-1].focus()}
    else if(e.key==="Escape"||e.key==="Tab"){e.preventDefault();e.stopPropagation();closeMenus();anchor.focus()}});
  btns[0].focus();
}
function trapFocus(root){root.addEventListener("keydown",e=>{if(e.key!=="Tab")return;const f=[...root.querySelectorAll('button:not([disabled]),input,select,textarea,[href],[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];
  if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}})}
function makeModal(scrimClass,boxClass,labelId,html,onMount,trigger,onCancel){
  closeMenus();
  const s=document.createElement("div");s.className=scrimClass;
  s.innerHTML=`<div class="${boxClass}" role="dialog" aria-modal="true" aria-labelledby="${labelId}">${html}</div>`;
  document.body.appendChild(s);
  const close=(done)=>{s.remove();document.removeEventListener("keydown",esck,true);if(trigger&&document.body.contains(trigger)&&trigger.offsetParent!==null)trigger.focus();else{const t=$("#tab-"+UI.tab)||$("#main");t&&t.focus()}if(!done&&onCancel)onCancel()};
  const esck=e=>{if(e.key==="Escape"&&!document.querySelector(".menu")){e.stopPropagation();close()}};
  document.addEventListener("keydown",esck,true);
  s.addEventListener("mousedown",e=>{if(e.target===s)close()});
  s.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>close());
  trapFocus(s);
  onMount(s.firstElementChild,close);
  if(!s.contains(document.activeElement)){const f=s.querySelector("input,select,textarea,button:not([disabled])");f&&f.focus()}
  return {el:s,close};
}
const cDialog=(html,onMount,trigger,onCancel)=>makeModal("scrim","dlg","cdT",html,onMount,trigger,onCancel);
const simDialog=(html,onMount,trigger)=>makeModal("simscrim","simdlg","sdT",html,onMount,trigger);

/* ======================================================================
   TAB INTROS: Classroom-style feature-intro card with a silent wireframe
   animation of the tab's key action. Shown once per tab on first visit,
   replayable from Practice Help. Never touches S or L.
   ====================================================================== */
const introSeen={};
const IVK="#444746",IVL="#C4C7C5",IVG="#E8EAED",IVB="#0B57D0";
const ivLine=(x1,x2,y,c=IVL,w=3,cls="")=>`<line ${cls?`class="${cls}"`:""} x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const ivCursor=cls=>`<g class="a cur ${cls}"><path d="M0 0v17l4.4-4 3 6.8 3-1.3-3-6.6h6z" fill="#1F1F1F" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></g>`;
const ivRipple=(cls,x,y)=>`<circle class="a rp ${cls}" cx="${x}" cy="${y}" r="10" fill="none" stroke="${IVB}" stroke-width="2"/>`;
const ivPill=(x,y,fill,ink,label)=>`<rect x="${x}" y="${y-8}" width="60" height="16" rx="8" fill="${fill}"/><text x="${x+30}" y="${y+3.2}" text-anchor="middle" font-family="Google Sans,Roboto,Arial,sans-serif" font-size="9" font-weight="500" fill="${ink}">${label}</text>`;
const ivKebab=(x,y)=>`<circle cx="${x}" cy="${y-6}" r="1.7" fill="${IVK}"/><circle cx="${x}" cy="${y}" r="1.7" fill="${IVK}"/><circle cx="${x}" cy="${y+6}" r="1.7" fill="${IVK}"/>`;
function ivFrame(active,inner){
  const tabs=[["stream",200,236],["classwork",262,314],["people",340,372]];
  return `<svg viewBox="0 0 560 314" aria-hidden="true" focusable="false"><defs><clipPath id="ivClip"><rect x="21" y="97" width="518" height="198" rx="7"/></clipPath></defs>
   <g class="a sc"><rect x="20" y="18" width="520" height="278" rx="8" fill="#fff" stroke="${IVK}" stroke-width="2"/>
   <path d="M36 34h20M36 40h20M36 46h20" stroke="${IVK}" stroke-width="2" stroke-linecap="round"/><circle cx="516" cy="40" r="11" fill="#DADCE0"/>
   <line x1="20" y1="62" x2="540" y2="62" stroke="${IVK}" stroke-width="2"/>
   ${tabs.map(([k,a,b])=>ivLine(a,b,80,k===active?IVB:IVL,4)+(k===active?`<rect x="${a-4}" y="91" width="${b-a+8}" height="3" rx="1.5" fill="${IVB}"/>`:"")).join("")}
   <line x1="20" y1="96" x2="540" y2="96" stroke="#E3E3E3" stroke-width="1.5"/>
   <g clip-path="url(#ivClip)">${inner}</g></g></svg>`;
}
const ivPersonAdd=(x,y)=>`<g transform="translate(${x} ${y})" fill="none" stroke="${IVB}" stroke-width="2" stroke-linecap="round"><circle cx="-3" cy="-4" r="4"/><path d="M-11 8c0-4 4-6 8-6s8 2 8 6"/><path d="M7 -5h7M10.5 -8.5v7"/></g>`;
const INTROS={
  stream:{title:"Share updates in Stream",
    body:"Write an announcement and select Post. It appears at the top of the Stream, and you can edit or delete your own posts at any time.",
    label:"Animation: a pointer opens the announcement box, a message is typed and posted, and the new post appears at the top of the Stream above the older one.",
    svg:()=>ivFrame("stream",`
     <rect x="44" y="108" width="472" height="42" rx="6" fill="${IVG}"/>
     <rect x="44" y="162" width="110" height="56" rx="6" fill="#fff" stroke="${IVL}" stroke-width="1.5"/>${ivLine(58,120,180,IVK)}${ivLine(58,136,200,IVL,5)}
     <g class="a s-old"><rect x="168" y="208" width="348" height="60" rx="6" fill="#fff" stroke="${IVL}" stroke-width="1.5"/><circle cx="188" cy="228" r="9" fill="#9AC5A5"/>${ivLine(204,270,224,IVK)}${ivLine(204,240,234)}${ivLine(184,480,252)}</g>
     <g class="a s-new"><rect x="168" y="208" width="348" height="60" rx="6" fill="#fff" stroke="${IVL}" stroke-width="1.5"/><rect class="a s-hl" x="168" y="208" width="348" height="60" rx="6" fill="#EAF1FD" stroke="${IVB}" stroke-width="1.5"/>
      <circle cx="188" cy="228" r="9" fill="#5C6BC0"/>${ivLine(204,250,224,IVK)}${ivLine(204,236,234)}${ivLine(184,420,252,IVK)}</g>
     <g class="a s-cc"><rect x="168" y="162" width="348" height="34" rx="6" fill="#fff" stroke="${IVL}" stroke-width="1.5"/><circle cx="186" cy="179" r="8" fill="#DADCE0"/>${ivLine(202,330,179,IVL,4)}</g>
     <g class="a s-ce"><rect x="168" y="162" width="348" height="78" rx="6" fill="#fff" stroke="${IVB}" stroke-width="1.5"/>
      ${ivLine(184,420,184,IVK,4,"a tx s-t1")}${ivLine(184,340,198,IVK,4,"a tx s-t2")}
      ${ivLine(420,446,223)}<rect x="460" y="214" width="44" height="18" rx="9" fill="#E3E3E3"/><rect class="a s-pb" x="460" y="214" width="44" height="18" rx="9" fill="${IVB}"/></g>
     ${ivRipple("s-r1",250,180)}${ivRipple("s-r2",482,223)}${ivCursor("s-cur")}`)},
  classwork:{title:"Organise work with topics",
    body:"Create a topic, then move assignments under it. Work filed under a topic is easier for students to find than a long list with no topic.",
    label:"Animation: a pointer selects Create, then Topic, and a topic heading appears. The pointer opens an assignment's options, chooses Move to topic, and the assignment moves under the new topic.",
    svg:()=>ivFrame("classwork",`
     <rect x="44" y="108" width="76" height="28" rx="14" fill="${IVB}"/><path d="M56 122h10M61 117v10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>${ivLine(74,106,122,"#fff",3)}
     <g class="a c-rb"><rect x="44" y="150" width="472" height="28" rx="6" fill="#fff" stroke="${IVL}" stroke-width="1.5"/><circle cx="62" cy="164" r="8" fill="#DADCE0"/>${ivLine(80,210,164,IVK)}${ivKebab(504,164)}</g>
     <g class="a c-hd">${ivLine(44,150,196,IVK,5)}${ivKebab(504,196)}<line x1="44" y1="208" x2="516" y2="208" stroke="${IVK}" stroke-width="1.5"/></g>
     <g class="a c-ra"><rect x="44" y="214" width="472" height="28" rx="6" fill="#fff" stroke="${IVL}" stroke-width="1.5"/><rect class="a c-hl" x="44" y="214" width="472" height="28" rx="6" fill="#EAF1FD" stroke="${IVB}" stroke-width="1.5"/>
      <circle cx="62" cy="228" r="8" fill="#A8C7FA"/>${ivLine(80,250,228,IVK)}${ivKebab(504,228)}</g>
     <g class="a c-m1"><rect x="44" y="140" width="124" height="64" rx="4" fill="#fff" stroke="${IVL}" stroke-width="1.5"/>${ivLine(60,124,158,IVK)}<rect class="a c-m1h" x="45" y="172" width="122" height="28" fill="${IVG}"/>${ivLine(60,100,186,IVK)}</g>
     <g class="a c-m2"><rect x="380" y="170" width="128" height="34" rx="4" fill="#fff" stroke="${IVL}" stroke-width="1.5"/><rect class="a c-m2h" x="381" y="171" width="126" height="32" fill="${IVG}"/>${ivLine(396,480,187,IVK)}</g>
     ${ivRipple("c-r1",82,122)}${ivRipple("c-r2",100,186)}${ivRipple("c-r3",504,164)}${ivRipple("c-r4",440,187)}${ivCursor("c-cur")}`)},
  people:{title:"Manage who's in your class",
    body:"Invite a co-teacher, who shows as Pending until they accept. In this sandbox, a practice student you add joins straight away as Active.",
    label:"Animation: a pointer opens Invite teachers, an email is typed and a Pending co-teacher row appears. Then a practice student is added and appears in the Students list as Active.",
    svg:()=>{const row=(y,c,w,pill,cls="")=>`<g ${cls?`class="${cls}"`:""}><circle cx="58" cy="${y}" r="9" fill="${c}"/>${ivLine(76,w,y,IVK)}${pill}</g>`;
     const dlg=(cls,t)=>`<g class="a ${cls}"><rect x="190" y="110" width="180" height="96" rx="14" fill="#E9EEF6" stroke="${IVL}" stroke-width="1.5"/>${ivLine(206,290,130,IVK,4)}
      <rect x="206" y="142" width="148" height="24" rx="4" fill="#fff" stroke="#747775" stroke-width="1.2"/>${ivLine(214,300,154,IVK,3,"a tx "+t)}${ivLine(318,350,188,IVB,4)}</g>`;
     return ivFrame("people",`
     ${ivLine(44,130,116,IVK,5)}${ivPersonAdd(502,116)}<line x1="44" y1="130" x2="516" y2="130" stroke="${IVK}" stroke-width="1.5"/>
     ${row(149,"#5C6BC0",150,ivPill(444,149,"#C2E7FF","#004A77","Owner"))}
     ${row(177,"#9AA0A6",200,ivPill(444,177,"#FFDF99","#5A4300","Pending"),"a p-pend")}
     ${ivLine(44,136,212,IVK,5)}${ivPersonAdd(502,212)}<line x1="44" y1="224" x2="516" y2="224" stroke="${IVK}" stroke-width="1.5"/>
     ${row(238,"#1E8E3E",170,ivPill(444,238,"#C4EED0","#0A3818","Active"))}
     ${row(262,"#8E24AA",150,ivPill(444,262,"#C4EED0","#0A3818","Active"))}
     <g class="a p-new"><rect class="a p-hl" x="40" y="274" width="480" height="22" rx="6" fill="#EAF1FD"/>${row(285,"#E8710A",160,ivPill(444,285,"#C4EED0","#0A3818","Active"))}</g>
     ${dlg("p-d1","p-t1")}${dlg("p-d2","p-t2")}
     ${ivRipple("p-r1",504,116)}${ivRipple("p-r2",334,188)}${ivRipple("p-r3",504,212)}${ivRipple("p-r4",334,188)}${ivCursor("p-cur")}`)}}
};
const INTRO_DUR={stream:"8s",classwork:"9s",people:"10s"};
function maybeIntro(t){
  if(introSeen[t])return;
  setTimeout(()=>{if(introSeen[t]||UI.view!=="class"||UI.tab!==t||Guide.g||$("#shell").hidden||document.querySelector(".scrim,.simscrim,.editor"))return;
    showIntro(t,$("#tab-"+t))},0);
}
function showIntro(t,trigger){
  introSeen[t]=true;if(document.querySelector(".dlg.intro"))return;const x=INTROS[t];
  makeModal("scrim","dlg intro","cdT",`<div class="iv" role="img" aria-label="${esc(x.label)}" style="--d:${INTRO_DUR[t]}">${x.svg()}</div>
    <h2 id="cdT">${esc(x.title)}</h2><p id="ivBody">${esc(x.body)}</p>
    <div class="acts"><button class="tb" id="introOk" data-close>Got it</button></div>`,
  d=>{d.setAttribute("aria-describedby","ivBody");d.querySelector("#introOk").focus()},trigger);
}

/* ======================================================================
   PRACTICE HELP + GUIDED PRACTICE (never changes sandbox state itself)
   ====================================================================== */
const ABOUT={
  stream:"Stream is the class conversation. Post announcements, edit or delete your own posts, and see the newest post appear at the top.",
  classwork:"Classwork holds the work students complete. Create topics first, then file assignments under them so the list stays easy to scan.",
  people:"People shows who is in the class. Invited co-teachers stay Pending until they accept; practice students join as Active. The class code controls who can join."
};
const GUIDES={
  stream:[
    {key:"post",title:"Post an announcement",steps:[
      {t:"#annOpen",x:"Select “Announce something to your class”.",until:"composer:open"},
      {t:"#annText",x:"Type a short message. Post stays unavailable until there's text.",until:"composer:text"},
      {t:"#annPost",x:"Select Post. Your announcement appears at the top of the Stream.",until:"post:created"}]},
    {key:"edit",title:"Edit your own post",needs:()=>S.posts.some(p=>!p.protected),needMsg:"Post an announcement first, then come back to edit it.",steps:[
      {t:()=>firstOwnPostMenu(),x:"Open the options (⋮) on one of your posts.",until:"postmenu:open"},
      {t:"#mEditPost",x:"Choose Edit.",until:null,nextOn:"#editText"},
      {t:"#editSave",x:"Change the text, then select Save.",until:"post:edited"}]},
    {key:"remove",title:"Delete your own post",needs:()=>S.posts.some(p=>!p.protected),needMsg:"Post an announcement first. The protected welcome post can't be deleted.",steps:[
      {t:()=>firstOwnPostMenu(),x:"Open the options (⋮) on one of your posts.",until:"postmenu:open"},
      {t:"#mDeletePost",x:"Choose Delete. You can post again at any time.",until:"post:removed"}]}
  ],
  classwork:[
    {key:"topic",title:"Create a topic",steps:[
      {t:"#createBtn",x:"Select Create.",until:"create:open"},
      {t:"#mTopic",x:"Choose Topic.",until:"topic:dialog"},
      {t:"#topicName",x:"Name the topic, for example “Week 1”.",until:"topic:text"},
      {t:"#topicAdd",x:"Select Add.",until:"topic:created"}]},
    {key:"assign",title:"Create an assignment and file it",steps:[
      {t:"#createBtn",x:"Select Create.",until:"create:open"},
      {t:"#mAssignment",x:"Choose Assignment.",until:"assign:editor"},
      {t:"#aTitle",x:"Give the assignment a title.",until:"assign:title"},
      {t:"#aTopic",x:()=>S.topics.length?"Choose a topic to file it under.":"Choose a topic. With no topics yet, it will go to No topic.",until:"assign:topic",skipIf:()=>!S.topics.length},
      {t:"#aAssign",x:"Select Assign.",until:"assign:created"}]},
    {key:"move",title:"Move an assignment to a topic",needs:()=>S.assignments.length&&S.topics.length,needMsg:"Create at least one topic and one assignment first.",steps:[
      {t:()=>document.querySelector("[data-item-menu]"),x:"Open the options (⋮) on an assignment.",until:"itemmenu:open"},
      {t:"#mMove",x:"Choose Move to topic.",until:"move:dialog"},
      {t:"#moveTopic",x:"Pick a topic, then select Move.",until:"assign:moved"}]}
  ],
  people:[
    {key:"invite",title:"Invite a co-teacher",steps:[
      {t:"#inviteBtn",x:"Select Invite teachers.",until:"invite:dialog"},
      {t:"#invEmail",x:"Type an email address, for example tutor@example.com.",until:"invite:valid"},
      {t:"#invSubmit",x:"Select Invite. The new row shows Pending.",until:"invite:sent"}]},
    {key:"student",title:"Add a practice student",steps:[
      {t:"#addStudentBtn",x:"Select Add practice student.",until:"student:dialog"},
      {t:"#stuName",x:"Type a fictional name.",until:"student:text"},
      {t:"#stuSubmit",x:"Select Add. The student appears as Active and the count updates.",until:"student:added"}]},
    {key:"remove",title:"Remove a student",needs:()=>S.students.length>0,needMsg:"Add a practice student first.",steps:[
      {t:()=>document.querySelector("[data-student-menu]"),x:"Open the options (⋮) next to a student.",until:null,nextOn:".menu"},
      {t:".menu [role=menuitem]",x:"Choose Remove.",until:"student:removed"}]},
    {key:"code",title:"Regenerate the class code",steps:[
      {t:"#regenBtn",x:"Select Regenerate code. The old code stops working.",until:"code:regenerated"}]}
  ]
};
function firstOwnPostMenu(){const p=S.posts.find(x=>!x.protected);return p?document.querySelector(`[data-post-menu="${p.id}"]`):null}

const Guide={g:null,i:0,raf:0,doneT:0,
  start(g){this.exit(true);if(UI.view!=="class")openClass(UI.tab);
    if(g.needs&&!g.needs()){snack(g.needMsg);return}
    this.g=g;this.i=0;this.skip();$("#spot").hidden=false;$("#coach").hidden=false;this.draw();this.loop();announce(`Guidance started: ${g.title}. ${this.text()}`)},
  text(){const s=this.g.steps[this.i];return typeof s.x==="function"?s.x():s.x},
  target(){const s=this.g.steps[this.i];if(!s)return null;const el=typeof s.t==="function"?s.t():document.querySelector(s.t);return el&&el.offsetParent!==null?el:null},
  skip(){while(this.g&&this.g.steps[this.i]&&this.g.steps[this.i].skipIf&&this.g.steps[this.i].skipIf())this.i++},
  on(e){if(!this.g||this.doneT)return;const s=this.g.steps[this.i];if(s&&s.until===e)this.advance()},
  advance(){this.i++;this.skip();if(this.i>=this.g.steps.length){this.finish();return}this.draw();announce(this.text())},
  finish(){const c=$("#coach");c.classList.add("done");c.innerHTML=`<div class="k" id="coachK">Done</div><p>${esc(this.g.title)} — nicely practised. Your work stays in the sandbox.</p><div class="acts"><span></span><button class="x" id="coachClose">${I("close")}Close</button></div>`;
    $("#spot").hidden=true;$("#coachClose").onclick=()=>this.exit();announce(`${this.g.title} complete.`);this.doneT=setTimeout(()=>this.exit(true),3500);this.placeCoach(null)},
  draw(){const c=$("#coach");c.classList.remove("done");const n=this.g.steps.length;
    c.innerHTML=`<div class="k" id="coachK">Guide me · Step ${this.i+1} of ${n}</div><p>${esc(this.text())}</p><div class="acts"><span style="font:400 12px var(--fs);color:#9FB0CC">${esc(this.g.title)}</span><button class="x" id="coachExit">${I("close")}Exit guidance</button></div>`;
    $("#coachExit").onclick=()=>{this.exit();announce("Guidance closed. Your work is unchanged.")};this.place()},
  loop(){cancelAnimationFrame(this.raf);const tick=()=>{if(!this.g)return;
      if(!this.doneT){let el=this.target();const s=this.g.steps[this.i];
        if(s&&s.nextOn&&document.querySelector(s.nextOn)){this.advance();el=this.target()}
        if(!el){for(let k=this.i-1;k>=0;k--){const prev=this.g.steps[k];const pe=typeof prev.t==="function"?prev.t():document.querySelector(prev.t);if(pe&&pe.offsetParent!==null){this.i=k;this.draw();break}}}
        this.place()}
      this.raf=requestAnimationFrame(tick)};this.raf=requestAnimationFrame(tick)},
  place(){if(!this.g||this.doneT)return;const el=this.target();const sp=$("#spot");
    if(!el){sp.hidden=true;this.placeCoach(null);return}
    const r=el.getBoundingClientRect();sp.hidden=false;const pad=6;
    Object.assign(sp.style,{left:r.left-pad+"px",top:r.top-pad+"px",width:r.width+pad*2+"px",height:r.height+pad*2+"px"});
    this.placeCoach(r)},
  placeCoach(r){const c=$("#coach");const cw=c.offsetWidth,ch=c.offsetHeight,vw=document.documentElement.clientWidth,vh=innerHeight;
    if(!r){c.style.left=Math.max(16,vw/2-cw/2)+"px";c.style.top=Math.max(16,vh-ch-96)+"px";return}
    let top=r.bottom+16;if(top+ch>vh-88)top=r.top-ch-16;if(top<8)top=Math.min(vh-ch-88,r.bottom+16);
    let left=r.left;left=Math.max(16,Math.min(left,vw-cw-16));c.style.left=left+"px";c.style.top=Math.max(8,top)+"px"},
  exit(silent){cancelAnimationFrame(this.raf);clearTimeout(this.doneT);this.doneT=0;this.g=null;$("#spot").hidden=true;$("#coach").hidden=true}
};

function openHelp(trigger,start){
  const tab=UI.view==="class"?UI.tab:"stream";const tabName=TABS.find(t=>t[0]===tab)[1];
  let dlgRef;
  const view=(which)=>{
    const d=dlgRef.el.firstElementChild;
    if(which==="menu"){d.innerHTML=`<div class="hd"><div><span class="eb">Practice Help</span><h2 id="sdT">How can we help?</h2></div><button class="ib" data-x aria-label="Close help">${I("close")}</button></div>
      <div class="bd">
       <button class="choice" id="hWatch">${I("smart_display")}<span><b>Watch the walkthrough</b><span class="s">A 70-second captioned overview. Your sandbox isn't changed.</span></span>${I("chevron_right","go")}</button>
       <button class="choice" id="hGuide">${I("route")}<span><b>Guide me</b><span class="s">Choose one action in ${tabName}. We'll highlight each step.</span></span>${I("chevron_right","go")}</button>
       <button class="choice" id="hWhat">${I("info")}<span><b>What can I do here?</b><span class="s">A short explanation of the ${tabName} tab.</span></span>${I("chevron_right","go")}</button>
      </div>`;
      d.querySelector("#hWatch").onclick=()=>{dlgRef.close(true);openPlayer(trigger)};
      d.querySelector("#hGuide").onclick=()=>view("guide");d.querySelector("#hWhat").onclick=()=>view("what");d.querySelector("#hWatch").focus()}
    if(which==="guide"){d.innerHTML=`<div class="hd"><div><span class="eb">Guide me · ${tabName}</span><h2 id="sdT">What would you like to practise?</h2></div><button class="ib" data-x aria-label="Close help">${I("close")}</button></div>
      <div class="bd"><button class="back" id="hBack">${I("arrow_back")}Back</button>
       ${GUIDES[tab].map((g,i)=>`<button class="choice" data-g="${i}">${I("touch_app")}<span><b>${esc(g.title)}</b><span class="s">${g.needs&&!g.needs()?esc(g.needMsg):plural(g.steps.length,"step")+" · leave at any time"}</span></span>${I("chevron_right","go")}</button>`).join("")}
       <p style="margin-top:14px;font-size:13px;color:var(--sim-muted)">Other tabs have their own guides. Open a tab, then choose Practice Help.</p></div>`;
      d.querySelector("#hBack").onclick=()=>view("menu");
      d.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{const g=GUIDES[tab][+b.dataset.g];dlgRef.close(true);setTimeout(()=>{Guide.start(g);const el=Guide.target();el&&el.focus()},60)});
      d.querySelector("[data-g]").focus()}
    if(which==="what"){d.innerHTML=`<div class="hd"><div><span class="eb">What can I do here?</span><h2 id="sdT">${tabName}</h2></div><button class="ib" data-x aria-label="Close help">${I("close")}</button></div>
      <div class="bd"><p>${ABOUT[tab]}</p><p style="color:var(--sim-muted);font-size:14px">Everything is fictional and reversible. Reset Sandbox starts over with a fresh class code.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;margin-top:8px"><button class="back" id="hBack">${I("arrow_back")}Back</button><span style="display:flex;gap:10px;flex-wrap:wrap"><button class="simbtn ghost" id="hIntro">${I("smart_display")}Replay the ${tabName} intro</button><button class="simbtn" id="hTry">${I("route")}Guide me through ${tabName}</button></span></div></div>`;
      d.querySelector("#hBack").onclick=()=>view("menu");d.querySelector("#hTry").onclick=()=>view("guide");d.querySelector("#hIntro").onclick=()=>{dlgRef.close(true);if(UI.view!=="class")openClass(tab);setTimeout(()=>showIntro(tab,trigger),0)};d.querySelector("#hBack").focus()}
    d.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>dlgRef.close());
  };
  dlgRef=simDialog("",()=>{},trigger);view(start||"menu");
}
$("#dHelp").onclick=e=>openHelp(e.currentTarget);

/* ======================================================================
   WALKTHROUGH PLAYER — recorded video of a separate demo session.
   Playing it never touches S or L. No autoplay.
   ====================================================================== */
const fmt=t=>{t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0")};
let ccOn=true,txOn=false,lastVol=1;
function openPlayer(trigger){
  Guide.exit(true);
  const has=!!VIDEO_SRC&&!VIDEO_SRC.startsWith("/*");
  const ref=makeModal("simscrim","player","plT",`
    <div class="ph2"><h2 id="plT">Walkthrough · The Sandbox Class</h2><button class="ib" id="plX" aria-label="Close walkthrough">${I("close")}</button></div>
    <div class="vwrap">${has?`<video id="vid" preload="metadata" playsinline aria-label="Walkthrough video, 70 seconds, showing the sandbox in use">${VIDEO_WEBM.startsWith("data:")?`<source src="${VIDEO_WEBM}" type="video/webm">`:""}<source src="${VIDEO_SRC}" type="video/mp4"></video>
       <div class="cc" id="cc" hidden></div><div class="big" id="big"><button id="bigPlay" aria-label="Play walkthrough">${I("play_arrow","fill")}</button></div>`
       :`<div class="nov">The walkthrough video isn't included in this build. Use Practice Help › Guide me instead.</div>`}</div>
    ${has?`<div class="pctl">
      <button class="ib" id="pPlay" aria-label="Play">${I("play_arrow","fill")}</button>
      <button class="ib" id="pReplay" aria-label="Replay from start">${I("replay")}</button>
      <span class="time" id="pTime">0:00 / 1:10</span>
      <input type="range" class="seek" id="pSeek" min="0" max="70" step="0.1" value="0" aria-label="Seek">
      <button class="ib" id="pMute" aria-label="Mute">${I("volume_up")}</button>
      <input type="range" class="vol" id="pVol" min="0" max="1" step="0.05" value="${lastVol}" aria-label="Volume">
      <button class="ib" id="pCC" aria-pressed="${ccOn}" aria-label="Captions">${I("closed_caption")}</button>
      <button class="ib" id="pTx" aria-pressed="${txOn}" aria-label="Transcript" aria-controls="tx">${I("subject")}</button>
     </div>
     <div class="tx" id="tx" ${txOn?"":"hidden"}><h3>Transcript</h3>${CUES.map((c,i)=>`<button data-c="${i}"><span>${fmt(c.s)}</span>${esc(c.t)}</button>`).join("")}</div>`:""}`,
  (box,close)=>{box.querySelector("#plX").onclick=()=>{const v=box.querySelector("#vid");v&&v.pause();close()};if(!has)return;
    const v=box.querySelector("#vid"),seek=box.querySelector("#pSeek"),vol=box.querySelector("#pVol"),cc=box.querySelector("#cc"),big=box.querySelector("#big");
    v.volume=lastVol;
    const setPlay=()=>{box.querySelector("#pPlay").innerHTML=v.paused?I("play_arrow","fill"):I("pause","fill");box.querySelector("#pPlay").setAttribute("aria-label",v.paused?"Play":"Pause");big.hidden=!v.paused||v.currentTime>0&&!v.ended};
    const toggle=()=>{v.paused||v.ended?v.play():v.pause()};
    box.querySelector("#bigPlay").onclick=toggle;box.querySelector("#pPlay").onclick=toggle;v.onclick=toggle;
    box.querySelector("#pReplay").onclick=()=>{v.currentTime=0;v.play()};
    v.onplay=setPlay;v.onpause=setPlay;v.onended=setPlay;
    v.onloadedmetadata=()=>{seek.max=v.duration||70;box.querySelector("#pTime").textContent=`${fmt(v.currentTime)} / ${fmt(v.duration)}`};
    v.ontimeupdate=()=>{seek.value=v.currentTime;seek.setAttribute("aria-valuetext",`${fmt(v.currentTime)} of ${fmt(v.duration)}`);box.querySelector("#pTime").textContent=`${fmt(v.currentTime)} / ${fmt(v.duration||70)}`;
      const k=CUES.findIndex(c=>v.currentTime>=c.s&&v.currentTime<c.e);cc.hidden=!ccOn||k<0;if(k>=0)cc.textContent=CUES[k].t;
      box.querySelectorAll(".tx button").forEach((b,i)=>b.classList.toggle("now",i===k))};
    seek.oninput=()=>{v.currentTime=+seek.value};
    vol.oninput=()=>{v.volume=+vol.value;v.muted=+vol.value===0;lastVol=+vol.value;box.querySelector("#pMute").innerHTML=I(v.muted?"volume_off":"volume_up")};
    box.querySelector("#pMute").onclick=()=>{v.muted=!v.muted;box.querySelector("#pMute").innerHTML=I(v.muted?"volume_off":"volume_up");box.querySelector("#pMute").setAttribute("aria-label",v.muted?"Unmute":"Mute");if(!v.muted&&v.volume===0){v.volume=.8;vol.value=.8}};
    box.querySelector("#pCC").onclick=e=>{ccOn=!ccOn;e.currentTarget.setAttribute("aria-pressed",ccOn);v.ontimeupdate()};
    box.querySelector("#pTx").onclick=e=>{txOn=!txOn;e.currentTarget.setAttribute("aria-pressed",txOn);box.querySelector("#tx").hidden=!txOn};
    box.querySelectorAll(".tx button").forEach(b=>b.onclick=()=>{v.currentTime=CUES[+b.dataset.c].s+.05;if(v.paused)v.play()});
    box.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT")return;if(e.key===" "||e.key==="k"){e.preventDefault();toggle()}});
    box.querySelector("#bigPlay").focus()},trigger);
}
$("#dWatch").onclick=e=>openPlayer(e.currentTarget);

/* ======================================================================
   RESET / END PRACTICE / SUMMARY / FINISH
   ====================================================================== */
function resetSandbox(){Guide.exit(true);closeMenus();$$(".scrim,.simscrim,.editor").forEach(x=>x.remove());
  seed();showScreen("shell");openClass("stream");renderDrawer();renderTop();
  $("#main").scrollTop=0;focusTab();snack(`Sandbox reset. New class code: ${S.classCode}.`)}
$("#dReset").onclick=resetSandbox;
$("#dEnd").onclick=openSummary;

const LEVELS=["Needs more practice","Developing","Confident"];
function openSummary(){
  Guide.exit(true);closeMenus();$$(".scrim,.simscrim,.editor").forEach(x=>x.remove());
  const unf=unfiled().length,filed=S.assignments.length-unf,pend=pendingTeachers().length;
  const most=Object.entries(L.tabOpens).sort((a,b)=>b[1]-a[1])[0];
  const el=$("#summary");
  el.innerHTML=`<div class="sum">
   <div class="sum-top"><div><div class="eb">EDU 101 · Practice Summary</div><h1 id="sumTitle" tabindex="-1">What you practised</h1></div><span class="notscore">${I("block")}Not a score</span></div>
   <div class="two">
    <section class="pan" aria-labelledby="csH"><h2 id="csH">${I("domain")}Your class right now</h2><p class="sub">Current contents of the EDU 101 sandbox.</p>
     <dl class="kv">
      <dt class="grp">Stream</dt><dt>Posts remaining</dt><dd>${S.posts.length}</dd>
      <dt class="grp">Classwork</dt><dt>Topics</dt><dd>${S.topics.length}</dd><dt>Assignments</dt><dd>${S.assignments.length}</dd><dt>Filed under a topic</dt><dd>${filed}</dd><dt>No topic (unfiled)</dt><dd>${unf}</dd>
      <dt class="grp">People</dt><dt>Teachers</dt><dd>1 owner${pend?`, ${pend} pending`:""}</dd><dt>Active students</dt><dd>${S.students.length}</dd><dt>Class code</dt><dd style="letter-spacing:.06em">${esc(S.classCode)}</dd>
     </dl>
     ${S.topics.length||unf?`<ul class="tree" aria-label="Classwork structure">${unf?`<li>No topic (${unf})</li>`:""}${S.topics.map(t=>{const a=inTopic(t.id);return `<li>${esc(t.name)} (${a.length})${a.length?`<ul>${a.map(x=>`<li>${esc(x.title)}</li>`).join("")}</ul>`:""}</li>`}).join("")}</ul>`:""}
    </section>
    <section class="pan" aria-labelledby="aaH"><h2 id="aaH">${I("list_alt")}Actions you tried</h2><p class="sub">Everything you did this session, including work you later removed.</p>
     <dl class="kv">
      <dt class="grp">Stream</dt><dt>Posts created</dt><dd>${L.postsCreated}</dd><dt>Posts edited</dt><dd>${L.postsEdited}</dd><dt>Posts deleted</dt><dd>${L.postsRemoved}</dd>
      <dt class="grp">Classwork</dt><dt>Topics created</dt><dd>${L.topicsCreated}</dd><dt>Assignments created</dt><dd>${L.assignmentsCreated}</dd><dt>…filed when created</dt><dd>${L.createdFiled}</dd><dt>…left unfiled</dt><dd>${L.createdUnfiled}</dd><dt>Assignments moved or edited</dt><dd>${L.assignmentsMoved+L.assignmentsEdited}</dd><dt>“Getting crowded?” note</dt><dd>${L.nudgeShown?"Shown":"Not shown"}</dd>
      <dt class="grp">People</dt><dt>Co-teacher invitations</dt><dd>${L.invitesSent}</dd><dt>Students added / removed</dt><dd>${L.studentsAdded} / ${L.studentsRemoved}</dd><dt>Class code regenerated</dt><dd>${L.codeRegenerations}</dd>
      <dt class="grp">Tabs</dt><dt>Tabs opened</dt><dd>${L.tabsVisited.length?L.tabsVisited.map(t=>TABS.find(x=>x[0]===t)[1]).join(", "):"None"}</dd>
     </dl></section>
   </div>
   <section class="pan selfc" aria-labelledby="scH"><h2 id="scH">${I("psychology")}How confident do you feel?</h2><p class="sub">A private self-check. It isn't saved or shared.</p>
    ${TABS.map(([k,l])=>`<fieldset><legend>${l}</legend><div class="seg">${LEVELS.map((lv,i)=>`<label><input type="radio" name="sc-${k}" id="sc-${k}-${i}" value="${lv}" ${UI.self[k]===lv?"checked":""}><span>${lv}</span></label>`).join("")}</div></fieldset>`).join("")}
    <div class="transfer"><label for="transfer">The first real action I will take in my class this week is…</label><textarea id="transfer" placeholder="Optional">${esc(UI.transfer)}</textarea></div>
    ${most[1]?`<p class="sub" style="margin-top:12px">To think about: you opened ${TABS.find(x=>x[0]===most[0])[1]} most often. What would thirty unfiled items feel like to a student?</p>`:""}
   </section>
   <div class="sumacts">
    <span class="lab">Continue Practice:</span>
    ${TABS.map(([k,l])=>`<button class="simbtn ghost" data-cont="${k}">${l}</button>`).join("")}
    <span class="sp"></span>
    <button class="simbtn ghost" id="sumReset">${I("restart_alt")}Reset Sandbox</button>
    <button class="simbtn gold" id="sumFinish">Finish</button>
   </div></div>`;
  showScreen("summary");el.scrollTop=0;$("#sumTitle").focus();
  el.querySelectorAll("input[type=radio]").forEach(r=>r.onchange=()=>{UI.self[r.name.slice(3)]=r.value});
  $("#transfer").oninput=e=>{UI.transfer=e.target.value};
  el.querySelectorAll("[data-cont]").forEach(b=>b.onclick=()=>{showScreen("shell");UI.view="class";setTab(b.dataset.cont,true);renderDrawer();renderTop();focusTab()});
  $("#sumReset").onclick=resetSandbox;$("#sumFinish").onclick=showFinish;
}
function showFinish(){const t=UI.transfer.trim();const el=$("#finish");
  el.innerHTML=`<div class="fin"><div class="in"><div class="mivamark" style="color:var(--sim-ink)">MIVA</div>
   <h1 id="finTitle" tabindex="-1" style="font:500 15px/20px var(--fs);letter-spacing:.12em;text-transform:uppercase;color:var(--sim-teal);margin:28px 0 0">Practice complete</h1>
   ${t?`<blockquote>“${esc(t)}”</blockquote><p>That's your first real action this week.</p>`:`<blockquote>You've rehearsed Stream, Classwork and People in a class that doesn't exist.</blockquote>`}
   <p>The safest place to make a first mistake is the sandbox. Come back before your real class goes live.</p>
   <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px"><button class="simbtn ghost" id="finBack">${I("arrow_back")}Back to summary</button><button class="simbtn" id="finAgain">${I("restart_alt")}Start a fresh sandbox</button></div></div></div>`;
  showScreen("finish");$("#finTitle").focus();$("#finBack").onclick=openSummary;$("#finAgain").onclick=resetSandbox}

/* boot: welcome screen first */
L.tabsVisited=[];
showScreen("welcome");$("#beginBtn").focus();
/* expose for automated verification only (read-only snapshot) */
window.__sandbox={state:()=>JSON.parse(JSON.stringify(S)),log:()=>JSON.parse(JSON.stringify(L)),
  /* UI-only: lets the walkthrough recorder skip the tab intro cards */skipIntros:()=>TABS.forEach(([k])=>{introSeen[k]=true})};
})();
