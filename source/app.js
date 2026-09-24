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
let S,L,UI,seq,A;  /* A: the class currently open */
const nid=p=>p+(++seq);
function seed(){
  seq=0;
  /* Nothing is set up in advance: the learner picks a role, then creates (or joins) the class. */
  S={user:{role:null,name:"You"},classes:[],activeId:null,flags:{unfiledNudgeShown:false,gateSeen:false}};
  L={role:null,classesCreated:0,classesJoined:0,
     tabsVisited:[],tabOpens:{stream:0,classwork:0,people:0,grades:0},
     postsCreated:0,postsEdited:0,postsRemoved:0,
     topicsCreated:0,topicsRenamed:0,topicsRemoved:0,
     assignmentsCreated:0,createdFiled:0,createdUnfiled:0,assignmentsEdited:0,assignmentsMoved:0,assignmentsRemoved:0,
     nudgeShown:false,
     invitesSent:0,invitesCancelled:0,studentsAdded:0,studentsRemoved:0,codeRegenerations:0};
  UI={view:"role",tab:"stream",composerOpen:false,draft:"",editingPost:null,editDraft:"",nudgeVisible:false,
      enrolledOpen:true,teachingOpen:true,self:{},transfer:"",placeholder:null,homeView:"teaching"};
  A=null;
}
seed();
const unfiled=()=>A.assignments.filter(a=>!a.topicId);
const owner=()=>!!A&&A.role==="owner";
function makeClass(f,role){
  const c={id:nid("c-"),name:f.name,section:f.section||"",level:f.level||"",subject:f.subject||"",room:f.room||"",
    role,code:genCode(null),theme:"Light blue",streamClasswork:"condensed",
    posts:[],topics:[],assignments:[],
    teachers:[],students:[]};
  if(role==="owner")c.teachers.push({id:"t-owner-"+c.id,name:"You",email:"",status:"owner"});
  else{
    c.teachers.push({id:nid("t-"),name:f.teacher||"Ada Okafor",email:"",status:"owner"});
    c.students.push({id:nid("u"),name:"You",placeholder:false,isYou:true});
    c.posts.push({id:nid("post-"),author:f.teacher||"Ada Okafor",when:"Just now",edited:false,protected:true,
      text:"Welcome to the class. Everything you need for this week is under Classwork."});
  }
  S.classes.push(c);return c;
}
const inTopic=id=>A.assignments.filter(a=>a.topicId===id);
const pendingTeachers=()=>A.teachers.filter(t=>t.status==="pending");

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
  $("#role").hidden=name!=="role";
  $("#shell").hidden=name!=="shell";
  $("#dock").hidden=name!=="shell";
  document.body.classList.toggle("dock-on",name==="shell");
  $("#summary").hidden=name!=="summary";
  $("#finish").hidden=name!=="finish";
  if(name!=="shell")Guide.exit(true);
}
$("#beginBtn").onclick=()=>{showRolePicker()};
$("#welcomeWatch").onclick=e=>openPlayer(e.currentTarget);

/* ======================================================================
   CREATE / JOIN A CLASS (SPEC §6.1-6.3, §6.9). Copy is the pack's, verbatim.
   ====================================================================== */
function startCreateClass(trigger){
  if(S.flags.gateSeen)return openCreateClass(trigger);
  cDialog(`<h2 id="cdT">Using Classroom at a school with students?</h2>
   <p>If so, your school must sign up for a <a href="#" data-x>Google Workspace for Education</a> account before you can use Classroom. <a href="#" data-x>Learn More</a></p>
   <p>Google Workspace for Education lets schools decide which Google services their students can use, and provides additional <a href="#" data-x>privacy and security</a> protections that are important in a school setting. Students cannot use Google Classroom at a school with personal accounts.</p>
   <label class="cbrow"><input type="checkbox" id="gateBox"><span>I've read and understand the above notice, and I'm not using Classroom at a school with students</span></label>
   <div class="acts"><button class="tb" data-close>Go back</button><button class="tb" id="gateGo" disabled>Continue</button></div>`,
  (d,close)=>{const box=d.querySelector("#gateBox"),go=d.querySelector("#gateGo");
    d.querySelectorAll("[data-x]").forEach(a=>a.onclick=e=>{e.preventDefault();snack("External help pages aren't part of this practice.")});
    box.onchange=()=>{go.disabled=!box.checked;if(box.checked)emit("gate:ticked")};
    go.onclick=()=>{S.flags.gateSeen=true;close(true);openCreateClass(trigger)}},trigger);
  emit("gate:open");
}
function openCreateClass(trigger){
  const F=[["className","Class name","*"],["section","Section",""],["level","Level(s)",""],["subject","Subject",""],["room","Room",""]];
  cDialog(`<h2 id="cdT">Create class</h2>
   <form id="ccForm" novalidate>
    ${F.map(([id,label,req],i)=>`<div class="filled cc"><label for="${id}">${label}${req?"*":""}</label><input id="${id}" autocomplete="off" maxlength="80" ${i===0?'aria-required="true" aria-describedby="ccHelp"':""}></div>${i===0?`<div class="help" id="ccHelp">*Required</div>`:""}`).join("")}
    <div class="acts"><button type="button" class="tb" data-close id="ccCancel">Cancel</button><button class="tb" id="ccCreate" disabled>Create</button></div>
   </form>`,
  (d,close)=>{const name=d.querySelector("#className"),create=d.querySelector("#ccCreate");name.focus();
    name.oninput=()=>{create.disabled=!name.value.trim();if(name.value.trim())emit("class:name")};
    d.querySelector("#ccForm").onsubmit=e=>{e.preventDefault();const n=name.value.trim();if(!n)return;
      /* the submitting state the pack asks for: fields grey out, Cancel greys out, label reads Creating… */
      d.querySelectorAll("input").forEach(i=>{i.disabled=true});
      d.querySelector("#ccCancel").disabled=true;create.disabled=true;create.textContent="Creating…";
      const f={name:n,section:d.querySelector("#section").value.trim(),level:d.querySelector("#level").value.trim(),
               subject:d.querySelector("#subject").value.trim(),room:d.querySelector("#room").value.trim()};
      setTimeout(()=>{const c=makeClass(f,"owner");L.classesCreated++;close(true);
        openClass(c.id,"stream");snack(`Class “${excerpt(c.name,30)}” created. Its code is ${c.code}.`);emit("class:created")},700)}},trigger);
  emit("class:dialog");
}
function openJoinClass(trigger){
  cDialog(`<h2 id="cdT">Join class</h2>
   <div class="jcard"><div class="k">You're currently signed in as</div><div class="who"><span class="la" style="background:#5C6BC0">Y</span><div class="n">You<small>you@example.com</small></div><button class="ob" id="jcSwitch">Switch account</button></div></div>
   <div class="jcard"><div class="k">Class code</div><p style="margin:0 0 12px">Ask your teacher for the class code, then enter it here.</p>
     <form id="jcForm" novalidate><div class="field of"><input id="jcCode" autocomplete="off" maxlength="8" placeholder=" " aria-describedby="jcHelp"><label for="jcCode">Class code</label></div><div class="help" id="jcHelp">5-8 letters or numbers</div></form></div>
   <p style="margin-top:16px"><b>To sign in with a class code</b></p>
   <ul class="jbul"><li>Use an authorized account</li><li>Use a class code with 5-8 letters or numbers, and no spaces or symbols</li></ul>
   <p style="color:var(--onv)">If you have trouble joining the class, go to the Help Center article</p>
   <div class="acts"><button type="button" class="tb" data-close>Cancel</button><button class="tb" id="jcJoin" disabled>Join</button></div>`,
  (d,close)=>{const code=d.querySelector("#jcCode"),join=d.querySelector("#jcJoin"),help=d.querySelector("#jcHelp");
    d.querySelector("#jcSwitch").onclick=()=>snack("Switching accounts isn't part of this practice.");
    const valid=v=>/^[A-Za-z0-9]{5,8}$/.test(v);
    code.oninput=()=>{const v=code.value.trim();join.disabled=!v;
      if(code.getAttribute("aria-invalid")&&valid(v)){code.removeAttribute("aria-invalid");help.classList.remove("err");help.textContent="5-8 letters or numbers"}};
    const submit=e=>{e&&e.preventDefault();const v=code.value.trim();
      if(!valid(v)){code.setAttribute("aria-invalid","true");help.classList.add("err");help.textContent="Use 5-8 letters or numbers, with no spaces or symbols.";code.focus();return}
      const c=makeClass({name:"Design Thinking 101",section:"Cohort B",teacher:"Ada Okafor"},"student");
      c.code=v.toUpperCase();L.classesJoined++;close(true);openClass(c.id,"stream");
      snack(`Joined ${c.name} as a student.`);emit("class:joined")};
    d.querySelector("#jcForm").onsubmit=submit;join.onclick=submit},trigger);
  emit("join:dialog");
}

/* ======================================================================
   ROLE PICKER — the Workspace first-run beat: teacher or student.
   In the real product this is irreversible without an administrator; here
   Reset Sandbox starts over, which is the practice equivalent.
   ====================================================================== */
function showRolePicker(){
  const el=$("#role");
  el.innerHTML=`<div class="rolewrap"><div class="rolecard">
    <div class="eb">${esc(S.user.name)} · first sign-in</div>
    <h1 id="roleTitle" tabindex="-1">What brings you to Classroom?</h1>
    <p class="sub">Pick the role you want to rehearse. In Google Workspace for Education this choice is made once and only an administrator can change it. Here you can start over at any time with Reset Sandbox.</p>
    <div class="roleopts" role="group" aria-labelledby="roleTitle">
      <button class="roleopt" id="roleTeacher">${I("school")}<span><b>I'm a Teacher</b><span class="s">Create a class, post to it, set work and manage who is in it.</span></span>${I("arrow_forward","go")}</button>
      <button class="roleopt" id="roleStudent">${I("group")}<span><b>I'm a Student</b><span class="s">Join a class with a code and see it the way your students will.</span></span>${I("arrow_forward","go")}</button>
    </div>
    <p class="fine">${I("science")}Both roles are simulated. Nothing here reaches a real class.</p>
  </div></div>`;
  showScreen("role");$("#roleTitle").focus();
  $("#roleTeacher").onclick=()=>chooseRole("teacher");
  $("#roleStudent").onclick=()=>chooseRole("student");
}
function chooseRole(r){
  S.user.role=r;L.role=r;
  showScreen("shell");goHome();
  announce(r==="teacher"?"Teacher selected. Create your first class to begin.":"Student selected. Join a class with a code to begin.");
  setTimeout(()=>{const b=$("#plusBtn");b&&b.focus()},80);
}

