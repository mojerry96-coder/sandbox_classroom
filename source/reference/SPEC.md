# Google Classroom — UX & UI specification for a clone

**Captured:** 23 September 2026, live from `classroom.google.com`
**Account type:** personal Google account (consumer), which both *teaches* one class and is *enrolled* in another
**Method:** every measurement in this document was read off the running product with `getComputedStyle` and `getBoundingClientRect`, and every string was copied from the live DOM. Nothing here is recalled from memory or transcribed from a screenshot.
**Purpose:** build a faithful educational simulation — someone who learns on the clone should feel no discontinuity when they open the real thing.

> **On the logo.** Do not reproduce the Google Classroom wordmark or the green board-and-person mark. The *interface* is Material 3, which is an open design system, and Material Symbols is Apache-2.0, so the icons are fine to use. Give the clone its own name and mark.

---

## 1. The mental model

Classroom has exactly four nouns and the whole product falls out of them.

| Noun | What it is | Where it lives |
|---|---|---|
| **Class** | a container with a name, section, subject, room, theme, code and Drive folder | `/c/{courseId}` |
| **Post** | an announcement, or a piece of classwork (assignment, quiz, question, material) | Stream / Classwork |
| **Person** | a teacher or a student, joined by code, link or invitation | People |
| **Submission** | one student's response to one piece of classwork, with a status and a grade | Grades / student work |

Everything else — Calendar, To-do, To review, Archived — is a *view* over those four.

A class page always has the same four tabs in the same order: **Stream · Classwork · People · Grades**. That consistency is load-bearing; it is the thing a learner internalises.

---

## 2. Roles, and the "are you a teacher or a student?" question

This is worth getting right, because it is the part people remember and it is the part most clones get wrong.

**On a Workspace for Education account**, the very first sign-in shows a role picker — *I'm a Teacher* / *I'm a Student*. It is irreversible without an administrator. That is the screen most people mean when they say "it asked me if I was a teacher or a student."

**On a personal Google account** (what was captured here) there is no such screen. Instead:

- The `+` button in the top bar offers **Join class** (become a student) or **Create class** (become a teacher).
- Choosing *Create class* for the first time raises a one-time legal gate — see §6.1.
- After that, role is *per class*, not per account. The same person is a teacher in one class and a student in another, and the left drawer grows two groups: **Teaching** and **Enrolled**.
- Once both groups exist, the Home page grows a **Teaching / Enrolled** segmented control at the top, and the URL changes between `/h/tv` and `/h/st`.

**For the simulation:** reproduce the Workspace role picker as the opening beat — it matches the mental model learners carry — and then use the per-class role model underneath, because that is what actually drives the UI.

---

## 3. Design language

Classroom is Material 3 (Material You) with a small set of house rules. The full token set is in `data/tokens.json` and as CSS custom properties in `reference-html/tokens.css`.

### 3.1 The five greys that do all the work

| Token | Value | Where |
|---|---|---|
| surface | `#F8FAFD` | app background, top app bar, nav drawer |
| surface-lowest | `#FFFFFF` | content canvas, cards, class tab bar |
| surface-low | `#F0F4F9` | dropdown menu surfaces |
| surface-container | `#E9EEF6` | dialog backgrounds |
| surface-high | `#DDE3EA` | filled text fields, tonal sub-cards, condensed stream rows |

Note what is *absent*: **shadows**. Menus and dialogs in current Classroom carry `box-shadow: none`. Depth is communicated entirely by tonal surface colour plus a scrim. If your clone reaches for `box-shadow` on a menu, it will read as a 2019 build.

### 3.2 Accents

`#0B57D0` for links, the active tab, and text buttons. `#1B57D0` for filled buttons. `#2962FF` for the active icon in the collapsed nav rail. `#C2E7FF` and `#D3E3FD` for tonal fills. `#B3261E` for errors. That is the whole palette outside class themes.

### 3.3 Type

One family — `"Google Sans", Roboto, Arial, sans-serif` — and one weight, **400**, for 98% of the interface. Weight 500 appears in exactly two places: the active tab label and the class name in the top bar. There is a global `letter-spacing: 0.1px`.

