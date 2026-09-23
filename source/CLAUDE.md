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
  - `openPlayer` is the walkthrough player. `#vBegin` is a real Begin Practice button laid over the one drawn on the video's end card (percent position, 16:9 frame). It shows from 0.9 s before the last cue, which is always spoken over the end card, and takes focus when the video ends.
  - `playOpener` is the opener, built to the house spec in `brand/OPENER.md` (`#intro` in `body.html`, `.intro-*` styles, ported from the spec's reference files). Three partner logos arrive one at a time; `centreOn(n)` re-centres the row on the logos revealed so far. Skip/Esc jump to the finished frame; **Begin** ends it and calls `openPlayer(beginBtn,{auto:true})`, so the walkthrough plays with sound (Begin is the required click; `#vUnmute` is the fallback if a browser still blocks it). The welcome screen is `inert` meanwhile. `__sandbox.skipOpener()` ends it without opening the walkthrough, for tests and the recorder.
    - `centreOn` measures inside the row, not from the row's own `offsetLeft`: the row has a transform, which makes it the offset parent of the logos. The spec's reference mixes the two spaces, which shifts the finished line whenever the title is wider than the logo row (19px here). Fixed in this port; worth reporting back to whoever owns the spec.
  - `INTROS` / `showIntro` / `maybeIntro` are the tab intro cards: a Classroom-style dialog with a silent SVG wireframe animation, shown once per tab (`introSeen`, which survives Reset) and replayable from Practice Help. The animations are CSS keyframes in `styles.css` (`s-*`, `c-*`, `p-*`). Base styles are the final frame, which is what reduced motion shows and where the three loops end. Never touch `S` or `L` here.
- `build.py`: inlines fonts (base64), the icon codepoints, `cues.json`, and optionally the video. It writes `dist/sandbox-class.html` (for Artifact publishing, with no html/head tags) and `dist/local.html` (a standalone page).
  - Run `python3 build.py` for the build without video, or `python3 build.py ../walkthrough/sandbox-walkthrough-1080p.mp4` to embed the walkthrough. It also embeds the `.webm` beside the `.mp4` when that exists, and says so when it does not; keep the WebM, because open-source Chromium (the test browser) cannot play H.264.
  - Paths are relative to this folder, so it runs as-is from here.
- `fonts/`: the Google Sans, Google Sans Flex and Roboto woff2 files, `afacad-var.woff2` (the opener title) and `ms-sub.woff2`, a Material Symbols subset.
  - **Adding a new icon:** add its name to the list in `sub.py`, rerun it (it needs the full Material Symbols woff2 from `npm pack @fontsource-variable/material-symbols-outlined`), and rebuild. The `I("name")` helper returns nothing for icons that aren't in `icons.json`.
- `test/verify.py`: Playwright functional suite (77 checks). Build first; the tests load `dist/local.html`. `test/player.py` checks the walkthrough player.
- Video pipeline (work dir `video/`, not committed): `record.py` records the real build as screenshots plus a cursor timeline; `schedule.py` places the narration (`narration/s1-17.wav`) against the recorded marks; `compose.py` composites cursor, captions and audio; `pace.py` shortens silent gaps and writes `paced-cues.json`, which becomes `cues.json`. Needs numpy, soundfile, Pillow and `video/gs500.ttf` (Google Sans 500 converted from the woff2 with fontTools).
- `brand/`: the Miva logos (blue on light, white on dark; the practice's own screens only — the Classroom shell uses a neutral mortarboard tile instead), the opener artwork (`ekiti.svg`, `miva.svg`, `tof.svg`, `chevrons.svg`) and the house spec `OPENER.md`. `build.py` inlines all of them for the `@@LOGO_*@@` tokens in `body.html`, `app.js` and `styles.css` (the chevron motif is a CSS background).

- `reference/`: the Google Classroom clone reference pack (SPEC.md, CHECKLIST.md, data/*.json), measured from the live product on 23 Sep 2026. Build against it; `data/tokens.json` is the source of truth for colour, type, shape and sizing.
  - Its house rule, and the easiest thing to get wrong: **menus and dialogs carry no box-shadow**. Depth is tonal surface plus scrim.

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