/* ======================================================================
   CLASSROOM SHELL
   ====================================================================== */
function renderAll(){renderDrawer();renderTop();renderMain()}
function renderTop(){
  const c=$("#crumb");
  const t=UI.view==="class"&&A?A.name:UI.view==="placeholder"?UI.placeholder:"";
  c.innerHTML=t?`${I("chevron_right")}<span class="t">${esc(t)}</span>`:"";
  $("#topact").innerHTML=`<button class="ib" id="plusBtn" aria-label="Create or join a class" aria-haspopup="menu" aria-expanded="false">${I("add")}</button>`;
  const pb=$("#plusBtn");
  if(pb)pb.onclick=e=>{e.stopPropagation();openMenu(pb,[{label:"Join class",fn:()=>openJoinClass(pb)},{label:"Create class",fn:()=>startCreateClass(pb)}],{alignRight:true});emit("plus:open")};
}
$("#brandLink").onclick=e=>{e.preventDefault();goHome()};
$("#hamb").onclick=()=>{
  if(matchMedia("(max-width:1023px)").matches){document.body.classList.toggle("drawer-open");$("#hamb").setAttribute("aria-expanded",document.body.classList.contains("drawer-open"))}
  else{document.body.classList.toggle("rail");$("#hamb").setAttribute("aria-expanded",!document.body.classList.contains("rail"))}
};
function closeMobileDrawer(){document.body.classList.remove("drawer-open")}
function renderDrawer(){
  const act=k=>{if(UI.view==="home"&&k==="home")return"act";if(UI.view==="class"&&A&&k===A.id)return"act";if(UI.view==="placeholder"&&UI.placeholder===k)return"act";return""};
  const teaching=S.classes.filter(c=>c.role==="owner"),enrolled=S.classes.filter(c=>c.role==="student");
  const item=(k,icon,label,rail)=>`<button class="ni ${act(k)}" data-nav="${k}" ${act(k)?'aria-current="page"':""}>${I(icon,act(k)?"fill":"")}<span class="lbl">${label}</span><span class="rlbl" aria-hidden="true">${rail||label}</span></button>`;
  const classItem=c=>`<button class="ni ${act(c.id)}" data-class="${c.id}" ${act(c.id)?'aria-current="page"':""}><span class="ltr" aria-hidden="true">${esc(c.name.trim()[0].toUpperCase())}</span><span class="lbl">${esc(c.name)}${c.section?`<small>${esc(c.section)}</small>`:""}</span><span class="rlbl" aria-hidden="true">${esc(excerpt(c.name,9))}</span></button>`;
  const group=(key,title,icon,label,classes,open)=>classes.length?`<div class="gap"></div>
     <button class="ni hdr" data-group="${key}" aria-expanded="${open}">${I(icon)}<span class="lbl">${title}</span>${I(open?"expand_less":"expand_more","chev")}</button>
     <div class="sub" ${open?"":"hidden"}>${item(label[0],label[1],label[2])}${classes.map(classItem).join("")}</div>`:"";
  $("#drawer").innerHTML=item("home","home","Home")+item("Calendar","calendar_today","Calendar")
    +group("teaching","Teaching","group",["To review","checklist","To review"],teaching,UI.teachingOpen)
    +group("enrolled","Enrolled","school",["To-do","task_alt","To-do"],enrolled,UI.enrolledOpen)
    +`<div class="gap"></div>`+item("Archived classes","archive","Archived classes","Archived")+item("Settings","settings","Settings");
  $$("#drawer [data-nav]").forEach(b=>b.onclick=()=>{closeMobileDrawer();const n=b.dataset.nav;
    if(n==="home")goHome();else{UI.view="placeholder";UI.placeholder=n;renderAll();$("#main").focus()}});
  $$("#drawer [data-class]").forEach(b=>b.onclick=()=>{closeMobileDrawer();openClass(b.dataset.class,UI.tab||"stream")});
  $$("#drawer [data-group]").forEach(b=>b.onclick=()=>{const g=b.dataset.group;
    if(g==="teaching")UI.teachingOpen=!UI.teachingOpen;else UI.enrolledOpen=!UI.enrolledOpen;
    renderDrawer();$(`[data-group="${g}"]`).focus()});
}
function goHome(){UI.view="home";A=null;S.activeId=null;renderAll();$("#main").focus()}
function openClass(id,tab){
  if(id){S.activeId=id;A=S.classes.find(c=>c.id===id)||null}
  if(!A){goHome();return}
  UI.view="class";setTab(tab||"stream",true);renderDrawer();renderTop()}
$("#main").addEventListener("scroll",()=>$("#topbar").classList.toggle("scrolled",$("#main").scrollTop>4));

function renderMain(){
  const m=$("#main");
  if(UI.view==="home")return renderHome(m);
  if(UI.view==="placeholder"){m.innerHTML=`<div class="sheet"><div class="placeholder-page">${I("explore")}<b>${esc(UI.placeholder)} isn't part of this practice</b>This sandbox focuses on the Stream, Classwork and People tabs in EDU 101.<div style="margin-top:20px"><button class="fb" id="phGo">${A?`Open ${esc(A.name)}`:"Back to Home"}</button></div></div></div>`;$("#phGo").onclick=()=>A?openClass(A.id,"stream"):goHome();return}
  renderClass(m);
}

