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
