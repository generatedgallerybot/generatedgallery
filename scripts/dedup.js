#!/usr/bin/env node
/**
 * Dedup images table by source_url.
 * Keeps the earliest (lowest id) row for each source_url, deletes the rest.
 * Runs in batches to avoid timeouts.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getCount() {
  const { count, error } = await supabase
    .from('images')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function dedup() {
  const startCount = await getCount();
  console.log(`Starting dedup. Current count: ${startCount.toLocaleString()}`);
  
  let totalDeleted = 0;
  let batchNum = 0;
  
  // Use RPC to find and delete dupes in batches
  // First, let's find dupes by querying for duplicate source_urls
  while (true) {
    batchNum++;
    console.log(`\nBatch ${batchNum}: Finding duplicates...`);
    
    // Find source_urls that have duplicates (limit to process in batches)
    const { data: dupes, error: dupeErr } = await supabase.rpc('find_duplicate_urls', { batch_limit: 500 });
    
    if (dupeErr) {
      // RPC doesn't exist, use alternative approach
      console.log('RPC not available, using manual approach...');
      await dedupManual();
      return;
    }
    
    if (!dupes || dupes.length === 0) {
      console.log('No more duplicates found.');
      break;
    }
    
    console.log(`Found ${dupes.length} URLs with duplicates`);
    
    for (const { source_url, min_id } of dupes) {
      const { data: deleted, error: delErr } = await supabase
        .from('images')
        .delete()
        .eq('source_url', source_url)
        .neq('id', min_id)
        .select('id');
      
      if (delErr) {
        console.error(`Error deleting dupes for ${source_url}:`, delErr.message);
        continue;
      }
      totalDeleted += (deleted?.length || 0);
    }
    
    console.log(`Batch ${batchNum}: Deleted ${totalDeleted} total so far`);
  }
  
  const endCount = await getCount();
  console.log(`\n✅ Dedup complete!`);
  console.log(`   Before: ${startCount.toLocaleString()}`);
  console.log(`   After: ${endCount.toLocaleString()}`);
  console.log(`   Removed: ${(startCount - endCount).toLocaleString()} duplicates`);
}

async function dedupManual() {
  const startCount = await getCount();
  let totalDeleted = 0;
  let offset = 0;
  const batchSize = 1000;
  
  console.log(`Manual dedup mode. Scanning ${startCount.toLocaleString()} images...`);
  
  // Scan through all images ordered by id, track seen source_urls
  // Process in chunks by id range
  let scanned = 0;
  const seen = new Map(); // source_url -> first id
  let idsToDelete = [];
  let page = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('images')
      .select('id, source_url, created_at')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(page * batchSize, (page + 1) * batchSize - 1);
    
    if (error) {
      console.error('Scan error:', error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    for (const row of data) {
      scanned++;
      if (!row.source_url) continue;
      
      if (seen.has(row.source_url)) {
        idsToDelete.push(row.id);
      } else {
        seen.set(row.source_url, row.id);
      }
    }
    
    page++;
    
    // Delete in batches of 200
    while (idsToDelete.length >= 200) {
      const batch = idsToDelete.splice(0, 200);
      const { error: delErr } = await supabase
        .from('images')
        .delete()
        .in('id', batch);
      
      if (delErr) {
        console.error('Delete error:', delErr.message);
      } else {
        totalDeleted += batch.length;
      }
    }
    
    if (scanned % 50000 === 0) {
      console.log(`  Scanned: ${scanned.toLocaleString()} | Dupes found: ${(totalDeleted + idsToDelete.length).toLocaleString()} | Unique URLs: ${seen.size.toLocaleString()}`);
    }
  }
  
  // Delete remaining
  while (idsToDelete.length > 0) {
    const batch = idsToDelete.splice(0, 200);
    const { error: delErr } = await supabase
      .from('images')
      .delete()
      .in('id', batch);
    
    if (delErr) {
      console.error('Delete error:', delErr.message);
    } else {
      totalDeleted += batch.length;
    }
  }
  
  const endCount = await getCount();
  console.log(`\n✅ Dedup complete!`);
  console.log(`   Scanned: ${scanned.toLocaleString()}`);
  console.log(`   Before: ${startCount.toLocaleString()}`);
  console.log(`   After: ${endCount.toLocaleString()}`);
  console.log(`   Removed: ${totalDeleted.toLocaleString()} duplicates`);
  console.log(`   Unique URLs tracked: ${seen.size.toLocaleString()}`);
}

dedup().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