/* ---------------- Home (reference-backed: Home screenshot) ---------------- */
const EMPTY_HOME=`<svg width="220" height="150" viewBox="0 0 220 150" aria-hidden="true"><rect x="26" y="34" width="168" height="92" rx="12" fill="#E9EEF6"/><rect x="44" y="52" width="70" height="9" rx="4.5" fill="#A8C7FA"/><rect x="44" y="72" width="120" height="7" rx="3.5" fill="#fff"/><rect x="44" y="88" width="96" height="7" rx="3.5" fill="#fff"/><circle cx="176" cy="112" r="18" fill="#0B57D0"/><path d="M176 103v18M167 112h18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
function renderHome(m){
  const teaching=S.classes.filter(c=>c.role==="owner"),enrolled=S.classes.filter(c=>c.role==="student");
  const both=teaching.length&&enrolled.length;
  if(both&&!["teaching","enrolled"].includes(UI.homeView))UI.homeView="teaching";
  const list=both?(UI.homeView==="teaching"?teaching:enrolled):(teaching.length?teaching:enrolled);
  const teacher=S.user.role==="teacher";
  m.innerHTML=`<div class="home">
   ${both?`<div class="seg" role="tablist" aria-label="Class role">
     <button role="tab" id="segTeaching" aria-selected="${UI.homeView==="teaching"}" data-home="teaching">${UI.homeView==="teaching"?I("check"):""}Teaching</button>
     <button role="tab" id="segEnrolled" aria-selected="${UI.homeView==="enrolled"}" data-home="enrolled">${UI.homeView==="enrolled"?I("check"):""}Enrolled</button></div>`:""}
   <section class="scard" aria-labelledby="clsH"><div class="shead"><h2 id="clsH">Classes</h2></div>
   ${list.length?`<ul class="grid">${list.map(cardHTML).join("")}</ul>`
     :`<div class="cw-empty">${EMPTY_HOME}<b>${teacher?"Create your first class":"Join your first class"}</b>
        <span>${teacher?"A class holds your Stream, Classwork and People. Nothing exists until you create it.":"Ask your teacher for the class code, then join with it."}</span>
        <div style="margin-top:20px"><button class="fb" id="homeCreate">${I("add")}${teacher?"Create class":"Join class"}</button></div></div>`}
   </section></div>`;
  paintBanners();
  const hc=$("#homeCreate");if(hc)hc.onclick=()=>teacher?startCreateClass(hc):openJoinClass(hc);
  $$("[data-home]").forEach(b=>b.onclick=()=>{UI.homeView=b.dataset.home;renderMain()});
  $$("[data-open-class]").forEach(b=>b.onclick=e=>{e.preventDefault();openClass(b.dataset.openClass,"stream")});
  $$("[data-card-tab]").forEach(b=>b.onclick=()=>openClass(b.dataset.cardClass,b.dataset.cardTab));
}
function cardHTML(c){
  return `<li class="ccard"><div class="cban"><canvas class="cvs" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
   <a href="#" data-open-class="${c.id}" style="position:relative">${esc(c.name)}</a><div style="position:relative">${esc(c.section)}</div></div>
   <span class="cav" aria-hidden="true">${esc((c.role==="owner"?"Y":c.teachers[0]?c.teachers[0].name:"T").trim()[0].toUpperCase())}</span><div class="cbody"></div>
   <div class="cfoot">${c.role==="owner"?`<button class="ib" aria-label="Open Classwork for ${esc(c.name)}" data-card-tab data-card-class="${c.id}" data-card-tab="classwork">${I("assignment_ind")}</button>
     <button class="ib" aria-label="Open People for ${esc(c.name)}" data-card-class="${c.id}" data-card-tab="people">${I("group")}</button>`:""}</div></li>`;
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
const TABS=[["stream","Stream"],["classwork","Classwork"],["people","People"],["grades","Grades"]];
function renderClass(m){
  m.innerHTML=`<div class="sheet"><div class="ctabrow">
   <div class="ctabs" role="tablist" aria-label="${esc(A.name)}">${TABS.map(([k,l])=>`<button class="ctab" role="tab" id="tab-${k}" data-tab="${k}" aria-selected="${UI.tab===k}" aria-controls="panel" tabindex="${UI.tab===k?0:-1}">${l}</button>`).join("")}</div>
   <div class="ctabacts">
     <button class="ib" id="tbCal" aria-label="Open Google Calendar for ${esc(A.name)}">${I("calendar_today")}</button>
     <button class="ib" id="tbDrive" aria-label="Open folder for “${esc(A.name)}” in Google Drive">${I("folder_open")}</button>
     ${owner()?`<button class="ib" id="tbSettings" aria-label="Class settings for ${esc(A.name)}">${I("settings")}</button>`:""}
     <button class="ib ovf" id="tbMore" aria-label="More class actions" aria-haspopup="menu" aria-expanded="false">${I("more_vert")}</button>
   </div></div>
   <div class="col" id="panel" role="tabpanel" aria-labelledby="tab-${UI.tab}"></div></div>`;
  $$(".ctab").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $("#tbCal").onclick=()=>snack("The class Calendar isn't part of this practice.");
  $("#tbDrive").onclick=()=>snack("The class Drive folder isn't part of this practice.");
  const tset=$("#tbSettings");if(tset)tset.onclick=()=>classSettings(tset);
  $("#tbMore").onclick=e=>{e.stopPropagation();openMenu(e.currentTarget,[
    {icon:"calendar_today",label:"Google Calendar",fn:()=>snack("The class Calendar isn't part of this practice.")},
    {icon:"folder_open",label:"Class Drive folder",fn:()=>snack("The class Drive folder isn't part of this practice.")}]
    .concat(owner()?[{icon:"settings",label:"Class settings",fn:()=>classSettings($("#tbMore"))}]:[]),{alignRight:true})};
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
function renderPanel(){({stream:renderStream,classwork:renderClasswork,people:renderPeople,grades:renderGrades})[UI.tab]($("#panel"))}

/* ======================================================================
   STREAM
   ====================================================================== */
function renderStream(p,freshId){
  const posts=A.posts;
  p.innerHTML=`<section class="banner" aria-label="Class banner"><canvas class="cvs" aria-hidden="true"></canvas>
    <h1>${esc(A.name)}</h1><div class="secn">${esc(A.section)}</div>
    ${owner()?`<button class="custbtn" id="customBtn">${I("edit")}Customize</button>`:""}
    <button class="ib infobtn" id="classInfo" aria-label="View class information">${I("info")}</button></section>
  <div class="slay">
   <div class="lcol">
    ${owner()?`<section class="lcard meet" aria-labelledby="meetH"><h3 id="meetH">Meet<button class="ib" id="meetMenu" aria-label="Meet link options" aria-haspopup="menu" aria-expanded="false">${I("more_vert")}</button></h3>
      <p class="dis">You don't have permission to create or edit the Meet link. Contact your admin to get access.</p></section>`:""}
    <section class="lcard" aria-labelledby="ccH"><h3 id="ccH">Class code<button class="ib" id="codeMenu" aria-label="Class code options" aria-haspopup="menu" aria-expanded="false">${I("more_vert")}</button></h3>
      <div class="coderow"><div class="codebig" id="streamCode">${esc(A.code)}</div><button class="ib" id="codeFull" aria-label="Display class code">${I("fullscreen")}</button></div></section>
    <section class="lcard" aria-labelledby="upH"><h3 id="upH">Upcoming</h3><p>${A.assignments.length?"No work due soon":"Woohoo, no work due soon!"}</p><div class="va"><button class="tb" id="viewAll" style="padding:0 8px">View all</button></div></section>
   </div>
   <div class="feed">
    ${owner()?`<div class="comprow"><button class="tonal" id="annOpen">${I("edit")}New announcement</button><button class="tb" id="repostBtn" aria-label="Reuse post">${I("repeat")}Repost</button></div>`
      :`<div class="simnote">${I("info")}<span>You are in this class as a <b>student</b>. Students see the stream but don't post announcements.</span></div>`}
    ${posts.length?posts.map(post=>postCard(post,post.id===freshId)).join("")
      :`<div class="cw-empty stream-empty">${EMPTY_STREAM}<b>This is where you can talk to your class</b>
        <span>Use the stream to share announcements, post assignments, and respond to student questions</span>
        ${owner()?`<div style="margin-top:20px"><button class="ob" id="streamSettings">${I("settings")}Stream settings</button></div>`:""}</div>`}
   </div></div>`;
  paintBanners();
  $("#viewAll").onclick=()=>snack(`No work is due in ${A.name}.`);
  $("#classInfo").onclick=()=>classInfoDialog($("#classInfo"));
  const cf=$("#codeFull");if(cf)cf.onclick=()=>displayCode(cf);
  const cb=$("#customBtn");if(cb)cb.onclick=()=>customizeDialog(cb);
  const ss=$("#streamSettings");if(ss)ss.onclick=()=>streamSettings(ss);
  const rp=$("#repostBtn");if(rp)rp.onclick=()=>snack("There are no earlier posts to reuse yet.");
  const mm=$("#meetMenu");if(mm)mm.onclick=e=>{e.stopPropagation();openMenu(mm,[{icon:"link",label:"Manage Meet link",fn:()=>snack("Meet links aren't part of this practice.")}],{alignRight:true})};
  $("#codeMenu").onclick=e=>{e.stopPropagation();openMenu($("#codeMenu"),[
    {icon:"link",label:"Copy class invite link",fn:()=>snack("Invite link copied (simulated).")},
    {icon:"content_copy",label:"Copy class code",fn:()=>snack("Class code copied (simulated).")},
    {icon:"autorenew",label:"Reset class code",fn:()=>regenerate($("#codeMenu"))},
    {icon:"visibility",label:"Display class code",fn:()=>displayCode($("#codeMenu"))}])};
  const ao=$("#annOpen");if(ao)ao.onclick=()=>openComposer(ao);
  $$("[data-post-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const post=A.posts.find(x=>x.id===b.dataset.postMenu);
    const items=(post.protected||!owner())?[{icon:"content_copy",label:"Copy link",fn:()=>snack("Link copied (simulated).")}]
      :[{icon:"edit",label:"Edit",id:"mEditPost",fn:()=>openComposer(b,post)},{icon:"delete",label:"Delete",id:"mDeletePost",fn:()=>removePost(post,p)},"-",{icon:"content_copy",label:"Copy link",fn:()=>snack("Link copied (simulated).")}];
    openMenu(b,items);emit("postmenu:open")});
}
const EMPTY_STREAM=`<svg width="230" height="150" viewBox="0 0 230 150" aria-hidden="true"><rect x="30" y="30" width="96" height="70" rx="8" fill="#E9EEF6"/><rect x="104" y="48" width="96" height="70" rx="8" fill="#DDE3EA"/><rect x="118" y="64" width="60" height="7" rx="3.5" fill="#fff"/><rect x="118" y="80" width="44" height="7" rx="3.5" fill="#fff"/><rect x="44" y="46" width="58" height="7" rx="3.5" fill="#A8C7FA"/><rect x="44" y="62" width="68" height="6" rx="3" fill="#fff"/><rect x="44" y="76" width="50" height="6" rx="3" fill="#fff"/></svg>`;

/* The announcement composer is a modal in the real product, not an inline box (SPEC §6.5). */
function openComposer(trigger,editing){
  const draft=editing?editing.text:"";
  const ref=makeModal("scrim","dlg comp","cdT",`<h2 id="cdT">${editing?"Edit announcement":"Announcement"}</h2>
    <div class="forrow"><span class="lab">For</span>
      <span class="chipsel" aria-label="Post in ${esc(A.name)} ${esc(A.section)}">${esc(A.name)}${I("arrow_drop_down")}</span>
      <button class="ob allstu" id="allStudents">${I("group")}All students</button></div>
    <form id="annForm">
      <div class="rt"><label for="annText" class="sr">Announce something to your class</label>
        <textarea id="annText" placeholder="Announce something to your class" aria-describedby="annHint">${esc(draft)}</textarea>
        <div class="rtbar" role="toolbar" aria-label="Text formatting">
          ${[["format_bold","Bold"],["format_italic","Italic"],["format_underlined","Underline"],["format_list_bulleted","Bulleted list"],["format_clear","Remove formatting"]]
            .map(([ic,l])=>`<button type="button" class="ib" aria-label="${l}" data-rt="${l}">${I(ic)}</button>`).join("")}</div></div>
      <div class="attachrow" role="group" aria-label="Attach">
        ${[["add_to_drive","Add Google Drive file"],["smart_display","Add YouTube video"],["upload","Upload file"],["link","Add link"]]
          .map(([ic,l])=>`<button type="button" class="ib att" aria-label="${l}" data-att="${l}">${I(ic)}</button>`).join("")}</div>
      <p class="hint sr" id="annHint">Post becomes available when your announcement has text.</p>
      <div class="acts"><button type="button" class="tb" data-close>Cancel</button>
        <span class="split"><button class="fb" id="annPost" ${draft.trim()?"":"disabled"}>${editing?"Save":"Post"}</button>
        <button class="fb caret" id="annMore" aria-haspopup="menu" aria-expanded="false" aria-label="Post options" ${draft.trim()?"":"disabled"}>${I("arrow_drop_down")}</button></span></div>
    </form>`,
  (d,close)=>{const ta=d.querySelector("#annText"),post=d.querySelector("#annPost"),more=d.querySelector("#annMore");
    ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
    const sync=()=>{const ok=!!ta.value.trim();post.disabled=!ok;more.disabled=!ok;if(ok)emit("composer:text")};
    ta.oninput=sync;
    d.querySelectorAll("[data-rt]").forEach(b=>b.onclick=()=>snack(`${b.dataset.rt} isn't part of this practice.`));
    d.querySelectorAll("[data-att]").forEach(b=>b.onclick=()=>snack(`${b.dataset.att} isn't part of this practice.`));
    d.querySelector("#allStudents").onclick=e=>announceTo(e.currentTarget);
    more.onclick=e=>{e.preventDefault();e.stopPropagation();openMenu(more,[
      {label:"Post",fn:()=>submit()},{label:"Schedule",fn:()=>snack("Scheduling isn't part of this practice.")},
      {label:"Save draft",fn:()=>snack("Drafts aren't part of this practice.")}],{alignRight:true})};
    const submit=()=>{const t=ta.value.trim();if(!t)return;
      if(editing){editing.text=t;editing.edited=true;L.postsEdited++;close(true);renderPanel();snack("Post updated.");emit("post:edited");return}
      const id=nid("post-");A.posts.unshift({id,author:"You",when:"Just now",edited:false,protected:false,text:t,kind:"announcement"});
      L.postsCreated++;close(true);renderStream($("#panel"),id);snack("Posted to Stream.");emit("post:created")};
    d.querySelector("#annForm").onsubmit=e=>{e.preventDefault();submit()};
    sync()},trigger);
  emit("composer:open");return ref;
}
/* "Announce to" — the one dialog the pack captured on a white surface */
function announceTo(trigger){
  cDialog(`<h2 id="cdT">Announce to</h2>
   ${A.students.length?`<div class="stulist">${A.students.map(s=>`<label class="stu"><input type="checkbox" checked><span class="la" style="background:${laColor(s.name)}">${esc(s.name.trim()[0].toUpperCase())}</span>${esc(s.name)}</label>`).join("")}</div>`
     :`<div class="cw-empty" style="padding:24px 0">${EMPTY_PEOPLE}<b>There are no students in this class</b><div style="margin-top:16px"><button class="ob" id="atInvite">${I("person_add")}Invite students</button></div></div>`}
   <div class="acts"><button class="tb" data-close>Cancel</button><button class="tb" data-close>Done</button></div>`,
  (d,close)=>{const inv=d.querySelector("#atInvite");if(inv)inv.onclick=()=>{close(true);setTab("people");setTimeout(()=>{const b=$("#addStudentBtn");b&&b.focus()},60)}},trigger,null,"white");
}
function displayCode(trigger){
  simDialog(`<div class="hd"><div><span class="eb">Class code</span><h2 id="sdT">${esc(A.name)}</h2></div><button class="ib" data-close aria-label="Close">${I("close")}</button></div>
    <div class="bd" style="text-align:center"><div class="bigcode">${esc(A.code)}</div>
    <p>Students join at classroom.google.com with this code. It is fictional and reaches no one.</p></div>`,()=>{},trigger);
}
function classInfoDialog(trigger){
  cDialog(`<h2 id="cdT">Class information</h2>
   <dl class="kv info"><dt>Class name</dt><dd>${esc(A.name)}</dd>${A.section?`<dt>Section</dt><dd>${esc(A.section)}</dd>`:""}
   ${A.subject?`<dt>Subject</dt><dd>${esc(A.subject)}</dd>`:""}${A.room?`<dt>Room</dt><dd>${esc(A.room)}</dd>`:""}
   <dt>Class code</dt><dd>${esc(A.code)}</dd><dt>Theme</dt><dd>${esc(A.theme)}</dd></dl>
   <div class="acts"><button class="tb" data-close>Close</button></div>`,()=>{},trigger);
}
/* Class settings: full-screen dialog at wide widths, Save disabled until a field changes (SPEC §6.10).
   Details and the stream setting now; the rest of the inventory lands with the settings phase. */
