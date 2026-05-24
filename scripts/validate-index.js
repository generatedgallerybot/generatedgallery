#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../public/schemas/generated-gallery-record.schema.json');
const inputPath = path.resolve(process.argv[2] || './public/index/generated-gallery.jsonl');
const maxErrors = Number(process.env.MAX_ERRORS || 20);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function isUri(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isDateTime(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateRecord(record, lineNumber) {
  const errors = [];
  const required = ['id', 'url', 'source', 'media', 'generation', 'taxonomy', 'safety', 'indexedAt'];
  for (const field of required) {
    if (!(field in record)) errors.push(`missing ${field}`);
  }

  if (typeof record.id !== 'string' || record.id.length === 0) errors.push('id must be a non-empty string');
  if (typeof record.url !== 'string' || !isUri(record.url)) errors.push('url must be an http(s) URI');
  if (record.thumbnailUrl !== null && record.thumbnailUrl !== undefined && !isUri(record.thumbnailUrl)) errors.push('thumbnailUrl must be null or an http(s) URI');

  if (!record.source || typeOf(record.source) !== 'object') errors.push('source must be an object');
  else {
    if (typeof record.source.site !== 'string' || record.source.site.length === 0) errors.push('source.site must be a non-empty string');
    if (record.source.url !== null && record.source.url !== undefined && !isUri(record.source.url)) errors.push('source.url must be null or an http(s) URI');
  }

  if (!record.media || typeOf(record.media) !== 'object') errors.push('media must be an object');
  else {
    if (!['image', 'video', 'gif', 'unknown'].includes(record.media.type)) errors.push('media.type is invalid');
    for (const dim of ['width', 'height']) {
      const value = record.media[dim];
      if (value !== null && value !== undefined && (!Number.isInteger(value) || value < 1)) errors.push(`media.${dim} must be null or a positive integer`);
    }
  }

  if (!record.taxonomy || typeOf(record.taxonomy) !== 'object') errors.push('taxonomy must be an object');
  else if (!Array.isArray(record.taxonomy.tags)) errors.push('taxonomy.tags must be an array');
  else if (new Set(record.taxonomy.tags).size !== record.taxonomy.tags.length) errors.push('taxonomy.tags must be unique');

  if (!record.safety || typeOf(record.safety) !== 'object') errors.push('safety must be an object');
  else {
    if (typeof record.safety.nsfw !== 'boolean') errors.push('safety.nsfw must be boolean');
    if (record.safety.rating && !['sfw', 'mature', 'nsfw', 'unknown'].includes(record.safety.rating)) errors.push('safety.rating is invalid');
  }

  if (!isDateTime(record.indexedAt)) errors.push('indexedAt must be an ISO date-time string');
  if (record.createdAt !== null && record.createdAt !== undefined && !isDateTime(record.createdAt)) errors.push('createdAt must be null or an ISO date-time string');

  return errors.map(error => `line ${lineNumber}: ${error}`);
}

function main() {
  JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const input = fs.readFileSync(inputPath, 'utf8');
  const lines = input.split('\n').filter(line => line.trim().length > 0);
  const seenIds = new Set();
  const errors = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch (err) {
      errors.push(`line ${lineNumber}: invalid JSON (${err.message})`);
      return;
    }

    if (seenIds.has(record.id)) errors.push(`line ${lineNumber}: duplicate id ${record.id}`);
    seenIds.add(record.id);
    errors.push(...validateRecord(record, lineNumber));
  });

  if (errors.length > 0) {
    for (const error of errors.slice(0, maxErrors)) console.error(error);
    if (errors.length > maxErrors) console.error(`... ${errors.length - maxErrors} more errors`);
    fail(`Validation failed: ${errors.length} error(s) in ${inputPath}`);
    return;
  }

  console.log(`Validated ${lines.length} JSONL record(s) in ${inputPath}`);
}

main();
