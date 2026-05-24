# Generated Gallery

**Open source AI media indexer, protocol, and viewer.**

Browse the live viewer at [generatedgallery.com](https://generatedgallery.com). No account needed.

Useful links:

- [Live gallery](https://generatedgallery.com/)
- [Open protocol](https://generatedgallery.com/protocol)
- [Creator kit](https://generatedgallery.com/protocol/creator-kit)
- [Machine Dream Finds](https://generatedgallery.com/machine-dream-finds)
- [Public manifest](https://generatedgallery.com/index/manifest.json)
- [Public JSONL feed](https://generatedgallery.com/index/generated-gallery.jsonl)
- [Compressed dataset export](https://generatedgallery.com/index/generated-gallery.jsonl.gz)
- [Prompt-only dataset export](https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz)

![Generated Gallery Screenshot](https://generatedgallery.com/og-image.png)

## What it is

Generated Gallery started as a searchable gallery of AI generated images and prompts. It is now moving toward an open stack for AI media discovery:

- **Protocol**: portable JSON records for generated media, prompts, safety flags, and provenance
- **Indexer**: source adapters that crawl public AI media sources and normalize metadata
- **Registry**: a Supabase/Postgres store with dedupe, filtering, and search
- **Viewer**: a Next.js app for browsing any compatible index

The goal is to make AI image discovery portable. Anyone should be able to crawl a source, publish a JSONL feed, and point a viewer at it.

## Machine Dream Finds

Machine Dream Finds are small, themed AI image packs built on top of the protocol. Each pack is meant to be useful as a moodboard, prompt notebook, model test set, or agent-readable collection.

A good pack has:

- One memorable theme
- 5 to 12 images
- Prompt fragments where available
- Source URLs and provenance
- Safety labels
- A manifest so another viewer or crawler can inspect it

See the live hub at [generatedgallery.com/machine-dream-finds](https://generatedgallery.com/machine-dream-finds) and the publishing guide at [generatedgallery.com/protocol/creator-kit](https://generatedgallery.com/protocol/creator-kit).

## Current viewer features

- Browse thousands of AI images across categories like fantasy, portraits, sci-fi, anime, architecture, and more
- See the full prompt where available
- Search by title, description, or prompt text
- Download images from their upstream URLs
- NSFW toggle, off by default
- Upvote and save images
- Infinite scroll with masonry grid layout
- Mobile friendly

## Protocol and dataset

The v0.2 protocol spec lives in [`docs/protocol/README.md`](docs/protocol/README.md).

The dataset roadmap lives in [`docs/DATASET_ROADMAP.md`](docs/DATASET_ROADMAP.md), and the Hugging Face-ready dataset card draft lives in [`docs/dataset/HUGGINGFACE_DATASET_CARD.md`](docs/dataset/HUGGINGFACE_DATASET_CARD.md).

The canonical record schema lives in [`public/schemas/generated-gallery-record.schema.json`](public/schemas/generated-gallery-record.schema.json).

A protocol record looks like this:

```json
{
  "id": "civitai:123456",
  "url": "https://example.com/image.jpeg",
  "source": { "site": "civitai.com", "url": "https://civitai.com/images/123456" },
  "media": { "type": "image", "width": 1024, "height": 1024 },
  "generation": { "prompt": "cinematic portrait", "model": "Flux" },
  "taxonomy": { "category": "portraits", "tags": ["portrait"] },
  "labels": {
    "subjects": ["person"],
    "styles": ["cinematic", "photorealistic"],
    "medium": ["photo"],
    "quality_score": 0.74,
    "labeler": "generatedgallery-rules-v0.2.0"
  },
  "safety": { "nsfw": false, "rating": "sfw" },
  "indexedAt": "2026-05-06T00:00:00.000Z"
}
```

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Database | Supabase, PostgreSQL |
| Indexer | Node.js crawlers |
| Feed format | JSONL plus JSON Schema |
| Hosting | PM2 or Vercel compatible |

## Running it yourself

### Prerequisites

- Node.js 18+
- Supabase project, free tier is enough for development

### Setup

```bash
git clone https://github.com/generatedgallerybot/generatedgallery.git
cd generatedgallery
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Run the database schema:

```bash
npm run setup-db
```

Start the dev server:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

### Running the indexer

```bash
npm run crawl
```

The current crawler pulls from Civitai and writes normalized rows into Supabase. Source adapters will be split out as the open indexer matures.

### Exporting a JSONL feed

```bash
npm run export:index
```

By default this writes SFW records to `public/index/generated-gallery.jsonl`, plus:

- `public/index/manifest.json` — feed metadata, record count, checksum, source/category counts
- `public/index/generated-gallery.sample.json` — first 3 sample records for quick inspection
- `public/index/generated-gallery.prompts.jsonl` — prompt/label-focused split
- `.jsonl.gz` versions of both large exports for downstream consumers

You can pass a path and limit:

```bash
npm run export:index -- ./exports/sfw.jsonl 5000
```

Or use explicit flags:

```bash
npm run export:index -- --out ./exports/all.jsonl --limit 5000 --safety all
npm run validate:index -- ./exports/all.jsonl
```

## Project structure

```text
docs/protocol/   protocol spec and feed notes
public/schemas/  JSON Schema for portable records
scripts/         crawlers, dedupe, and export tools
src/app/         Next.js App Router pages
src/components/  viewer UI components
src/lib/         Supabase client, protocol mapping, utilities
migrations/      database migrations
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for adapter contracts, JSONL import/export workflows, verification commands, and safety/provenance rules.

Useful contributions:

- Source adapters for new AI media sites
- Better prompt and model metadata extraction
- Label audits and taxonomy improvements
- Dataset loaders/notebooks for Python, DuckDB, Polars, and JS

Dataset examples now include a plain Python streaming loader and a DuckDB label-count recipe. See [`examples/`](examples/) and [`docs/dataset/DUCKDB_RECIPE.md`](docs/dataset/DUCKDB_RECIPE.md).
- Deduplication improvements
- Search improvements, including embeddings or hybrid search
- Static JSONL feed support in the viewer
- Moderation and provenance tooling
- Docs for running a mirror

Open an issue before large changes so we can keep the protocol small and useful.

## License

MIT

Media rights and licenses remain with the upstream creators and source platforms. Generated Gallery records provenance instead of erasing it.

**Live:** [generatedgallery.com](https://generatedgallery.com)