function classSettings(trigger){
  const ed=document.createElement("div");ed.className="editor cset";ed.setAttribute("role","dialog");
  ed.setAttribute("aria-modal","true");ed.setAttribute("aria-labelledby","csT");
  const F=[["csName","Class name","name",true],["csSection","Section","section"],["csSubject","Subject","subject"],["csRoom","Room","room"]];
  ed.innerHTML=`<div class="ed-bar"><button type="button" class="ib" id="csClose" aria-label="Close dialog">${I("close")}</button>
     <h2 id="csT">Class settings</h2><button class="fb" id="csSave" disabled>Save</button></div>
   <div class="ed-body cset-body"><div class="ed-card">
     <h3>Class Details</h3>
     ${F.map(([id,label,key,req])=>`<div class="filled"><label for="${id}">${label}${req?"*":""}</label><input id="${id}" value="${esc(A[key]||"")}" autocomplete="off" maxlength="80"></div>`).join("")}
   </div>
   <div class="ed-card"><h3>General</h3>
     <div class="setrow"><div><b>Class code</b><span>${esc(A.code)}</span></div><button class="ob" id="csReset">${I("autorenew")}Reset</button></div>
     <fieldset class="radios"><legend>Classwork on the Stream</legend>
       ${[["details","Show attachments and details"],["condensed","Show condensed notifications"],["hidden","Hide notifications"]]
         .map(([v,l])=>`<label><input type="radio" name="csStream" value="${v}" ${A.streamClasswork===v?"checked":""}><span>${l}</span></label>`).join("")}</fieldset>
   </div></div>`;
  document.body.appendChild(ed);
  const close=()=>{ed.remove();document.removeEventListener("keydown",esck,true);if(trigger&&document.body.contains(trigger))trigger.focus()};
  const esck=e=>{if(e.key==="Escape"&&!document.querySelector(".menu")){e.stopPropagation();close()}};
  document.addEventListener("keydown",esck,true);trapFocus(ed);
  const save=ed.querySelector("#csSave"),dirty=()=>{save.disabled=false};
  ed.querySelectorAll("input").forEach(i=>{i.oninput=dirty;i.onchange=dirty});
  ed.querySelector("#csClose").onclick=close;
  ed.querySelector("#csReset").onclick=()=>{regenerate(null);close();snack(`New class code: ${A.code}.`)};
  save.onclick=()=>{const n=ed.querySelector("#csName").value.trim();if(!n){ed.querySelector("#csName").focus();return}
    A.name=n;A.section=ed.querySelector("#csSection").value.trim();A.subject=ed.querySelector("#csSubject").value.trim();
    A.room=ed.querySelector("#csRoom").value.trim();A.streamClasswork=ed.querySelector("input[name=csStream]:checked").value;
    close();renderAll();snack("Class settings saved.")};
  ed.querySelector("#csName").focus();
  emit("settings:open");
}
function streamSettings(trigger){
  cDialog(`<h2 id="cdT">Stream settings</h2>
   <div class="simnote">${I("science")}<span><b>Simplified for practice.</b> Classroom keeps these in class settings; the one that changes what you see here is below.</span></div>
   <fieldset class="radios"><legend>Classwork on the Stream</legend>
     ${[["details","Show attachments and details"],["condensed","Show condensed notifications"],["hidden","Hide notifications"]]
       .map(([v,l])=>`<label><input type="radio" name="cwStream" value="${v}" ${A.streamClasswork===v?"checked":""}><span>${l}</span></label>`).join("")}</fieldset>
   <div class="acts"><button class="tb" data-close>Cancel</button><button class="tb" id="ssSave">Save</button></div>`,
  (d,close)=>{d.querySelector("#ssSave").onclick=()=>{const v=d.querySelector("input[name=cwStream]:checked").value;A.streamClasswork=v;close(true);renderPanel();snack("Stream settings saved.")}},trigger);
}
function customizeDialog(trigger){
  const THEMES=[["Blue","#D0E4FF","#3271EA"],["Green","#BEEFBB","#128937"],["Pink","#FFD8EF","#DC258D"],["Orange","#FFDCC3","#E86E00"],["Cyan","#ACEDFF","#009EBB"],["Purple","#EEDCFE","#7438D2"],["Light blue","#E7F2FF","#4E8FF8"],["Grey","#E3E3E3","#5E5E5E"]];
  cDialog(`<h2 id="cdT">Customize appearance</h2>
   <div class="prev" aria-hidden="true"><canvas class="cvs"></canvas><span>${esc(A.name)}</span></div>
   <h3 class="ctl">Select theme color</h3>
   <div class="swatches" role="radiogroup" aria-label="Select theme color">
     ${THEMES.map(([n,fill,ring])=>`<button role="radio" aria-checked="${A.theme===n}" aria-label="${n}" data-theme="${n}" style="background:${fill};box-shadow:inset 0 0 0 2px ${ring}">${A.theme===n?I("check"):""}</button>`).join("")}</div>
   <div class="acts"><button class="tb" data-close>Cancel</button><button class="tb" id="cuSave" disabled>Save</button></div>`,
  (d,close)=>{let pick=A.theme;paintBanners();
    d.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>{pick=b.dataset.theme;
      d.querySelectorAll("[data-theme]").forEach(x=>{x.setAttribute("aria-checked",x.dataset.theme===pick);x.innerHTML=x.dataset.theme===pick?I("check"):""});
      d.querySelector("#cuSave").disabled=pick===A.theme});
    d.querySelector("#cuSave").onclick=()=>{A.theme=pick;close(true);renderPanel();snack(`Theme changed to ${pick}.`)}},trigger);
}
const EMPTY_PEOPLE=`<svg width="200" height="140" viewBox="0 0 200 140" aria-hidden="true"><rect x="34" y="86" width="132" height="26" rx="8" fill="#E9EEF6"/><path d="M66 86c0-16 13-28 29-28s29 12 29 28z" fill="#DDE3EA"/><circle cx="95" cy="46" r="15" fill="#DDE3EA"/><circle cx="88" cy="44" r="2" fill="#5F6368"/><circle cx="102" cy="44" r="2" fill="#5F6368"/><path d="M88 52c4 3 10 3 14 0" stroke="#5F6368" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
const EMPTY_GRADES=`<svg width="200" height="150" viewBox="0 0 200 150" aria-hidden="true"><rect x="40" y="40" width="120" height="76" rx="10" fill="#E9EEF6"/><rect x="56" y="58" width="40" height="8" rx="4" fill="#A8C7FA"/><rect x="56" y="76" width="88" height="6" rx="3" fill="#fff"/><rect x="56" y="90" width="66" height="6" rx="3" fill="#fff"/><circle cx="150" cy="106" r="16" fill="#0B57D0" opacity=".12"/><path d="M143 106h14M150 99v14" stroke="#0B57D0" stroke-width="2.5" stroke-linecap="round"/></svg>`;
function postCard(post,fresh){
  if(post.kind==="classwork"){
    if(A.streamClasswork==="hidden")return "";
    if(A.streamClasswork==="condensed")return `<article class="cpost ${fresh?"fresh":""}" data-post="${post.id}">
      <span class="icon" aria-hidden="true">${I("assignment")}</span>
      <div class="meta"><div class="who">${esc(post.author)} posted a new assignment: ${esc(post.text)}</div><div class="when">${esc(post.when)}</div></div>
      <button class="ib" data-post-menu="${post.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Options for ${esc(post.text)}">${I("more_vert")}</button></article>`;
  }
  return fullPostCard(post,fresh);
}
function fullPostCard(post,fresh){
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
function removePost(post,p){A.posts=A.posts.filter(x=>x!==post);L.postsRemoved++;if(UI.editingPost===post.id)UI.editingPost=null;renderStream(p);($("#annOpen")||$("#annText")).focus();snack("Post deleted.");emit("post:removed")}

/* ======================================================================
   CLASSWORK
   ====================================================================== */
function renderClasswork(p){
  const unf=unfiled(),any=A.topics.length||A.assignments.length;
  p.innerHTML=`${owner()?`<div class="cwbar"><button class="create" id="createBtn" aria-haspopup="menu" aria-expanded="false">${I("add")}Create</button></div>`:""}
   ${UI.nudgeVisible?`<div class="nudge" id="nudge" role="status">${I("lightbulb")}<p><b>Getting crowded?</b> Items filed under a topic are much easier for students to find than a long unfiled list.</p><button id="nudgeOk">Dismiss</button></div>`:""}
   ${!any?`<div class="cw-empty">${EMPTY_CW}<b>This is where you'll assign work</b><span>You can add assignments and other work for the class, then organise it into topics</span></div>`:""}
   ${unf.length?`<section class="topic" aria-labelledby="h-nt"><div class="thead nt"><h2 id="h-nt">No topic</h2><span class="tcount">${plural(unf.length,"item")}</span></div>${unf.map(rowHTML).join("")}</section>`:""}
   ${A.topics.map(t=>{const its=inTopic(t.id);return `<section class="topic" aria-labelledby="h-${t.id}" data-topic="${t.id}"><div class="thead"><h2 id="h-${t.id}">${esc(t.name)}</h2><span class="tcount">${plural(its.length,"item")}</span>
     <button class="ib" data-topic-menu="${t.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Topic options for ${esc(t.name)}">${I("more_vert")}</button></div>
     ${its.length?its.map(rowHTML).join(""):`<div class="empty-t">No work in this topic yet</div>`}</section>`}).join("")}`;
  const cb=$("#createBtn");if(cb)cb.onclick=e=>{e.stopPropagation();openMenu($("#createBtn"),[{icon:"assignment",label:"Assignment",id:"mAssignment",fn:()=>openAssignmentEditor(null,$("#createBtn"))},"-",{icon:"topic",label:"Topic",id:"mTopic",fn:()=>openTopicDialog(null,$("#createBtn"))}]);emit("create:open")};
  const nb=$("#nudgeOk");if(nb)nb.onclick=()=>{UI.nudgeVisible=false;renderClasswork(p);$("#createBtn").focus()};
  $$("[data-topic-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const t=A.topics.find(x=>x.id===b.dataset.topicMenu);
    openMenu(b,[{icon:"edit",label:"Rename",fn:()=>openTopicDialog(t,b)},{icon:"delete",label:"Delete",fn:()=>confirmDeleteTopic(t,b)}],{alignRight:true})});
  $$("[data-item-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const a=A.assignments.find(x=>x.id===b.dataset.itemMenu);
    openMenu(b,[{icon:"edit",label:"Edit",fn:()=>openAssignmentEditor(a,b)},{icon:"drive_file_move",label:"Move to topic",id:"mMove",fn:()=>openMoveDialog(a,b)},{icon:"delete",label:"Delete",fn:()=>{A.assignments=A.assignments.filter(x=>x!==a);L.assignmentsRemoved++;renderClasswork(p);$("#createBtn").focus();snack(`Assignment “${excerpt(a.title,30)}” deleted.`);emit("assign:removed")}}],{alignRight:true});emit("itemmenu:open")});
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
      const t={id:nid("topic-"),name:n};A.topics.unshift(t);L.topicsCreated++;close();renderPanel();$("#createBtn").focus();snack(`Topic “${excerpt(n,30)}” created.`);emit("topic:created")}},trigger,()=>emit("topic:cancel"));
  emit("topic:dialog");
}
function confirmDeleteTopic(t,trigger){const n=inTopic(t.id).length;
  cDialog(`<h2 id="cdT">Delete topic?</h2><p>“${esc(t.name)}” will be deleted.${n?` Its ${plural(n,"item")} won't be deleted. They'll move to No topic.`:""}</p>
   <div class="acts"><button class="tb" data-close>Cancel</button><button class="tb" id="delTopic">Delete</button></div>`,
  (d,close)=>{d.querySelector("#delTopic").onclick=()=>{A.assignments.forEach(a=>{if(a.topicId===t.id)a.topicId=null});A.topics=A.topics.filter(x=>x!==t);L.topicsRemoved++;
    const nud=maybeNudge();close(true);renderPanel();$("#createBtn").focus();snack(`Topic deleted.${n?` ${plural(n,"item")} moved to No topic.`:""}`);if(nud)announceNudge()}},trigger)}
function announceNudge(){setTimeout(()=>announce("Getting crowded? Items filed under a topic are much easier for students to find than a long unfiled list."),1400)}
function topicOptions(sel){return `<option value="">No topic</option>${A.topics.map(t=>`<option value="${t.id}" ${sel===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}`}
function openMoveDialog(a,trigger){
  cDialog(`<h2 id="cdT">Move to topic</h2><div class="simnote">${I("info")}<span><b>Practice shortcut.</b> In Classroom you change an assignment's topic by editing it. Both routes work here.</span></div>
   <p style="overflow-wrap:anywhere">${esc(a.title)}</p>
   <form id="mvForm"><div class="field of"><select id="moveTopic">${topicOptions(a.topicId)}</select>${I("arrow_drop_down","dd")}<label for="moveTopic">Topic</label></div>
   <div class="acts"><button type="button" class="tb" data-close>Cancel</button><button class="tb" id="moveGo">Move</button></div></form>`,
  (d,close)=>{d.querySelector("#mvForm").onsubmit=e=>{e.preventDefault();const v=d.querySelector("#moveTopic").value||null;
    if(v===a.topicId){close();return}
    a.topicId=v;L.assignmentsMoved++;const nud=maybeNudge();close(true);renderPanel();$("#createBtn").focus();
    snack(v?`Moved to “${excerpt(A.topics.find(t=>t.id===v).name,30)}”.`:"Moved to No topic.");if(nud)announceNudge();emit("assign:moved")}},trigger);
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
     <div class="st"><div class="k">For</div><div class="v">${esc(A.name)}${I("arrow_drop_down")}</div></div>
     <div class="st"><div class="k">Assign to</div><div class="v">All students${I("arrow_drop_down")}</div></div>
     <div class="st"><div class="k">Points</div><div class="v">100${I("arrow_drop_down")}</div></div>
     <div class="st"><div class="k">Due</div><div class="v">No due date${I("arrow_drop_down")}</div></div>
     <div><div class="st"><div class="k" id="aTopicK">Topic</div></div><div class="field of" style="margin:0"><select id="aTopic" aria-labelledby="aTopicK">${topicOptions(a?a.topicId:null)}</select>${I("arrow_drop_down","dd")}</div>
      ${A.topics.length?"":`<div class="help" style="margin-left:0;margin-top:8px">No topics yet. Create one from Create › Topic.</div>`}</div>
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
    else{A.assignments.unshift({id:nid("asg-"),title,instructions,topicId,edited:false});L.assignmentsCreated++;topicId?L.createdFiled++:L.createdUnfiled++;
      A.posts.unshift({id:nid("post-"),author:"You",when:"Just now",edited:false,protected:true,text:title,kind:"classwork"})}
    const nud=maybeNudge();
    ed.remove();document.removeEventListener("keydown",esck,true);
    if(UI.view!=="class"||UI.tab!=="classwork"){UI.view="class";UI.tab="classwork"}
    renderPanel();$("#createBtn").focus();
    const tn=topicId?A.topics.find(t=>t.id===topicId).name:null;
    snack(a?"Assignment updated.":tn?`Assignment filed under “${excerpt(tn,30)}”.`:"Assignment added to No topic.");
    if(nud)announceNudge();emit(a?"assign:edited":"assign:created")};
  emit("assign:editor");
}

