# Label Audit 001

A small balanced audit slice for Generated Gallery protocol v0.2 weak labels.

## Files

- Public JSONL: `https://generatedgallery.com/index/audit/label-audit-001.jsonl`
- Source export: `https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz`

## Goal

Review 100 prompt-only records across rough buckets:

- person
- anime
- landscape
- photo
- unknown/sparse labels

## What to record

For each bad or interesting example, note:

```text
record id:
bucket:
false positive labels:
missing labels:
safety concern:
notes:
```

## Rules

- This is metadata/provenance review, not a media-rights grant.
- Do not redistribute source images.
- Labels are weak deterministic labels, not ground truth.
- Suggested rule changes should preserve schema v0.2.

## Validation

```bash
npm run validate:index -- public/index/generated-gallery.jsonl
python3 examples/load_dataset.py public/index/audit/label-audit-001.jsonl 5
```
