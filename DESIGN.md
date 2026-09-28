---
name: Shasta SRM
description: A working tabletop model of the North State, lit by the real sun over Anderson.
colors:
  valley-mist: "#eef1ec"
  paper: "#f8faf8"
  sage-wash: "#e4eae5"
  conifer-ink: "#13241c"
  lichen: "#4a5b53"
  hairline: "#d3ddd8"
  hairline-strong: "#b7c5be"
  fuel-green: "#2f7a45"
  power-gold: "#9a6a06"
  action-amber: "#f0b93f"
  on-amber: "#1b1a10"
  danger: "#a3372b"
  steam-blue: "#4f84b5"
  boil-orange: "#c95f2a"
  sky-top: "#8fbbe0"
  sky-bottom: "#e9f1f3"
  night-navy: "#0a1422"
  night-surface: "#101e32"
  night-surface-2: "#16263d"
  night-ink: "#eaf1f7"
  night-muted: "#a3b3c5"
  night-hairline: "#22344f"
  night-hairline-strong: "#33496b"
  night-fuel: "#7fd192"
  night-gold: "#ffc94d"
  night-danger: "#ff8d7d"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 5.6rem)"
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.8vw, 3.3rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 1.8vw, 1.6rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Schibsted Grotesk Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 1.5vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Schibsted Grotesk Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Schibsted Grotesk Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  figure:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(3rem, 6vw, 5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
rounded:
  focus: "4px"
  row: "12px"
  tile: "16px"
  card: "18px"
  panel: "22px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  max: "1240px"
  section: "clamp(72px, 10vw, 140px)"
  section-tight: "clamp(48px, 7vw, 96px)"
  stack: "20px"
  cluster: "12px"
components:
  button-primary:
    backgroundColor: "{colors.action-amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.conifer-ink}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
    height: "48px"
  button-small:
    rounded: "{rounded.pill}"
    padding: "10px 16px"
    height: "40px"
  segment-pressed:
    backgroundColor: "{colors.conifer-ink}"
    textColor: "{colors.valley-mist}"
    rounded: "{rounded.pill}"
    padding: "8px 11px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "clamp(22px, 3vw, 32px)"
  doc-row:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.tile}"
    padding: "18px 20px"
  story-panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "28px 28px 20px"
    width: "410px"
---

# Design System: Shasta SRM

## Overview

**Creative North Star: "The Museum Diorama"**

The site is a working tabletop model of the North State: real USGS terrain on a dark plinth with soil-strata cut edges, a miniature conifer forest, and a matte clay plant, lit by the real sun over Anderson. The visitor follows a load of wood from the forest to their light switch. Everything else (inner pages, job rows, hours, documents) is the quiet placard beside the model: flat paper surfaces, hairline rules, heavy grotesque headlines, and one amber action.

One world, two lights. Day is valley mist and conifer ink; night is navy with window and power gold glowing. The page does not choose a theme; the sun does. Density is low on Persuade and Read pages and tighter on Operate pages (careers, drop-off, safety, contact), where rows and tables replace prose.

The build refuses the category's photo hero, stat band, and three-card grid. No stock photography, no testimonials, and no figure the plant has not stated.

**Key Characteristics:**
- Real terrain and real sun position carry the imagery; no photos.
- Two palettes, swapped wholesale by one class on the root element.
- Fuel green and power gold are the only interface flow colors; amber means "act".
- Heavy Bricolage display over a plain Schibsted body.
- Flat paper surfaces with hairlines; frosted glass only over the moving model.
- One authored motion moment per section, and all of it yields to reduced motion.

## Colors

A cool, mineral day palette and a deep navy night palette sharing one set of roles; saturation is spent only on flow (green, gold) and action (amber).

### Primary
- **Action Amber** (action-amber): The action and interaction color. It fills the primary button, the focus ring (3px outline, 3px offset), text selection, the skip link, and the arrival tint on a targeted job. It is not swapped at night.
- **On Amber** (on-amber): Text on amber fills only.

### Secondary
- **Fuel Green** (fuel-green; night-fuel at night): Wood waste in the flow. The legend key, haul lines in both story engines, rail segments for fuel steps, confirmation icons (checks, documents, contact glyphs), numbered step discs, the open-status dot, caret, and form accent.
- **Power Gold** (power-gold; night-gold at night): Electricity in the flow, and every figure that measures output: the hero's second line, pay figures, the homes counter, story figures, and fallback step numerals. The day value is darkened for use as text on light surfaces.

