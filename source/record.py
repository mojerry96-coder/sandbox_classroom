"""Record the real build in a separate demo session as keyframed screenshots + cursor timeline."""
import asyncio, json, os, shutil
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(HERE, "dist", "local.html")
WORK = os.environ.get("VIDEO_WORK", os.path.join(HERE, "video"))  # scratch dir, not committed
OUT = os.path.join(WORK, "shots")
S = 4 / 3  # CSS px -> video px (1440x810 css -> 1920x1080)

class Rec:
    def __init__(self, page):
        self.p = page; self.t = 0.0; self.n = 0
        self.images = []   # (t, path)
        self.keys = []     # (t, x, y) in video px
        self.clicks = []   # (t, x, y)
        self.cur = (1500, 700)
        self.keys.append((0.0, *self.cur))
        self.marks = {}

    def mark(self, n):
        self.marks[n] = self.t

    async def shot(self, at=None):
        self.n += 1
        path = f"{OUT}/{self.n:04d}.png"
        await self.p.screenshot(path=path)
        self.images.append((self.t if at is None else at, path))
        return path

    def wait_until(self, t):
        if t > self.t: self.t = t

    async def center(self, sel):
        el = await self.p.wait_for_selector(sel, state="visible", timeout=5000)
        b = await el.bounding_box()
        return (b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)

    async def move(self, target, dur=0.8, hover=True, dx=0, dy=0):
        if isinstance(target, str):
            cx, cy = await self.center(target)
        else:
            cx, cy = target
        cx += dx; cy += dy
        vx, vy = cx * S, cy * S
        self.keys.append((self.t, *self.cur))
        self.t += dur
        self.keys.append((self.t, vx, vy))
        self.cur = (vx, vy)
        if hover:
            await self.p.mouse.move(cx, cy)
            await self.p.wait_for_timeout(120)
            await self.shot()

    async def click(self, settle=0.45):
        x, y = self.cur[0] / S, self.cur[1] / S
        self.clicks.append((self.t, *self.cur))
        await self.p.mouse.click(x, y)
        t0 = self.t
        # capture the transition: a few quick frames then a settled frame
        await self.p.wait_for_timeout(60);  await self.shot(t0 + 0.07)
        await self.p.wait_for_timeout(90);  await self.shot(t0 + 0.16)
        await self.p.wait_for_timeout(int(settle * 1000)); await self.shot(t0 + 0.32)
        self.t = t0 + 0.35

    async def type(self, text, dur):
        step = dur / max(1, len(text))
        i = 0
        while i < len(text):
            chunk = text[i:i + 2]
            await self.p.keyboard.type(chunk)
            i += len(chunk)
            self.t += step * len(chunk)
            await self.shot()

    async def hold(self, d):
        self.t += d

