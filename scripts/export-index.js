#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { LABELER_VERSION, enrichRecord } = require('./label-record');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const PROTOCOL_VERSION = '0.2.0';
const DEFAULT_OUT = path.resolve(__dirname, '../public/index/generated-gallery.jsonl');
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://generatedgallery.com';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function parseArgs(argv) {
  const options = {
    outPath: DEFAULT_OUT,
    limit: Number(process.env.EXPORT_LIMIT || 10000),
    safety: 'sfw',
    manifestPath: null,
    samplePath: null,
    promptOnlyPath: null,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') options.outPath = path.resolve(argv[++i]);
    else if (arg === '--limit') options.limit = Number(argv[++i]);
    else if (arg === '--safety') options.safety = argv[++i];
    else if (arg === '--manifest') options.manifestPath = path.resolve(argv[++i]);
    else if (arg === '--sample') options.samplePath = path.resolve(argv[++i]);
    else if (arg === '--prompts') options.promptOnlyPath = path.resolve(argv[++i]);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npm run export:index -- [outPath] [limit]\n\nOptions:\n  --out <path>       JSONL output path (default: public/index/generated-gallery.jsonl)\n  --limit <number>   Max records to export (default: 10000 or EXPORT_LIMIT)\n  --safety <sfw|nsfw|all>  Safety filter (default: sfw)\n  --manifest <path>  Manifest output path (default: alongside JSONL)\n  --sample <path>    Sample records output path (default: alongside JSONL)\n`);
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }

  // Backward-compatible positional args: node scripts/export-index.js ./out.jsonl 5000
  if (positional[0]) options.outPath = path.resolve(positional[0]);
  if (positional[1]) options.limit = Number(positional[1]);

  if (!Number.isFinite(options.limit) || options.limit < 1) options.limit = 10000;
  options.limit = Math.floor(options.limit);
  if (!['sfw', 'nsfw', 'all'].includes(options.safety)) options.safety = 'sfw';

  const parsed = path.parse(options.outPath);
  const base = path.join(parsed.dir, parsed.name.replace(/\.jsonl$/i, ''));
  options.manifestPath = options.manifestPath || path.join(parsed.dir, 'manifest.json');
  options.samplePath = options.samplePath || `${base}.sample.json`;
  options.promptOnlyPath = options.promptOnlyPath || `${base}.prompts.jsonl`;

  return options;
}

function mediaType(row) {
  const explicit = String(row.media_type || '').toLowerCase();
  if (['image', 'video', 'gif'].includes(explicit)) return explicit;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(row.image_url)) return 'video';
  if (/\.gif(\?|$)/i.test(row.image_url)) return 'gif';
  return 'image';
}

function externalId(sourceUrl) {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/(?:images|posts|models)\/(\d+)/i);
  return match?.[1] || null;
}

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function uniqueTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))].slice(0, 50);
}

function positiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function toRecord(row) {
  const nsfw = Boolean(row.is_nsfw);
  return {
    id: `${cleanString(row.source_site) || 'generatedgallery'}:${row.id}`,
    url: row.image_url,
    thumbnailUrl: row.thumbnail_url || null,
    title: cleanString(row.title),
    description: cleanString(row.description),
    source: {
      site: cleanString(row.source_site) || 'generatedgallery.com',
      url: row.source_url || null,
      externalId: cleanString(row.external_id) || externalId(row.source_url),
      creator: cleanString(row.creator) || cleanString(row.uploaded_by)
    },
    media: {
      type: mediaType(row),
      width: positiveInt(row.width),
      height: positiveInt(row.height),
      mimeType: cleanString(row.mime_type)
    },
    generation: {
      prompt: cleanString(row.prompt),
      negativePrompt: cleanString(row.negative_prompt),
      model: cleanString(row.model)
    },
    taxonomy: {
      category: cleanString(row.category),
      tags: uniqueTags(row.tags)
    },
    safety: {
      nsfw,
      rating: nsfw ? 'nsfw' : 'sfw'
    },
    stats: {
      views: nonNegativeInt(row.views),
      downloads: nonNegativeInt(row.downloads),
      upvotes: nonNegativeInt(row.upvotes)
    },
    createdAt: row.created_at || null,
    indexedAt: row.crawled_at || row.created_at || new Date().toISOString()
  };
}

function increment(map, key) {
  const safeKey = key || 'unknown';
  map[safeKey] = (map[safeKey] || 0) + 1;
}

function topEntries(map, limit = 20) {
  return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit));
}

function countLabels(labelCounts, labels) {
  for (const field of ['subjects', 'styles', 'medium', 'use_cases', 'quality_flags', 'avoidance_flags', 'safety']) {
    for (const value of labels[field] || []) increment(labelCounts[field], value);
  }
  increment(labelCounts.model_family, labels.model_family || 'unknown');
}


function auditBatches() {
  const auditDir = path.resolve(__dirname, '../public/index/audit');
  if (!fs.existsSync(auditDir)) return [];
  return fs.readdirSync(auditDir)
    .filter(name => name.endsWith('.jsonl'))
    .sort()
    .map(name => {
      const fullPath = path.join(auditDir, name);
      const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').filter(Boolean).length;
      return {
        name: name.replace(/\.jsonl$/, ''),
        url: publicUrlFor(fullPath),
        recordCount: lineCount
      };
    });
}

function promptOnlyRecord(record) {
  return {
    id: record.id,
    source: record.source,
    generation: record.generation,
    labels: record.labels,
    safety: record.safety,
    media: record.media,
    rights: record.rights,
    indexedAt: record.indexedAt
  };
}

function gzipFile(inputPath) {
  const outputPath = `${inputPath}.gz`;
  fs.writeFileSync(outputPath, zlib.gzipSync(fs.readFileSync(inputPath), { level: 9 }));
  return { path: outputPath, size: fs.statSync(outputPath).size };
}

function publicUrlFor(outPath) {
  const publicDir = path.resolve(__dirname, '../public');
  const relative = path.relative(publicDir, outPath);
  if (relative.startsWith('..')) return null;
  return `${PUBLIC_BASE_URL}/${relative.split(path.sep).join('/')}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pageSize = 1000;
  fs.mkdirSync(path.dirname(options.outPath), { recursive: true });

  const hash = crypto.createHash('sha256');
  const stream = fs.createWriteStream(options.outPath);
  const promptStream = fs.createWriteStream(options.promptOnlyPath);
  const samples = [];
  const sourceCounts = {};
  const categoryCounts = {};
  const labelCounts = { subjects: {}, styles: {}, medium: {}, use_cases: {}, quality_flags: {}, avoidance_flags: {}, safety: {}, model_family: {} };
  const startedAt = new Date().toISOString();

  let written = 0;
  for (let offset = 0; offset < options.limit; offset += pageSize) {
    const end = Math.min(offset + pageSize - 1, options.limit - 1);
    let query = supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, end);

    if (options.safety === 'sfw') query = query.eq('is_nsfw', false);
    if (options.safety === 'nsfw') query = query.eq('is_nsfw', true);

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      const record = enrichRecord(toRecord(row));
      const line = `${JSON.stringify(record)}\n`;
      const promptLine = `${JSON.stringify(promptOnlyRecord(record))}\n`;
      stream.write(line);
      promptStream.write(promptLine);
      hash.update(line);
      written += 1;
      increment(sourceCounts, record.source.site);
      increment(categoryCounts, record.taxonomy.category);
      countLabels(labelCounts, record.labels);
      if (samples.length < 3) samples.push(record);
    }

    if (data.length < pageSize) break;
  }

  await Promise.all([
    new Promise(resolve => stream.end(resolve)),
    new Promise(resolve => promptStream.end(resolve))
  ]);

  const stats = fs.statSync(options.outPath);
  const promptStats = fs.statSync(options.promptOnlyPath);
  const gzipStats = gzipFile(options.outPath);
  const promptGzipStats = gzipFile(options.promptOnlyPath);
  const manifest = {
    name: `Generated Gallery public ${options.safety.toUpperCase()} index`,
    protocolVersion: PROTOCOL_VERSION,
    labelerVersion: LABELER_VERSION,
    updatedAt: new Date().toISOString(),
    generatedAt: startedAt,
    itemsUrl: publicUrlFor(options.outPath),
    apiUrl: `${PUBLIC_BASE_URL}/api/index?safety=${options.safety}`,
    schemaUrl: `${PUBLIC_BASE_URL}/schemas/generated-gallery-record.schema.json`,
    promptOnlyUrl: publicUrlFor(options.promptOnlyPath),
    compressedItemsUrl: publicUrlFor(gzipStats.path),
    compressedPromptOnlyUrl: publicUrlFor(promptGzipStats.path),
    license: 'metadata: CC0 where possible, media: upstream terms apply',
    defaultSafety: options.safety,
    format: 'jsonl',
    recordCount: written,
    byteSize: stats.size,
    compressedByteSize: gzipStats.size,
    promptOnlyByteSize: promptStats.size,
    compressedPromptOnlyByteSize: promptGzipStats.size,
    sha256: hash.digest('hex'),
    sourceCounts: topEntries(sourceCounts),
    categoryCounts: topEntries(categoryCounts),
    labelCounts: Object.fromEntries(Object.entries(labelCounts).map(([key, value]) => [key, topEntries(value)])),
    auditBatches: auditBatches(),
    splits: {
      default: { safety: options.safety, recordCount: written, url: publicUrlFor(options.outPath), compressedUrl: publicUrlFor(gzipStats.path) },
      prompts: { safety: options.safety, recordCount: written, url: publicUrlFor(options.promptOnlyPath), compressedUrl: publicUrlFor(promptGzipStats.path) }
    },
    sampleRecordsUrl: publicUrlFor(options.samplePath)
  };

  fs.writeFileSync(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(options.samplePath, `${JSON.stringify(samples, null, 2)}\n`);

  console.log(`Exported ${written} records to ${options.outPath}`);
  console.log(`Wrote manifest to ${options.manifestPath}`);
  console.log(`Wrote sample records to ${options.samplePath}`);
  console.log(`Wrote prompt-only records to ${options.promptOnlyPath}`);
  console.log(`Wrote compressed exports to ${gzipStats.path} and ${promptGzipStats.path}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
