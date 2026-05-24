#!/usr/bin/env python3
"""Print top Generated Gallery label counts from a manifest."""
import json
import sys
import urllib.request

DEFAULT_MANIFEST = "https://generatedgallery.com/index/manifest.json"


def load_json(location):
    if location.startswith(("http://", "https://")):
        with urllib.request.urlopen(location, timeout=30) as response:
            return json.load(response)
    with open(location, "r", encoding="utf-8") as handle:
        return json.load(handle)


def main():
    manifest = load_json(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MANIFEST)
    print(f"protocol={manifest['protocolVersion']} labeler={manifest.get('labelerVersion')} records={manifest['recordCount']}")
    for group, counts in manifest.get("labelCounts", {}).items():
        top = ", ".join(f"{k}:{v}" for k, v in list(counts.items())[:8])
        print(f"{group}: {top}")


if __name__ == "__main__":
    main()