async def main():
    shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1440, "height": 810}, device_scale_factor=S)
        p = await ctx.new_page()
        await p.goto(URL); await p.wait_for_timeout(600)
        await p.evaluate("__sandbox.skipOpener()")  # the walkthrough starts on the welcome screen
        # tab cards are part of the tour now, so they are NOT skipped  # the walkthrough narration predates the tab intro cards
        await p.add_style_tag(content="*{caret-color:#1F1F1F} .snack{animation:none}")
        r = Rec(p)
        await r.shot(0.0)

        # ---- welcome -> role picker
        await r.hold(1.2)
        await r.move("#beginBtn", 1.1)
        await r.click(0.6)
        r.mark("role"); await r.hold(1.6)

        # ---- teacher, then the boot skeleton and an empty Home
        await r.move("#roleTeacher", 1.0)
        await r.click(0.6)
        await r.hold(1.6)            # boot skeleton
        r.mark("home"); await r.hold(1.2)

        # ---- create the class: + menu, consumer gate, the five fields
        await r.move("#plusBtn", 0.9)
        await r.click(0.4)
        await r.move(".menu [role=menuitem]:last-child", 0.6)
        await r.click(0.5)
        r.mark("create"); await r.hold(0.8)
        await r.move("#gateBox", 0.8)
        await r.click(0.4)
        await r.move("#gateGo", 0.7)
        await r.click(0.6)
        await r.move("#className", 0.6, hover=False)
        await r.hold(0.3)
        await r.type("EDU 101", 1.6)
        await r.move("#section", 0.6)
        await r.click(0.25)          # focus the field before typing into it
        await r.type("Sandbox Class", 1.6)
        await r.move("#ccCreate", 0.8)
        await r.click(1.2)           # submitting state, then the class opens
        await r.hold(1.4)
        await r.move("#introOk", 0.8)   # the Stream tab card
        await r.click(0.6)

        # ---- Stream
        r.mark("stream"); await r.hold(0.6)
        await r.move("#annOpen", 0.8)
        await r.click(0.6)
        await r.move("#annText", 0.5, hover=False)
        await r.hold(0.3)
        await r.type("Welcome, everyone. Our first class begins on Monday.", 4.0)
        await r.move("#annPost", 0.9)
        await r.click(0.8)
        await r.hold(1.8)

        # ---- Classwork: a topic, then an assignment filed under it
        r.mark("classwork")
        await r.move("#tab-classwork", 0.8)
        await r.click(0.5)
        await r.move("#introOk", 0.7)
        await r.click(0.5)
        await r.move("#createBtn", 0.7)
        await r.click(0.4)
        await r.move("#mTopic", 0.6)
        await r.click(0.5)
        await r.type("Week 1", 1.0)
        await r.move("#topicAdd", 0.6)
        await r.click(0.7)
        await r.move("#createBtn", 0.6)
        await r.click(0.3)
        await r.move("#mAssignment", 0.5)
        await r.click(0.6)
        await r.hold(0.9)                       # the first-run promo lands over the editor
        await r.move(".scrim .dlg .acts .tb:last-child", 0.8)
        await r.click(0.6)
        await r.move("#aTitle", 0.5, hover=False)
        await r.type("Introduce yourself", 1.8)
        await r.move("#aTopic", 0.7)
        r.clicks.append((r.t, *r.cur))
        await p.focus("#aTopic")
        await p.select_option("#aTopic", label="Week 1")
        await p.wait_for_timeout(150); await r.shot(r.t + 0.2)
        r.t += 0.9
        await r.move("#aAssign", 0.8)
        await r.click(0.8)
        await r.hold(1.6)

        # ---- People: invite two students, who stay Invited
        r.mark("people")
        await r.move("#tab-people", 0.8)
        await r.click(0.5)
        await r.move("#introOk", 0.7)
        await r.click(0.5)
        await r.move("#peopleInvite", 0.8)
        await r.click(0.6)
        await r.move(".contact:nth-of-type(1)", 0.8)
        await r.click(0.3)
        await r.move(".contact:nth-of-type(2)", 0.6)
        await r.click(0.3)
        await r.move("#invGo", 0.8)
        await r.click(0.8)
        r.mark("invited"); await r.hold(2.0)

        # ---- Grades
        r.wait_until(60.6)
        r.mark("grades")
        await r.move("#tab-grades", 0.8)
        await r.click(0.5)
        await r.hold(2.2)

        # ---- Practice Help
        r.wait_until(65.0)
        r.mark("help")
        await r.move("#dHelp", 0.9)
        await r.click(0.6)
        await r.move("#hGuide", 0.8)
        await r.hold(0.8)
        await r.move("#hWhat", 0.7)
        await r.hold(1.0)
        await r.move(".simdlg [data-x]", 0.8)
        await r.click(0.6)

        # ---- End Practice / summary
        r.wait_until(73.6)
        r.mark("summary")
        await r.move("#dEnd", 0.8)
        await r.click(0.7)
        await r.hold(1.4)
        el = "#summary"
        target = await p.evaluate("(()=>{const s=document.querySelector('#summary');const f=document.querySelector('.selfc');return Math.min(f.offsetTop-40,s.scrollHeight-s.clientHeight)})()")
        steps = 14
        for i in range(1, steps + 1):
            e = 0.5 - 0.5 * __import__('math').cos(3.14159 * i / steps)
            await p.evaluate(f"document.querySelector('{el}').scrollTop={target*e}")
            r.t += 0.06
            await r.shot()
        await r.hold(0.4)
        await r.move("#sc-stream-1 + span", 0.8)
        await r.click(0.3)
        await r.move("#sc-classwork-2 + span", 0.7)
        await r.click(0.3)
        r.wait_until(83.2)
        r.mark("endcard")

        # end card (rendered in the page with the same fonts)
        await p.evaluate("""(()=>{const d=document.createElement('div');d.id='endcard';d.style.cssText='position:fixed;inset:0;z-index:999;background:#10223C;color:#fff;display:grid;place-items:center;text-align:center;font-family:"Google Sans",Roboto,sans-serif';
          const logo=document.querySelector('#welcome .mivalogo').src;d.innerHTML='<div><img src="'+logo+'" alt="" style="display:block;height:64px;width:auto;margin:0 auto"><div style="font:500 56px/1.1 \\'Google Sans\\';margin:34px 0 26px;letter-spacing:-.01em">Your turn</div><div style="display:inline-flex;align-items:center;gap:10px;background:#D9A53B;color:#1B1403;border-radius:14px;padding:16px 30px;font:500 20px \\'Google Sans\\'">&#9654;&nbsp; Begin Practice</div><div style="margin-top:26px;font:400 16px \\'Google Sans\\';color:#9FB0CC">EDU 101 · The Sandbox Class</div></div>';document.body.appendChild(d)})()""")
        await p.wait_for_timeout(100)
        endcard = await r.shot(r.t + 0.4)
        meta = {"images": r.images, "keys": r.keys, "clicks": r.clicks, "end": round(r.t + 3.0, 2), "marks": r.marks, "endcard_t": round(r.t + 0.4, 2)}
        json.dump(meta, open(os.path.join(WORK, "timeline.json"), "w"))
        print("shots", r.n, "last t", round(r.t, 2))
        await b.close()

asyncio.run(main())
