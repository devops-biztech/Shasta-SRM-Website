# Content to confirm with SRM before launch

The site only uses facts from SRM's current website and its own handouts. These still need SRM to sign off or fill in. Each item says where it lives in the code.

## Figures (`src/data/site.ts` → `facts`)
- [ ] 55 MW generating capacity
- [ ] Up to 1,250 tons of wood taken in per day
- [ ] About 62,600 homes' worth of electricity
- [ ] 789,238 barrels of oil equivalent and 237,521 tons of coal offset per year: how were these calculated, and are they current?
- [ ] Founded / generating since 1987

## Claims in the copy
- [ ] **The plant runs around the clock.** The night-time hero line says "Our plant is still turning forest waste into power" (`src/scripts/journey.ts`, `paintLight`). Grid step, "more" text: "a biomass plant can run whatever the weather and whatever the time of day" (`src/data/story.ts`).
- [ ] Fuel comes from the Shasta-Trinity and Lassen National Forests and private land. It also includes mill residue and the public recycling program. Is that the right emphasis?
- [ ] "Capturing energy that would otherwise go up in smoke from an open burn pile" (Boiler step). Is SRM comfortable with this framing?

## Hours (`src/data/site.ts` → `schedules`)
- [ ] **Conflict:** the old website says "Temporary delivery schedule: Mon–Fri 5 a.m.–midnight, Sat 8–5". The public handout says Mon–Sat 8–5. The site currently assumes the first is **commercial fuel delivery** and the second is **public drop-off**. Please confirm.
- [ ] Is the commercial schedule still "temporary"?

## People and contact (`src/data/site.ts` → `org`)
- [ ] HR contact is still Shannon Taylor at staylor@trlcmill.com. Should applications go to an srm-energy.com address instead?
- [ ] Is ap@srm-energy.com the right general office email to publish?
- [ ] Is apply.srm-energy.com still the application portal?

## Jobs (`src/content/jobs/*.md`)
- [ ] Are all six roles still open, and are the wages current?
- [ ] Any benefits, shifts, or certifications SRM wants listed? None are shown, because none were provided.

## Visuals
- [ ] **Exact plant location** for the map marker (currently Anderson town center plus a small offset: `PLACES.Anderson` in `src/scripts/engines/types.ts`, `PLANT_UV` in `diorama.ts`).
- [ ] **Photos of the real site** (aerial and ground), so the 3D plant can be modeled on SRM's actual buildings instead of a generic layout.
- [ ] Haul routes and power-line routes on the map are **illustrative**, not actual routes. Is that OK, or does SRM want real ones?
- [ ] Logo: only a raster PNG exists. A vector (SVG) version would sharpen the header and footer.

## Before launch
- [ ] Set `SHOW_VIEW_SWITCH` and `SHOW_LIGHT_PREVIEW` in `src/config.ts` to `false`, or keep them if SRM likes letting visitors play.
- [ ] Choose hosting (Netlify, Vercel, or Cloudflare Pages) and point srm-energy.com at it. Redirects from the old WordPress URLs are already set in `astro.config.mjs`. The host can also serve them as real 301s.
