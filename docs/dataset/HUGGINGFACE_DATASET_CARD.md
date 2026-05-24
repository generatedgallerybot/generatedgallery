---
license: cc0-1.0
language:
- en
tags:
- ai-generated-images
- prompts
- stable-diffusion
- metadata
- jsonl
- provenance
pretty_name: Generated Gallery AI Image Metadata Index
size_categories:
- 10K<n<100K
---

# Generated Gallery AI Image Metadata Index

Generated Gallery is a metadata and provenance index for AI-generated media. The dataset contains normalized records with source URLs, prompt text where available, safety fields, dimensions, weak labels, model-family hints, and downstream-friendly JSONL exports.

This is **not** a rights-free image bundle. It is a metadata dataset with upstream media URLs. Verify upstream terms before downloading, redistributing, or training on source media.

## Current public snapshot

- Manifest: https://generatedgallery.com/index/manifest.json
- Full SFW JSONL: https://generatedgallery.com/index/generated-gallery.jsonl.gz
- Prompt-only SFW JSONL: https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz
- Schema: https://generatedgallery.com/schemas/generated-gallery-record.schema.json
- Live viewer: https://generatedgallery.com
- Protocol docs: https://generatedgallery.com/protocol

## Fields

Each full record includes:

- `id` - stable source-prefixed id
- `url`, `thumbnailUrl` - upstream media URLs
- `source` - source site, source URL, creator/external id where available
- `media` - type, width, height, MIME hint
- `generation` - prompt, negative prompt, model hint
- `taxonomy` - source/category/tags where available
- `labels` - deterministic weak labels from prompt/source metadata
- `safety` - SFW/NSFW flag
- `rights` - metadata/media/training caveats
- `provenance` - indexer/source trace
- `stats` - viewer/source engagement counts where available
- `createdAt`, `indexedAt`

## Weak label taxonomy

Generated Gallery v0.2 adds deterministic rule labels:

- `subjects`: person, animal, landscape, product, architecture, vehicle, food, robot
- `styles`: anime, photorealistic, cinematic, 3d-render, fantasy, sci-fi, watercolor, oil-painting, line-art, pixel-art
- `aesthetic`: dark, pastel, neon, minimal, high-detail, vintage
- `medium`: photo, illustration, painting, poster, render
- `composition`: portrait, full-body, wide-shot, macro, isometric
- `use_cases`: wallpaper, character-reference, product-mockup, concept-art, social-avatar
- `quality_flags`: positive-prompt hints like watermark, text-artifacts, low-detail
- `avoidance_flags`: negative-prompt hints such as bad-hands, anatomy-issues, low-detail
- `model_family`: stable-diffusion, stable-diffusion-xl, flux, midjourney, dall-e, or unknown
- `quality_score`: weak heuristic, not a human rating

Labeler: `generatedgallery-rules-v0.2.0`.

These labels are useful for filtering, sampling, prompt analysis, and bootstrapping higher-quality annotation. They are not ground truth.

## Example Python loader

```python
import gzip, json, urllib.request

url = "https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz"
with urllib.request.urlopen(url) as response:
    with gzip.GzipFile(fileobj=response) as gz:
        for i, line in enumerate(gz):
            record = json.loads(line)
            print(record["id"], record["labels"]["styles"], record["generation"].get("prompt"))
            if i >= 4:
                break
```

## Intended uses

- prompt analysis
- AI media search/retrieval demos
- weakly-supervised style/subject sampling
- provenance-aware index experiments
- agent-readable media pack exchange
- dataset card/schema tooling

## Out-of-scope / cautions

- Do not treat source media as automatically licensed for training.
- Do not treat weak labels as human-verified ground truth.
- Do not redistribute upstream images without rights review.
- NSFW detection is metadata-derived and imperfect.

## Citation

```bibtex
@misc{generatedgallery2026metadata,
  title = {Generated Gallery AI Image Metadata Index},
  author = {Generated Gallery},
  year = {2026},
  url = {https://generatedgallery.com/index/manifest.json},
  note = {Metadata/provenance index for AI-generated media. Upstream media rights apply.}
}
```

## Contributions wanted

Good agent-sized tasks:

- improve prompt keyword to label mappings
- audit 100-record label batches
- add source adapters with clear provenance
- write loaders for Python, JS, DuckDB, Polars
- build small notebooks for prompt/style analysis
- improve schema examples and validators
