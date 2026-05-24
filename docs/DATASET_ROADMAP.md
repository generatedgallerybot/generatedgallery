# GeneratedGallery Dataset Roadmap

GeneratedGallery should become a usable downstream AI image metadata dataset, not just a browsable gallery.

## Thesis

The defensible thing is a large, normalized, labeled index of AI-generated media with prompts, negative prompts, source provenance, model hints, style labels, safety labels, dimensions, quality signals, and machine-readable exports.

Do not position this as a rights-free image bundle. Position it as a metadata/provenance/prompt dataset and protocol for generated media.

## Who it helps

- model builders looking for prompt/image metadata distributions
- dataset curators who need normalized AI media records
- agents that need a common schema for generated image packs
- search/recommendation systems that need style, subject, model, and safety labels
- LoRA/fine-tune researchers looking for candidate metadata, not blind scraping
- prompt engineers studying what prompts produce which visual classes

## Dataset product shape

### Current v0

JSONL records include:

- id
- url and thumbnailUrl
- source site/url/creator
- media width/height/type
- prompt and negativePrompt
- model, mostly empty today
- taxonomy category/tags, sparse today
- safety nsfw/rating
- basic stats
- createdAt/indexedAt

### Needed v1 labels

Add normalized labels in a new `labels` object, preserving original raw fields.

```json
{
  "labels": {
    "subjects": ["person", "cat", "product", "landscape"],
    "styles": ["anime", "photorealistic", "cinematic", "3d-render"],
    "aesthetic": ["high-contrast", "pastel", "dark", "minimal"],
    "medium": ["illustration", "photo", "concept-art", "poster"],
    "composition": ["portrait", "close-up", "full-body", "wide-shot"],
    "use_cases": ["wallpaper", "character-reference", "product-mockup"],
    "quality_flags": ["watermark", "text-artifacts", "bad-hands", "low-detail"],
    "safety": ["sfw"],
    "model_family": "stable-diffusion",
    "confidence": {
      "subjects": 0.82,
      "styles": 0.74,
      "quality_flags": 0.61
    },
    "labeler": "generatedgallery-rules-v0.1"
  }
}
```

### Useful downstream exports

- `generated-gallery.full.jsonl.gz` - all public metadata records
- `generated-gallery.sfw.jsonl.gz` - SFW only
- `generated-gallery.prompts.jsonl.gz` - prompt/negative/model/style only
- `generated-gallery.sample.json` - small inspectable sample
- `manifest.json` - counts, schema version, updated_at, splits, license notes
- `schema.json` - canonical schema
- Hugging Face dataset card with clear caveats

## Labeling strategy

Use a cheap layered approach before any expensive vision model pass.

1. **Rule labels from prompt text**
   - Map keywords to subjects/styles/medium/composition/use cases.
   - Extract model names, LoRA mentions, aspect hints, camera/lens terms.
   - Flag common quality negatives from negative prompts.

2. **Source-derived labels**
   - Preserve Civitai/PromptHero tags where available.
   - Normalize source tags into the canonical taxonomy.

3. **Weak quality labels**
   - Use dimensions, prompt length, missing prompt, duplicate source, NSFW flag, and engagement stats.
   - Add `quality_score` as a weak ranking signal, not ground truth.

4. **Small audited gold set**
   - Hand/agent-review 500-1000 records across categories.
   - Use this to evaluate label rules and recruit contributors.

5. **Optional model-assisted labeling**
   - Only later, run a vision model over thumbnails for subject/style/quality.
   - Cache labels and model version.
   - Never imply perfect ground truth.

## Protocol angle

The protocol should be framed as:

> a portable manifest format for generated media packs: prompts, provenance, safety, model hints, labels, and usage metadata.

Agents can help because the tasks are modular and verifiable:

- add source adapters
- improve taxonomy mappings
- validate schema examples
- label gold-set batches
- write dataset cards/docs
- add export tools
- build consumers/demo notebooks
- open PRs to awesome lists

## Recruiting other agents

The pitch should not be “please promote my site.” The pitch is:

> Help build an open metadata protocol and dataset for AI-generated media so agents and model builders have a common format to exchange prompts, provenance, and labels.

Make contribution tasks small:

- `good first issue: map 50 prompt keywords to style labels`
- `good first issue: add a Python loader for the JSONL export`
- `good first issue: validate 100 SFW/NSFW labels from metadata only`
- `good first issue: write a Hugging Face dataset card section`
- `good first issue: add a source adapter for X`

Agents need clear IO contracts:

- input file path or JSONL slice
- expected output file/schema
- validation command
- no secrets/no scraping beyond allowed sources
- no paid APIs unless explicitly approved

## Immediate next implementation steps

1. Create canonical schema v0.2 with `labels`, `license`, `rights`, `splits`, `quality_score`, and `provenance` fields.
2. Write a deterministic rule labeler that reads existing records and emits enriched JSONL.
3. Generate counts by label and publish manifest.
4. Add docs page: `/ai-image-dataset/labels` or `/dataset` explaining fields and caveats.
5. Publish Hugging Face metadata-only dataset card when login/token is available.
6. Create GitHub issues for modular agent/contributor tasks.

## Guardrails

- Do not upload bulk source images unless rights are reviewed.
- Do not call it a clean training dataset yet.
- Do not claim labels are human-verified unless they are.
- Keep original metadata and weak labels separate.
- Version everything: schema, labeler, export date, source adapters.
