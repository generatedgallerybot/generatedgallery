#!/usr/bin/env node
/**
 * Continuous Civitai crawler — grabs ALL new images, runs forever.
 * Tracks cursor position in a state file so it can resume after restart.
 * 
 * Usage: node scripts/continuous-crawl.js [--backfill]
 *   --backfill: crawl backwards from current position to fill history
 *   (default): crawl forward, grabbing new images every minute
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

const STATE_FILE = path.join(__dirname, '..', '.crawl-state.json');

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

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { forwardCursor: null, backfillCursor: null, totalInserted: 0, lastRun: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function fetchPage(cursor) {
  const params = new URLSearchParams({
    limit: '200',
    sort: 'Newest',
    nsfw: 'true',
  });
  if (cursor) params.set('cursor', cursor);
  
  const url = `https://civitai.com/api/v1/images?${params}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeneratedGallery/1.0)' },
    timeout: 30000,
  });
  
  if (!res.ok) {
    if (res.status === 429) {
      console.log('  Rate limited, waiting 30s...');
      await sleep(30000);
      return { items: [], nextCursor: cursor }; // retry same cursor
    }
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  
  const data = await res.json();
  return {
    items: data.items || [],
    nextCursor: data.metadata?.nextCursor || null
  };
}

async function insertBatch(items) {
  const rows = items.map(item => {
    const meta = item.meta || {};
    const prompt = meta.prompt || null;
    const isVideo = item.type === 'video' || (item.url && /\.(mp4|webm|gif)(\?|$)/i.test(item.url));
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
      crawled_at: new Date().toISOString(),
    };
  });

  let inserted = 0;
  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { data, error } = await supabase.from('images').insert(batch).select('id');
    if (error) {
      // Batch failed — try one by one (handles dupes)
      for (const row of batch) {
        const { data: d, error: e } = await supabase.from('images').insert(row).select('id');
        if (d?.length) inserted++;
      }
    } else {
      inserted += data?.length || 0;
    }
  }
  return inserted;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function crawlForward(state) {
  console.log(`\n🔄 Checking for new images...`);
  let cursor = null; // Always start from newest
  let totalNew = 0;
  let emptyPages = 0;
  
  while (true) {
    try {
      const { items, nextCursor } = await fetchPage(cursor);
      if (!items.length) break;
      
      // Check how many are new (not in DB)
      const urls = items.map(i => i.url).filter(Boolean);
      const { data: existing } = await supabase
        .from('images')
        .select('source_url')
        .in('source_url', urls);
      const existingSet = new Set((existing || []).map(d => d.source_url));
      const newItems = items.filter(i => i.url && !existingSet.has(i.url));
      
      if (newItems.length === 0) {
        emptyPages++;
        if (emptyPages >= 3) {
          console.log(`  Caught up (${emptyPages} pages with no new images)`);
          break;
        }
      } else {
        emptyPages = 0;
        const inserted = await insertBatch(newItems);
        totalNew += inserted;
        console.log(`  +${inserted} new (${items.length - newItems.length} dupes)`);
      }
      
      cursor = nextCursor;
      if (!cursor) break;
      await sleep(1000);
      
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      await sleep(5000);
      break;
    }
  }
  
  state.totalInserted += totalNew;
  state.lastRun = new Date().toISOString();
  saveState(state);
  return totalNew;
}

async function crawlBackfill(state) {
  console.log(`\n⏪ Backfilling historical images...`);
  let cursor = state.backfillCursor || null;
  let totalNew = 0;
  let pages = 0;
  const maxPages = 500; // ~100k images per backfill run
  
  while (pages < maxPages) {
    try {
      const { items, nextCursor } = await fetchPage(cursor);
      if (!items.length) {
        console.log('  No more items, backfill complete!');
        state.backfillComplete = true;
        break;
      }
      
      pages++;
      const urls = items.map(i => i.url).filter(Boolean);
      const { data: existing } = await supabase
        .from('images')
        .select('source_url')
        .in('source_url', urls);
      const existingSet = new Set((existing || []).map(d => d.source_url));
      const newItems = items.filter(i => i.url && !existingSet.has(i.url));
      
      if (newItems.length > 0) {
        const inserted = await insertBatch(newItems);
        totalNew += inserted;
      }
      
      const dupes = items.length - newItems.length;
      if (pages % 10 === 0 || newItems.length > 0) {
        console.log(`  Page ${pages}: +${newItems.length} new, ${dupes} dupes [total new: ${totalNew}]`);
      }
      
      cursor = nextCursor;
      state.backfillCursor = cursor;
      if (!cursor) {
        state.backfillComplete = true;
        break;
      }
      
      // Save state every 50 pages
      if (pages % 50 === 0) {
        state.totalInserted += totalNew;
        saveState(state);
        totalNew = 0;
      }
      
      await sleep(1000);
      
    } catch (err) {
      console.error(`  Error on page ${pages}: ${err.message}`);
      await sleep(10000);
    }
  }
  
  state.totalInserted += totalNew;
  state.lastRun = new Date().toISOString();
  saveState(state);
  console.log(`  Backfill run: ${totalNew} new images across ${pages} pages`);
}

async function run() {
  const isBackfill = process.argv.includes('--backfill');
  const state = loadState();
  
  if (isBackfill) {
    if (state.backfillComplete) {
      console.log('Backfill already complete!');
      return;
    }
    console.log('🚀 Starting backfill crawler...');
    console.log(`   Resume cursor: ${state.backfillCursor || 'start'}`);
    await crawlBackfill(state);
    return;
  }
  
  // Continuous forward crawl
  console.log('🚀 Starting continuous crawler...');
  console.log('   Checking for new images every 60 seconds');
  console.log('   Press Ctrl+C to stop\n');
  
  while (true) {
    try {
      const newCount = await crawlForward(state);
      
      // Get total count
      const { count } = await supabase.from('images').select('*', { count: 'exact', head: true });
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      
      if (newCount > 0) {
        console.log(`[${now}] +${newCount} new images (total: ${count?.toLocaleString()})`);
      } else {
        process.stdout.write('.');
      }
      
      // Wait 60 seconds before next check
      await sleep(60000);
      
    } catch (err) {
      console.error(`Error: ${err.message}`);
      await sleep(30000);
    }
  }
}

process.on('unhandledRejection', (err) => console.error('Unhandled:', err));
process.on('SIGINT', () => { console.log('\nStopping...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\nStopping...'); process.exit(0); });

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