/* ======================================================================
   GRADES — the fourth tab. Empty until there is work and there are students.
   ====================================================================== */
function renderGrades(p){
  const students=A.students,work=A.assignments;
  if(!students.length||!work.length){
    p.innerHTML=`<div class="cw-empty">${EMPTY_GRADES}<b>This is where you'll view and manage grades</b>
      <span>${!students.length?"Grades appear once students are in the class and there is work to mark.":"Create an assignment and grades for it appear here."}</span>
      ${owner()&&!students.length?`<div style="margin-top:20px"><button class="ob" id="grInvite">${I("person_add")}Invite students</button></div>`:""}</div>`;
    const gi=$("#grInvite");if(gi)gi.onclick=()=>{setTab("people");setTimeout(()=>{const b=$("#addStudentBtn");b&&b.focus()},60)};
    return;
  }
  p.innerHTML=`<div class="gradewrap"><div class="simnote">${I("science")}<span><b>Simplified for practice.</b> Marks aren't entered here; this shows the shape of the Grades table, with every student unmarked.</span></div>
   <table class="grades"><caption class="sr">Grades for ${esc(A.name)}</caption>
    <thead><tr><th scope="col">Student</th>${work.map(a=>`<th scope="col">${esc(excerpt(a.title,18))}<span>out of 100</span></th>`).join("")}</tr></thead>
    <tbody>${students.map(s=>`<tr><th scope="row"><span class="la" style="background:${laColor(s.name)}">${esc(s.name.trim()[0].toUpperCase())}</span>${esc(s.name)}</th>
      ${work.map(()=>`<td><span class="nomark">–<small>No mark</small></span></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

/* ======================================================================
   PEOPLE
   ====================================================================== */
const LA=["#1E8E3E","#8E24AA","#E8710A","#1967D2","#D01884","#12848F","#5F6368"];
const laColor=n=>{let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%997;return LA[h%LA.length]};
function renderPeople(p){
  const n=A.students.length;
  p.innerHTML=`<section aria-labelledby="tH"><div class="ph"><h2 id="tH">Teachers</h2>${owner()?`<button class="ib" id="inviteBtn" aria-label="Invite teachers" style="color:var(--pri)">${I("person_add")}</button>`:""}</div>
   ${A.teachers.map(t=>t.status==="owner"?`<div class="prow"><span class="la" style="background:#5C6BC0" aria-hidden="true">Y</span><div class="n">You<small>Class owner · can't be removed</small></div><span class="badge b-owner">${I("key")}Owner</span><span style="width:44px" aria-hidden="true"></span></div>`
     :`<div class="prow"><span class="la" style="background:#9AA0A6" aria-hidden="true">${esc(t.email[0].toUpperCase())}</span><div class="n">${esc(t.email)}<small>Co-teacher · invitation not accepted yet</small></div><span class="badge b-pending">${I("schedule")}Pending</span>
       <button class="ib" data-teacher-menu="${t.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Options for ${esc(t.email)}">${I("more_vert")}</button></div>`).join("")}
  </section>
  <section aria-labelledby="sH" style="margin-top:24px"><div class="ph"><h2 id="sH">Students</h2><span class="count" id="headcount" aria-live="off">${plural(n,"student")}</span>${owner()?`<button class="ib" id="addStudentBtn" aria-label="Add practice student" style="color:var(--pri)">${I("person_add")}</button>`:""}</div>
   ${n?A.students.map(s=>`<div class="prow"><span class="la" style="background:${laColor(s.name)}" aria-hidden="true">${esc(s.name.trim()[0].toUpperCase())}</span><div class="n">${esc(s.name)}<small>${s.placeholder?"Fictional placeholder student":"Fictional student added by you"}</small></div><span class="badge b-active">${I("check")}Active</span>
     ${owner()?`<button class="ib" data-student-menu="${s.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Options for ${esc(s.name)}">${I("more_vert")}</button>`:""}</div>`).join("")
     :`<div class="empty-t">No students yet. Add a practice student to see the roster change.</div>`}
  </section>
  <section class="codecard" aria-labelledby="pcH"><span class="lbl" id="pcH">Class code</span><span class="codebig" id="peopleCode">${esc(A.code)}</span>
   ${owner()?`<span class="simtag">${I("science")}Practice shortcut</span><button class="ob" id="regenBtn">${I("autorenew")}Regenerate code</button>`:""}</section>`;
  const ib=$("#inviteBtn");if(ib)ib.onclick=()=>openInvite(ib);
  const ab=$("#addStudentBtn");if(ab)ab.onclick=()=>openAddStudent(ab);
  const rb=$("#regenBtn");if(rb)rb.onclick=()=>regenerate(rb);
  $$("[data-teacher-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const t=A.teachers.find(x=>x.id===b.dataset.teacherMenu);
    openMenu(b,[{icon:"close",label:"Cancel invitation",fn:()=>{A.teachers=A.teachers.filter(x=>x!==t);L.invitesCancelled++;renderPeople(p);$("#inviteBtn").focus();snack(`Invitation for ${t.email} cancelled.`)}}],{alignRight:true})});
  if(owner())$$("[data-student-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const s=A.students.find(x=>x.id===b.dataset.studentMenu);
    openMenu(b,[{icon:"person_remove",label:"Remove",fn:()=>{A.students=A.students.filter(x=>x!==s);L.studentsRemoved++;renderPeople(p);$("#addStudentBtn").focus();snack(`Removed ${s.name}. ${plural(A.students.length,"student")} in ${A.name}.`);emit("student:removed")}}],{alignRight:true})});
}
function regenerate(trigger){
  const prev=A.code;A.code=genCode(prev);L.codeRegenerations++;
  if(UI.view==="class")renderPanel();
  const again=$("#regenBtn")||$("#codeMenu")||trigger;again&&again.focus();
  snack(`New class code generated: ${A.code}.`);announce(`New class code generated: ${spellCode(A.code)}.`);emit("code:regenerated")}
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
      if(A.teachers.some(t=>t.email&&t.email.toLowerCase()===v.toLowerCase())){setErr("This person has already been invited.");i.focus();return}
      A.teachers.push({id:nid("t-"),email:v,status:"pending"});L.invitesSent++;close(true);renderPanel();$("#inviteBtn").focus();snack(`Invite sent to ${v}.`);emit("invite:sent")}},trigger);
  emit("invite:dialog")}
function openAddStudent(trigger){
  cDialog(`<h2 id="cdT">Add practice student</h2><div class="simnote">${I("science")}<span><b>Simplified for practice.</b> In Classroom, students join through an invitation, an invite link or the class code. Here they are added directly and show as Active.</span></div>
   <form id="stuForm" novalidate><div class="field of"><input id="stuName" autocomplete="off" maxlength="60" placeholder=" " aria-describedby="stuHelp"><label for="stuName">Student name</label></div>
   <div class="help" id="stuHelp">Use a fictional name, for example Ada Okafor</div>
   <div class="acts"><button type="button" class="tb" data-close>Cancel</button><button class="tb" id="stuSubmit" disabled>Add</button></div></form>`,
  (d,close)=>{const i=d.querySelector("#stuName"),b=d.querySelector("#stuSubmit");
    i.oninput=()=>{b.disabled=!i.value.trim();if(i.value.trim())emit("student:text")};
    d.querySelector("#stuForm").onsubmit=e=>{e.preventDefault();const v=i.value.trim();if(!v)return;
      A.students.push({id:nid("u"),name:v,placeholder:false});L.studentsAdded++;close(true);renderPanel();$("#addStudentBtn").focus();snack(`${v} added to ${A.name} as Active. ${plural(A.students.length,"student")}.`);emit("student:added")}},trigger);
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
const cDialog=(html,onMount,trigger,onCancel,surface)=>makeModal("scrim","dlg"+(surface==="white"?" white":""),"cdT",html,onMount,trigger,onCancel);
const simDialog=(html,onMount,trigger)=>makeModal("simscrim","simdlg","sdT",html,onMount,trigger);

/* ---------------- skip link, Help FAB, tooltips ---------------- */
$("#skipLink").onclick=e=>{e.preventDefault();const m=$("#main");m.focus();m.scrollTop=0};
$("#helpFab").onclick=e=>openMenu(e.currentTarget,[
  {icon:"help_center",label:"Help Centre",fn:()=>snack("The Help Centre isn't part of this practice.")},
  {icon:"smart_display",label:"Watch the walkthrough",fn:()=>openPlayer($("#helpFab"))},
  {icon:"route",label:"Practice Help",fn:()=>openHelp($("#helpFab"))}],{alignRight:true});
/* Every icon button carries an aria-label; the product pairs each one with a matching tooltip. */
let tipEl,tipT;
function hideTip(){clearTimeout(tipT);if(tipEl){tipEl.remove();tipEl=null}}
function showTip(el){
  const label=el.getAttribute("aria-label");if(!label)return;hideTip();
  tipEl=document.createElement("div");tipEl.className="tip";tipEl.textContent=label;document.body.appendChild(tipEl);
  const r=el.getBoundingClientRect(),w=tipEl.offsetWidth,h=tipEl.offsetHeight;
  let top=r.bottom+6;if(top+h>innerHeight-8)top=r.top-h-6;
  tipEl.style.left=Math.max(8,Math.min(r.left+r.width/2-w/2,document.documentElement.clientWidth-w-8))+"px";
  tipEl.style.top=Math.max(8,top)+"px";
}
const tipTarget=e=>e.target.closest&&e.target.closest("#shell [aria-label],.fab[aria-label]");
document.addEventListener("pointerover",e=>{const t=tipTarget(e);if(!t||t===tipEl)return;clearTimeout(tipT);tipT=setTimeout(()=>showTip(t),500)});
document.addEventListener("pointerout",e=>{if(tipTarget(e))hideTip()});
document.addEventListener("focusin",e=>{const t=tipTarget(e);if(t)showTip(t)});
document.addEventListener("focusout",hideTip);
document.addEventListener("keydown",e=>{if(e.key==="Escape")hideTip()},true);
["click","scroll","wheel"].forEach(ev=>document.addEventListener(ev,hideTip,true));

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
  if(introSeen[t]||!INTROS[t])return;
  setTimeout(()=>{if(introSeen[t]||UI.view!=="class"||UI.tab!==t||Guide.g||$("#shell").hidden||document.querySelector(".scrim,.simscrim,.editor"))return;
    showIntro(t,$("#tab-"+t))},0);
}
function showIntro(t,trigger){
  if(!INTROS[t])return;
  introSeen[t]=true;if(document.querySelector(".dlg.tabcard"))return;const x=INTROS[t];
  makeModal("scrim","dlg tabcard","cdT",`<div class="iv" role="img" aria-label="${esc(x.label)}" style="--d:${INTRO_DUR[t]}">${x.svg()}</div>
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
  people:"People shows who is in the class. Invited co-teachers stay Pending until they accept; practice students join as Active. The class code controls who can join.",
  grades:"Grades collects every student's work for each assignment. It stays empty until the class has both students and work, and in this practice no marks are entered — it shows you where marking would happen."
};
const GUIDES={
  stream:[
    {key:"post",title:"Post an announcement",steps:[
      {t:"#annOpen",x:"Select “Announce something to your class”.",until:"composer:open"},
      {t:"#annText",x:"Type a short message. Post stays unavailable until there's text.",until:"composer:text"},
      {t:"#annPost",x:"Select Post. Your announcement appears at the top of the Stream.",until:"post:created"}]},
    {key:"edit",title:"Edit your own post",needs:()=>A.posts.some(p=>!p.protected),needMsg:"Post an announcement first, then come back to edit it.",steps:[
      {t:()=>firstOwnPostMenu(),x:"Open the options (⋮) on one of your posts.",until:"postmenu:open"},
      {t:"#mEditPost",x:"Choose Edit.",until:null,nextOn:"#editText"},
      {t:"#editSave",x:"Change the text, then select Save.",until:"post:edited"}]},
    {key:"remove",title:"Delete your own post",needs:()=>A.posts.some(p=>!p.protected),needMsg:"Post an announcement first. The protected welcome post can't be deleted.",steps:[
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
      {t:"#aTopic",x:()=>A.topics.length?"Choose a topic to file it under.":"Choose a topic. With no topics yet, it will go to No topic.",until:"assign:topic",skipIf:()=>!A.topics.length},
      {t:"#aAssign",x:"Select Assign.",until:"assign:created"}]},
    {key:"move",title:"Move an assignment to a topic",needs:()=>A.assignments.length&&A.topics.length,needMsg:"Create at least one topic and one assignment first.",steps:[
      {t:()=>document.querySelector("[data-item-menu]"),x:"Open the options (⋮) on an assignment.",until:"itemmenu:open"},
      {t:"#mMove",x:"Choose Move to topic.",until:"move:dialog"},
      {t:"#moveTopic",x:"Pick a topic, then select Move.",until:"assign:moved"}]}
  ],
  grades:[],
  people:[
    {key:"invite",title:"Invite a co-teacher",steps:[
      {t:"#inviteBtn",x:"Select Invite teachers.",until:"invite:dialog"},
      {t:"#invEmail",x:"Type an email address, for example tutor@example.com.",until:"invite:valid"},
      {t:"#invSubmit",x:"Select Invite. The new row shows Pending.",until:"invite:sent"}]},
    {key:"student",title:"Add a practice student",steps:[
      {t:"#addStudentBtn",x:"Select Add practice student.",until:"student:dialog"},
      {t:"#stuName",x:"Type a fictional name.",until:"student:text"},
      {t:"#stuSubmit",x:"Select Add. The student appears as Active and the count updates.",until:"student:added"}]},
    {key:"remove",title:"Remove a student",needs:()=>A.students.length>0,needMsg:"Add a practice student first.",steps:[
      {t:()=>document.querySelector("[data-student-menu]"),x:"Open the options (⋮) next to a student.",until:null,nextOn:".menu"},
      {t:".menu [role=menuitem]",x:"Choose Remove.",until:"student:removed"}]},
    {key:"code",title:"Regenerate the class code",steps:[
      {t:"#regenBtn",x:"Select Regenerate code. The old code stops working.",until:"code:regenerated"}]}
  ]
};
function firstOwnPostMenu(){const p=A.posts.find(x=>!x.protected);return p?document.querySelector(`[data-post-menu="${p.id}"]`):null}

const Guide={g:null,i:0,raf:0,doneT:0,
  start(g){this.exit(true);if(UI.view!=="class"&&A)openClass(A.id,UI.tab);
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
  if(!A){simDialog(`<div class="hd"><div><span class="eb">Practice Help</span><h2 id="sdT">Set your class up first</h2></div></div>
    <div class="bd"><p>The guides walk through Stream, Classwork and People, so they need a class. Use <b>+</b> in the top bar to create one (or join one as a student), then open Practice Help again.</p>
    <div style="display:flex;gap:10px;justify-content:flex-end"><button class="simbtn ghost" data-close>Close</button><button class="simbtn" id="hMake">${I("add")}Create a class</button></div></div>`,
    (d,close)=>{d.querySelector("#hMake").onclick=()=>{close(true);const b=$("#plusBtn");S.user.role==="student"?openJoinClass(b):startCreateClass(b)}},trigger);return}
  const tab=UI.view==="class"?UI.tab:"stream";const tabName=TABS.find(t=>t[0]===tab)[1];
  let dlgRef;
  const view=(which)=>{
    const d=dlgRef.el.firstElementChild;
    if(which==="menu"){d.innerHTML=`<div class="hd"><div><span class="eb">Practice Help</span><h2 id="sdT">How can we help?</h2></div><button class="ib" data-x aria-label="Close help">${I("close")}</button></div>
      <div class="bd">
       <button class="choice" id="hWatch">${I("smart_display")}<span><b>Watch the walkthrough</b><span class="s">A 76-second captioned overview. Your sandbox isn't changed.</span></span>${I("chevron_right","go")}</button>
       <button class="choice" id="hGuide">${I("route")}<span><b>Guide me</b><span class="s">Choose one action in ${tabName}. We'll highlight each step.</span></span>${I("chevron_right","go")}</button>
       <button class="choice" id="hWhat">${I("info")}<span><b>What can I do here?</b><span class="s">A short explanation of the ${tabName} tab.</span></span>${I("chevron_right","go")}</button>
      </div>`;
      d.querySelector("#hWatch").onclick=()=>{dlgRef.close(true);openPlayer(trigger)};
      d.querySelector("#hGuide").onclick=()=>view("guide");d.querySelector("#hWhat").onclick=()=>view("what");d.querySelector("#hWatch").focus()}
    if(which==="guide"){d.innerHTML=`<div class="hd"><div><span class="eb">Guide me · ${tabName}</span><h2 id="sdT">What would you like to practise?</h2></div><button class="ib" data-x aria-label="Close help">${I("close")}</button></div>
      <div class="bd"><button class="back" id="hBack">${I("arrow_back")}Back</button>
       ${!GUIDES[tab].length?`<p style="margin:8px 0 0;color:var(--sim-muted)">There's nothing to rehearse on this tab yet. Open Stream, Classwork or People and choose Practice Help again.</p>`:""}
       ${GUIDES[tab].map((g,i)=>`<button class="choice" data-g="${i}">${I("touch_app")}<span><b>${esc(g.title)}</b><span class="s">${g.needs&&!g.needs()?esc(g.needMsg):plural(g.steps.length,"step")+" · leave at any time"}</span></span>${I("chevron_right","go")}</button>`).join("")}
       <p style="margin-top:14px;font-size:13px;color:var(--sim-muted)">Other tabs have their own guides. Open a tab, then choose Practice Help.</p></div>`;
      d.querySelector("#hBack").onclick=()=>view("menu");
      d.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{const g=GUIDES[tab][+b.dataset.g];dlgRef.close(true);setTimeout(()=>{Guide.start(g);const el=Guide.target();el&&el.focus()},60)});
      const first=d.querySelector("[data-g]");(first||d.querySelector("#hBack")).focus()}
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
   Playing it never touches S or L. It starts on its own only straight after the opener
   (openPlayer with auto); opened from Watch walkthrough, it waits for Play.
   ====================================================================== */
const fmt=t=>{t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0")};
let ccOn=true,txOn=false,lastVol=1;
function openPlayer(trigger,opts={}){
  Guide.exit(true);
  const has=!!VIDEO_SRC&&!VIDEO_SRC.startsWith("/*");
  const ref=makeModal("simscrim","player","plT",`
    <div class="ph2"><h2 id="plT">Walkthrough · The Sandbox Class</h2><button class="ib" id="plX" aria-label="Close walkthrough">${I("close")}</button></div>
    <div class="vwrap">${has?`<video id="vid" preload="metadata" playsinline aria-label="Walkthrough video, 76 seconds, showing the sandbox in use">${VIDEO_WEBM.startsWith("data:")?`<source src="${VIDEO_WEBM}" type="video/webm">`:""}<source src="${VIDEO_SRC}" type="video/mp4"></video>
       <div class="cc" id="cc" hidden></div><button class="vunmute" id="vUnmute" hidden>${I("volume_off")}Turn on sound</button><button class="vbegin" id="vBegin" hidden>${I("play_arrow","fill")}Begin Practice</button><div class="big" id="big"><button id="bigPlay" aria-label="Play walkthrough">${I("play_arrow","fill")}</button></div>`
       :`<div class="nov">The walkthrough video isn't included in this build. Use Practice Help › Guide me instead.</div>`}</div>
    ${has?`<div class="pctl">
      <button class="ib" id="pPlay" aria-label="Play">${I("play_arrow","fill")}</button>
      <button class="ib" id="pReplay" aria-label="Replay from start">${I("replay")}</button>
      <span class="time" id="pTime">0:00 / 1:16</span>
      <input type="range" class="seek" id="pSeek" min="0" max="76" step="0.1" value="0" aria-label="Seek">
      <button class="ib" id="pMute" aria-label="Mute">${I("volume_up")}</button>
      <input type="range" class="vol" id="pVol" min="0" max="1" step="0.05" value="${lastVol}" aria-label="Volume">
      <button class="ib" id="pCC" aria-pressed="${ccOn}" aria-label="Captions">${I("closed_caption")}</button>
      <button class="ib" id="pTx" aria-pressed="${txOn}" aria-label="Transcript" aria-controls="tx">${I("subject")}</button>
     </div>
     <div class="tx" id="tx" ${txOn?"":"hidden"}><h3>Transcript</h3>${CUES.map((c,i)=>`<button data-c="${i}"><span>${fmt(c.s)}</span>${esc(c.t)}</button>`).join("")}</div>`:""}`,
  (box,close)=>{box.querySelector("#plX").onclick=()=>{const v=box.querySelector("#vid");v&&v.pause();close()};if(!has)return;
    const v=box.querySelector("#vid"),seek=box.querySelector("#pSeek"),vol=box.querySelector("#pVol"),cc=box.querySelector("#cc"),big=box.querySelector("#big");
    v.volume=lastVol;
    const setPlay=()=>{box.querySelector("#pPlay").innerHTML=v.paused?I("play_arrow","fill"):I("pause","fill");box.querySelector("#pPlay").setAttribute("aria-label",v.paused?"Play":"Pause");big.hidden=!v.paused||v.currentTime>0};
    const toggle=()=>{v.paused||v.ended?v.play():v.pause()};
    box.querySelector("#bigPlay").onclick=toggle;box.querySelector("#pPlay").onclick=toggle;v.onclick=toggle;
    box.querySelector("#pReplay").onclick=()=>{v.currentTime=0;v.play()};
    /* End card: the drawn Begin Practice button becomes a real one. It appears with the closing line
       ("Your turn — Begin Practice."), which is always spoken over the end card. */
    const vb=box.querySelector("#vBegin"),endT=CUES.length?CUES[CUES.length-1].s-0.9:Infinity;
    const endCard=()=>{const on=v.ended||v.currentTime>=endT;vb.hidden=!on;if(on)big.hidden=true};
    vb.onclick=()=>{v.pause();const fromWelcome=!$("#welcome").hidden;close();if(fromWelcome)$("#beginBtn").onclick()};
    v.onplay=setPlay;v.onpause=setPlay;
    v.onended=()=>{setPlay();endCard();vb.focus();announce("Walkthrough finished. Begin Practice is available.")};
    v.onloadedmetadata=()=>{seek.max=v.duration||76;box.querySelector("#pTime").textContent=`${fmt(v.currentTime)} / ${fmt(v.duration)}`};
    v.ontimeupdate=()=>{seek.value=v.currentTime;seek.setAttribute("aria-valuetext",`${fmt(v.currentTime)} of ${fmt(v.duration)}`);box.querySelector("#pTime").textContent=`${fmt(v.currentTime)} / ${fmt(v.duration||76)}`;
      const k=CUES.findIndex(c=>v.currentTime>=c.s&&v.currentTime<c.e);cc.hidden=!ccOn||k<0;if(k>=0)cc.textContent=CUES[k].t;
      box.querySelectorAll(".tx button").forEach((b,i)=>b.classList.toggle("now",i===k));endCard()};
    seek.oninput=()=>{v.currentTime=+seek.value};
    vol.oninput=()=>{v.volume=+vol.value;v.muted=+vol.value===0;lastVol=+vol.value;box.querySelector("#pMute").innerHTML=I(v.muted?"volume_off":"volume_up")};
    const vu=box.querySelector("#vUnmute");
    const syncMute=()=>{box.querySelector("#pMute").innerHTML=I(v.muted?"volume_off":"volume_up");box.querySelector("#pMute").setAttribute("aria-label",v.muted?"Unmute":"Mute");if(!v.muted)vu.hidden=true};
    v.onvolumechange=syncMute;
    box.querySelector("#pMute").onclick=()=>{v.muted=!v.muted;if(!v.muted&&v.volume===0){v.volume=.8;vol.value=.8}};
    vu.onclick=()=>{v.muted=false;if(v.volume===0){v.volume=.8;vol.value=.8}box.querySelector("#pPlay").focus()};
    box.querySelector("#pCC").onclick=e=>{ccOn=!ccOn;e.currentTarget.setAttribute("aria-pressed",ccOn);v.ontimeupdate()};
    box.querySelector("#pTx").onclick=e=>{txOn=!txOn;e.currentTarget.setAttribute("aria-pressed",txOn);box.querySelector("#tx").hidden=!txOn};
    box.querySelectorAll(".tx button").forEach(b=>b.onclick=()=>{v.currentTime=CUES[+b.dataset.c].s+.05;if(v.paused)v.play()});
    box.addEventListener("keydown",e=>{if(e.target.closest("input,button,textarea"))return;if(e.key===" "||e.key==="k"){e.preventDefault();toggle()}});
    box.querySelector("#bigPlay").focus();
    /* Straight after the opener: start playing. Browsers only allow sound after the learner has
       clicked something (e.g. Skip intro); otherwise start muted with captions and offer sound. */
    if(opts.auto){
      const started=()=>{box.querySelector("#pPlay").focus();announce(v.muted?"Walkthrough playing without sound, with captions. Turn on sound is available. Press Escape to close.":"Walkthrough playing. Press Escape to close.")};
      v.play().then(started).catch(()=>{v.muted=true;v.play().then(()=>{vu.hidden=false;started();vu.focus()}).catch(()=>{})});
    }},trigger);
}
$("#dWatch").onclick=e=>openPlayer(e.currentTarget);

/* ======================================================================
   RESET / END PRACTICE / SUMMARY / FINISH
   ====================================================================== */
function resetSandbox(){Guide.exit(true);closeMenus();$$(".scrim,.simscrim,.editor").forEach(x=>x.remove());
  seed();showRolePicker();snack("Sandbox reset. Choose a role and set your class up again.")}
$("#dReset").onclick=resetSandbox;
$("#dEnd").onclick=openSummary;

const LEVELS=["Needs more practice","Developing","Confident"];
function openSummary(){
  Guide.exit(true);closeMenus();$$(".scrim,.simscrim,.editor").forEach(x=>x.remove());
  const K=A||S.classes[0]||null;   /* the class to report on, if the learner made one */
  const unf=K?K.assignments.filter(a=>!a.topicId).length:0,filed=K?K.assignments.length-unf:0;
  const pend=K?K.teachers.filter(t=>t.status==="pending").length:0;
  const most=Object.entries(L.tabOpens).sort((a,b)=>b[1]-a[1])[0];
  const el=$("#summary");
  el.innerHTML=`<div class="sum">
   <div class="sum-top"><div><div class="eb">${K?esc(K.name)+" · ":""}Practice Summary</div><h1 id="sumTitle" tabindex="-1">What you practised</h1></div><span class="notscore">${I("block")}Not a score</span></div>
   <div class="two">
    <section class="pan" aria-labelledby="csH"><h2 id="csH">${I("domain")}Your class right now</h2><p class="sub">${K?`Current contents of ${esc(K.name)}.`:"You haven't created a class yet."}</p>
     ${K?`<dl class="kv">
      <dt class="grp">Class</dt><dt>Name</dt><dd>${esc(K.name)}</dd>${K.section?`<dt>Section</dt><dd>${esc(K.section)}</dd>`:""}<dt>Your role</dt><dd>${K.role==="owner"?"Teacher (owner)":"Student"}</dd>
      <dt class="grp">Stream</dt><dt>Posts remaining</dt><dd>${K.posts.length}</dd>
      <dt class="grp">Classwork</dt><dt>Topics</dt><dd>${K.topics.length}</dd><dt>Assignments</dt><dd>${K.assignments.length}</dd><dt>Filed under a topic</dt><dd>${filed}</dd><dt>No topic (unfiled)</dt><dd>${unf}</dd>
      <dt class="grp">People</dt><dt>Teachers</dt><dd>${K.teachers.filter(t=>t.status==="owner").length} owner${pend?`, ${pend} pending`:""}</dd><dt>Students</dt><dd>${K.students.length}</dd><dt>Class code</dt><dd style="letter-spacing:.06em">${esc(K.code)}</dd>
     </dl>`:""}
     ${K&&(K.topics.length||unf)?`<ul class="tree" aria-label="Classwork structure">${unf?`<li>No topic (${unf})</li>`:""}${K.topics.map(t=>{const a=K.assignments.filter(x=>x.topicId===t.id);return `<li>${esc(t.name)} (${a.length})${a.length?`<ul>${a.map(x=>`<li>${esc(x.title)}</li>`).join("")}</ul>`:""}</li>`}).join("")}</ul>`:""}
    </section>
    <section class="pan" aria-labelledby="aaH"><h2 id="aaH">${I("list_alt")}Actions you tried</h2><p class="sub">Everything you did this session, including work you later removed.</p>
     <dl class="kv">
      <dt class="grp">Setting up</dt><dt>Role chosen</dt><dd>${L.role?L.role[0].toUpperCase()+L.role.slice(1):"None"}</dd><dt>Classes created</dt><dd>${L.classesCreated}</dd>${L.classesJoined?`<dt>Classes joined</dt><dd>${L.classesJoined}</dd>`:""}
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
  el.querySelectorAll("[data-cont]").forEach(b=>b.onclick=()=>{showScreen("shell");
    if(K){openClass(K.id,b.dataset.cont);focusTab()}else goHome()});
  $("#sumReset").onclick=resetSandbox;$("#sumFinish").onclick=showFinish;
}
function showFinish(){const t=UI.transfer.trim();const el=$("#finish");
  el.innerHTML=`<div class="fin"><div class="in"><img class="mivalogo" src="@@LOGO_BLUE@@" alt="Miva Open University" width="966" height="312" style="margin:0 auto">
   <h1 id="finTitle" tabindex="-1" style="font:500 15px/20px var(--fs);letter-spacing:.12em;text-transform:uppercase;color:var(--sim-teal);margin:28px 0 0">Practice complete</h1>
   ${t?`<blockquote>“${esc(t)}”</blockquote><p>That's your first real action this week.</p>`:`<blockquote>You've rehearsed Stream, Classwork and People in a class that doesn't exist.</blockquote>`}
   <p>The safest place to make a first mistake is the sandbox. Come back before your real class goes live.</p>
   <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px"><button class="simbtn ghost" id="finBack">${I("arrow_back")}Back to summary</button><button class="simbtn" id="finAgain">${I("restart_alt")}Start a fresh sandbox</button></div></div></div>`;
  showScreen("finish");$("#finTitle").focus();$("#finBack").onclick=openSummary;$("#finAgain").onclick=resetSandbox}

/* ======================================================================
   OPENER — house spec (brand/OPENER.md). The three partner logos arrive one at
   a time; the row re-centres on each arrival, so what is on screen stays centred
   and nothing overlaps. Ends on a still frame with Begin, which hands over to the
   walkthrough — that click is also what lets the video play with sound.
   ====================================================================== */
let openerEnd=null;
function playOpener(){
  const intro=$("#intro");if(!intro){$("#beginBtn").focus();return}
  const row=intro.querySelector(".intro-logos"),logos=$$("#intro .intro-logo");
  const begin=$("#introBegin"),skip=$("#introSkip"),w=$("#welcome");
  const reduced=reduceMotion(),timers=[];let shown=1,finished=false;
  const at=(ms,fn)=>timers.push(setTimeout(fn,ms));
  w.inert=true;
  /* Layout positions only: getBoundingClientRect would include the entry scale.
     Measured inside the row: its transform makes it the offset parent of the logos, so mixing
     their offsets with the row's own offsetLeft would shift the line by that amount. */
  const centreOn=n=>{const vis=logos.slice(0,Math.max(n,1)),a=vis[0],z=vis[vis.length-1];
    const base=a.offsetParent===row?0:row.offsetLeft;
    const mid=(a.offsetLeft+z.offsetLeft+z.offsetWidth)/2-base;
    row.style.setProperty("--shift",(row.offsetWidth/2-mid)+"px")};
  const showBegin=()=>{timers.forEach(clearTimeout);logos.forEach(el=>el.classList.add("in","set"));centreOn(logos.length);
    intro.classList.add("st-line","st-title","st-begin");begin.focus({preventScroll:true})};
  const finish=(walkthrough=true)=>{if(finished)return;finished=true;openerEnd=null;timers.forEach(clearTimeout);
    document.removeEventListener("keydown",key,true);removeEventListener("resize",onResize);
    intro.classList.add("out");setTimeout(()=>intro.remove(),reduced?0:700);w.inert=false;
    const hasVideo=!!VIDEO_SRC&&!VIDEO_SRC.startsWith("/*");
    if(walkthrough&&hasVideo)openPlayer($("#beginBtn"),{auto:true});else $("#beginBtn").focus()};
  const key=e=>{if(finished||e.key!=="Escape")return;e.preventDefault();showBegin()};
  const onResize=()=>centreOn(shown);
  openerEnd=()=>finish(false);
  begin.onclick=()=>finish();skip.onclick=showBegin;
  document.addEventListener("keydown",key,true);addEventListener("resize",onResize);
  if(reduced){showBegin();return}
  skip.focus();
  const play=()=>{if(finished)return;centreOn(1);
    const ENTER=350,GAP=1000,HOLD=700;
    logos.forEach((el,i)=>{at(ENTER+i*GAP,()=>{shown=i+1;centreOn(shown);el.classList.add("in")});
      at(ENTER+i*GAP+HOLD,()=>el.classList.add("set"))});
    const settled=ENTER+(logos.length-1)*GAP+HOLD;
    at(settled+500,()=>intro.classList.add("st-line"));
    at(settled+750,()=>intro.classList.add("st-title"));
    at(settled+1400,()=>{intro.classList.add("st-begin");begin.focus({preventScroll:true})})};
  /* the logos must be laid out before the centring offsets mean anything */
  const imgs=$$("#intro .intro-logo img");
  Promise.all(imgs.map(im=>im.complete?null:new Promise(r=>{im.onload=im.onerror=r}))).then(()=>requestAnimationFrame(play));
}

/* boot: Miva opener, then the welcome screen */
L.tabsVisited=[];
showScreen("welcome");playOpener();
/* expose for automated verification only (read-only snapshot) */
window.__sandbox={state:()=>JSON.parse(JSON.stringify(S)),log:()=>JSON.parse(JSON.stringify(L)),
  /* UI-only: lets the walkthrough recorder skip the tab intro cards */skipIntros:()=>TABS.forEach(([k])=>{introSeen[k]=true}),
  /* UI-only: ends the opener at once (tests, recorder) */skipOpener:()=>{openerEnd&&openerEnd(false)}};
})();
