# The Sandbox Class: build package (v2)

This package covers DT01 · DT 01 03, a Stream, Classwork and People practice in EDU 101.
Miva Open University · Interactive and Immersive Learning Team.

## Contents

| File | Purpose |
|---|---|
| `sandbox-class.html` | The complete simulation in one file. Fonts, icons and the walkthrough video are all embedded, so it runs offline and needs no backend. |
| `walkthrough/sandbox-walkthrough-1080p.mp4` | 76-second walkthrough at 1920×1080, 30 fps, H.264/AAC, narrated in Nigerian English. It carries a soft English caption track that is set as the default. |
| `walkthrough/sandbox-walkthrough-1080p.webm` | The same walkthrough in VP9/Opus. The build embeds both, because browsers without H.264 support (such as open-source Chromium) can only play this one. |
| `walkthrough/sandbox-walkthrough-1080p-open-captions.mp4` | The same walkthrough with the captions burned in, for players that ignore caption tracks. |
| `walkthrough/captions.srt`, `walkthrough/captions.vtt` | Caption files. |
| `walkthrough/transcript.md` | Timed transcript. |
| `source/` | Source code (`styles.css`, `body.html`, `app.js`), the build script, the verification suites, the Miva logos (`brand/`), the narration (`narration/`) and the video pipeline. |

## Screen flow

1. **Miva opener** plays once when the page loads: about 5 seconds, silent. The emblem sharpens into view, the wordmark slides out from behind it, a light sweeps across the logo, and the course title rises before it fades into the welcome screen. Skip intro and Escape end it at once. With reduced motion it shows the finished composition briefly instead.
2. **Miva welcome** offers Begin Practice and Watch walkthrough.
3. **Walkthrough player** plays a recorded demo session and never touches the learner's sandbox. It has Play/Pause, Replay, a seek bar, volume and mute, a captions toggle (on by default) and a clickable transcript. Nothing plays until the learner presses Play. When the walkthrough reaches its end card, the Begin Practice button drawn in the video becomes a real button: from the welcome screen it starts practice, and from inside the practice it closes the walkthrough.
4. **EDU 101 workspace** opens straight onto Stream. The first time each tab opens, a Classroom-style intro card plays a short, silent wireframe animation of that tab's key action (posting, filing work under a topic, inviting and adding people). "Got it" closes it. It shows once per tab and can be replayed from Practice Help › What can I do here? Stream, Classwork and People are free to use in any order. The Classroom Home, Calendar, To review, Archived and Settings items give navigation context. The last four show a "not part of this practice" page with a link back to EDU 101.
5. **Practice Help** offers Watch the walkthrough, Guide me (one action at a time with a spotlight and coach, which the learner can exit at any point) and What can I do here?
6. **Practice Summary** is labelled "Not a score". It shows the current class state and the actions attempted as separate panels, a self-check for each tab, the transfer prompt, Continue Practice (to any tab), Reset Sandbox and Finish.
7. **Finish** shows the learner's transfer sentence and a closing reminder.

## Fidelity register