### Tertiary (illustration only)
- **Steam Blue** (steam-blue) and **Boil Orange** (boil-orange): Only inside the fine-line plant cutaway (the steam line and the flame). They never appear in legends, rails, text, or controls.

### Neutral
- **Valley Mist** / **Night Navy** (valley-mist / night-navy): Page background.
- **Paper** / **Night Surface** (paper / night-surface): Raised sections (crew, apply, "inside the plant"), cards, footer, frosted panels at 86-90% mix.
- **Sage Wash** / **Night Surface 2** (sage-wash / night-surface-2): Canvas grounds (fire plots), hover fill on social buttons.
- **Conifer Ink** / **Night Ink** (conifer-ink / night-ink): Headings and body text; also the pressed segment fill.
- **Lichen** / **Night Muted** (lichen / night-muted): Ledes, secondary copy, captions, table values, small headings.
- **Hairline** and **Hairline Strong**: Section rules, row dividers, card borders; strong for ghost-button-adjacent borders and the scrollbar thumb.
- **Danger** (danger / night-danger): Closed status and "not accepted" marks only.
- **Sky Top / Sky Bottom**: The stage and page-head sky wash. On the journey stage the sky is recomputed from solar altitude (a seven-stop table from deep night through golden hour to noon) and set inline.

### Named Rules
**The Amber Means Act Rule.** Action Amber marks the one primary action in a view and the interaction states listed above. It is never decoration, never a bullet, never a text color.

**The Two Flows Rule.** Interface flow color is fuel green (wood) or power gold (electricity). Boiler steps are drawn in green and turbine steps in gold; steam and boil hues stay inside the cutaway.

**The Sun Decides Rule.** Theme is set before first paint from the solar altitude at Anderson (40.448 N, 122.297 W; night below -0.833 degrees), rechecked every minute. `?light=day|golden|night|live` previews and persists for the session. There is no manual theme toggle outside the journey's light preview.

## Typography

**Display Font:** Bricolage Grotesque Variable (with Segoe UI, system-ui)
**Body Font:** Schibsted Grotesk Variable (with Segoe UI, system-ui)

**Character:** A compressed, very heavy display grotesque with tight negative tracking set against a sober newspaper grotesk; the headline shouts the claim and the body reads like a placard. Both are self-hosted via @fontsource-variable.

### Hierarchy
- **Display** (800, clamp(2.6rem, 6vw, 5.6rem), 0.96): One h1 per page. The journey hero runs a slightly smaller clamp (2.75rem-5.4rem) with its second line in power gold. Inner-page h1 caps at 16ch.
- **Headline** (800, clamp(2rem, 3.8vw, 3.3rem), 1.02): Section h2. Local variants step down to roughly 1.5-2.4rem inside grids and bands.
- **Title** (800, clamp(1.3rem, 1.8vw, 1.6rem), 1.15): h3, job titles, fire-plot captions, mobile menu links (700, 1.35rem).
- **Lede** (400, clamp(1.1rem, 1.5vw, 1.3rem), 1.55, lichen): The sentence under a heading; 58ch max.
- **Body** (400, 1.0625rem, 1.6): Running copy; prose blocks 68ch max at 1.7 line height. Headings balance, paragraphs use pretty wrapping.
- **Label** (700, 0.95rem, 0.01em, lichen, sentence case): Small section headings in the footer and contact lines. Buttons use 700 1rem; legend and segments 600 0.8-0.85rem.
- **Figure** (800 display, tabular numerals, power gold): Counters and measured output (homes lit, 55 MW, 1,250 tons, pay). A 600 body-size note in lichen sits beneath.

### Named Rules
**The Heading Stands Alone Rule.** Nothing sits above a heading: no eyebrow, kicker, or uppercase tag. Section identity comes from the heading itself and the surface change.

**The Solid Ink Rule.** Headline color is ink or power gold, as a solid fill. No gradient or clipped-background text.

## Layout

A single centered column: content width min(100%, 1240px) with a fluid gutter of clamp(16px, 4vw, 48px). Sections breathe at clamp(72px, 10vw, 140px) block padding (tight sections at clamp(48px, 7vw, 96px)). Stacks default to a 20px gap and clusters to 12px. Section rhythm alternates the page background with paper bands bounded by top and bottom hairlines.

