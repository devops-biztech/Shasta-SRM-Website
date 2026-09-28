# Shasta SRM website

The website for Shasta Sustainable Resource Management, a 55 MW wood-fired renewable power plant in Anderson, CA. It is an Astro static site.

## Develop

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static site → dist/
npm run preview   # serve the build
npm run check     # type-check
```

## Pages

| Route | What it's for |
|---|---|
| `/` | The forest-to-power journey, the 62,600-homes field, the wildfire demo, jobs, and drop-off |
| `/how-it-works/` | The eight steps in depth, a plant cutaway, and the figures |
| `/forests-and-wildfire/` | Why thinning matters, with the interactive fire demo |
| `/careers/` | Open roles with posted pay, and how to apply |
| `/drop-off/` | Wood to Energy Recycling Program: hours, accepted materials, and yard rules |
| `/safety/` | Safety Rules Book and acknowledgement (crew), and handouts (public) |
| `/contact/` | Phone lines, HR, address, and hours |

## Everyday edits

- **Jobs:** one Markdown file per role in `src/content/jobs/`. To close a role, set `open: false` or delete the file.
- **Hours, phone numbers, figures, accepted materials, yard rules:** all in `src/data/site.ts`.
- **Story copy** (the eight steps): `src/data/story.ts`.
- **PDFs:** `public/docs/`, listed in `src/data/site.ts` → `docs`.

## The two story engines

The homepage journey can be drawn two ways from the same real terrain:

- **`diorama`:** a 3D tabletop model (Three.js/WebGL), lit by the real sun over Anderson.
- **`contour`:** a tilted contour map (Canvas 2D). It's lighter and runs anywhere.

Set the default in `src/config.ts` (`STORY_ENGINE`). Visitors can preview the other with `?view=contour` or `?view=diorama`, or with the in-page switch while `SHOW_VIEW_SWITCH` is on. If WebGL isn't available, the diorama falls back to the contour map. If neither can load, the story shows as plain text.

Both engines implement `StoryEngine` (`src/scripts/engines/types.ts`). The shell (`src/scripts/journey.ts`) owns scrolling, copy, and controls.

## Light follows the sun

Every page is day- or night-themed based on the sun's real position over Anderson (`src/lib/sun.ts`, plus an inline script in `src/layouts/Base.astro` so there's no flash). Preview a light with `?light=day|golden|night|live`. The choice lasts for the session.

## Terrain data

`public/data/heights.json` and `public/data/contours.json` come from open USGS-derived elevation tiles. To regenerate them:

```sh
cd scripts/terrain
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build_terrain.py
```

## Before launch

See `CONTENT-TODO.md` for the figures, hours, and contacts SRM still needs to confirm.
