#!/usr/bin/env python3
"""Small Polars recipe for Generated Gallery JSONL.GZ exports.

Usage:
  python examples/polars_recipe.py
  python examples/polars_recipe.py https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz cinematic 5 10000
"""
import gzip
import io
import json
import sys
import urllib.request
from pathlib import Path

import polars as pl

DEFAULT_URL = "https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz"
DEFAULT_LABEL = "cinematic"
DEFAULT_SAMPLE_SIZE = 5
DEFAULT_LIMIT = 10000


def open_stream(location: str):
    if location.startswith(("http://", "https://")):
        req = urllib.request.Request(
            location,
            headers={"User-Agent": "generatedgallery-polars-recipe/1.0"},
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
        bio = io.BytesIO(raw)
        if location.endswith(".gz"):
            return io.TextIOWrapper(gzip.GzipFile(fileobj=bio), encoding="utf-8")
        return io.TextIOWrapper(bio, encoding="utf-8")

    path = Path(location)
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("r", encoding="utf-8")


def load_rows(location: str, limit: int):
    rows = []
    with open_stream(location) as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            labels = record.get("labels", {})
            generation = record.get("generation", {})
            source = record.get("source", {})
            rows.append({
                "id": record.get("id"),
                "styles": labels.get("styles") or [],
                "subjects": labels.get("subjects") or [],
                "model_family": labels.get("model_family"),
                "prompt": generation.get("prompt") or "",
                "source_url": source.get("url") or record.get("url"),
            })
            if len(rows) >= limit:
                break
    return pl.DataFrame(rows)


def print_list_top(df: pl.DataFrame, field: str, label: str):
    top = (
        df.select(pl.col(field).explode().drop_nulls().alias("value"))
        .group_by("value")
        .len()
        .sort("len", descending=True)
        .head(10)
    )
    print(f"\nTop {label}:")
    for row in top.iter_rows(named=True):
        print(f"- {row['value']}: {row['len']}")


def print_model_top(df: pl.DataFrame):
    top = (
        df.select(pl.col("model_family"))
        .drop_nulls()
        .group_by("model_family")
        .len()
        .sort("len", descending=True)
        .head(10)
    )
    print("\nTop model families:")
    for row in top.iter_rows(named=True):
        print(f"- {row['model_family']}: {row['len']}")


def print_samples(df: pl.DataFrame, label: str, sample_size: int):
    sample = (
        df.filter(
            pl.col("styles").list.contains(label)
            | pl.col("subjects").list.contains(label)
            | (pl.col("model_family") == label)
        )
        .select("prompt", "source_url")
        .head(sample_size)
    )
    print(f"\nSample rows for label '{label}':")
    if sample.height == 0:
        print("- no rows matched")
        return
    for row in sample.iter_rows(named=True):
        prompt = row["prompt"].replace("\n", " ").strip()
        if len(prompt) > 180:
            prompt = f"{prompt[:177]}..."
        print(f"- prompt: {prompt}")
        print(f"  source: {row['source_url']}")


def main():
    location = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    label = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_LABEL
    sample_size = int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_SAMPLE_SIZE
    limit = int(sys.argv[4]) if len(sys.argv) > 4 else DEFAULT_LIMIT

    df = load_rows(location, limit=limit)
    print(f"Loaded {df.height} rows from: {location}")
    print_list_top(df, "styles", "styles")
    print_list_top(df, "subjects", "subjects")
    print_model_top(df)
    print_samples(df, label=label, sample_size=sample_size)
    print("\nMedia rights note: upstream creators/platforms keep rights to source media. Verify rights before reuse.")


if __name__ == "__main__":
    main()