| Area | Reference | Status |
|---|---|---|
| App shell: top bar, drawer and rail, active pill, colours, type, spacing | Home screenshot, plus live-DOM measurements from the Sep 2026 capture | **Reference-backed**, except that the Google Classroom logo is replaced by the Miva logo |
| Home Classes card grid and class card | Home screenshot | **Reference-backed** (the owner card's footer icons are provisional) |
| Class tabs, banner, left column, Stream item and post cards | Student-view capture only | **Provisional**: teacher-view Stream (composer, class code card) needs a teacher reference |
| Classwork rows, topic headers, Create menu, assignment editor | Student-view capture plus standard Classroom behaviour | **Provisional**: the Create menu lists Assignment and Topic only |
| People lists, headings, invite dialog | Student-view capture | **Provisional**: teacher-only controls follow Classroom patterns without a screenshot |
| Tab intro cards (illustration panel, title, body, "Got it") | Classroom's "Navigating Classroom just got easier" feature-intro dialog (Sep 2026 screenshot) | **Reference-backed** layout; the three animations and their copy are written for this practice |
| Dialogs, menus, snackbar, outlined fields | Measured on live Join and Create dialogs and menus | **Reference-backed** (styling) |

**Simplified practice actions** are marked with a dashed gold "Practice shortcut" or "Simplified for practice" tag in the interface:

- **Adding a student:** students become Active immediately. In Classroom they join by invitation, invite link or class code.
- **Regenerating the class code** from the People tab. In Classroom this is done from the Stream class code card, which is also supported here.
- **Moving an assignment** to a topic through a menu item. In Classroom you edit the assignment's topic instead, which also works here.
- **Co-teacher invitations** never send email and stay Pending.

**Visual separation.** The simulation's own controls use a dark navy and gold treatment. These are the dock, Practice Help, the guidance coach, the nudge, the practice tags and the Miva screens. That keeps them visually distinct from the Classroom interface itself.

**Not produced.** Section 7 of the storyboard describes an optional 25-35 second UI-led pre-roll with its own narration, to play before Begin Practice. It has not been built. Its purpose, establishing that the class is fictional and that nothing reaches real students, is already carried by the welcome screen and by the first three lines of the walkthrough, so a second video would repeat it. Build it if the course team wants the exact pre-roll script in the PDF.

**Assets.**

- **Logo:** the Miva Open University logo, in `source/brand/`. The blue version is used on light backgrounds (the top bar and the Finish screen) and the white version on dark ones (the welcome panel and the walkthrough end card). It replaces the Google Classroom logo and the old "MIVA · Open University · Interactive and Immersive Learning" text mark.
- **Fonts:** Google Sans, Google Sans Flex and Roboto, from Fontsource under the OFL.
- **Icons:** a subset of Material Symbols Outlined, under Apache-2.0.
- **Not included:** Google's logo, banner art and illustrations are not reproduced. The banner and empty-state art are drawn generically.

## Sandbox logic

- **State.** There is one in-memory `S` (sandbox) and a separate `L` (practice log). IDs are stable and counts are derived from collections. Only committed actions are counted, so opening a dialog is not counted.
- **Seed:**
  - EDU 101, section "Sandbox Class"
  - one protected welcome post
  - no topics or assignments
  - "You" as Owner
  - Amina Bello and Tobi Adeyemi as placeholder students
  - a fresh class code in `XXX-XXX` format
  - `unfiledNudgeShown` set to false
- **The nudge** shows once, when unfiled items first reach 2. The flag is set immediately, so re-rendering, switching tabs or adding more unfiled items never repeats it.
- **Protections:**
  - The welcome post has no Edit or Delete option.
  - The Owner row has no remove control.
  - A regenerated class code is never the same as the previous one.
- **Persistence.** Refresh or Reset restores the seed with a new code and clears the log, the reflections and the flags. There is no storage, network, email or analytics.

## Verification

The suite has **66** checks (51 original, 9 for the tab intro cards, 2 for assignment-edit logging, 4 for the opener) (`source/test/verify.py`), plus a player check. They cover:

- seeded state
- empty and whitespace-only input blocked everywhere
- post, edit, delete, and the welcome-post protection
- safe text rendering
- topics and assignments, the topic selector populated from state, nested counts and moving items
- the nudge appearing only once
- invalid email rejected, the Pending badge, and the Owner protection
- adding and removing students with the headcount updating
- 40 regenerations with no repeated code
- state kept across tab changes
- guidance advancing and exit leaving state unchanged
- the walkthrough not altering state
- the summary separating current state from actions attempted
- Continue Practice keeping state
- the Finish sentence
- Reset restoring the seed
- tab intro cards: shown once per tab, focus handling, Escape, a text alternative, no state change, replay from Practice Help
- an assignment edit that also changes the topic is logged as one action, not two
- no localStorage use and no JS errors

The player check confirmed the video loads (76 s), that the end card's Begin Practice button appears, takes focus when the video ends and starts practice, stays paused on open, and that seeking, captions and the transcript work.

## Walkthrough production notes

- **Recording:** the real build was recorded in a separate headless demo session at 1440×810 CSS px with a device-pixel ratio of 4/3, which gives 1920×1080 frames. The interface was not redrawn or generated.
- **Re-recorded (21 Sep 2026)** so the footage shows the Miva logo instead of the Google Classroom logo, with a new Nigerian English narrator.
- **Pipeline** (run from `source/`, after `python3 build.py`): `record.py` records the build into `source/video/`; then, from `source/video/`, `schedule.py` places each narrated line against the actions, `compose.py` adds the cursor, click rings, captions and audio, and `pace.py` shortens the silent stretches (1.8×, or 2.5× for gaps over 6 s; narrated lines keep their speed). The composed cut runs 92 s and the paced one 76 s. Rebuild the page with `python3 build.py ../walkthrough/sandbox-walkthrough-1080p.mp4`.
- **Cursor and camera:** the cursor path and click rings were composited afterwards, and the camera stays fixed.
- **Narration:** a synthetic Nigerian English voice (ElevenLabs "Ifeoma Odumodu - Nigerian Narrator", `eleven_multilingual_v2`, stability 0.6, similarity 0.8) reads the script word for word, one file per line in `source/narration/`. To use a recorded voiceover instead, replace those 17 files and rerun the pipeline from `schedule.py`; the timings follow the new audio.
- **Names and addresses:** all identities are fictional (Ada Okafor, tutor@example.com).
