#!/usr/bin/env node
/**
 * Dedup v3: Uses fetch with timeout instead of supabase-js to avoid silent hangs.
 * Cursor-based pagination, extracts URL key for memory efficiency.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 500;
const DELETE_BATCH = 50;

async function fetchWithTimeout(url, opts, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function query(params) {
  const url = `${SUPABASE_URL}/rest/v1/images?${params}`;
  const res = await fetchWithTimeout(url, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deleteBatch(ids) {
  // Use OR filter: id=in.(id1,id2,...)
  const filter = `id=in.(${ids.join(',')})`;
  const url = `${SUPABASE_URL}/rest/v1/images?${filter}`;
  const res = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: { 
      'apikey': SERVICE_KEY, 
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    }
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
}

async function dedup() {
  console.log(`Dedup v3 started at ${new Date().toISOString()}`);
  
  const seen = new Set();
  let pendingDelete = [];
  let totalDeleted = 0;
  let scanned = 0;
  let cursor = '';

  while (true) {
    let params = `select=id,source_url&order=id.asc&limit=${BATCH_SIZE}`;
    if (cursor) params += `&id=gt.${cursor}`;

    let data;
    try {
      data = await query(params);
    } catch (e) {
      console.error(`Query error: ${e.message}`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      cursor = row.id;
      if (!row.source_url) continue;
      const key = row.source_url.substring(row.source_url.lastIndexOf('/') + 1);
      if (seen.has(key)) {
        pendingDelete.push(row.id);
      } else {
        seen.add(key);
      }
    }

    while (pendingDelete.length >= DELETE_BATCH) {
      const batch = pendingDelete.splice(0, DELETE_BATCH);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await deleteBatch(batch);
          totalDeleted += batch.length;
          break;
        } catch (e) {
          console.error(`Delete error (${attempt+1}/3): ${e.message}`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }

    if (scanned % 5000 === 0) {
      const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log(`[${new Date().toISOString()}] Scanned: ${scanned.toLocaleString()} | Del: ${totalDeleted.toLocaleString()} | Uniq: ${seen.size.toLocaleString()} | Mem: ${mem}MB | @${cursor.substring(0,8)}`);
    }
  }

  // Flush
  while (pendingDelete.length > 0) {
    const batch = pendingDelete.splice(0, DELETE_BATCH);
    try { await deleteBatch(batch); totalDeleted += batch.length; } catch(e) {}
  }

  console.log(`\n✅ Done at ${new Date().toISOString()}`);
  console.log(`   Scanned: ${scanned.toLocaleString()} | Deleted: ${totalDeleted.toLocaleString()} | Unique: ${seen.size.toLocaleString()}`);
}

process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err); });
process.on('unhandledRejection', (err) => { console.error('UNHANDLED:', err); });
dedup().catch(err => { console.error('Fatal:', err); process.exit(1); });
