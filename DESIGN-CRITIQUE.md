# Design Critique Log

## Latest Critique (Feb 24, 2026 — v2.17, 9:20PM UTC)
**Score: 3/10**

### ⛔ SITE IS BROKEN — IMAGES NOT RENDERING

This is no longer a design critique — it's a **triage report**. The entire image grid shows dark empty rectangles on both desktop and mobile. The core product (images) is completely absent. No amount of CSS polish matters when the gallery shows zero art.

### Top 5 Issues (Ranked by Impact)

#### 1. CRITICAL: Images not loading at all — desktop AND mobile
Every single thumbnail in the grid is a dark empty rectangle. Not skeleton loaders, not shimmer placeholders — just void. This is either: (a) image URLs are broken/expired (Civitai CDN tokens?), (b) lazy-loading IntersectionObserver never fires, or (c) a build error stripped the `<img>` tags. **The site is functionally dead.** An art gallery with no art is a blank wall. Debug: open DevTools → Network tab → check if image requests fire and what status codes return. Check `src` attributes on image elements.

#### 2. Mobile gallery completely missing — 12th consecutive report
On 390px viewport, below the filter pills there's essentially ONE barely-visible card then straight to footer. The entire gallery content area is empty. This has been reported for 12 consecutive critiques. The virtualization/IntersectionObserver is fundamentally broken on mobile viewports. **This makes the site unusable for 60%+ of real traffic.**

#### 3. No loading states or feedback
When images fail (as they are now), users see: dark rectangles with tiny labels. No shimmer animation, no error state, no "failed to load" message, no retry button. Zero feedback. Compare to Unsplash's blur-up LQIP or even a basic CSS shimmer pulse. The user has no idea if the site is loading, broken, or empty.

#### 4. Content curation still nonexistent
Category labels visible on cards show repetitive "AI Artwork" fallback on most items, with occasional "fantasy", "anime", "landscapes". Even when images DO load, previous critiques documented: duplicate panda-with-roses, identical hallway shots, Star Wars tabloid next to photorealistic portraits. Zero editorial sequencing.

#### 5. Filter UI is cluttered — three distinct rows
Sort tabs (Recent/Trending) + format toggles (All/square/portrait) + category pills create three stacked rows of filtering UI with no clear visual grouping. The sort controls and format toggles should be collapsed or combined. Compare to Unsplash's single clean filter row.

### What's Actually Good (the foundation)
- **Hero headline** "AI art, collected." with serif treatment on "collected." — editorial, memorable, distinctive
- **Color identity** — warm gold (#e8d5b7) accent on near-black is differentiated from the generic blue-on-dark SaaS default
- **Typography hierarchy** in the hero section works
- **Category system** is comprehensive and well-chosen
- **Nav bar** is clean and minimal on desktop
- **178,400+ count** adds credibility
- **Footer** is clean with Open Source callout building trust

### What Improved Since Last Critique (v2.14, 9:20AM UTC)
- Card labels now showing metadata (category fallbacks, model names) per v2.16 fix — **confirmed working**
- However, the image rendering regression has made this improvement invisible since there's nothing to overlay on

### What Got Worse
- Images were at least partially loading in previous critiques (desktop showed ~20+ images). Now showing zero on both viewports. **This is a regression.**

### Specific Actionable Fixes (Priority Order)
1. **CHECK IMAGE URLS NOW** — `SELECT image_url FROM images LIMIT 5` → curl those URLs → see if they 404/403. If Civitai CDN tokens expired, all 178K images are broken.
2. **Check browser console** — open generatedgallery.com in Chrome DevTools, look for CORS errors, CSP blocks, or failed network requests in the console/network tab
3. **Check PM2 build output** — `pm2 logs generatedgallery --lines 50` for any build/render errors
4. **Add error boundaries** — images should have `onError` handlers that show a fallback state, not silent dark rectangles
5. **Add shimmer skeletons** — even if images load correctly, the loading phase needs warm shimmer (#1a1918 → #242220 pulse)

### Comparison to Premium Benchmarks
| Dimension | GG Score | Unsplash | Dribbble | Notes |
|-----------|----------|----------|----------|-------|
| Content renders | 0/10 | 10/10 | 10/10 | Images don't load |
| Mobile experience | 1/10 | 9/10 | 8/10 | Gallery missing entirely |
| Loading states | 1/10 | 9/10 | 7/10 | No feedback at all |
| Typography | 6/10 | 8/10 | 7/10 | Hero is good, rest is low-contrast |
| Color/brand | 6/10 | 7/10 | 8/10 | Gold accent is distinctive but underused |
| Nav/search | 5/10 | 9/10 | 7/10 | Search bar too timid, no suggestions |
| Hero section | 6/10 | 8/10 | 7/10 | Good copy, no visual energy |

**Until images actually render, the score cannot exceed 4/10. Fix the data pipeline first. Everything else is furniture arrangement on the Titanic.**

---

## Previous Critique (Feb 24, 2026 — v2.14, 9:20AM UTC)
**Score: 5.5/10**

### ⛔ AUTOMATED LOOP HALTED — MANUAL INTERVENTION REQUIRED

This is the **11th consecutive critique** with the same top 3 issues unfixed. The critique→implement cron cycle is burning compute with zero results. **The implement cron should be disabled until a human debugs the root causes.**

### Top 4 Issues (Ranked by Impact)

#### 1. Mobile infinite scroll broken — 11th consecutive report ✅ ATTEMPTED FIX (v2.15)
**Fix:** Doubled mobile virtualization buffer from 2500px to 5000px + added delayed recomputation to catch layout shifts. The visibility system was likely marking items as "not visible" on mobile due to tight buffer + slower layout. Needs visual verification.
##### Original issue:
After ~16 images on 390px viewport, the entire lower page is empty dark skeleton rectangles stretching to the footer. This is a **data fetching bug**, not CSS. The IntersectionObserver or paginated fetch is failing silently on mobile viewports. No CSS fix will solve this. Needs someone in DevTools checking Network/Console on mobile emulation.

#### 2. No hover overlays or metadata on cards — 11th report ✅ FIXED (v2.16)
**Root cause found:** All images had `title: null` in the DB, and the overlay code was wrapped in `{image.title && ...}` conditionals — so it rendered nothing. Fix: cards now always show a label using category as fallback (or "AI Artwork"), and model names are cleaned from raw URNs (e.g. "prefectIllustriousXL_40" → "Prefect Illustrious XL"). Both desktop hover overlays and mobile info bars now always display metadata.

#### 3. Content quality is uncurated
Duplicate panda-with-roses, 3+ identical hallway shots, Star Wars tabloid parody mixed with photorealistic portraits and anime. Zero editorial sequencing. The hero says "curated" but it's a raw API dump. Needs aesthetic scoring, diversity sorting, and actual deduplication.

#### 4. Hero subtitle is stale generic copy ✅ FIXED (v2.15)
Same "Thousands of AI-generated images..." text for weeks. Replace with live count ("2,826 AI artworks and counting") or rotating micro-copy. Two-minute fix.

---

## Previous Critique (Feb 24, 2026 — v2.12, 1:20AM UTC)
**Score: 5.5/10** — See full history in git log.

---

*This file is updated by the design critique cron job. Implementation cron reads this to know what to fix.*
