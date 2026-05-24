#!/usr/bin/env python3
"""Query Generated Gallery JSONL exports with DuckDB.

Usage:
  python examples/duckdb_label_counts.py public/index/generated-gallery.prompts.jsonl.gz

Requires:
  pip install duckdb
"""
import sys

try:
    import duckdb
except ImportError as exc:
    raise SystemExit("Install DuckDB first: pip install duckdb") from exc

DATASET = sys.argv[1] if len(sys.argv) > 1 else "https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz"

con = duckdb.connect()
con.execute("INSTALL json; LOAD json;")

print(f"dataset={DATASET}")
print("\nTop styles")
print(con.execute("""
    SELECT style, count(*) AS records
    FROM read_json_auto(?) AS records,
         UNNEST(records.labels.styles) AS t(style)
    GROUP BY style
    ORDER BY records DESC
    LIMIT 12
""", [DATASET]).fetchdf().to_string(index=False))

print("\nTop subjects")
print(con.execute("""
    SELECT subject, count(*) AS records
    FROM read_json_auto(?) AS records,
         UNNEST(records.labels.subjects) AS t(subject)
    GROUP BY subject
    ORDER BY records DESC
    LIMIT 12
""", [DATASET]).fetchdf().to_string(index=False))

print("\nModel families")
print(con.execute("""
    SELECT labels.model_family AS model_family, count(*) AS records
    FROM read_json_auto(?)
    GROUP BY labels.model_family
    ORDER BY records DESC
""", [DATASET]).fetchdf().to_string(index=False))

print("\nSample anime prompts")
print(con.execute("""
    SELECT id, generation.prompt AS prompt
    FROM read_json_auto(?) AS records
    WHERE list_contains(records.labels.styles, 'anime')
      AND generation.prompt IS NOT NULL
    LIMIT 5
""", [DATASET]).fetchdf().to_string(index=False))