| Role | px / line-height | Used for |
|---|---|---|
| display | 36 / 44 | class banner title |
| headline-lg | 24 / 32 | page and dialog titles |
| headline-md | 22 / 28 | banner section, empty-state titles, class code |
| title-lg | 18 / 24 | card headings |
| body-lg | 16 / 24 | menu items, text inputs, dialog body |
| body-md | 14 / 20 | tabs, buttons, most UI text |
| label-md | 13 / 20 | field labels, metadata |
| label-sm | 12 / 16 | top-bar section line, captions |

If you cannot license Google Sans, Roboto is the closest metric match; Inter reads slightly too tight.

### 3.4 Shape

`9999px` for anything pill-shaped (nav items, buttons, chips, the segmented control, the help FAB). `28px` for dialogs and Home section cards. `16px` for the class banner and the canvas's top-left corner. `12px` for class cards, theme tiles and tonal sub-cards. `4px` for menu surfaces and the *top two corners only* of filled text fields.

### 3.5 Motion

- **Dialog in:** ~150–200 ms fade plus a slight scale-up from about 96%, scrim fading in alongside. Out is a plain fade with no scale.
- **Menus:** a fast fade under 120 ms. No slide.
- **Route change:** a 4 px indeterminate linear bar pinned directly under the top app bar — `#1B57D0` on a `#C2E7FF` track.
- **Section loading:** a 48 px indeterminate circular spinner centred in the region.
- **Skeletons:** grey rounded pills in the shape of the incoming rows (seen on Home's *Recently due*).

---

## 4. The shell

See `wireframes/wf-01-shell.svg` for the annotated version.

### 4.1 Top app bar — 65 px, `#F8FAFD`

`hamburger (40) · logo (32) + wordmark (22px) · [chevron + class name/section] · spacer · + (40) · apps (40) · avatar (32)`

Inside a class the bar grows a breadcrumb: a chevron, then the class name at **16 px / 500 / `#444746`** with the section beneath at **12 px / 400**. Note the class name here is *not* the same size as the banner title — they are 16 px and 36 px respectively.

### 4.2 Navigation drawer

**Expanded: 347 px.** Items are 48 px tall, icon 24 px, label 14 px, 20 px gap between them. The active item is a full-width pill at `#D3E3FD`, radius 9999, text and icon `#0B57D0`.

**Collapsed rail: 72 px.** Icons only. The active item becomes a 52×32 pill at `#C2E7FF` with `border-radius: 0 20px 20px 0` and an `#004A77` glyph, with the label below in `#2962FF`.

**The hamburger is a toggle, not a breakpoint.** At expanded widths it switches between the 347 px drawer and the 72 px rail and the content reflows. Below roughly 1000 px it opens a modal drawer over a scrim instead. The state persists across page loads — get this right or the clone will feel wrong on the second visit.

Order: `Home · Calendar · — · [Teaching: To review, …classes] · — · [Enrolled: To-do, …classes] · — · Archived classes · Settings`. Group headers are collapsible and carry a chevron. Class entries show a 24 px circle with the class initial (`#E8F0FE` on `#0B57D0`) and two lines — name and section.

### 4.3 Content canvas

White, with a **16 px top-left corner radius only**. It is the single most distinctive structural detail of the current Classroom and it is easy to miss.

### 4.4 Class tab bar — 65 px, white

Tabs are 95×48 at 14 px. Active gets `#0B57D0`, weight 500 and a **3 px** bottom border matched to the tab width. On the right: Google Calendar, Class Drive folder, Class settings (gear), and at narrow widths an overflow `⋮` that absorbs the first two.

### 4.5 Help FAB

48 px circle, `rgba(255,255,255,0.85)`, fixed bottom-right, `z-index: 9999`. It renders on *every* screen including the boot skeleton.

---

## 5. Responsive behaviour

| Mode | Viewport | Nav | Layout |
|---|---|---|---|
| compact | < ~600 px | hidden; hamburger opens a modal drawer | one column, cards full-bleed, *Add class* becomes a tonal pill instead of a text link, class card goes full width |
| medium | ~600 – ~960 px | hidden | one content column; class cards in a wrapping grid at their fixed ~292 px |
| expanded | ≥ ~960–1000 px | permanent 347 px drawer | class page shows sidebar and main column side by side |

Breakpoints were derived by measuring the nav element at several widths; treat them as ±20 px.

The **class settings** screen has its own switch: a full-screen dialog at expanded widths, an ordinary centred dialog below roughly 700 px.

---

## 6. Flows

Machine-readable versions of all of these live in `data/flows.json`.

### 6.1 First run on a personal account

1. Click `+` → menu **Add course**: *Join class* / *Create class*. Surface `#F0F4F9`, radius 4, 48 px rows, 16 px text, **no shadow**. The `+` picks up a circular grey state layer.
2. Click **Create class** → the gate dialog, 514×390:
   - Title: *Using Classroom at a school with students?*
   - Two paragraphs with inline links (*Google Workspace for Education*, *Learn More*, *privacy and security*).
   - One checkbox: *I've read and understand the above notice, and I'm not using Classroom at a school with students*.
   - **Go back** (enabled) and **Continue** (disabled grey).
3. Tick the box → the checkbox fills `#1B57D0` with a white check and a light-blue state halo; **Continue** turns `#0B57D0`.
4. **Continue** → cross-fade to the Create class dialog. The gate never appears again for this account.

### 6.2 Create a class

Dialog 560×548, `#E9EEF6`, radius 28, 24 px padding. Five Material **filled** text fields, each 512×56 on `#DDE3EA` with `border-radius: 4px 4px 0 0`. Vertical pitch is 72 px — except after the first field, where the `*Required` helper row pushes it to 92 px.

Fields: **Class name\*** (autofocused; blue floating label, 2 px `#0B57D0` indicator, helper `*Required`), **Section**, **Level(s)** (autocomplete), **Subject** (autocomplete, free text allowed), **Room**.

Footer: *Cancel* (text) / *Create* (disabled until Class name has content).

**The submitting state is worth copying exactly:** on Create, every field greys out and becomes non-interactive, *Cancel* greys out, and the primary button's label changes from **Create** to **Creating…**. There is no spinner.

### 6.3 What a brand-new class looks like

Stream tab active. Default theme **Light blue** with the blue pencil-pen-folders illustration. Banner 923×240 inside the 24 px gutter at radius 16; title 36 px white, section 22 px white; a white **Customize** pill (135×40, radius 20, `#F8FAFD`) top-right and a **View class information** (i) bottom-right. The top half of the banner carries a dark-to-transparent gradient so white text stays legible over any theme image.

Left sidebar, 258 px: a **Meet** card (present in the DOM but disabled on consumer accounts — *"You don't have permission to create or edit the Meet link. Contact your admin to get access."*), a **Class code** card showing an 8-character lowercase code at 22 px, and an **Upcoming** card.

Main column: a **New announcement** tonal pill (197×40, `#C2E7FF`, radius 20, 14 px label) and a **Repost** text button, then the empty state:

> **This is where you can talk to your class**
> Use the stream to share announcements, post assignments, and respond to student questions
> `[ Stream settings ]`

Creating a class also silently creates a Drive folder and a Google Calendar, both linked from the tab bar.

### 6.4 Customize the banner

**Customize** → *Customize appearance* (712×538): a live banner preview, then *Select stream header image* with **Select photo** and **Upload photo** tonal buttons, then *Select theme color* with eight 64 px circular swatches. The selected swatch shows a check glyph — the fill does not change. Footer *Cancel* / *Save*, Save disabled until something changes.

**Select photo** → *Select class theme* (622×546) stacks on top: six tabs (**General · English & History · Math & Science · Arts · Sports · Other**) over a scrolling two-column grid of 325×111 tiles at radius 12, each `role="option"`. **73 themes in total** — the complete catalogue with names per tab is in `data/themes-and-colors.json`.

The eight theme colours (fill / 2 px ring):

| Name | Fill | Ring |
|---|---|---|
| Blue | `#D0E4FF` | `#3271EA` |
| Green | `#BEEFBB` | `#128937` |
| Pink | `#FFD8EF` | `#DC258D` |
| Orange | `#FFDCC3` | `#E86E00` |
| Cyan | `#ACEDFF` | `#009EBB` |
| Purple | `#EEDCFE` | `#7438D2` |
| **Light blue (default)** | `#E7F2FF` | `#4E8FF8` |
| Grey | `#E3E3E3` | `#5E5E5E` |

### 6.5 Post an announcement

Modal composer titled **Announcement**.

- **For** row: a class select (`aria-label="Post in {class} {section}"` — Classroom supports posting to several classes at once) and an outlined **All students** pill.
- Rich text area, placeholder *Announce something to your class*. The toolbar — **Bold, Italic, Underline, Bulleted list, Remove formatting** — sits *below* the text area, above a 2 px blue active indicator.
- Attach row: four 40 px circular outlined icon buttons — Drive, YouTube, Upload, Link.
- Footer: *Cancel* and a **Post** split button, disabled while the body is empty. The caret opens **Post / Schedule / Save draft**.

**All students** opens the *Announce to* sub-dialog (528×472) — the only dialog captured with a white rather than `#E9EEF6` surface. With no students it shows a sleeping-cat illustration, *There are no students in this class*, and an **Invite students** action, over *Cancel* / *Done*.

### 6.6 Classwork and the Create menu

Empty state:

> **This is where you'll assign work**
> You can add assignments and other work for the class, then organize it into topics

A single filled **+ Create** pill sits top-left above a hairline rule. Its menu is 202 px wide with 56 px rows:

`Assignment · Quiz assignment · Question · Material · Reuse post · ── · Topic`

### 6.7 The assignment editor

See `wireframes/wf-02-assignment-editor.svg` and `reference-html/03-assignment-editor.html`.

Full-screen. **Top bar 74 px:** `✕ Close dialog · type icon in a tonal circle · "Assignment" at 24 px · spacer · Assign split button (disabled)`.

**Left column** (two outlined cards):
1. **Title\*** — note that this field renders **in the error state the moment the editor opens**: red label, red `*Required` helper, red 2 px underline. That is real behaviour, not a bug, and a faithful clone should reproduce it. Below it, **Instructions (optional)** with the same five-button rich-text toolbar.
2. **Attach** — five 56 px circular outlined buttons with 14 px labels beneath: **Drive · YouTube · Create · Upload · Link**. *Create* opens **Docs / Slides / Sheets / Drawings / Forms / Vids**, with a blue **New** badge pill on Vids.

**Right rail, 395 px, white, 1 px left divider:**

| Control | Type | Default |
|---|---|---|
| For | select | current class |
| Assign to | outlined pill | All students |
| Points | *editable* combobox, 172 px | `100`, with a single suggestion **Ungraded** — any number can be typed |
| Due | select → popover | *No due date*. Popover header **Due date & time**, a *Due date* field with a calendar icon, helper `MM/DD/YYYY`; picking a date reveals a Time field |
| Topic | select | *No topic* · existing topics · **Create topic** |
| Rubric | tonal **+ Rubric** button | — |

The **Assign** split-button caret opens **Assign / Schedule / Save draft**.

**First run only:** a promo dialog appears over the editor — *Schedule across multiple classes*, body *"You can now define due dates, publish dates, and topics for classwork and announcements across multiple classes."*, with *Learn more* and *Close*.

Variants (structure inferred from the Create menu and the Assignment pattern — see §10):
- **Quiz assignment** — as Assignment, plus an auto-attached *Blank Quiz* Google Form and a grade-importing toggle.
- **Question** — adds an answer-type select (Short answer / Multiple choice) and two checkboxes: *Students can reply to each other*, *Students can edit answer*.
- **Material** — no Points, Due or Rubric; only Title, Description, Attach, For, Topic.
- **Topic** — a small dialog with one text field and *Cancel* / *Add*.
- **Reuse post** — pick a class, pick a post, then a *Create new copies of all attachments* checkbox.

### 6.8 People

Two sections, **Teachers** and **Students**, each a heading with a `person_add` icon button right-aligned above a 1 px rule. Teacher rows are a 40 px avatar plus display name.

Empty students state: sleeping-cat illustration, *Add students to this class*, **Invite students**.

**Invite students** dialog: an *Invite link* label with the full URL `https://classroom.google.com/c/{courseId}?cjc={classCode}` and a copy icon button; an underlined *Type a name or email* search field; a scrolling contact list (44 px avatar, display name, email); footer *Cancel* / *Invite*, Invite disabled until someone is selected.

### 6.9 Join a class (student)

Dialog with two tonal sub-cards on the standard `#E9EEF6` surface:

1. *You're currently signed in as* — avatar, name, email, and an outlined **Switch account** button.
2. *Class code* — heading, *Ask your teacher for the class code, then enter it here.*, and an **outlined** (not filled) text field.

Then plain body text: *To sign in with a class code* with two bullets — *Use an authorized account* and *Use a class code with 5-8 letters or numbers, and no spaces or symbols* — and *If you have trouble joining the class, go to the Help Center article*.

Footer *Cancel* / *Join*, disabled until the field has content.

### 6.10 Class settings

Gear in the class tab bar. At expanded widths this is a **full-screen dialog**: a sticky top bar with `✕ Close dialog`, the title **Class settings**, and a **Save** pill on the right that stays disabled until a field changes. The body is a stack of centred outlined cards about 870 px wide.

Complete field and control inventory — including every select's options — is in `data/class-settings.json`. The headline items:

- **Class Details** — Class name\*, Class description, Section, Level(s), Subject, Room.
- **General → Invite codes** — a *Manage invite controls* button, the invite link with a copy action, the class code, and *Display class code*.
- **General → Stream and classwork** —
  - *Stream*: **Students can post and comment** (default) / Students can only comment / Only teachers can post or comment.
  - *Classwork on the Stream*: Show attachments and details / **Show condensed notifications** (default) / Hide notifications.
  - *Show deleted items* switch, helper *Only teachers can view deleted items.*
- **General → Manage Meet link** — three safety bullets; on a consumer account the whole group is disabled.
- **Grading** — *Automatically apply a draft grade to Missing assignments* (on by default) with a *Default grade* percentage; *Overall grade calculation*: **No overall grade** (default) / Total points / Weighted by category; *Show overall grade to students*; and grade categories.

---

## 7. Screen-by-screen states

Full inventory with routes in `data/screens.json`. The ones that matter most for a simulation:

### 7.1 Boot / route change

Reproduce this — it is the first thing a learner sees. The top bar renders with only the hamburger, apps and avatar (no logo, no page title); a 4 px indeterminate bar sits under it; the drawer shows *Home* and *Calendar*, then a centred spinner where the class list will be, then *Archived classes* and *Settings*; the content area is a blank white panel with the 16 px top-left corner. The Help FAB is already there.

### 7.2 Empty states

Every empty state is the same recipe: a grey line-art illustration (~200×160, occasionally one Google-blue accent), a 22 px title, a 14 px `#444746` body, and sometimes one action.

| Screen | Illustration | Title | Body / action |
|---|---|---|---|
| Stream | education cards | This is where you can talk to your class | Use the stream to share announcements, post assignments, and respond to student questions · `Stream settings` |
| Classwork | bear at a desk | This is where you'll assign work | You can add assignments and other work for the class, then organize it into topics |
| People → Students | sleeping cat on a book | Add students to this class | `Invite students` |
| Grades | fishbowl with a calculator | This is where you'll view and manage grades | `Invite students` |
| Home → Due soon | — | — | You don't have any work due in the next 7 days |
| Home → Recently due | bird at a laptop | No recent assignments to review | See assignments from the past 7 days that need review |
| Home → Class learning tools | — | — | You don't have any assigned class learning tools |
| Archived classes | window, plant and mug | None of your classes have been archived | `What does this mean?` |

### 7.3 Stream posts

Two renderings, and which one you get depends on the **Classwork on the Stream** class setting:

- **Condensed** (the default): a 571×72 row at radius 12 on `#DDE3EA`, 8 px vertical padding — a leading type icon, a one-line summary (*"{Author} posted a new material: {Title}"*), a date line, and a `⋮`.
- **Full**: a white card with a 1 px `#DADCE0` border — avatar, author, posted date, optional *(Edited {date})*, body, attachment chips, and an *Add class comment* row. Announcements always render this way.

Dates read `MMM D, YYYY`, with `Created MMM D, YYYY` and `(Edited MMM D, YYYY)` variants.

### 7.4 Cross-cutting banners

These live in the DOM permanently and reveal themselves on trigger:

| Message | Actions |
|---|---|
| Refresh your browser to update this page | Dismiss · Refresh |
| Stream was updated | Show |
| Class is archived. Restore it to add or edit anything. | Restore |
| You're invited to teach this class | Accept |
| Page is loading… | (screen-reader live region) |

---

## 8. Accessibility notes worth copying

Classroom is unusually careful here, and a simulation that copies it inherits the benefit:

- A **Skip to main content** link is the first focusable element.
- Landmark roles throughout: `navigation` (titlebar and drawer are separate), `main`, `complementary` (stream sidebar and the banner strip), `contentinfo` (the Help FAB).
- **Every icon button carries an `aria-label` and a visible tooltip**, and the two match. The ax-tree dumps in `data/ax-trees/` double as the tooltip copy.
- Labels are specific rather than generic — *"Open folder for \"{Class}\" in Google Drive"*, *"Class options for {Class}"* — so a screen-reader user hears which class they are acting on.
- Menus use `role="menu"` / `role="menuitem"`; theme tiles use `role="option"`; the role switcher uses `role="tablist"` / `role="tab"`.
- Loading is announced through a live region, not left silent.

---

## 9. Build order for the clone

1. **Shell** — top bar, drawer (all three modes), canvas with its 16 px corner, help FAB. Get the hamburger toggle and its persistence right first; everything sits inside it.
2. **Tokens** — drop in `reference-html/tokens.css` and build against the variables from the start. Retrofitting colour is expensive.
3. **Primitives** — button (5 variants + split), filled and outlined text fields, select, menu, dialog (standard + full-screen), switch, checkbox, card, empty state, tabs, segmented control.
4. **Home** — both role views, section cards, class card.
5. **Class shell** — tab bar, banner, and the Stream sidebar.
6. **Stream** — empty state, composer, condensed and full post renderings.
7. **Classwork** — Create menu, then the Assignment editor, then the other four types as variants of it.
8. **People and Grades** — these need seeded data to be interesting; do them once the simulation has fixture students.
9. **Views** — Calendar, To-do, To review, Archived, Settings.
10. **States** — boot skeleton, loading spinners, submitting states, the banner strip. Leave these to last but do not skip them; they are most of what makes it feel real.

---

## 10. What is verified and what is not

**Directly captured in this session** — everything above with measurements, plus: the first-run gate, Create class in all three states, the new-class landing, Customize appearance and the full 73-theme catalogue, the announcement composer including the split menu and the *Announce to* sub-dialog, Classwork empty and the Create menu, the Assignment editor with the Points / Due / Topic / Create-attachment menus, People empty, Invite students, Grades empty, Join class, Class settings in full, global Settings in full, Calendar, To-do, To review, Archived, the boot skeleton, the Home onboarding dialog, the role segmented control, and three responsive widths.

**Not reproducible with a single consumer account, and therefore described from structure rather than observed:**

- The Grades table with real students in it.
- The student submission page — the *Your work* panel with *Add or create* / *Mark as done* / *Turn in*, and private comments.
- The teacher's per-student grading view.
- A populated People tab with its *Actions* menu.
- The teacher class-card overflow menu (*Move / Edit / Copy / Archive*) and the archive confirmation.
- The Question, Material, Topic and Reuse post editors — only the Create menu entries and the shared Assignment pattern were observed.
- Error states on Join class submission.

Each of these is flagged `"verified": false` in `data/screens.json`. To close the gaps you need a second Google account enrolled as a student in the reference class; an hour of capture with two browser profiles would finish the set.

---

## 11. Files in this package

```
SPEC.md                        this document
README.md                      orientation
CHECKLIST.md                   build checklist derived from the spec

data/
  tokens.json                  colour, type, shape, spacing, sizing, breakpoints, motion
  components.json              component inventory with measured metrics + icon names
  screens.json                 route table, screen inventory, per-screen states, verification flags
  flows.json                   step-by-step flows with the exact UI response at each step
  copy-strings.json            every UI string, verbatim, keyed for i18n
  themes-and-colors.json       8 theme colours + all 73 photo themes across 6 tabs
  class-settings.json          complete class-settings field and option inventory
  stream-and-classwork.json    stream, composer, classwork and assignment-editor detail
  raw_tokens_home.json         raw computed-style frequency dump from the Home page
  ax-trees/                    accessibility-tree dumps (also usable as tooltip copy)

wireframes/
  wf-01-shell.svg              annotated shell with measurements + responsive modes
  wf-02-assignment-editor.svg  annotated assignment editor
  wf-03-first-run-flow.svg     first-run → first class flow diagram

reference-html/
  index.html                   gallery + colour, type and radius tables
  tokens.css                   the tokens as CSS custom properties — drop straight into the build
  shell.css                    reconstructed component CSS
  _shell.js                    shared chrome for the reference pages (inline SVG icons, drawn from scratch)
  00-home.html                 Home — Teaching view
  01-class-stream.html         Class — Stream
  02-classwork.html            Class — Classwork with the Create menu open
  03-assignment-editor.html    Assignment editor
  04-dialogs.html              the five key dialogs, side by side, with specs
```

```
previews/
  *-desktop.png / *-tablet.png / *-mobile.png
                                 rendered PNGs of the reference-html pages at 1440 / 760 / 390 px,
                                 2× density. These are renderings of the RECONSTRUCTIONS in this
                                 pack, not captures of the live product.
```
