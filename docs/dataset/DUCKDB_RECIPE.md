# DuckDB Recipe

Generated Gallery exports are newline-delimited JSON and gzip-friendly, so DuckDB can query them directly.

## Install

```bash
pip install duckdb
```

## Run the example

```bash
python examples/duckdb_label_counts.py public/index/generated-gallery.prompts.jsonl.gz
```

Or query the live export:

```bash
python examples/duckdb_label_counts.py https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz
```

## Example SQL

```sql
INSTALL json;
LOAD json;

SELECT style, count(*) AS records
FROM read_json_auto('public/index/generated-gallery.prompts.jsonl.gz') AS records,
     UNNEST(records.labels.styles) AS t(style)
GROUP BY style
ORDER BY records DESC;
```

## Rights note

This is a metadata/provenance dataset. Source media URLs remain governed by upstream terms. Verify rights before training on or redistributing images.
