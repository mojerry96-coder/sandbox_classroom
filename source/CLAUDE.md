# The Sandbox Class (EDU 101): Claude Code context

This is a single-file training simulation, the Miva DT01 · DT 01 03 Google Classroom-style sandbox.

## Layout
- `styles.css`: all CSS. It has two layers:
  - Classroom tokens, measured from the live product (`--app-bg`, `--pri`, and so on).
  - A deliberately distinct simulation layer (`--sim-*`: navy and gold). Keep these visually separate.
- `body.html`: static markup for the welcome screen, Classroom shell, simulation dock, and the coach/spotlight elements. `@@I:icon_name@@` tokens are expanded at build time.
- `app.js`: all logic, in an IIFE.
  - State: `S` is the sandbox state and `L` is the practice log, a separate object. `seed()` resets both.
  - Rendering: `renderStream`, `renderClasswork`, `renderPeople`, `openSummary`, `showFinish`.
  - Dialogs: `cDialog` (Classroom style) and `simDialog` (simulation style). Both manage focus, handle Escape and return focus to the trigger.
  - `Guide` is the guided-practice engine. Steps advance on `emit()` events.
  - `openPlayer` is the walkthrough player.
  - `INTROS` / `showIntro` / `maybeIntro` are the tab intro cards: a Classroom-style dialog with a silent SVG wireframe animation, shown once per tab (`introSeen`, which survives Reset) and replayable from Practice Help. The animations are CSS keyframes in `styles.css` (`s-*`, `c-*`, `p-*`). Base styles are the final frame, which is what reduced motion shows and where the three loops end. Never touch `S` or `L` here.
- `build.py`: inlines fonts (base64), the icon codepoints, `cues.json`, and optionally the video. It writes `dist/sandbox-class.html` (for Artifact publishing, with no html/head tags) and `dist/local.html` (a standalone page).
  - Run `python3 build.py` for the build without video, or `python3 build.py path/to/clean.mp4` to embed the video (it also embeds `clean.webm` beside it when that exists, and says so when it does not).
  - Paths are relative to this folder, so it runs as-is from here.
- `fonts/`: the Google Sans, Google Sans Flex and Roboto woff2 files, plus `ms-sub.woff2`, a Material Symbols subset.
  - **Adding a new icon:** add its name to the list in `sub.py`, rerun it (it needs the full Material Symbols woff2 from `npm pack @fontsource-variable/material-symbols-outlined`), and rebuild. The `I("name")` helper returns nothing for icons that aren't in `icons.json`.
- `test/verify.py`: Playwright functional suite (62 checks). Build first; the tests load `dist/local.html`. `test/player.py` checks the walkthrough player.
- `record.py` and `compose.py`: the video pipeline. It records the real build as screenshots plus a cursor timeline, then composites the frames with captions and narration.

## Rules from the storyboard/brief (don't break)
- No backend, no localStorage, and no real email. Refresh or Reset gives a fresh seed with a new class code.
- Seed:
  - EDU 101 / "Sandbox Class"
  - one protected welcome post (no Edit or Delete)
  - "You", Owner (cannot be removed)
  - two placeholder students
  - an `XXX-XXX` class code that is never repeated on regeneration
- Unfiled nudge: show it once, when the unfiled count first reaches 2. Set `S.flags.unfiledNudgeShown` immediately.
- Log only committed actions. Opening a dialog doesn't count, and one commit is one action: an assignment edit that also changes the topic counts as an edit only.
- The summary is labelled "Not a score" and keeps current state separate from actions attempted. No grades, points, timers or gates.
- Accessibility: 44px touch targets, semantic tabs with arrow keys, live-region announcements, reduced-motion support.
- Visual fidelity for Stream, Classwork and People is provisional (see README fidelity register). Mark simplified actions with the `.simtag` / `.simnote` styles.
