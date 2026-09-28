---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/layouts/Base.astro"]
---

# Homepage and site shell

## Scope and mode
Home is **Persuade**. It has to win over community skeptics and recruit crew. The inner pages (How it works, Forests & wildfire) are **Read**. Careers, Drop-off, Safety, and Contact are **Operate**. They all share one shell and one world.

## Audience, job, action
- **Community** needs to understand forest waste → wildfire risk down → steady local power, and to believe it.
- **Job seekers** need to reach the pay and the Apply button in one step.
- **Utility visitors** (drop-off, drivers) need hours, today's open/closed status, and the safety documents in one click.

## Proof and content
- **Real terrain:** USGS/Terrarium elevation data for Shasta, Lassen, the valley, and Anderson.
- **Real figures,** each flagged for SRM to confirm: 55 MW, 1,250 t/day, 62,600 homes, since 1987, and the oil and coal offsets.
- **Real jobs** with posted wages.
- **Real sun position.**
- **No stock photos, testimonials, or invented emissions data.**

## Direction contract
**THESIS:** The site is a working tabletop model of the North State, lit by the real sun over Anderson. The visitor physically follows a load of wood from the forest to their light switch. It refuses the category's photo-hero-plus-stat-band-plus-three-cards energy site.

**OWN-WORLD:** A museum diorama. Real terrain on a dark plinth, with soil-strata cut edges, a miniature conifer forest, and a matte clay plant. Two palettes follow the sun:
- **Day:** valley straw #cdb987, conifer #3a5f41, sky wash #8fbbe0→#e9f1f3, ink #13241c.
- **Night:** navy #0a1422, with window and power gold #ffc94d glowing.

Other rules: fuel green and power gold are the only flow colors; amber #f0b93f is reserved for action; Bricolage Grotesque for display and Schibsted Grotesk for body. Frosted panels are used only where text sits over the moving model.

**STORY:**
1. The hero: the whole region as a model, flows already moving, "Wildfire fuel in. Clean power out."
2. Scrolling flies the camera through 8 steps: forest, chipping, haul, fuel yard, boiler, turbine, grid, homes.
3. 62,600 homes light up.
4. The wildfire demo shows why thinning matters.
5. The crew and jobs.
6. The drop-off utility strip.

**FIRST VIEWPORT:**
- **Left 45%:** the live-time line, a display headline at 96px max, a one-sentence sub, and amber "Join the crew" plus a ghost "Follow the journey".
- **Right:** the full diorama, 3/4 view from the south-southwest, Shasta at the top, with a slow sway.
- **Bottom right:** the legend and light preview.
- **Mobile:** the headline on top and the model filling the lower half.

**FORM:** A grounded direction, the control-room "mimic board" process story (seed key ebfb3394). It evolved through user rounds (A2 clear diagram × A3 day/night) into a real-terrain diorama. It swaps with the contour-map engine (the same story on the same terrain) through config or `?view=contour`.

**FINISH:** Unreviewed and undocumented is unfinished. This build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Open decisions
- Exact plant position and site layout (needs photos of SRM's site).
- The accepted and rejected materials list for drop-off.
- SRM's confirmation of every figure and of the claim that the plant runs around the clock.
- Hosting target.
