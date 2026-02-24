#!/usr/bin/env python3
"""Dedup images by source_url. Cursor-based, resumable, no Node needed."""
import json, time, os, sys, urllib.request, urllib.error

URL = "https://tqkhbycfxrncmolifvlv.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxa2hieWNmeHJuY21vbGlmdmx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0NTMxNSwiZXhwIjoyMDg3MzIxMzE1fQ.ScfQQcPVyoMVZQy5Qgu7r2AD3n1igee3pUuMcJG-6zc"
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
BATCH = 500
STATE_FILE = "/tmp/dedup-state.json"

def api_get(params, timeout=30):
    url = f"{URL}/rest/v1/images?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def api_delete(ids, timeout=30):
    id_list = ",".join(ids)
    url = f"{URL}/rest/v1/images?id=in.({id_list})"
    req = urllib.request.Request(url, method="DELETE", headers={**HEADERS, "Prefer": "return=minimal"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        pass

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"cursor": "", "seen": [], "deleted": 0, "scanned": 0}

def save_state(state):
    # Don't save the full seen set, just cursor and counts
    with open(STATE_FILE, "w") as f:
        json.dump({"cursor": state["cursor"], "deleted": state["deleted"], "scanned": state["scanned"], "unique": len(state["seen_set"])}, f)

def main():
    state = load_state()
    cursor = state.get("cursor", "")
    deleted = state.get("deleted", 0)
    scanned = state.get("scanned", 0)
    
    # Load seen from file
    seen_file = "/tmp/dedup-seen-v4.txt"
    seen = set()
    if os.path.exists(seen_file):
        print(f"Loading seen file...", flush=True)
        with open(seen_file) as f:
            seen = set(line.strip() for line in f if line.strip())
        print(f"Loaded {len(seen):,} seen entries", flush=True)
    
    print(f"Starting dedup-v4. Cursor: {cursor[:8] if cursor else 'start'}, Seen: {len(seen)}, Deleted: {deleted}, Scanned: {scanned}")
    
    pending_delete = []
    seen_buffer = []
    
    while True:
        params = f"select=id,source_url&order=id.asc&limit={BATCH}"
        if cursor:
            params += f"&id=gt.{cursor}"
        
        try:
            data = api_get(params)
        except Exception as e:
            print(f"Query error: {e}")
            time.sleep(5)
            continue
        
        if not data:
            break
        
        for row in data:
            scanned += 1
            cursor = row["id"]
            url = row.get("source_url", "")
            if not url:
                continue
            key = url.rsplit("/", 1)[-1]
            if key in seen:
                pending_delete.append(row["id"])
            else:
                seen.add(key)
                seen_buffer.append(key)
        
        # Flush seen buffer periodically
        if len(seen_buffer) >= 1000:
            with open(seen_file, "a") as f:
                f.write("\n".join(seen_buffer) + "\n")
            seen_buffer = []
        
        # Delete in batches of 50
        while len(pending_delete) >= 50:
            batch = pending_delete[:50]
            pending_delete = pending_delete[50:]
            for attempt in range(3):
                try:
                    api_delete(batch)
                    deleted += len(batch)
                    break
                except Exception as e:
                    print(f"Delete error ({attempt+1}/3): {e}")
                    time.sleep(3)
        
        if scanned % 5000 == 0:
            save_state({"cursor": cursor, "deleted": deleted, "scanned": scanned, "seen_set": seen})
            print(f"[{time.strftime('%H:%M:%S', time.gmtime())}] Scanned: {scanned:,} | Del: {deleted:,} | Uniq: {len(seen):,} | @{cursor[:8]}")
            sys.stdout.flush()
    
    # Flush remaining
    if seen_buffer:
        with open(seen_file, "a") as f:
            f.write("\n".join(seen_buffer) + "\n")
    
    while pending_delete:
        batch = pending_delete[:50]
        pending_delete = pending_delete[50:]
        try:
            api_delete(batch)
            deleted += len(batch)
        except:
            pass
    
    save_state({"cursor": cursor, "deleted": deleted, "scanned": scanned, "seen_set": seen})
    print(f"\n✅ Done! Scanned: {scanned:,} | Deleted: {deleted:,} | Unique: {len(seen):,}")

if __name__ == "__main__":
    main()
