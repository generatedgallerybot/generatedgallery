# Design Critique Log

## Latest Critique (Feb 23, 2026 — v2.6, 1:20AM UTC)
**Score: 5.5/10**

### Top 5 Issues (Ranked by Impact)

#### 1. Mobile is STILL broken — wall of empty black placeholders below the fold
This was "✅ FIXED" last critique. It is not fixed. The mobile screenshot (390x844) shows ~15 real images, then dozens of empty dark rectangles stretching to the footer. This is the same bug from v2.4. Either the fix regressed or was never deployed. This is a P0 — half your mobile visitors see a dead page.
- Fix: Verify the ref-based IntersectionObserver fix from v2.5 was actually built and deployed (`npm run build && pm2 restart`). Check the browser console on mobile viewport for errors. The skeleton placeholders should not render unless images are actively loading.

#### 2. No visible hover overlays or interaction affordances on images
Third consecutive critique flagging this. Every image is still a bare rectangle with zero metadata, zero action buttons, zero hover state. This is THE defining feature gap vs Unsplash/Dribbble/ArtStation. Screenshots can't capture hover, but the code should at minimum show a subtle permanent metadata strip (title, model) below each image on mobile where hover doesn't exist. There's nothing.
- Fix: Prioritize mobile-visible metadata (small bar under each image card with truncated title). Desktop hover overlay is secondary but still needed.

#### 3. Content curation is still nonexistent
Fourth critique in a row. The hero says "curated." The grid shows anime panda with roses next to realistic portraits next to Star Wars tabloid parody next to near-identical architecture hallways (still at least 3). No quality filter, no deduplication, no coherent aesthetic. This tagline is false advertising.
- Fix: Either change tagline to "AI art, collected." or implement basic dedup (perceptual hash) and a quality tier. A "Featured" row at top with 4-6 hand-picked images would help immensely.

#### 4. Mobile category filter still has no scroll affordance
Same as v2.4 and v2.5. Only 4 pills visible on mobile with hard truncation. No fade gradient, no arrow, no indication that 12+ categories exist offscreen. Users will never discover them.
- Fix: Add a right-edge fade gradient (transparent to background color) and ensure 44px touch targets.

#### 5. NSFW toggle still orphaned on the right
Unchanged across 3 critiques. The toggle sits alone with no label, visually disconnected from the filter system. On mobile it's nearly invisible.
- Fix: Add "NSFW" label text next to the toggle. Move it inline with Recent/Trending.

### What Improved Since Last Critique (v2.5)
- Honestly, nothing visible changed between v2.5 and v2.6. Desktop layout, hero, typography, color palette all remain the same. The warm dark palette and hero typography are still the strongest elements. Search bar is clean. Desktop above-the-fold is passable.

### Recurring Unfixed Issues (3+ critiques)
- ❌ Mobile infinite scroll broken (flagged since v2.4, "fixed" in v2.5, still broken)
- ❌ No hover overlays / image metadata (flagged since v2.3)
- ❌ Content curation nonexistent (flagged since v2.2)
- ❌ Mobile category scroll hints (flagged since v2.3)
- ❌ NSFW toggle placement (flagged since v2.4)

### Summary
Nothing has visually changed since the last critique 4 hours ago. The same 5 issues persist. Desktop above-the-fold is the only thing holding the score above 4. Mobile is broken, images have no metadata, content isn't curated. The implementation cron either isn't running, isn't deploying, or is making changes that don't affect these core issues. Score holds at 5.5 — it won't move until mobile loading works and images show metadata.

---

## Previous Critique (Feb 22, 2026 — v2.5, 9:20PM UTC)
**Score: 5.5/10**

### Top 5 Issues (Ranked by Impact)

#### 1. ✅ FIXED — Mobile infinite scroll broken — wall of empty placeholders
Root cause: `loadImages` had `images.length` in its dependency array, causing the IntersectionObserver to constantly disconnect/reconnect on every append. Fixed by using refs for offset (`imagesRef`), loading state (`loadingRef`, `loadingMoreRef`, `hasMoreRef`), and the load function itself (`loadImagesRef`). The observer now mounts once and reads current values via refs. Also increased rootMargin from 400px to 600px for earlier prefetch on mobile.

#### 2. No hover overlays or image metadata visible on desktop
Previous critique marked this "✅ FIXED" but the desktop screenshot shows zero hover states, zero metadata, zero interaction affordance on any image card. Every image is still a bare rectangle. Either the fix wasn't deployed, or it only activates on actual hover (which screenshots can't capture). If the latter, verify it works. If the former, this remains the #1 design gap vs Unsplash/Dribbble/ArtStation.
- Fix: Confirm hover overlays are actually deployed and functional. Consider showing a subtle permanent metadata bar (title truncated, one line) below each image on desktop too, not just on hover.

#### 3. Content curation is nonexistent — "curated" tagline is a lie
The grid mixes: realistic portraits, anime pandas with roses, Star Wars tabloid parody, Jolteon fan art on pink background, near-identical architecture hallways (at least 3), busty fantasy characters. There's no quality filter, no deduplication, no coherent aesthetic. The hero says "curated" but the content says "random API dump." This destroys credibility instantly.
- Fix: Implement a quality score (resolution + aesthetic model or manual flag). Deduplicate similar images (those hallway shots). Consider a "staff picks" or featured row at top with actually curated selections.

#### 4. Mobile category filter UX still poor
Only 4 pills visible on mobile ("All", "3D Render", "Abstract", "Animat...") with hard truncation. No scroll indicator, no fade hint, no arrow. Users won't discover 12+ hidden categories. Touch targets still look small.
- Fix: Add a fade gradient on the right edge to hint at scrollability. Ensure 44px min touch height. Consider a "More ▸" chip at the end.

#### 5. NSFW toggle placement is disconnected
The toggle floats alone on the far right of the filter bar with no label context. On mobile it's barely visible. It looks like an orphaned UI element, not part of the filter system.
- Fix: Move NSFW toggle inline with Recent/Trending pills, or add a visible label. On mobile, integrate it into a filter drawer or bottom sheet.

---

## Previous Critique (Feb 22, 2026 — v2.4, 5:20PM UTC)
**Score: 5/10**

(See git history for older critiques)

---
*This file is updated by the design critique cron job. Implementation cron reads this to know what to fix.*
