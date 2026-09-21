import asyncio,os
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1280,"height":800})
    await pg.goto("file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","local.html")))
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
    await b.close()
asyncio.run(main())
