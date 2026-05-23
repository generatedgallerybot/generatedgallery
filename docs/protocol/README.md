# Generated Gallery Open Protocol

Generated Gallery is moving from a single hosted gallery into a small open stack:

1. **Protocol**: a portable JSON record for AI generated media and prompt metadata.
2. **Indexer**: crawlers that normalize public sources into protocol records.
3. **Registry**: a Supabase/Postgres store with dedupe, moderation flags, and search fields.
4. **Viewer**: the Next.js app at generatedgallery.com, which can read any compatible registry.

The goal is simple: AI image viewers should not be locked to one database, one crawler, or one site. Anyone should be able to crawl a source, publish a JSONL index, and point a viewer at it.

The public protocol surface is live at:

- https://generatedgallery.com/protocol
- https://generatedgallery.com/protocol/creator-kit
- https://generatedgallery.com/machine-dream-finds
- https://generatedgallery.com/index/manifest.json
- https://generatedgallery.com/index/generated-gallery.jsonl

## Record shape

A record is one generated media item plus enough provenance to render it responsibly.

```json
{
  "id": "civitai:123456",
  "url": "https://.../image.jpeg",
  "thumbnailUrl": "https://.../image.jpeg",
  "source": {
    "site": "civitai.com",
    "url": "https://civitai.com/images/123456",
    "externalId": "123456"
  },
  "media": {
    "type": "image",
    "width": 1024,
    "height": 1024,
    "mimeType": "image/jpeg"
  },
  "generation": {
    "prompt": "cinematic portrait of a cat trader",
    "negativePrompt": "blurry, low quality",
    "model": "Flux",
    "seed": "12345",
    "steps": 30,
    "sampler": "DPM++ 2M"
  },
  "taxonomy": {
    "category": "portraits",
    "tags": ["portrait", "cinematic"]
  },
  "safety": {
    "nsfw": false,
    "rating": "sfw"
  },
  "createdAt": "2026-05-06T00:00:00.000Z",
  "indexedAt": "2026-05-06T01:00:00.000Z"
}
```

The canonical JSON Schema is in [`schemas/generated-gallery-record.schema.json`](../../schemas/generated-gallery-record.schema.json).

## Principles

- **Provenance first**: keep source site, source URL, and upstream IDs whenever available.
- **Prompt transparency**: prompts and generation metadata are first-class fields, not hidden blobs.
- **Viewer neutrality**: viewers should be able to consume a static JSONL export or a hosted API.
- **Crawler neutrality**: indexers can be official scripts, third-party scrapers, manual uploads, or future federation feeds.
- **Safety by default**: NSFW is explicit and viewers should default to SFW-only.
- **No ownership laundering**: this protocol records where media came from. It does not claim rights or erase attribution.

## Machine Dream Finds

Machine Dream Finds are small themed packs that make the protocol useful for humans, not just crawlers.

Each pack should contain:

- one memorable theme
- 5 to 12 records
- prompt fragments where available
- source URLs and provenance
- safety labels
- a manifest or gallery URL that another viewer can inspect

The format is intentionally simple so artists, model makers, curators, and agents can all publish compatible packs.

Example public hub: https://generatedgallery.com/machine-dream-finds

## Feed formats

### JSONL index

One record per line, gzip-friendly:

```text
{"id":"...","url":"..."}
{"id":"...","url":"..."}
```

Use this for large static exports, mirrors, and backups. Consumers should stream by line instead of loading the whole file.

```js
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline/promises';

for await (const line of createInterface({ input: createReadStream('generated-gallery.jsonl') })) {
  if (!line.trim()) continue;
  const record = JSON.parse(line);
  // record.url, record.source, record.generation.prompt, ...
}
```

Local exports can be checked with:

```bash
npm run validate:index -- ./public/index/generated-gallery.jsonl
```

### Manifest

A small JSON file describing a feed:

```json
{
  "name": "Generated Gallery Civitai SFW feed",
  "protocolVersion": "0.1.0",
  "updatedAt": "2026-05-06T00:00:00.000Z",
  "itemsUrl": "https://generatedgallery.com/index/generated-gallery.jsonl",
  "license": "metadata: CC0 where possible, media: upstream terms apply",
  "defaultSafety": "sfw",
  "format": "jsonl",
  "recordCount": 10000,
  "byteSize": 1234567,
  "sha256": "...",
  "sourceCounts": { "civitai": 10000 },
  "sampleRecordsUrl": "https://generatedgallery.com/index/generated-gallery.sample.json"
}
```

## Current status

This is v0.1. It matches the existing Generated Gallery database and Civitai crawler, but is intentionally conservative.

Already live:

- public JSONL snapshot
- public manifest and sample records
- JSON Schema validation script
- read-only `/api/index` endpoint
- protocol explorer page
- creator kit page
- Machine Dream Finds hub

Next migration steps:

- split source adapters from `scripts/crawler.js`
- publish a CLI-friendly pack validator
- add per-gallery manifest export
- publish contributor docs for adding new source adapters
