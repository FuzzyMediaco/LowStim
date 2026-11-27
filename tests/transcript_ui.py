"""Run with Python Playwright and Chromium. LOWSTIM_TEST_URL can point to a running slate."""
import asyncio
import os
import shutil
import threading
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.async_api import async_playwright

ORIGINAL = "rocket on a launch pad"
CORRECTION = "a sailboat floating on the water"


@contextmanager
def site():
    if url := os.environ.get("LOWSTIM_TEST_URL"):
        yield url
        return

    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    dist = Path(__file__).resolve().parents[1] / "dist"
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=dist)) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}"
        finally:
            server.shutdown()
            thread.join()


async def check(browser, url, action):
    page = await browser.new_page(viewport={"width": 412, "height": 860})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.add_init_script("""
        window.plans = [];
        window.SlateDevice = {
          hasModel: () => true,
          listen() {},
          stopVoice() {
            window.heardAt = performance.now();
            window.slateVoiceResult('rocket on a launch pad', '');
          },
          plan(id, prompt) {
            window.plans.push({prompt, delay: performance.now() - window.heardAt});
            window.slatePlanResult(id, '{}');
          }
        };
    """)
    try:
        await page.goto(url)
        await page.mouse.dblclick(120, 125)
        await page.click("#mic")
        await page.click("#stopVoice")
        await page.wait_for_selector("#bar")
        idea = page.locator("#idea")
        assert await idea.input_value() == ORIGINAL
        assert await idea.evaluate("""el => getComputedStyle(el).fontFamily.includes('Pixelify')
            && el !== document.activeElement""")

        if action == "edit":
            await idea.fill(CORRECTION)
        elif action == "close":
            await page.click("#cancelType")
        elif action == "outside":
            await page.mouse.click(300, 420)
        elif action == "escape":
            await page.keyboard.press("Escape")

        if action != "auto":
            await page.wait_for_timeout(3500)
            assert await page.evaluate("plans.length") == 0
            if action == "edit":
                await idea.press("Enter")
            else:
                assert await idea.input_value() == ""
                assert await page.locator("#feedback").is_hidden()
                await page.mouse.move(90, 400)
                await page.mouse.down()
                await page.mouse.move(135, 420, steps=4)
                await page.mouse.move(180, 390, steps=4)
                await page.mouse.up()

        await page.wait_for_selector("#sceneTools", timeout=12000)
        plan, = await page.evaluate("plans")
        assert (ORIGINAL in plan["prompt"]) == (action == "auto")
        assert (CORRECTION in plan["prompt"]) == (action == "edit")
        if action == "auto":
            assert plan["delay"] >= 3150
        assert not errors, errors
    finally:
        await page.close()


async def main():
    with site() as url:
        async with async_playwright() as playwright:
            executable = shutil.which("chromium") or shutil.which("chromium-browser")
            browser = await playwright.chromium.launch(executable_path=executable)
            try:
                await asyncio.gather(*(check(browser, url, action) for action in
                                       ("auto", "edit", "close", "outside", "escape")))
            finally:
                await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
    print("Transcript preview, edits, submission, and dismissal passed.")
