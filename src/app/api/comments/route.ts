import { NextRequest, NextResponse } from 'next/server';
import { appendFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getBearerUser } from '@/lib/server-auth';
import { getServerSupabase } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

const COMMENTS_DIR = path.join(process.cwd(), '.cache', 'comments');
const COMMENTS_FILE = path.join(COMMENTS_DIR, 'comments.jsonl');
const ALLOWED_TARGETS = new Set(['image', 'gallery', 'lora', 'model_asset', 'output']);

type CommentRecord = {
  id: string;
  target_type: string;
  target_id: string;
  user_id: string;
  user_email: string | null;
  body: string;
  status: 'visible' | 'hidden' | 'deleted' | 'flagged';
  created_at: string;
};

function isMissingTable(error: any) {
  const msg = String(error?.message || error || '');
  return msg.includes('comments') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

async function readLocalComments(): Promise<CommentRecord[]> {
  try {
    const raw = await readFile(COMMENTS_FILE, 'utf8');
    return raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function cleanBody(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
}

function publicComment(comment: any) {
  return {
    id: comment.id,
    body: comment.body,
    userEmail: comment.user_email,
    userId: comment.user_id,
    createdAt: comment.created_at,
    upvotes: comment.upvotes || 0,
  };
}

async function isBanned(userId: string) {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.auth.admin.getUserById(userId);
    const bannedUntil = data.user?.banned_until;
    return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get('targetType') || 'image';
  const targetId = searchParams.get('targetId') || '';
  if (!ALLOWED_TARGETS.has(targetType) || !targetId) {
    return NextResponse.json({ error: 'targetType and targetId required' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('comments')
    .select('id,target_type,target_id,user_id,user_email,body,status,upvotes,created_at')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
    .limit(100);

  if (!error) return NextResponse.json({ ok: true, comments: (data || []).map(publicComment), storage: 'supabase' });
  if (!isMissingTable(error)) return NextResponse.json({ ok: false, comments: [], storage: 'supabase_error', error: error.message }, { status: 500 });

  const comments = (await readLocalComments())
    .filter(comment => comment.status === 'visible' && comment.target_type === targetType && comment.target_id === targetId)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .slice(-100)
    .map(publicComment);

  return NextResponse.json({ ok: true, comments, storage: 'local_jsonl_missing_table' });
}

export async function POST(request: NextRequest) {
  const { user, error } = await getBearerUser(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  if (await isBanned(user.id)) return NextResponse.json({ error: 'User is banned' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const targetType = String(body.targetType || 'image');
  const targetId = String(body.targetId || '');
  const commentBody = cleanBody(body.body);
  if (!ALLOWED_TARGETS.has(targetType) || !targetId) {
    return NextResponse.json({ error: 'targetType and targetId required' }, { status: 400 });
  }
  if (commentBody.length < 2) return NextResponse.json({ error: 'Comment is too short' }, { status: 400 });

  const record: CommentRecord = {
    id: crypto.randomUUID(),
    target_type: targetType,
    target_id: targetId,
    user_id: user.id,
    user_email: user.email || null,
    body: commentBody,
    status: 'visible',
    created_at: new Date().toISOString(),
  };

  const supabase = getServerSupabase();
  const { data, error: insertError } = await supabase.from('comments').insert(record).select('*').single();
  if (!insertError) return NextResponse.json({ ok: true, comment: publicComment(data), storage: 'supabase' });
  if (!isMissingTable(insertError)) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await mkdir(COMMENTS_DIR, { recursive: true });
  await appendFile(COMMENTS_FILE, JSON.stringify(record) + '\n', 'utf8');
  return NextResponse.json({ ok: true, comment: publicComment(record), storage: 'local_jsonl_missing_table' });
}