Grids are asymmetric two-column splits (5fr/7fr, 1.4fr/1fr, 1.3fr/1fr, 4fr/7fr) or even halves; they collapse to one column at 860-900px. The footer runs 1.4fr and three 1fr columns, then two columns at 900px and one at 560px. Lists are ruled rows, not card grids.

The home journey is a sticky 100svh stage inside a 1000vh section: hero copy left (46vw max, 660px), the model filling the stage, the caption panel left and vertically centered, and the legend bottom right. Below 860px the headline sits on top, the model fills the lower half, the panel docks to the bottom, and the legend hides while stepping. Inner pages open with a page head that clears the fixed header (top padding clamp(130px, 16vw, 190px)) over a faint contour texture of the relevant place.

The header is fixed, 12px padded, 1440px max; it turns solid past 40px of scroll and slides away when scrolling down past 160px. Anchor targets use a 88-96px scroll margin.

## Elevation & Depth

Surfaces are flat and separated by tone and hairlines. Shadow is ambient, soft, and ink-tinted by day (pure black at night, heavier), and it appears on things that float over something: the model's panel and insets, the mobile menu, canvases, the cutaway, and hover lift on document rows. The model itself provides real depth through Three.js lighting; the interface does not imitate it.

### Shadow Vocabulary
- **Rest float** (shadow-1): Cutaway card, fire-plot canvases, model part labels, doc-row hover.
- **Lifted float** (shadow-2): Story panel, cutaway inset over the map, mobile menu.
- **Amber glow** (primary button only): A warm colored drop under the amber pill that deepens on hover.

### Named Rules
**The Glass Over Motion Rule.** Frosted glass (surface mixed at 86-90% with 10-14px backdrop blur) is allowed only where text sits over the moving model: the story panel, legend keys, segmented controls, part labels, and the map inset. Nowhere else.

## Shapes

Two families. Controls are full pills (999px): buttons, segmented controls, legend keys, part labels, the logo lozenge, and circular icon buttons (42-46px). Containers are softly rounded: 22px for floating panels, 18px for cards and the cutaway, 16px for document rows, 14px for canvases, 12px for hoverable job rows. Numbered steps use 32px circles filled fuel green. Borders are 1px hairlines on containers and 1.5px on ghost buttons.

### Icons
One authored set on a 24px grid: 1.75 stroke, round caps and joins, currentColor, no fill. Default size 20px (18px in buttons and arrow links, 26px on documents). Decorative icons are aria-hidden; linked icons carry a label. Icons sit inline with text, colored fuel green or lichen; they are never set in tiles or card grids.

## Components

### Buttons
- **Shape:** Full pill (999px), 48px minimum height, 1.5px border.
- **Primary:** Action Amber fill, On Amber text, 700 1rem, 14px 22px, amber glow shadow. One per view.
- **Hover / Focus:** Lift 1px (translateY), border resolves to ink (ghost) or stays amber (primary), glow deepens; press returns to 0. Focus is the global amber ring.
- **Ghost:** Transparent, ink text, ink border at 55%. Used for the secondary path beside a primary ("Follow the journey", "Reset").
- **Small:** 40px, 10px 16px, 0.95rem; the header's "Apply now".
- **Arrow link:** Bold text with a trailing arrow that slides 4px on hover.

### Segmented controls (journey legend)
- **Style:** Frosted pill track, 4px inset; 600 0.8rem segments in lichen.
- **State:** `aria-pressed="true"` fills the segment with ink and flips its text to the background color. Two groups: view (3D model / Contour map) and light (Live / Day / Golden hour / Night).

### Cards / Containers
- **Corner Style:** 18px (card), 22px (floating panel).
- **Background:** Paper, or the page background when nested inside a paper band.
- **Shadow Strategy:** Flat at rest; see Elevation.
- **Border:** 1px hairline.
- **Internal Padding:** clamp(22px, 3vw, 32px); 24-28px on side panels.

### Rows (jobs, documents, hours)
- **Job row:** Four-column grid (title, summary, gold pay, arrow) on hairlines; hover (pointer devices only) fills with the page background and nudges the arrow 4px. Collapses to title/pay over summary at 760px.
- **Document row:** Paper tile, 16px radius, file icon in fuel green, size and download glyph trailing; hover lifts 2px with rest float.
- **Hours table:** Day/hours rows on hairlines, 420px max, with a live status line above.

