#!/usr/bin/env node
/**
 * Fast Civitai crawler - inserts without dedup checks.
 * Uses Civitai image IDs to track what we've seen via a local file cache.
 * Usage: node scripts/fast-crawl.js [pages] [sort]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SEEN_FILE = path.join(__dirname, '..', '.crawl-seen-ids.json');

// Load seen IDs from local cache
function loadSeen() {
  try {
    return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')));
  } catch { return new Set(); }
}

function saveSeen(seen) {
  // Keep only last 100k IDs to avoid file bloat
  const arr = [...seen].slice(-100000);
  fs.writeFileSync(SEEN_FILE, JSON.stringify(arr));
}

const CATEGORIES = {
  'Portrait': /portrait|face|headshot|close.?up|selfie|woman|man|girl|boy|person|beauty/i,
  'Landscape': /landscape|scenery|mountain|ocean|river|forest|nature|sunset|sunrise|lake|valley|field/i,
  'Fantasy': /fantasy|dragon|magic|wizard|elf|fairy|mythical|enchanted|spell|sorcerer|medieval/i,
  'Sci-Fi': /sci.?fi|cyberpunk|futuristic|space|robot|mech|android|neon|dystopian|alien/i,
  'Anime': /anime|manga|waifu|chibi|kawaii|otaku|2d|cel.?shad/i,
  'Architecture': /architecture|building|interior|room|house|city|skyline|skyscraper|castle|temple/i,
  'Abstract': /abstract|geometric|pattern|fractal|surreal|psychedelic|generative/i,
  'Animals': /animal|cat|dog|wolf|bird|horse|dragon|creature|pet|wildlife/i,
  'Food': /food|dish|meal|recipe|cooking|cake|fruit|restaurant/i,
  'Vehicles': /car|vehicle|motorcycle|spaceship|airplane|train|boat|ship/i,
  'Fashion': /fashion|clothing|outfit|dress|style|model|runway|couture/i,
  'Horror': /horror|dark|creepy|zombie|monster|demon|ghost|nightmare|gore|blood/i,
  'Still Life': /still.?life|object|product|flower|plant|vase|bottle|table/i,
  'Digital Art': /digital|illustration|concept.?art|artwork|painting|draw/i,
  'Photography': /photo|realistic|raw|canon|nikon|dslr|35mm|bokeh|depth.of.field/i,
};

function categorize(prompt) {
  if (!prompt) return 'Uncategorized';
  for (const [cat, re] of Object.entries(CATEGORIES)) {
    if (re.test(prompt)) return cat;
  }
  return 'Uncategorized';
}

function extractTags(prompt) {
  if (!prompt) return [];
  return prompt.replace(/[()[\]{}:]/g, ' ')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 2 && t.length < 40)
    .slice(0, 15);
}

async function crawlPage(cursor, sort) {
  const params = new URLSearchParams({ limit: '200', sort, nsfw: 'false' });
  if (cursor) params.set('cursor', cursor);
  
  const url = `https://civitai.com/api/v1/images?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeneratedGallery/1.0)' },
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  
  if (!res.ok) {
    console.error(`API error: ${res.status}`);
    return { items: [], nextCursor: null };
  }
  
  const data = await res.json();
  return { items: data.items || [], nextCursor: data.metadata?.nextCursor || null };
}

async function run() {
  const maxPages = parseInt(process.argv[2]) || 50;
  const sort = process.argv[3] || 'Newest';
  
  console.log(`🚀 Fast crawl: ${maxPages} pages, sort=${sort}`);
  
  const seen = loadSeen();
  console.log(`   Local cache: ${seen.size} seen IDs`);
  
  let cursor = null;
  let totalInserted = 0;
  let totalChecked = 0;
  let totalSkipped = 0;
  let consecutiveEmpty = 0;
  const startTime = Date.now();
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const { items, nextCursor } = await crawlPage(cursor, sort);
      
      if (!items.length) {
        console.log(`Page ${page}: No items, stopping.`);
        break;
      }
      
      totalChecked += items.length;
      
      // Filter using local cache
      const newItems = items.filter(i => i.url && !seen.has(i.id));
      const skipped = items.length - newItems.length;
      totalSkipped += skipped;
      
      if (newItems.length === 0) {
        consecutiveEmpty++;
        console.log(`Page ${page}: 0 new / ${items.length} (${skipped} cached) [${consecutiveEmpty} empty]`);
        if (consecutiveEmpty >= 10) {
          console.log('10 consecutive empty pages, stopping.');
          break;
        }
        cursor = nextCursor;
        if (!cursor) break;
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      
      consecutiveEmpty = 0;
      
      // Insert in batches of 20
      let pageInserted = 0;
      const rows = newItems.map(item => {
        const meta = item.meta || {};
        const prompt = meta.prompt || null;
        return {
          title: null,
          description: null,
          prompt,
          negative_prompt: meta.negativePrompt || null,
          model: meta.Model || meta.model || null,
          source_url: item.url,
          source_site: 'civitai.com',
          image_url: item.url,
          thumbnail_url: item.url,
          width: item.width || null,
          height: item.height || null,
          tags: extractTags(prompt),
          category: categorize(prompt),
          upvotes: 0, downloads: 0, views: 0,
          is_nsfw: item.nsfw || false,
          media_type: item.type === 'video' ? 'video' : 'image',
          crawled_at: new Date().toISOString(),
        };
      });
      
      for (let i = 0; i < rows.length; i += 20) {
        const batch = rows.slice(i, i + 20);
        try {
          const { data, error } = await supabase.from('images').insert(batch).select('id');
          if (error) {
            // Try one by one on error
            for (const row of batch) {
              try {
                const { data: d2 } = await supabase.from('images').insert(row).select('id');
                if (d2?.length) pageInserted++;
              } catch {}
            }
          } else {
            pageInserted += data?.length || 0;
          }
        } catch (e) {
          console.error(`  Batch insert error: ${e.message}`);
        }
      }
      
      // Mark all as seen
      items.forEach(i => seen.add(i.id));
      totalInserted += pageInserted;
      
      console.log(`Page ${page}: ${pageInserted} new / ${items.length} checked [total: ${totalInserted}]`);
      
      cursor = nextCursor;
      if (!cursor) { console.log('No more pages.'); break; }
      
      // Save seen cache periodically
      if (page % 10 === 0) saveSeen(seen);
      
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Page ${page} error:`, err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  saveSeen(seen);
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Done!`);
  console.log(`   Checked: ${totalChecked}`);
  console.log(`   Inserted: ${totalInserted}`);
  console.log(`   Skipped (cached): ${totalSkipped}`);
  console.log(`   Time: ${elapsed}s`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
