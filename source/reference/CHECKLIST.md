# Clone build checklist

Tick these off against `SPEC.md`. Items marked ⚠ are the ones that most affect whether the simulation
*feels* like Classroom rather than merely resembling it.

## Foundations
- [ ] `tokens.css` wired in; no hard-coded hex anywhere in components
- [ ] Type scale set up, weight 400 everywhere except the active tab and the top-bar class name
- [ ] Global `letter-spacing: 0.1px`
- [ ] ⚠ Menus and dialogs have **no box-shadow** — tonal surface + scrim only
- [ ] Material Symbols (or equivalent) loaded; Classroom logo **not** used

## Shell
- [ ] Top app bar, 65 px, `#F8FAFD`
- [ ] Breadcrumb inside a class: chevron + class name 16/500 + section 12/400
- [ ] Nav drawer expanded, 347 px, 48 px items, active pill `#D3E3FD` radius 9999
- [ ] Nav rail collapsed, 72 px, active pill 52×32 radius `0 20px 20px 0` on `#C2E7FF`
- [ ] ⚠ Hamburger toggles expanded ↔ rail at wide widths, opens a modal drawer below ~1000 px
- [ ] ⚠ Drawer state persists across page loads
- [ ] Drawer groups: Teaching / Enrolled, collapsible, with class avatars and two-line entries
- [ ] ⚠ Content canvas has a **16 px top-left corner radius only**
- [ ] Help FAB, 48 px, `rgba(255,255,255,.85)`, fixed bottom-right, on every screen

## Primitives
- [ ] Buttons: filled, filled-tonal, outlined, text, icon, split (with caret menu)
- [ ] Disabled buttons: `#E3E3E3` fill, `#9AA0A6` label
- [ ] Filled text field: 56 px, `#DDE3EA`, radius `4px 4px 0 0`, floating label, 2 px focus indicator
- [ ] Error field: red label, red helper, red 2 px indicator
- [ ] Outlined text field (used in Join class and the "All classes" filters)
- [ ] Select, 56 px, with a `#F0F4F9` menu
- [ ] Menu: radius 4, `8px 0` padding, 48 px rows (38 px dense with leading icons), separators
- [ ] Dialog: `#E9EEF6`, radius 28, 24 px padding, right-aligned footer
- [ ] Full-screen dialog variant: 74 px top bar, ✕ left, primary action right
- [ ] Switch 52×32; checkbox 18 px with a 40 px state-layer halo
- [ ] Empty state: illustration → 22 px title → 14 px body → optional action
- [ ] Tabs with a 3 px active underline matched to tab width
- [ ] Segmented control, 48 px, check icon on the selected segment

## Roles
- [ ] Workspace-style role picker as the simulation's opening beat
- [ ] Per-class role underneath (the same user teaches one class, is enrolled in another)
- [ ] Teaching / Enrolled segmented control on Home, only when both groups exist
- [ ] `/h/tv` and `/h/st` route variants

## Screens
- [ ] Boot skeleton with the 4 px linear bar and the drawer spinner ⚠
- [ ] Home — Teaching: Recently due (+ skeleton rows), Classes
- [ ] Home — Enrolled: Due soon, Class learning tools, Classes
- [ ] Class card 292×296, radius 12, banner + overlapping avatar + footer icon row + overflow menu
- [ ] Class Stream: banner, Class code / Upcoming sidebar, composer row, empty state
- [ ] Stream posts: condensed row (571×72, radius 12, `#DDE3EA`) **and** full white card
- [ ] Classwork: Create button, 202 px menu with the separator before Topic, empty state
- [ ] Assignment editor: two left cards, 395 px right rail, attach row
- [ ] ⚠ Title field opens **already in the error state**
- [ ] People: Teachers / Students sections, invite dialog with the invite link
- [ ] Grades: empty state, then the table once fixtures exist
- [ ] Calendar, To-do (Assigned/Missing/Done), To review (To review/Reviewed), Archived
- [ ] Global Settings: Profile + the five notification groups
- [ ] Class settings as a full-screen dialog with a Save that stays disabled until dirty

## Flows
- [ ] `+` menu → Join class / Create class
- [ ] First-run gate dialog, Continue disabled until the checkbox is ticked
- [ ] Create class → ⚠ submitting state: fields grey out, button reads **Creating…**
- [ ] New class gets the Light blue theme, a generated 8-char code, a Drive folder and a Calendar
- [ ] Customize appearance → theme picker with 6 tabs and 73 themes
- [ ] Announcement composer → All students sub-dialog → Post / Schedule / Save draft
- [ ] Assignment: Points combobox with the "Ungraded" suggestion; Due popover; Topic → Create topic
- [ ] Create-attachment menu: Docs / Slides / Sheets / Drawings / Forms / Vids (New badge)
- [ ] Join class by code, 5–8 alphanumerics
- [ ] First-run promo over the assignment editor

## States and polish
- [ ] Route-change linear progress bar
- [ ] Section spinners and skeleton pills
- [ ] Submitting / disabled states on every form
- [ ] The five cross-cutting banners (refresh, stream updated, archived, co-teach invite, loading)
- [ ] Dialog enter: ~180 ms fade + scale from 96%; exit: fade only
- [ ] Menu enter: fade under 120 ms, no slide

## Accessibility
- [ ] Skip to main content as the first focusable element
- [ ] Landmarks: navigation ×2, main, complementary, contentinfo
- [ ] ⚠ Every icon button has an `aria-label` **and** a matching tooltip
- [ ] Labels name the object: "Class options for {Class}", not "More options"
- [ ] `role="menu"` / `menuitem`, `role="option"` on theme tiles, `role="tablist"` on the role switcher
- [ ] Loading announced through a live region
- [ ] Focus visible on every interactive element; Escape closes menus and dialogs

## Simulation-specific
- [ ] Fixture data: at least 6 students, 3 assignments in mixed states, 2 topics, a few comments
- [ ] No real email is ever sent; the invite flow ends in a simulated confirmation
- [ ] Practice actions labelled as practice where they diverge from the real product
- [ ] Every destructive action is reversible within the simulation
