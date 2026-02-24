#!/usr/bin/env node
/**
 * Dedup images by source_url using cursor pagination.
 * Writes seen URLs to a Set (string interning for memory efficiency).
 * Deletes dupes as it finds them.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 500;
const DELETE_BATCH = 50;
const PROGRESS_INTERVAL = 5000;

async function dedup() {
  console.log(`Starting dedup v2 at ${new Date().toISOString()}`);
  
  // Use a Set of just the unique part of URLs (after last /) to save memory
  const seen = new Set();
  let idsToDelete = [];
  let totalDeleted = 0;
  let scanned = 0;
  let cursor = '';
  let consecutiveErrors = 0;

  function extractKey(url) {
    if (!url) return null;
    // Most are civitai URLs, extract just the UUID filename
    const i = url.lastIndexOf('/');
    return i >= 0 ? url.substring(i + 1) : url;
  }

  while (true) {
    let query = supabase
      .from('images')
      .select('id, source_url')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (cursor) {
      query = query.gt('id', cursor);
    }

    const { data, error } = await query;

    if (error) {
      consecutiveErrors++;
      console.error(`Scan error (${consecutiveErrors}):`, error.message);
      if (consecutiveErrors > 10) {
        console.error('Too many consecutive errors, stopping.');
        break;
      }
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
    consecutiveErrors = 0;

    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      cursor = row.id;
      const key = extractKey(row.source_url);
      if (!key) continue;

      if (seen.has(key)) {
        idsToDelete.push(row.id);
      } else {
        seen.add(key);
      }
    }

    // Delete in small batches
    while (idsToDelete.length >= DELETE_BATCH) {
      const batch = idsToDelete.splice(0, DELETE_BATCH);
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: delErr } = await supabase
          .from('images')
          .delete()
          .in('id', batch);
        if (!delErr) {
          totalDeleted += batch.length;
          break;
        }
        console.error(`Delete error (attempt ${attempt+1}):`, delErr.message);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (scanned % PROGRESS_INTERVAL === 0) {
      const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log(`[${new Date().toISOString()}] Scanned: ${scanned.toLocaleString()} | Deleted: ${totalDeleted.toLocaleString()} | Unique: ${seen.size.toLocaleString()} | Mem: ${mem}MB | Cursor: ${cursor.substring(0,8)}`);
    }
  }

  // Flush remaining
  while (idsToDelete.length > 0) {
    const batch = idsToDelete.splice(0, DELETE_BATCH);
    const { error: delErr } = await supabase.from('images').delete().in('id', batch);
    if (!delErr) totalDeleted += batch.length;
  }

  console.log(`\n✅ Dedup v2 complete at ${new Date().toISOString()}`);
  console.log(`   Scanned: ${scanned.toLocaleString()}`);
  console.log(`   Deleted: ${totalDeleted.toLocaleString()}`);
  console.log(`   Unique: ${seen.size.toLocaleString()}`);
}

dedup().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
