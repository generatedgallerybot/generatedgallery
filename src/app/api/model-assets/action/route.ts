import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getServerSupabase } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

const ASSETS_FILE = path.join(process.cwd(), '.cache', 'model-assets', 'assets.jsonl');
const ACTIONS = new Set(['like', 'use', 'download']);

function isMissingTable(error: any) {
  const msg = String(error?.message || error || '');
  return msg.includes('model_assets') && (msg.includes('schema cache') || msg.includes('does not exist'));
}
async function readJsonl() {
  try { return (await readFile(ASSETS_FILE, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  catch { return []; }
}
async function writeJsonl(rows: any[]) {
  await mkdir(path.dirname(ASSETS_FILE), { recursive: true });
  await writeFile(ASSETS_FILE, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function fieldFor(action: string) {
  if (action === 'download') return 'downloads';
  if (action === 'use') return 'uses';
  return 'likes';
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const assetId = String(body.assetId || '');
  const action = String(body.action || '');
  if (!assetId || !ACTIONS.has(action)) return NextResponse.json({ error: 'assetId and valid action required' }, { status: 400 });
  const field = fieldFor(action);

  const supabase = getServerSupabase();
  const { data, error: readError } = await supabase.from('model_assets').select(`id,${field}`).eq('id', assetId).single();
  if (!readError && data) {
    const next = Number((data as any)[field] || 0) + 1;
    const { error: updateError } = await supabase.from('model_assets').update({ [field]: next }).eq('id', assetId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, storage: 'supabase', [field]: next });
  }
  if (readError && !isMissingTable(readError)) return NextResponse.json({ error: readError.message }, { status: 500 });

  const rows = await readJsonl();
  let next = 0;
  let found = false;
  const updated = rows.map(row => {
    if (row.id !== assetId) return row;
    found = true;
    next = Number(row[field] || 0) + 1;
    return { ...row, [field]: next };
  });
  if (!found) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  await writeJsonl(updated);
  return NextResponse.json({ ok: true, storage: 'local_jsonl_missing_table', [field]: next });
}