### Status line
A 9px dot plus text, computed in Anderson time on the visitor's device and refreshed each minute. Open: fuel green dot with a 4px 22% halo. Closed: danger dot. Unknown: hairline-strong dot with "Checking today's hours".

### Navigation
- **Desktop:** Logo lozenge (white pill), four links at 600 0.98rem, and the small amber "Apply now" pushed right. Hover and current page draw a 2px underline that scales in from the left.
- **Mobile (900px and below):** A 46px circular menu button opens a full-width sheet of display-weight links with trailing arrows, a full-width primary button, and a tap-to-call line. Escape closes and returns focus. Below 420px the header CTA hides.
- **Footer:** Paper band, four columns, label-style headings, legal line under a hairline, terrain data credit.

### Story Journey (signature)
The home hero and eight-step story (forest, chipping, haul, fuel yard, boiler, turbine, grid, homes). The shell (`src/scripts/journey.ts`) owns scroll position, copy, rail, figures, and light; an engine only draws.
- **Engine contract:** `resize(w, h)`, `setLight(sunState)`, `frame(dt, sf, step)` where sf runs continuously from -1 (hero) to 7.999, and `dispose()`. Engines receive the stage, a canvas, an HTML labels layer, `mobile`, `reduce`, and `avoid()` (the hero and panel rectangles labels must stay clear of). Labels are HTML, not canvas text.
- **Engines:** `diorama` (Three.js tabletop model; default) and `contour` (Canvas 2D tilted contour map with a line-drawn plant inset). Chosen by `STORY_ENGINE` in `src/config.ts`, overridable with `?view=` and remembered for the session.
- **Fallbacks:** No WebGL, or the diorama throws: mount contour. Contour fails (including missing terrain data): the section becomes static and the always-present ordered list of steps renders as a readable grid with gold numerals. The step list is in the DOM for screen readers and search at all times.
- **Panel:** Frosted 410px card with the step title, text, an optional gold figure, and an eight-segment rail tinted by each step's flow color (keyboard-focusable once stepping).
- **Light:** The stage sky, copy under the headline, and the live-time line follow the sun; any canvas on the site redraws when the root night class changes.

### Other authored moments
- **Homes field:** 6,260 dots (one per ten homes) light outward from the plant in power gold as the sticky section scrolls; the counter tracks them.
- **Fire demo:** Two seeded percolation plots (78% and 45% cover) and one "Drop a spark" primary; results are announced politely and focus moves to Reset.
- **Plant cutaway:** A fine-line SVG that draws itself once when 30% visible, with fuel, steam, and power particles riding their lines. Labeled as an illustration.
- **Page-head contours:** Real contour lines for the page's place, lines only, masked in from the left; static.

### Motion
Standard easing is cubic-bezier(.16, 1, .3, 1). Theme changes cross-fade background and text over 0.8s. Movement is transform and opacity; the one native exception is the stroke line-draw of fine-line illustrations (1.6-1.8s). Each section gets one authored moment and nothing competes with it. Under reduced motion: all CSS transitions and animations collapse, smooth scroll becomes instant, engines hold a still camera with no sway and snap between steps with flows shown statically, the homes field shows fully lit, the fire demo resolves instantly, and the cutaway renders drawn with its particles removed.

## Do's and Don'ts

### Do:
- **Do** bind every color to a token and let `html.night` swap it; canvas code must read the night class and redraw on change.
- **Do** keep one amber primary per view, with a ghost button for the secondary path.
- **Do** color interface flow as fuel green (wood) or power gold (electricity), and measured output as a power-gold figure.
- **Do** separate sections by paper bands and hairlines, and list things as ruled rows.
- **Do** draw icons from the authored 24px, 1.75-stroke set and set them inline with text.
- **Do** give every model, canvas, and demo a text equivalent and a reduced-motion state.
- **Do** flag every stated figure as SRM-confirmed source data before it ships, and label illustrations as illustrations.

### Don't:
- **Don't** put an eyebrow, kicker, or uppercase tag above a heading.
- **Don't** use gradient or background-clipped text.
- **Don't** build icon-card grids or three-up feature cards.
- **Don't** use frosted glass anywhere except text over the moving model.
- **Don't** use Action Amber for bullets, dots, rules, or other decoration.
- **Don't** introduce steam blue or boil orange into interface chrome.
- **Don't** use stock photos, testimonials, or invented numbers, emissions data, or claims.
- **Don't** add a manual theme switch; the sun sets the light.
