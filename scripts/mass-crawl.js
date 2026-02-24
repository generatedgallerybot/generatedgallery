#!/usr/bin/env node
/**
 * Mass Civitai crawler with proper pagination.
 * Usage: node scripts/mass-crawl.js [pages] [sort]
 * Examples:
 *   node scripts/mass-crawl.js 50          # 50 pages of 200 = 10k images checked
 *   node scripts/mass-crawl.js 100 Newest  # 100 pages of newest
 *   node scripts/mass-crawl.js 200 "Most Reactions"
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// Batch check which URLs already exist (chunked to avoid URL length limits)
async function filterExistingUrls(urls) {
  if (!urls.length) return new Set();
  const existing = new Set();
  const chunkSize = 30;
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const { data } = await supabase
      .from('images')
      .select('source_url')
      .in('source_url', chunk);
    (data || []).forEach(d => existing.add(d.source_url));
  }
  return existing;
}

async function crawlPage(cursor, sort, nsfw) {
  const params = new URLSearchParams({
    limit: '200',
    sort,
    nsfw: nsfw ? 'true' : 'false',
  });
  const period = process.argv[4] || 'AllTime';
  if (period !== 'AllTime') params.set('period', period);
  if (cursor) params.set('cursor', cursor);
  
  const url = `https://civitai.com/api/v1/images?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeneratedGallery/1.0)' },
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    return { items: [], nextCursor: null };
  }
  
  const data = await res.json();
  return {
    items: data.items || [],
    nextCursor: data.metadata?.nextCursor || null
  };
}

async function run() {
  const maxPages = parseInt(process.argv[2]) || 50;
  const sort = process.argv[3] || 'Newest';
  
  console.log(`🚀 Mass crawl: ${maxPages} pages, sort=${sort}, 200/page`);
  console.log(`   Target: ~${maxPages * 200} images to check\n`);
  
  let cursor = null;
  let totalInserted = 0;
  let totalChecked = 0;
  let totalDupes = 0;
  let consecutiveEmptyPages = 0;
  const startTime = Date.now();
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const { items, nextCursor } = await crawlPage(cursor, sort, true);
      
      if (!items.length) {
        console.log(`Page ${page}: No items returned, stopping.`);
        break;
      }
      
      totalChecked += items.length;
      
      // Batch dedup check
      const urls = items.map(i => i.url).filter(Boolean);
      const existing = await filterExistingUrls(urls);
      const newItems = items.filter(i => i.url && !existing.has(i.url));
      
      const dupes = items.length - newItems.length;
      totalDupes += dupes;
      
      if (newItems.length === 0) {
        consecutiveEmptyPages++;
        console.log(`Page ${page}: 0 new / ${items.length} checked (${dupes} dupes) [${consecutiveEmptyPages} empty in a row]`);
        if (consecutiveEmptyPages >= 5) {
          console.log('5 consecutive pages with no new images, stopping.');
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
        
        // Batch insert
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
            upvotes: 0,
            downloads: 0,
            views: 0,
            is_nsfw: item.nsfw || (item.nsfwLevel && item.nsfwLevel >= 3) || false,
            media_type: item.url && (item.url.endsWith('.mp4') || item.url.endsWith('.webm')) ? 'video' : item.url && item.url.endsWith('.gif') ? 'gif' : (item.type === 'video' ? 'video' : 'image'),
            crawled_at: new Date().toISOString(),
          };
        });
        
        // Insert in smaller batches to avoid timeouts
        let pageInserted = 0;
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { data, error } = await supabase.from('images').upsert(batch, { onConflict: 'source_url', ignoreDuplicates: true }).select('id');
          if (error) {
            // If batch fails, try one by one
            for (const row of batch) {
              const { data: d2, error: e2 } = await supabase.from('images').upsert(row, { onConflict: 'source_url', ignoreDuplicates: true }).select('id');
              if (d2?.length) pageInserted++;
            }
          } else {
            pageInserted += data?.length || 0;
          }
        }
        totalInserted += pageInserted;
        
        console.log(`Page ${page}: ${pageInserted} new / ${items.length} checked (${dupes} dupes) [total: ${totalInserted}]`);
      }
      
      cursor = nextCursor;
      if (!cursor) {
        console.log('No more pages (no nextCursor).');
        break;
      }
      
      // Rate limit: 1 second between pages
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      console.error(`Page ${page} error:`, err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  // Update category counts
  const { data: cats } = await supabase.rpc('get_category_counts');
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Done!`);
  console.log(`   Checked: ${totalChecked}`);
  console.log(`   Inserted: ${totalInserted}`);
  console.log(`   Dupes skipped: ${totalDupes}`);
  console.log(`   Time: ${elapsed}s`);
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
