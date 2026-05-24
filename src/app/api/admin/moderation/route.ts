import { NextResponse } from 'next/server';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { requireAdmin } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

const COMMENTS_FILE = path.join(process.cwd(), '.cache', 'comments', 'comments.jsonl');
const ASSETS_FILE = path.join(process.cwd(), '.cache', 'model-assets', 'assets.jsonl');

function isMissingTable(error: any, table: string) {
  const msg = String(error?.message || error || '');
  return msg.includes(table) && (msg.includes('schema cache') || msg.includes('does not exist'));
}

async function readJsonl(file: string) {
  try { return (await readFile(file, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  catch { return []; }
}
async function writeJsonl(file: string, rows: any[]) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.user) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  const kind = String(body.kind || '');
  const action = String(body.action || '');
  if (!id || !['comment', 'model_asset'].includes(kind) || !['hide', 'restore', 'delete', 'flag'].includes(action)) {
    return NextResponse.json({ error: 'kind, id, and action required' }, { status: 400 });
  }
  const status = action === 'restore' ? 'visible' : action === 'delete' ? 'deleted' : action === 'flag' ? 'flagged' : 'hidden';
  const table = kind === 'comment' ? 'comments' : 'model_assets';
  const file = kind === 'comment' ? COMMENTS_FILE : ASSETS_FILE;
  const restoredStatus = kind === 'comment' ? 'visible' : 'published';
  const nextStatus = action === 'restore' ? restoredStatus : status;

  const supabase = getServerSupabase();
  const { error } = await supabase.from(table).update({ status: nextStatus, moderation_note: body.note || null }).eq('id', id);
  if (!error) return NextResponse.json({ ok: true, storage: 'supabase' });
  if (!isMissingTable(error, table)) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = await readJsonl(file);
  let changed = false;
  const updated = rows.map(row => {
    if (row.id !== id) return row;
    changed = true;
    return { ...row, status: nextStatus, moderation_note: body.note || null };
  });
  if (!changed) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  await writeJsonl(file, updated);
  return NextResponse.json({ ok: true, storage: 'local_jsonl_missing_table' });
}
