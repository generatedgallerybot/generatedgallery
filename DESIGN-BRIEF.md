# GeneratedGallery Design Brief

## What It Is
Free AI art gallery — "Unsplash for AI art." Browse, search, download AI-generated images. No account needed.

## Brand Identity
- **Name**: Generated Gallery
- **Tone**: Editorial, minimal, premium. Not flashy, not corporate. Think art gallery meets tech product.
- **Logo**: Grid of 4 squares with decreasing opacity (SVG in Navbar.tsx)
- **Accent Color**: Warm gold (#e8d5b7) — used sparingly for active states and brand moments

## Current Stack
- Next.js 14, TypeScript, Tailwind CSS
- Space Grotesk (display) + DM Sans (body)
- Near-black surface palette (#050505 base)
- Supabase backend, ~2000 crawled images from Civitai
- PM2 on port 3456, Cloudflare quick tunnel

## Design Principles
1. **Content first** — the images are the product, everything else is chrome
2. **Dark and warm** — not cold blue/purple, warm neutral palette
3. **Minimal but not empty** — every element earns its space
4. **Micro-interactions matter** — hover states, transitions, loading states
5. **No template energy** — should feel hand-crafted, not generated

---

## 2026 Design Direction (Updated Feb 23, 2026 — Research Pass #2)

### Typography Upgrade
2026 is "Imperfect by Design" — the industry is rejecting algorithmic sterility. Ultra-thin fonts and blanding are dead. Variable fonts are infrastructure, not optional. Kinetic type is mainstream.

**Display (hero/headings) — pick ONE:**
- **Satoshi Variable** (Fontshare, free) — geometric sans with personality, 9 weights. Use at 64px hero, weight 700, -0.03em tracking. The sweet spot between Space Grotesk and something more distinctive.
- **General Sans Variable** (Fontshare, free) — slightly warmer, pairs beautifully with dark themes. 56-72px, weight 600, -0.02em tracking.
- **Upgrade path**: Die Grotesk (Klim) or GT America (Grilli Type) if we ever license fonts. Both are the "Mutant Heritage" trend — classic forms with tech-tuned edges.

**Body:**
- **Geist** (Vercel, free) — designed for dark interfaces, replaces DM Sans. 15px/1.65 line-height on dark backgrounds (dark needs more line-height than light).
- **Fallback**: Inter Variable at 15px/1.6

**Kinetic type opportunity (hero only):**
- Animate the hero headline weight on scroll using variable font axis: weight 300→700 as user scrolls past. CSS `font-variation-settings` + `IntersectionObserver`. Subtle but very 2026.
- Or: stagger letter reveal on load with `clip-path: inset(0 100% 0 0)` per character, 30ms delay each

**Specific settings:**
- Hero headline: 56px mobile / 72px desktop, weight 600-700, -0.03em tracking
- Section headers: 22px, weight 600, -0.01em tracking, uppercase with 0.08em spacing (editorial feel)
- Body/metadata: 15px, weight 400, 1.65 line-height
- Image captions: 12px, weight 500, letter-spacing 0.04em, uppercase, opacity 0.5
- Category labels: 11px, weight 600, uppercase, 0.06em tracking (like museum wall labels)

### Color Evolution
2026 trend: "calm and breathable" palettes. Softer, more restorative. Reduce visual fatigue. Our warm gold is perfectly on-trend.

- **Base black**: #080706 (warm-tinted, not pure black)
- **Surface layers**: #0f0e0d (cards), #1a1918 (elevated), #242220 (hover)
- **Warm accent**: #e8d5b7 (keep) — active states, selected categories, CTA hover
- **Secondary accent**: #b8a088 (muted gold for borders, dividers, inactive icons)
- **Text hierarchy**: #f5f0eb (primary), #a89e94 (secondary), #6b6259 (tertiary/muted)
- **NEW — Signal color**: #c4816c (muted terracotta) for "new" badges, trending indicators. Warm but distinct from gold.
- **Avoid**: Pure white (#fff) anywhere. Warmest white = #f5f0eb. No blue or purple tints.
- **Gradient accent**: subtle radial gradient from #e8d5b7 at 10% opacity behind hero text, fading to transparent. Gives warmth without being a visible gradient.

### Layout Patterns

**Masonry grid refinements:**
- Use CSS `grid-template-rows: masonry` (native CSS masonry, shipping in Chrome 2025+) with fallback
- Column gap: 12px (tighter than typical 16px — makes it feel more editorial/magazine)
- Responsive columns: 2 mobile / 3 tablet / 4-5 desktop
- Image border-radius: 4px (subtle, not rounded-lg)

**Hero section:**
- Trend: "Expressive minimalism" — big type, one featured image, lots of breathing room
- Try: full-bleed featured image behind hero text with gradient overlay
- Or: rotating "Editor's Pick" single image with large display type beside it
- Remove generic subtitle. Replace with rotating micro-copy: "2,826 AI artworks" or "Trending: cyberpunk portraits"

**Bento grid for categories:**
- Instead of horizontal scrolling pills, show top 4-6 categories as a bento grid with representative images
- Each cell: image background + category name in overlay type
- This is huge in 2026 — Dribbble, Apple, and editorial sites all doing it

### Micro-Interactions (2026 Trends)

**Image hover (priority):**
- Scale image to 1.02x with `transition: transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)`
- Overlay slides up from bottom (not fade) with: title, model name, download button
- Subtle parallax: image shifts 2-3px opposite to mouse direction on hover
- On hover, slightly desaturate neighboring images (focus effect)

**Scroll animations:**
- Stagger grid items on scroll-in: `animation-delay: calc(var(--index) * 60ms)`
- Use `IntersectionObserver` with 10% threshold, `translateY(20px)` → `translateY(0)` + opacity
- Keep it subtle. 0.4s duration max. No bouncing.

**Loading states:**
- Skeleton with warm shimmer (#1a1918 → #242220 pulse), not grey
- Blurhash or dominant-color placeholder per image (Unsplash does this — huge perceived perf win)
- Infinite scroll with "Loading more..." text that uses the accent color

**Cursor effects (optional, desktop only):**
- Custom cursor that changes to "View" text on image hover (like high-end portfolio sites)
- Or: magnetic effect on CTA buttons (cursor pulls button slightly toward it)

### Glassmorphism Elements
Big in 2026. Use sparingly:
- Navbar: `backdrop-filter: blur(20px)` with `background: rgba(8,7,6,0.7)` — semi-transparent sticky nav
- Search bar: glass card effect with warm-tinted blur
- Lightbox/modal overlay: frosted glass background

### Image Detail Page
- Full-width image with slow parallax on scroll
- Metadata panel slides in from right (desktop) or bottom sheet (mobile)
- Related images in a 3-column strip below
- Download button: warm gold, with hover glow effect (`box-shadow: 0 0 20px rgba(232,213,183,0.3)`)
- Add "Remix" or "Similar" button — links to search by style/model

### What Competitors Do Well (Steal These)
- **Unsplash**: Blurhash placeholders, clean search, collections concept, dominant-color page tinting
- **Lexica.art**: Prompt-first display, dark theme, copy-prompt button front and center
- **ArtStation**: Full-bleed image viewing, "Staff Picks" curation layer, strong artist attribution
- **Dribbble**: Color-based search, bento category layout, "Made with Figma" filter tags
- **Behance**: "Appreciate" interaction (heart with particle burst), project grouping, blue accent on black
- **Pinterest**: "Visual search" — click a region of an image to find similar. We could do this with CLIP embeddings later.

### 2026 Macro Trends to Apply
1. **Presence over perfection** — the 2026 ethos: intentional > ornamental. Design should feel authored, not generated. Every element has a reason.
2. **Expressive minimalism** — big type, breathing room, but with one bold move per section (not sterile emptiness)
3. **Perfectly imperfect** — subtle grain overlay on hero (CSS `background-image: url(noise.svg)` at 3-5% opacity), slight border irregularity on featured cards
4. **Scroll storytelling** — parallax image strips between content sections, not just a static grid page
5. **Variable fonts as interaction** — font weight responds to hover/scroll, feels alive
6. **Glassmorphism evolved** — frosted glass is standard now, but layer it: navbar blur + search blur + modal blur at different intensities (12px/20px/40px)
7. **CSS scroll-driven animations (native)** — `animation-timeline: scroll()` is shipping in Chrome/Edge. Replace JS IntersectionObserver scroll animations with pure CSS where possible. Zero JS overhead for fade-in/parallax grid items.
8. **View Transitions API** — use `document.startViewTransition()` for page-to-page navigation (grid → image detail). Crossfade the clicked image into the detail hero with `view-transition-name`. Feels like a native app.
9. **Vertical photography bias** — mobile-first means tall images perform better. Consider a "portrait priority" layout mode where tall images get 2-row spans in the masonry grid.
10. **GSAP ScrollTrigger + Framer Motion** — GSAP 3.12 ScrollTrigger for pinned horizontal scroll sections (e.g., "Featured This Week" strip). Framer Motion for React component enter/exit animations with `layout` prop for shared layout transitions between grid and lightbox.

### Quick Wins (Ship This Week)
1. Swap DM Sans → Geist for body text (free, dark-optimized)
2. Glassmorphism navbar with blur (12px)
3. Tighter grid gap (12px) + 4px border-radius on images
4. Warm shimmer loading skeletons (#1a1918 → #242220)
5. Hover overlay slide-up (title + download) with `translateY(100%)→0` transition
6. Replace subtitle with dynamic stat ("2,826 AI artworks and counting")
7. Add subtle noise texture overlay to hero section (3% opacity SVG)
8. Uppercase category labels with 0.06em tracking (museum wall label style)

### Stretch Goals
1. Lightbox/modal with frosted glass backdrop (blur 40px) + View Transitions API crossfade from grid thumbnail
2. Blurhash dominant-color placeholders per image
3. Bento grid category browser with representative images
4. Kinetic hero headline — variable font weight animates on scroll via `animation-timeline: scroll()`
5. CSS native masonry (`grid-template-rows: masonry`) with JS fallback
6. Color-based search/filtering (extract dominant palette per image, store in DB, filter by hex)
7. Terracotta (#c4816c) "Trending" badges on hot images
8. Subtle grain/noise on all surface layers (not just hero)
9. GSAP ScrollTrigger horizontal scroll strip — "Featured This Week" pinned section between hero and grid
10. **Prompt-first display** (steal from Lexica) — show truncated prompt under each image in grid, expandable on click. Prompt is the content for AI art, not just metadata.
11. **"Visual search" stub** — click a region of an image to find similar (CLIP embedding similarity). Even a simple "More like this" button per image would be a differentiator.
12. **Micro-interaction: appreciate** — heart button with CSS particle burst on click (Behance-style). Store in localStorage for anonymous users. `@keyframes particle { 0% { transform: translate(0) scale(1); opacity: 1 } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0 } }` with 6-8 pseudo-elements.
13. **Cursor morphing (desktop)** — custom cursor changes to "View ↗" text on image hover, "Download ↓" on download button. CSS `cursor: none` + JS follower div. High-end portfolio feel.

---

## File Locations
- `src/app/page.tsx` — homepage (hero + grid)
- `src/app/layout.tsx` — root layout + fonts
- `src/app/globals.css` — global styles + animations
- `src/app/image/[id]/page.tsx` — image detail page
- `src/app/upload/page.tsx` — upload/submit page
- `src/components/Navbar.tsx` — navigation bar
- `src/components/Footer.tsx` — footer
- `src/components/ImageGrid.tsx` — masonry grid
- `src/components/SearchBar.tsx` — search input
- `src/components/CategoryFilter.tsx` — category pills
- `src/components/LoadingSpinner.tsx` — loading state
- `tailwind.config.js` — theme config
- `package.json` — dependencies

## Build & Deploy
```bash
cd /root/.openclaw/workspace/generatedgallery
npm run build
pm2 restart generatedgallery
git add -A && git commit -m "description" && git push origin main
```

## Screenshot Process
Use node catbox-catbot with puppeteer at /tmp/node_modules/puppeteer, Chrome on port 9222:
```bash
# On node via nohup (gateway has 30s timeout):
nohup node -e "const p=require('/tmp/node_modules/puppeteer');(async()=>{const b=await p.connect({browserURL:'http://localhost:9222'});const pg=await b.newPage();await pg.setViewport({width:1440,height:900});await pg.goto('https://heath-shall-shot-toner.trycloudflare.com',{waitUntil:'networkidle2',timeout:30000});await new Promise(r=>setTimeout(r,5000));await pg.screenshot({path:'/tmp/gg-screenshot.png',fullPage:true});console.log('done');await pg.close()})()" > /tmp/ss.log 2>&1 &
# Then serve via: python3 -m http.server 8765 --directory /tmp
# Fetch from droplet: curl -o /tmp/gg-screenshot.png http://100.83.35.64:8765/gg-screenshot.png
```

## Known Issues (update this as you go)
- Masonry bottom has uneven column heights (inherent CSS columns limitation)
- Content is anime-heavy from Civitai crawls — need more diversity
- No lightbox/modal view for images
- Upload page is a stub (doesn't actually upload)
- No SEO pages (categories, trending)
- Mobile experience untested
