#!/bin/bash
# Dedup via bash + curl. Bulletproof, no Node.
set -euo pipefail

SUPABASE_URL="https://tqkhbycfxrncmolifvlv.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxa2hieWNmeHJuY21vbGlmdmx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0NTMxNSwiZXhwIjoyMDg3MzIxMzE1fQ.ScfQQcPVyoMVZQy5Qgu7r2AD3n1igee3pUuMcJG-6zc"
BATCH=500
SEEN_FILE="/tmp/dedup-seen.txt"
DELETE_FILE="/tmp/dedup-delete.txt"
CURSOR=""
SCANNED=0
DELETED=0

# Resume support
if [ -f /tmp/dedup-cursor.txt ]; then
  CURSOR=$(cat /tmp/dedup-cursor.txt)
  echo "Resuming from cursor: $CURSOR"
fi

# Init files
touch "$SEEN_FILE" "$DELETE_FILE"
SEEN_COUNT=$(wc -l < "$SEEN_FILE")
echo "Starting dedup-bash. Seen so far: $SEEN_COUNT"

while true; do
  FILTER="select=id,source_url&order=id.asc&limit=$BATCH"
  if [ -n "$CURSOR" ]; then
    FILTER="${FILTER}&id=gt.${CURSOR}"
  fi
  
  DATA=$(curl -sf --max-time 30 "${SUPABASE_URL}/rest/v1/images?${FILTER}" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" 2>/dev/null) || {
    echo "Query error, retrying in 5s..."
    sleep 5
    continue
  }
  
  COUNT=$(echo "$DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
  
  if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
    echo "No more rows. Done."
    break
  fi
  
  # Extract keys and find dupes
  echo "$DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
seen_file = '$SEEN_FILE'
delete_file = '$DELETE_FILE'

# Load seen set
seen = set()
with open(seen_file, 'r') as f:
    seen = set(line.strip() for line in f if line.strip())

new_seen = []
to_delete = []
last_id = ''

for row in data:
    last_id = row['id']
    url = row.get('source_url', '')
    if not url:
        continue
    key = url.rsplit('/', 1)[-1]
    if key in seen:
        to_delete.append(row['id'])
    else:
        seen.add(key)
        new_seen.append(key)

# Append new seen
with open(seen_file, 'a') as f:
    for k in new_seen:
        f.write(k + '\n')

# Append deletes
with open(delete_file, 'a') as f:
    for d in to_delete:
        f.write(d + '\n')

print(f'{last_id}|{len(to_delete)}|{len(seen)}')
" > /tmp/dedup-result.txt 2>/dev/null
  
  RESULT=$(cat /tmp/dedup-result.txt)
  CURSOR=$(echo "$RESULT" | cut -d'|' -f1)
  NEW_DUPES=$(echo "$RESULT" | cut -d'|' -f2)
  UNIQUE=$(echo "$RESULT" | cut -d'|' -f3)
  
  echo "$CURSOR" > /tmp/dedup-cursor.txt
  SCANNED=$((SCANNED + COUNT))
  
  # Delete if we have 50+ pending
  DEL_COUNT=$(wc -l < "$DELETE_FILE")
  if [ "$DEL_COUNT" -ge 50 ]; then
    # Take first 50
    IDS=$(head -50 "$DELETE_FILE" | tr '\n' ',' | sed 's/,$//')
    if curl -sf --max-time 30 -X DELETE \
      "${SUPABASE_URL}/rest/v1/images?id=in.(${IDS})" \
      -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
      -H "Prefer: return=minimal" > /dev/null 2>&1; then
      DELETED=$((DELETED + 50))
      # Remove first 50 lines
      tail -n +51 "$DELETE_FILE" > /tmp/dedup-delete-tmp.txt
      mv /tmp/dedup-delete-tmp.txt "$DELETE_FILE"
    fi
  fi
  
  if [ $((SCANNED % 5000)) -eq 0 ]; then
    echo "[$(date -u +%H:%M:%S)] Scanned: $SCANNED | Del: $DELETED | Pending: $(wc -l < $DELETE_FILE) | Uniq: $UNIQUE | @${CURSOR:0:8}"
  fi
done

# Flush remaining deletes
echo "Flushing remaining deletes..."
while [ -s "$DELETE_FILE" ]; do
  IDS=$(head -50 "$DELETE_FILE" | tr '\n' ',' | sed 's/,$//')
  BATCH_COUNT=$(head -50 "$DELETE_FILE" | wc -l)
  if curl -sf --max-time 30 -X DELETE \
    "${SUPABASE_URL}/rest/v1/images?id=in.(${IDS})" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Prefer: return=minimal" > /dev/null 2>&1; then
    DELETED=$((DELETED + BATCH_COUNT))
    tail -n +$((BATCH_COUNT + 1)) "$DELETE_FILE" > /tmp/dedup-delete-tmp.txt
    mv /tmp/dedup-delete-tmp.txt "$DELETE_FILE"
  else
    sleep 3
  fi
done

echo "✅ Dedup complete! Scanned: $SCANNED | Deleted: $DELETED"
