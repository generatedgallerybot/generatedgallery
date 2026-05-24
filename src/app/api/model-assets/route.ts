import { NextRequest, NextResponse } from 'next/server';
import { appendFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getBearerUser } from '@/lib/server-auth';
import { getServerSupabase } from '@/lib/server-db';
import { sanitizePrompt } from '@/lib/generation';

export const dynamic = 'force-dynamic';

const ASSETS_DIR = path.join(process.cwd(), '.cache', 'model-assets');
const ASSETS_FILE = path.join(ASSETS_DIR, 'assets.jsonl');
const TYPES = new Set(['lora', 'checkpoint', 'textual_inversion', 'vae', 'workflow', 'dataset', 'other']);
const BASE_MODELS = new Set(['flux', 'sdxl', 'sd15', 'pony', 'wan', 'hunyuan', 'other']);

type AssetRecord = {
  id: string;
  user_id: string;
  user_email: string | null;
  name: string;
  description: string | null;
  asset_type: string;
  base_model: string;
  file_url: string;
  source_url: string | null;
  license: string | null;
  trigger_words: string[];
  tags: string[];
  preview_url: string | null;
  is_nsfw: boolean;
  status: 'published' | 'hidden' | 'deleted' | 'flagged';
  created_at: string;
};

function isMissingTable(error: any) {
  const msg = String(error?.message || error || '');
  return msg.includes('model_assets') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

async function readAssets(): Promise<AssetRecord[]> {
  try {
    const raw = await readFile(ASSETS_FILE, 'utf8');
    return raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function csv(value: unknown, max = 24) {
  if (Array.isArray(value)) return value.map(v => sanitizePrompt(String(v))).filter(Boolean).slice(0, max);
  return String(value || '').split(',').map(v => sanitizePrompt(v)).filter(Boolean).slice(0, max);
}

function cleanUrl(value: unknown) {
  const url = String(value || '').trim().slice(0, 1600);
  if (!url) return '';
  if (/^(https?:\/\/|ipfs:\/\/|ar:\/\/)/i.test(url)) return url;
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?$/.test(url)) return url;
  return '';
}

function matchesSearch(asset: AssetRecord, q: string) {
  if (!q) return true;
  return [asset.name, asset.description, asset.base_model, asset.asset_type, ...asset.tags, ...asset.trigger_words]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function sortRecent<T extends { created_at: string }>(items: T[]) {
  return items.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
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

async function readFromSupabase(searchParams: URLSearchParams) {
  const includeNsfw = searchParams.get('nsfw') === 'true';
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const type = searchParams.get('type') || '';
  const baseModel = searchParams.get('baseModel') || '';
  const sort = searchParams.get('sort') || 'recent';
  const id = searchParams.get('id') || '';
  const supabase = getServerSupabase();

  if (id) {
    const { data, error } = await supabase.from('model_assets').select('*').eq('id', id).eq('status', 'published').single();
    if (error) return { error };
    if (data?.is_nsfw && !includeNsfw) return { hidden: true };
    return { asset: data };
  }

  const orderField = sort === 'popular' ? 'likes' : sort === 'used' ? 'uses' : sort === 'downloaded' ? 'downloads' : 'created_at';
  let query = supabase.from('model_assets').select('*').eq('status', 'published').order(orderField, { ascending: false }).order('created_at', { ascending: false }).limit(120);
  if (!includeNsfw) query = query.eq('is_nsfw', false);
  if (type) query = query.eq('asset_type', type);
  if (baseModel) query = query.eq('base_model', baseModel);
  const { data, error } = await query;
  if (error) return { error };
  return { assets: (data || []).filter(asset => matchesSearch(asset, q)) };
}

async function readFromLocal(searchParams: URLSearchParams) {
  const includeNsfw = searchParams.get('nsfw') === 'true';
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const type = searchParams.get('type') || '';
  const baseModel = searchParams.get('baseModel') || '';
  const sort = searchParams.get('sort') || 'recent';
  const id = searchParams.get('id') || '';
  const allAssets = await readAssets();
  if (id) {
    const asset = allAssets.find(row => row.id === id && row.status === 'published');
    if (!asset) return { notFound: true };
    if (asset.is_nsfw && !includeNsfw) return { hidden: true };
    return { asset };
  }
  const scoreField = sort === 'popular' ? 'likes' : sort === 'used' ? 'uses' : sort === 'downloaded' ? 'downloads' : 'created_at';
  const assets = allAssets
    .filter(asset => asset.status === 'published')
    .filter(asset => includeNsfw || !asset.is_nsfw)
    .filter(asset => !type || asset.asset_type === type)
    .filter(asset => !baseModel || asset.base_model === baseModel)
    .filter(asset => matchesSearch(asset, q))
    .sort((a, b) => scoreField === 'created_at' ? Date.parse(b.created_at) - Date.parse(a.created_at) : Number((b as any)[scoreField] || 0) - Number((a as any)[scoreField] || 0) || Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 120);
  return { assets };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromDb = await readFromSupabase(searchParams);
  if (!fromDb.error) {
    if (fromDb.hidden) return NextResponse.json({ error: 'NSFW asset hidden' }, { status: 403 });
    if (fromDb.asset) return NextResponse.json({ ok: true, asset: fromDb.asset, storage: 'supabase' });
    return NextResponse.json({ ok: true, assets: fromDb.assets || [], storage: 'supabase' });
  }
  if (!isMissingTable(fromDb.error)) return NextResponse.json({ error: fromDb.error.message }, { status: 500 });

  const local = await readFromLocal(searchParams);
  if (local.notFound) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  if (local.hidden) return NextResponse.json({ error: 'NSFW asset hidden' }, { status: 403 });
  if (local.asset) return NextResponse.json({ ok: true, asset: local.asset, storage: 'local_jsonl_missing_table' });
  return NextResponse.json({ ok: true, assets: local.assets || [], storage: 'local_jsonl_missing_table' });
}

export async function POST(request: NextRequest) {
  const { user, error } = await getBearerUser(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  if (await isBanned(user.id)) return NextResponse.json({ error: 'User is banned' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = sanitizePrompt(String(body.name || '')).slice(0, 160);
  const fileUrl = cleanUrl(body.fileUrl || body.file_url || body.downloadUrl);
  const assetType = TYPES.has(String(body.assetType || body.asset_type)) ? String(body.assetType || body.asset_type) : 'other';
  const baseModel = BASE_MODELS.has(String(body.baseModel || body.base_model)) ? String(body.baseModel || body.base_model) : 'other';
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!fileUrl) return NextResponse.json({ error: 'A valid file URL, IPFS URL, Arweave URL, or Replicate owner/model slug is required' }, { status: 400 });

  const record: AssetRecord = {
    id: crypto.randomUUID(),
    user_id: user.id,
    user_email: user.email || null,
    name,
    description: sanitizePrompt(String(body.description || '')).slice(0, 1200) || null,
    asset_type: assetType,
    base_model: baseModel,
    file_url: fileUrl,
    source_url: cleanUrl(body.sourceUrl || body.source_url) || null,
    license: sanitizePrompt(String(body.license || '')).slice(0, 120) || null,
    trigger_words: csv(body.triggerWords || body.trigger_words),
    tags: csv(body.tags, 32),
    preview_url: cleanUrl(body.previewUrl || body.preview_url) || null,
    is_nsfw: Boolean(body.isNsfw || body.is_nsfw),
    status: 'published',
    created_at: new Date().toISOString(),
  };

  const supabase = getServerSupabase();
  const { data, error: insertError } = await supabase.from('model_assets').insert(record).select('*').single();
  if (!insertError) return NextResponse.json({ ok: true, asset: data, storage: 'supabase' });
  if (!isMissingTable(insertError)) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await mkdir(ASSETS_DIR, { recursive: true });
  await appendFile(ASSETS_FILE, JSON.stringify(record) + '\n', 'utf8');
  return NextResponse.json({ ok: true, asset: record, storage: 'local_jsonl_missing_table' });
}
