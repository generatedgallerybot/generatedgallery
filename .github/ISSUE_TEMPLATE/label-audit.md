---
name: Label audit batch
description: Audit a small slice of weak labels against the protocol schema
title: "Label audit: <slice or topic>"
labels: [dataset, labels, good-first-issue]
---

## Goal

Audit a small JSONL slice and report whether the weak labels are useful downstream.

## Input

- Export: https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz
- Suggested slice: records `<start>` through `<end>`, or a label group such as `styles=anime`.

## Output

Please provide:

- false-positive labels
- missing useful labels
- confusing taxonomy names
- examples with record ids
- suggested rule changes if obvious

## Rules

- Do not download or redistribute source images unless rights are reviewed.
- Do not claim labels are human-verified globally. This is a local audit.
- Keep changes schema-compatible.

## Validation

If you change code, run:

```bash
npm run export:index -- --limit 1000 --safety sfw --out /tmp/gg-test.jsonl
npm run validate:index -- /tmp/gg-test.jsonl
```
