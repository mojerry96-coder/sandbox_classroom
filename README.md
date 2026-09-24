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

1. **Opener** (house spec, `source/brand/OPENER.md`) plays on load: about 4.5 seconds, silent. The Ekiti State crest, the MIVA lockup and the Tunji Olowolafe Foundation lockup arrive one at a time, and the row re-centres on each arrival so that whatever is on screen stays centred and no logo lands on another. Dividers and the chevron motif follow, then the tagline, "THE SANDBOX CLASS" with SANDBOX in amber, the unit label and **Begin**. Skip or Esc jumps to the finished frame rather than dismissing the opener, because the Begin click is what lets the walkthrough play with sound. With reduced motion the finished frame appears at once.
2. **Miva welcome** offers Begin Practice and Watch walkthrough.
3. **Walkthrough player** plays a recorded demo session and never touches the learner's sandbox. It has Play/Pause, Replay, a seek bar, volume and mute, a captions toggle (on by default) and a clickable transcript. The opener's **Begin** opens it and starts it playing, with sound, because Begin is a click. (If a browser still blocks sound, it plays muted with captions and shows a Turn on sound button.) Opened later from Watch walkthrough, it waits for Play. Closing it returns focus to Begin Practice. When the walkthrough reaches its end card, the Begin Practice button drawn in the video becomes a real button: from the welcome screen it starts practice, and from inside the practice it closes the walkthrough.
4. **Role picker** asks the Workspace first-run question — *I'm a Teacher* or *I'm a Student* — and the answer drives everything after it.
5. **Setting the class up.** Nothing exists in advance. A teacher uses **+ → Create class**, which raises Classroom's consumer gate (Continue stays disabled until the notice is ticked), then the five-field Create class dialog with its *Creating…* submitting state. The class arrives empty, with a generated code, and opens on Stream. A student uses **+ → Join class** and a 5–8 character code, and sees the class the way their students will: no composer, no Create, no invite controls.
6. **The class workspace.** The class page carries the product's four tabs — Stream, Classwork, People and Grades — with the Calendar, Drive and Class settings actions on the right. The banner has Customize and class information; the sidebar has the Meet card (disabled, as on a consumer account), the class code with its options menu, and Upcoming. Announcements are written in a **modal composer** with the formatting toolbar, attach row and Post split button. Posted work appears on the Stream as a **condensed notification**, which class settings can switch to full detail or hide. Stream, Classwork and People are free to use in any order. The first time each tab opens, a Classroom-style intro card plays a short, silent wireframe animation of that tab's key action. The drawer grows Teaching and Enrolled groups as classes appear, and Home gains a Teaching / Enrolled segmented control once both exist.
7. **Practice Help** offers Watch the walkthrough, Guide me (one action at a time with a spotlight and coach, which the learner can exit at any point) and What can I do here?
8. **Practice Summary** is labelled "Not a score". It shows the current class state and the actions attempted as separate panels, a self-check for each tab, the transfer prompt, Continue Practice (to any tab), Reset Sandbox and Finish.
9. **Finish** shows the learner's transfer sentence and a closing reminder.

## Fidelity register

| Area | Reference | Status |
|---|---|---|
| App shell: top bar, drawer and rail, active pill, colours, type, spacing | Home screenshot, plus live-DOM measurements from the Sep 2026 capture | **Reference-backed**, except the app mark: the simulated app carries a neutral mortarboard tile, neither Google's logo nor Miva's |
| Home Classes card grid and class card | Home screenshot | **Reference-backed** (the owner card's footer icons are provisional) |
| Class tabs, banner, left column, Stream item and post cards | Student-view capture only | **Provisional**: teacher-view Stream (composer, class code card) needs a teacher reference |
| Classwork rows, topic headers, Create menu, assignment editor | Reference pack (SPEC §6.6-6.7), measured from the live product | **Reference-backed**: Create lists Assignment, Quiz assignment, Question, Material, Reuse post and Topic; the editor carries the attach row and the full right rail |
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

- **Opener artwork:** `source/brand/` holds the three partner logos (`ekiti.svg`, `miva.svg`, `tof.svg`), the `chevrons.svg` motif and the house spec `OPENER.md`, all as supplied. `ekiti.svg` and `tof.svg` carry bitmaps inside the SVG, so the crest is the heaviest asset in the build (474 KB before encoding).
- **Opener type:** Afacad (variable), from Fontsource under the OFL, used for the opener title only.
- **Logo:** the Miva Open University logo, in `source/brand/`, marks the practice's own screens only: the blue version on the light Finish screen, the white version on the dark welcome panel and the walkthrough end card. It replaced the old "MIVA · Open University · Interactive and Immersive Learning" text mark.
- **The simulated app's mark:** a neutral tile with a mortarboard, drawn from the Material Symbols subset already in the build. Miva does not brand the Classroom-style interface, and Google's logo is not reproduced.
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

The suite has **121** checks (51 original, 9 for the tab intro cards, 2 for assignment-edit logging, 7 for the opener and the walkthrough handover). The opener checks follow the sign-off list in `source/brand/OPENER.md`: no two logos overlap at any sampled frame, each stage settles centred, all three fit at 375px with no sideways scroll, the motif stays at 0.7, each logo keeps its institution's alt text, Begin takes focus, and reduced motion shows the finished frame (`source/test/verify.py`), plus a player check. They cover:

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
