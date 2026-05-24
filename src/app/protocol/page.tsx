import Link from 'next/link';
import { promises as fs } from 'fs';
import path from 'path';
import { ProtocolExplorer } from '@/components/ProtocolExplorer';

type Manifest = {
  recordCount?: number;
  byteSize?: number;
  compressedByteSize?: number;
  protocolVersion?: string;
  labelerVersion?: string;
  sha256?: string;
  updatedAt?: string;
  sourceCounts?: Record<string, number>;
  categoryCounts?: Record<string, number>;
};

async function getLocalManifest(): Promise<Manifest | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public/index/manifest.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function number(value?: number) {
  if (typeof value !== 'number') return 'unknown';
  return new Intl.NumberFormat('en-US').format(value);
}

function mb(value?: number) {
  if (typeof value !== 'number') return 'unknown';
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export const metadata = {
  title: 'Open AI Media Protocol and Dataset',
  description: 'Generated Gallery open protocol, public AI media dataset, JSONL feed, and source adapter platform.',
  alternates: { canonical: 'https://generatedgallery.com/protocol' },
};

export default async function ProtocolPage() {
  const manifest = await getLocalManifest();
  const sources = Object.entries(manifest?.sourceCounts || {}).slice(0, 4);

  return (
    <main className="pt-16 min-h-screen">
      <section className="px-4 sm:px-6 lg:px-10 pt-16 pb-10 max-w-[1200px] mx-auto relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[420px] bg-accent/[0.05] rounded-full blur-[130px] pointer-events-none" />
        <div className="relative max-w-4xl">
          <p className="text-[12px] uppercase tracking-[0.28em] text-accent/60 mb-5">Open protocol {manifest?.protocolVersion || 'v0.2'}</p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.04]">
            A portable index for generated media.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/55 max-w-2xl leading-relaxed">
            Generated Gallery provides an open protocol, source adapter toolkit, public JSONL dataset, and viewer for AI generated art. Crawl a source, publish a feed, inspect it here, and let any compatible viewer render it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/protocol/creator-kit" className="rounded-full bg-accent text-[#17130d] px-5 py-3 text-sm font-semibold hover:bg-accent/90 transition-colors">
              Use the creator kit
            </Link>
            <a href="/index/generated-gallery.jsonl.gz" className="rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 px-5 py-3 text-sm hover:text-white hover:bg-white/[0.1] transition-colors">
              Download JSONL.GZ dataset
            </a>
            <a href="/index/manifest.json" className="rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 px-5 py-3 text-sm hover:text-white hover:bg-white/[0.1] transition-colors">
              View manifest
            </a>
            <Link href="/" className="rounded-full bg-white/[0.03] border border-white/[0.06] text-white/45 px-5 py-3 text-sm hover:text-white/80 transition-colors">
              Browse viewer
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-10 pb-12 max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/30">Public SFW records</p>
            <p className="mt-3 font-display text-3xl text-white">{number(manifest?.recordCount)}</p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/30">GZIP size</p>
            <p className="mt-3 font-display text-3xl text-white">{mb(manifest?.compressedByteSize || manifest?.byteSize)}</p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/30">Sources</p>
            <p className="mt-3 font-display text-3xl text-white">{sources.length || 'unknown'}</p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/30">Updated</p>
            <p className="mt-3 text-sm text-white/65">{manifest?.updatedAt ? new Date(manifest.updatedAt).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC' : 'unknown'}</p>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-10 pb-14 max-w-[1200px] mx-auto">
        <div className="rounded-3xl border border-accent/15 bg-accent/[0.055] p-6 mb-5">
          <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-5 items-center">
            <div>
              <p className="text-[12px] uppercase tracking-[0.22em] text-accent/65">New public ritual</p>
              <h2 className="mt-2 font-display text-3xl text-white">Machine Dream Finds</h2>
            </div>
            <div className="text-sm leading-7 text-white/55">
              Turn generated images into reusable packs: one theme, 5 to 12 images, prompt fragments, source links, safety labels, and a portable manifest. Built for creators, model makers, curators, and agents.
              <div className="mt-4"><Link href="/protocol/creator-kit" className="text-accent/80 hover:text-accent">Open the creator kit →</Link></div>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <div className="rounded-3xl border border-white/[0.08] bg-surface-1/70 p-6 space-y-5">
            <h2 className="font-display text-2xl text-white">What makes it a platform?</h2>
            <div className="space-y-4 text-sm text-white/55 leading-relaxed">
              <p><span className="text-white/85">Protocol:</span> JSON Schema records for media URLs, prompts, weak labels, model metadata, tags, safety, rights, and provenance.</p>
              <p><span className="text-white/85">Feeds:</span> static JSONL/GZIP snapshots with manifests, checksums, samples, prompt-only splits, and label counts.</p>
              <p><span className="text-white/85">Adapters:</span> source-specific crawlers normalize upstream art into one portable shape.</p>
              <p><span className="text-white/85">Viewer:</span> this app renders compatible registries and feeds in a fast visual browser.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-surface-1/70 p-6">
            <h2 className="font-display text-2xl text-white mb-5">Ship a compatible feed</h2>
            <pre className="overflow-x-auto rounded-2xl bg-black/35 border border-white/[0.06] p-4 text-[12px] leading-relaxed text-white/60"><code>{`npm run export:index -- --out public/index/generated-gallery.jsonl --limit 10000 --safety sfw
npm run validate:index public/index/generated-gallery.jsonl
npm run import:jsonl -- --file community-feed.jsonl --preview`}</code></pre>
            <p className="mt-4 text-sm text-white/45">Good feeds preserve upstream URLs, clearly label safety metadata, and keep prompt/model details intact.</p>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-10 pb-20 max-w-[1200px] mx-auto">
        <ProtocolExplorer />
      </section>
    </main>
  );
}
