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

## 2026 Design Direction (Updated Feb 22, 2026)

### Typography Upgrade
Current Space Grotesk + DM Sans is solid but common. Consider these swaps for more premium feel:

**Display (hero/headings):**
- **GT America** (Grilli Type) — bridges American Gothic and European Neo-Grotesk, 84 styles. Used by top editorial sites. Feels authoritative without being cold.
- **Söhne** (Klim) — the "memory of Akzidenz-Grotesk." What Vercel/Stripe use. Premium tech-meets-editorial.
- If staying free: **General Sans** (Fontshare) at 56-72px hero, -0.03em tracking, weight 600

**Body:**
- **Inter Variable** — still the king for UI body text, but bump to 15px/1.6 line-height for readability on dark
- **Geist** (Vercel) — clean, modern, designed for dark interfaces. Free.

**Specific settings:**
- Hero headline: 56px mobile / 72px desktop, weight 500-600, -0.03em tracking
- Section headers: 24px, weight 500, -0.01em tracking
- Body/metadata: 14-15px, weight 400, 1.6 line-height
- Image captions: 12px, weight 400, letter-spacing 0.02em, opacity 0.6

### Color Evolution
The warm gold (#e8d5b7) accent is on-trend. 2026 is moving toward "calm and breathable" palettes. Refine:

- **Base black**: Keep #050505 but add a subtle warm tint → #080706
- **Surface layers**: #0f0e0d (cards), #1a1918 (elevated), #242220 (hover)
- **Warm accent**: #e8d5b7 (keep) — use for active states, selected categories, CTA hover
- **Secondary accent**: #b8a088 (muted gold for borders, dividers)
- **Text hierarchy**: #f5f0eb (primary), #a89e94 (secondary), #6b6259 (tertiary/muted)
- **Avoid**: Pure white (#fff) anywhere. Warmest white should be #f5f0eb

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
- **Unsplash**: Blurhash placeholders, clean search, collections concept
- **Lexica.art**: Prompt-first display, dark theme, simple grid
- **ArtStation**: Full-bleed image viewing, strong artist attribution
- **Dribbble**: Color-based search, bento category layout
- **Behance**: "Appreciate" interaction (heart with particle burst), project grouping

### Quick Wins (Ship This Week)
1. Glassmorphism navbar with blur
2. Tighter grid gap (12px) + 4px border-radius on images
3. Warm shimmer loading skeletons
4. Hover overlay slide-up (title + download)
5. Staggered scroll-in animation for grid items
6. Replace subtitle with dynamic stat ("2,826 AI artworks and counting")

### Stretch Goals
1. Lightbox/modal with frosted glass backdrop
2. Blurhash dominant-color placeholders
3. Bento grid category browser
4. Custom cursor on desktop
5. CSS native masonry (with JS fallback)
6. Color-based search/filtering

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
