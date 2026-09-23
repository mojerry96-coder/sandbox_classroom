import asyncio,os
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1280,"height":800})
    await pg.goto("file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","local.html")))
    await pg.evaluate("__sandbox.skipOpener()")
    s0=await pg.evaluate("JSON.stringify(__sandbox.state())")
    await pg.click("#welcomeWatch"); await pg.wait_for_timeout(1500)
    print("duration",await pg.evaluate("document.querySelector('#vid').duration"),"paused",await pg.evaluate("document.querySelector('#vid').paused"))
    await pg.click("#bigPlay"); await pg.wait_for_timeout(1500)
    await pg.evaluate("document.querySelector('#pSeek').value=22;document.querySelector('#pSeek').dispatchEvent(new Event('input'))"); await pg.wait_for_timeout(700)
    await pg.click("#pTx"); await pg.wait_for_timeout(300)
    print("time",await pg.evaluate("document.querySelector('#vid').currentTime"),"cc",await pg.inner_text("#cc"))
    await pg.screenshot(path="test/player.png")
    await pg.keyboard.press("Escape")
    print("state unchanged",await pg.evaluate("JSON.stringify(__sandbox.state())")==s0)
    # end card: the drawn Begin Practice button is a real one
    await pg.click("#welcomeWatch"); await pg.wait_for_timeout(1200)
    print("end-card button hidden mid-video",await pg.is_hidden("#vBegin"))
    await pg.evaluate("(()=>{const v=document.querySelector('#vid');v.currentTime=v.duration-1.5;v.play()})()"); await pg.wait_for_timeout(2500)
    print("end-card button shown and focused at end",await pg.is_visible("#vBegin") and await pg.evaluate("document.activeElement.id")=="vBegin")
    await pg.click("#vBegin"); await pg.wait_for_timeout(300)
    print("end-card button starts practice",await pg.evaluate("!document.querySelector('.player') && !document.querySelector('#role').hidden && !!document.querySelector('#roleTeacher')"))
    await b.close()
asyncio.run(main())
