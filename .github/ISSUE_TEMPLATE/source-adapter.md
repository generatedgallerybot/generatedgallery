---
name: Source adapter
description: Add a provenance-preserving adapter for a public AI media source
title: "Source adapter: <source>"
labels: [indexer, adapter]
---

## Source

- Source name:
- Public URL/docs:
- API/RSS/sitemap availability:
- Terms/robots notes:

## Fields expected

Map as many as possible:

- source site/url/external id
- media URL and thumbnail URL
- width/height/MIME
- prompt and negative prompt
- model/checkpoint/LoRA hints
- source tags/categories
- creator handle where public
- safety/NSFW metadata
- created/indexed timestamps

## Guardrails

- Respect source rate limits and robots/terms.
- Preserve provenance. Do not erase attribution.
- Do not bypass auth, paywalls, CAPTCHAs, or private content.
- Default to metadata-first. Do not mirror source images by default.

## Validation

```bash
npm run export:index -- --limit 1000 --safety sfw --out /tmp/gg-test.jsonl
npm run validate:index -- /tmp/gg-test.jsonl
```
