import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Image Dataset: Public JSONL Feed, Prompts and Provenance',
  description: 'Use Generated Gallery as a public AI image metadata dataset with prompts, model metadata, source links, safety labels, JSONL exports, schema, and sample records.',
  alternates: { canonical: 'https://generatedgallery.com/ai-image-dataset' },
  openGraph: {
    title: 'AI Image Dataset | Generated Gallery',
    description: 'A public metadata dataset for AI-generated images, prompts, source provenance, safety labels, and portable gallery packs.',
    url: 'https://generatedgallery.com/ai-image-dataset',
    type: 'website',
  },
};

const links = [
  ['Manifest', '/index/manifest.json'],
  ['Sample records', '/index/generated-gallery.sample.json'],
  ['Full JSONL feed', '/index/generated-gallery.jsonl'],
  ['JSON Schema', '/schemas/generated-gallery-record.schema.json'],
  ['GitHub repo', 'https://github.com/generatedgallerybot/generated-media-protocol'],
];

export default function AiImageDatasetPage() {
  return (
    <main className="pt-16 min-h-screen">
      <section className="px-4 sm:px-6 lg:px-10 pt-16 pb-10 max-w-[1120px] mx-auto">
        <p className="text-[12px] uppercase tracking-[0.28em] text-accent/60 mb-5">Open AI image metadata</p>
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.05]">
          A public AI image dataset for prompts, provenance, and gallery packs.
        </h1>
        <p className="mt-6 text-lg text-white/55 max-w-3xl leading-relaxed">
          Generated Gallery publishes a metadata-first AI image dataset: source links, prompt text where available, model names, tags, categories, safety labels, and a JSONL feed designed for search, research, agents, and small gallery experiments.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/index/manifest.json" className="rounded-full bg-accent text-[#17130d] px-5 py-3 text-sm font-semibold hover:bg-accent/90 transition-colors">Open manifest</Link>
          <Link href="/protocol" className="rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 px-5 py-3 text-sm hover:text-white hover:bg-white/[0.1] transition-colors">Read protocol</Link>
          <a href="https://github.com/generatedgallerybot/generated-media-protocol" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 px-5 py-3 text-sm hover:text-white hover:bg-white/[0.1] transition-colors">GitHub schema</a>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-10 pb-8 max-w-[1120px] mx-auto grid md:grid-cols-3 gap-4">
        {[
          ['Metadata, not rights laundering', 'The dataset points back to source pages and upstream media. It is for discovery, prompt study, indexing, and provenance, not a claim that every image is free to reuse.'],
          ['JSONL-friendly', 'Records are one object per line so consumers can stream, filter, validate, mirror, or feed the index into search pipelines without loading a giant blob.'],
          ['Agent-readable packs', 'Machine Dream Finds are small themed collections with prompts, source links, safety labels, and manifests that other tools can inspect.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
            <h2 className="font-display text-xl text-white mb-3">{title}</h2>
            <p className="text-sm text-white/55 leading-6">{body}</p>
          </div>
        ))}
      </section>

      <section className="px-4 sm:px-6 lg:px-10 pb-16 max-w-[1120px] mx-auto">
        <div className="rounded-[2rem] border border-white/[0.08] bg-[#0f0e0c] overflow-hidden">
          <div className="p-6 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-white">Dataset endpoints</h2>
              <p className="text-sm text-white/45 mt-2">Start with the manifest, then inspect samples before pulling the full feed.</p>
            </div>
            <Link href="/machine-dream-finds" className="text-sm text-accent hover:text-accent/80">Browse example packs →</Link>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {links.map(([label, href]) => (
              <a key={href} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.035] transition-colors">
                <span className="text-sm text-white/70">{label}</span>
                <span className="text-xs text-white/35 truncate">{href}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
