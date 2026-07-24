#!/usr/bin/env python3
"""
Real / trusted-input autopilot for the Acme Intranet capture target.

Drives a REAL Chromium via Playwright — clicks produce trusted input events that
a capture agent records as real user input. It clicks every interactive element
on a page one by one, edits text fields (delete a few chars + type a few), opens each sub-app,
clicks all its elements, goes back to the portal, and moves to the next app.
Every action is spaced 400 ms.

Controls (type into this terminal, then Enter):
    p   pause / resume
    s   stop

Setup:
    pip install playwright
    playwright install chromium

Run (with the app running, e.g. `npm run dev`):
    python autopilot_driver.py --url http://localhost:5173 --per-app 40

For true OS-cursor hardware events instead of Playwright's trusted events, a
Selenium + pyautogui variant can locate each element's screen box and physically
move/click — ask and it can be added; Playwright is the robust default.
"""
import argparse
import sys
import threading
import time

from playwright.sync_api import sync_playwright

STEP = 0.4  # 400ms between actions
paused = False
stopped = False

SELECTOR = (
    "button, a[href], input, select, textarea, [role=menuitem], [role=tab], "
    ".app-tile, .nav-i, .rtab, .mf, .stab, .thumb, .board-card, .chip, .row-open, .commit"
)
WORDS = ["Approve", "Review", "Audit", "Reconcile", "Escalate", "Validate", "Export", "Refresh"]


def watch_keys():
    global paused, stopped
    for line in sys.stdin:
        c = line.strip().lower()
        if c == "p":
            paused = not paused
            print("[paused]" if paused else "[resumed]", flush=True)
        elif c == "s":
            stopped = True
            print("[stopping]", flush=True)
            break


def gate() -> bool:
    while paused and not stopped:
        time.sleep(0.1)
    return not stopped


def act(handle, i):
    try:
        handle.scroll_into_view_if_needed(timeout=1500)
    except Exception:
        pass
    try:
        tag = handle.evaluate("e => e.tagName.toLowerCase()")
        typ = (handle.get_attribute("type") or "").lower()
        if tag == "textarea" or (tag == "input" and typ in ("", "text", "email", "search")):
            handle.click(timeout=1500)
            handle.press("End")
            for _ in range(3):  # delete a few characters
                handle.press("Backspace")
                time.sleep(0.05)
            handle.type(" " + WORDS[i % len(WORDS)], delay=60)  # type a few
        elif tag == "input" and typ in ("checkbox", "radio"):
            handle.click(timeout=1500)
        elif tag == "select":
            try:
                handle.select_option(index=1)
            except Exception:
                pass
        else:
            handle.click(timeout=1500)  # button / link / tile / tab — may navigate + churn
    except Exception:
        pass


def click_through(page, exclude_tiles: bool, budget: int):
    clicks = 0
    while clicks < budget and gate():
        target = None
        for h in page.query_selector_all(SELECTOR):
            try:
                if h.get_attribute("data-ap-done"):
                    continue
                cls = h.get_attribute("class") or ""
                if "home-dot" in cls:
                    continue
                if exclude_tiles and "app-tile" in cls:
                    continue
                if h.evaluate("e => !!e.closest('[data-ap-control]')"):
                    continue
                if not h.is_visible():
                    continue
                target = h
                break
            except Exception:
                continue
        if target is None:
            break
        try:
            target.evaluate("e => e.setAttribute('data-ap-done','1')")
        except Exception:
            pass
        act(target, clicks)
        clicks += 1
        time.sleep(STEP)


def acquire(p, a):
    """Return (page, cleanup) for the chosen browser mode.

    Extensions only exist in a REAL browser profile, not Playwright's fresh
    bundled Chromium. Modes, best-for-extensions first:
      --cdp URL          attach to an already-running Chrome (ALL its extensions
                         + your capture extension are already loaded). Recommended.
      --load-extension   launch Chrome loading specific unpacked extension dirs.
      --user-data-dir    launch Chrome with an existing profile (its extensions).
      (none)             fresh bundled Chromium, no extensions.
    """
    ext = [e for e in (a.load_extension or "").split(",") if e]
    ext_args = []
    if ext:
        joined = ",".join(ext)
        ext_args = [f"--disable-extensions-except={joined}", f"--load-extension={joined}"]

    if a.cdp:
        browser = p.chromium.connect_over_cdp(a.cdp)
        ctx = browser.contexts[0] if browser.contexts else browser.new_context()
        page = ctx.new_page()
        return page, (lambda: None)  # leave the user's Chrome running

    if a.user_data_dir or ext_args:
        ctx = p.chromium.launch_persistent_context(
            a.user_data_dir or "",
            headless=False,
            channel=a.channel or None,
            args=ext_args,
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        return page, ctx.close

    browser = p.chromium.launch(headless=False, channel=a.channel or None)
    return browser.new_page(), browser.close


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:5173")
    parser.add_argument("--per-app", type=int, default=40)
    parser.add_argument("--cdp", help="attach to a running Chrome, e.g. http://localhost:9222")
    parser.add_argument("--channel", help="use a branded browser: chrome | msedge")
    parser.add_argument("--user-data-dir", help="Chrome profile dir (loads its extensions; Chrome must be closed)")
    parser.add_argument("--load-extension", help="comma-separated unpacked extension dirs")
    parser.add_argument("--port-base", type=int, help="visit one port per app (base..base+apps-1) instead of clicking tiles")
    parser.add_argument("--apps", type=int, default=22, help="number of sub-app ports when --port-base is set")
    args = parser.parse_args()

    threading.Thread(target=watch_keys, daemon=True).start()
    print("Autopilot running. 'p'+Enter = pause/resume, 's'+Enter = stop.", flush=True)

    with sync_playwright() as p:
        page, cleanup = acquire(p, args)
        page.goto(args.url)
        time.sleep(0.6)

        if args.port_base:
            # each sub-app on its own port (distinct origin) — visit each
            for i in range(args.apps):
                if not gate():
                    break
                port = args.port_base + i
                page.goto(f"http://localhost:{port}/")
                time.sleep(0.5)
                print(f"  → :{port}", flush=True)
                click_through(page, exclude_tiles=False, budget=args.per_app)
        else:
            # 1) portal's own controls (not the tiles)
            click_through(page, exclude_tiles=True, budget=12)
            # 2) each sub-app: open tile → click everything → back to portal
            tiles = page.query_selector_all(".app-tile")
            app_ids = [t.get_attribute("data-app") for t in tiles if t.get_attribute("data-app")]
            for aid in app_ids:
                if not gate():
                    break
                page.goto(args.url)
                time.sleep(0.4)
                tile = page.query_selector(f'[data-app="{aid}"]')
                if tile:
                    try:
                        tile.click(timeout=1500)
                    except Exception:
                        page.goto(f"{args.url}/{aid}")
                else:
                    page.goto(f"{args.url}/{aid}")
                time.sleep(STEP)
                print(f"  → {aid}", flush=True)
                click_through(page, exclude_tiles=False, budget=args.per_app)
                page.goto(args.url)  # back to main
                time.sleep(STEP)

        try:
            cleanup()
        except Exception:
            pass
    print("Done.", flush=True)


if __name__ == "__main__":
    main()
