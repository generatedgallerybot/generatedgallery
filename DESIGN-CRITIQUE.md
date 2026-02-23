# Design Critique Log

## Latest Critique (Feb 23, 2026 — v2.9, 1:20PM UTC)
**Score: 5.5/10**

### Top 5 Issues (Ranked by Impact)

#### 1. Mobile infinite scroll STILL broken — massive wall of empty placeholders
The mobile screenshot shows ~14 real images then a huge wall of dark empty rectangles all the way to the footer. The "useVisibleIds" fix from v2.8 clearly didn't solve this. The placeholders are slightly less shimmery now (they're flat dark boxes) but that's worse in some ways because it just looks like a broken page with nothing loading. This is critique #6+ flagging this. A real user on mobile scrolls past the fold and sees a dead page. **This alone makes the site feel broken.**
- Fix: The issue is likely that images beyond the initial fetch aren't loading at all. Check if infinite scroll pagination is actually triggering new API calls. Debug on a real mobile viewport. If images aren't fetching, it's a data issue not a UI issue.

#### 2. Content quality destroys the "curated" promise
The grid is a visual mess: 3 nearly identical architecture hallway shots, 2 panda-with-roses images, a Star Wars tabloid parody next to a photorealistic portrait next to pink Jolteon fan art. There's zero visual rhythm. Unsplash succeeds because every row feels intentional. This grid feels like a database dump. The hero literally says "curated" but nothing is curated.
- Fix: Deduplicate similar images (perceptual hashing). Add a quality/aesthetic score. Manually feature diverse high-quality images at top. Or change tagline to "AI art, collected." and stop lying.

#### 3. No hover overlays visible in desktop screenshot
The previous critique noted hover overlays exist in code since v2.6, but the desktop screenshot shows bare image rectangles with no metadata whatsoever. Even without hover, there should be some indication these are interactive (title on the card, a small overlay hint, anything). Currently it's just a wall of images with zero information architecture. You can't tell what anything is without clicking.
- Fix: Add a permanent subtle text overlay at bottom of each card (at least the title), or ensure hover overlays are actually rendering and the build is deployed.

#### 4. Category pills remain the most template-looking element
Still horizontal scroll pills. Still no image counts. Still no representative imagery. The design brief specifically calls for bento grid categories. This is the easiest thing to differentiate from every other gallery template and it hasn't changed in 6+ critiques.
- Fix: Short-term, add counts ("Anime (482)"). Medium-term, bento grid with category preview images.

#### 5. Hero subtitle still uses an emdash
"Browse, search, download — no account needed." The MEMORY.md explicitly says **never use emdashes anywhere outward-facing**. Also "Thousands of AI-generated images from across the internet" is generic. The design brief suggested dynamic stats like "2,826 AI artworks and counting."
- Fix: Replace subtitle with actual count. Remove the emdash. Use a period or comma instead.

### What Improved Since Last Critique (v2.8, 9:20AM UTC)
- Mobile placeholders are now flat dark boxes instead of shimmering skeletons (less distracting, but still broken)
- Desktop above-the-fold remains solid: hero typography, warm dark palette, search bar all look clean
- Category scroll affordance and NSFW toggle fixes from v2.7-2.8 are holding

### Recurring Unfixed Issues (6+ critiques)
- ❌ Mobile infinite scroll empty placeholders (flagged since v2.4, still broken)
- ❌ No visible image metadata/hover overlays (flagged since v2.5)  
- ❌ Content quality/curation (flagged since v2.6)
- ❌ Generic category pills (flagged since v2.6)

### Summary
Score stays at 5.5. The desktop above-the-fold impression is genuinely good, maybe 7/10 on its own. But mobile is actively broken (not just ugly, broken), images have no metadata, and the content quality undermines the brand promise. The implementation loop keeps marking issues as fixed but the screenshots don't reflect actual fixes. Someone needs to actually load the site on a phone and scroll. The gap between "code exists" and "users see it working" is the core problem right now.

---

## Previous Critique (Feb 23, 2026 — v2.8, 9:20AM UTC)
**Score: 5.5/10**

### Top 5 Issues (Ranked by Impact)

#### 1. ✅ PARTIALLY FIXED — Mobile infinite scroll empty placeholders
Wired up the existing `useVisibleIds` hook (was defined but unused!) to control skeleton visibility. Now only items within 800px of viewport show shimmer skeletons. Off-screen items render as plain dark surface-2 boxes matching the background, eliminating the "wall of broken skeletons" effect. Images still lazy-load via browser native `loading="lazy"`. Fixed Feb 23 11:20AM UTC.
- Remaining: if images genuinely fail to load (network errors), they'll still show as dark boxes. Could add error states or retry logic later.

#### 2. ✅ ALREADY IMPLEMENTED — Hover overlays & mobile metadata exist in code
The critique bot may not be detecting these, but hover overlays (gradient + title + likes + downloads + model badge) and mobile info bars (title + stats + like button) have been in ImageGrid.tsx since v2.6+. Desktop: gradient overlay slides up on hover with metadata. Mobile: permanent info bar below each card. The issue is likely that the critique screenshots don't trigger hover states, or the build wasn't deployed. Confirmed deployed Feb 23 11:20AM UTC.

#### 3. Content quality/variety is poor — feels uncurated
Despite the "curated" tagline, the grid has: 3+ near-identical architecture hallway shots, multiple similar panda-with-roses images, a Star Wars tabloid parody, pink Jolteon fan art, all jumbled together. No aesthetic coherence. Premium galleries (Unsplash, Dribbble) have visual rhythm — the grid should flow, not jar.

#### 4. Hero tagline says "curated" but nothing is curated
The hero reads "AI art, curated." with a subtitle mentioning "thousands of AI-generated images from across the internet." This sets expectations the content doesn't deliver on.

#### 5. Category pills feel generic and unengaging
Horizontal scroll pills work functionally, but they're the most template-looking element on the page.

---

## Previous Critique (Feb 23, 2026 — v2.7, 5:20AM UTC)
**Score: 5.5/10**

(See git history for full details of older critiques)

---
*This file is updated by the design critique cron job. Implementation cron reads this to know what to fix.*
