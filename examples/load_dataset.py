#!/usr/bin/env python3
"""Stream a Generated Gallery JSONL or JSONL.GZ export.

Usage:
  python examples/load_dataset.py https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz 5
  python examples/load_dataset.py public/index/generated-gallery.jsonl 3
"""
import gzip
import io
import json
import sys
import urllib.request
from pathlib import Path

DEFAULT_URL = "https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz"


def open_stream(location: str):
    if location.startswith(("http://", "https://")):
        response = urllib.request.urlopen(location, timeout=30)
        raw = response.read()
        bio = io.BytesIO(raw)
        if location.endswith(".gz"):
            return io.TextIOWrapper(gzip.GzipFile(fileobj=bio), encoding="utf-8")
        return io.TextIOWrapper(bio, encoding="utf-8")

    path = Path(location)
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("r", encoding="utf-8")


def iter_records(location: str):
    with open_stream(location) as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def main():
    location = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    for i, record in enumerate(iter_records(location), start=1):
        labels = record.get("labels", {})
        generation = record.get("generation", {})
        print(json.dumps({
            "id": record.get("id"),
            "styles": labels.get("styles", []),
            "subjects": labels.get("subjects", []),
            "model_family": labels.get("model_family"),
            "prompt": generation.get("prompt"),
        }, ensure_ascii=False))
        if i >= limit:
            break


if __name__ == "__main__":
    main()
