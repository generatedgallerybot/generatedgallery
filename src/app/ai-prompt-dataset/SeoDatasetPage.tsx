import Link from 'next/link';

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  slug: string;
  focus: string;
};

export function DatasetSeoPage({ eyebrow, title, description, bullets, slug, focus }: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: title,
    description,
    url: `https://generatedgallery.com/${slug}`,
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/jsonl+gzip', contentUrl: 'https://generatedgallery.com/index/generated-gallery.jsonl.gz' },
      { '@type': 'DataDownload', encodingFormat: 'application/jsonl+gzip', contentUrl: 'https://generatedgallery.com/index/generated-gallery.prompts.jsonl.gz' },
    ],
    creator: { '@type': 'Organization', name: 'Generated Gallery' },
    license: 'Metadata index with provenance and source URLs. Check source rights before training or redistribution.',
  };

  return <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <section className="max-w-4xl">
      <Link href="/ai-image-dataset" className="text-[13px] text-white/35 hover:text-white/65 transition-colors">← Dataset hub</Link>
      <p className="mt-8 text-xs uppercase tracking-[0.24em] text-accent/55">{eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl sm:text-6xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-5 text-lg text-white/55 leading-8 max-w-3xl">{description}</p>
      <div className="mt-7 flex flex-wrap gap-2 text-xs">
        <a href="/index/manifest.json" className="rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-1 text-accent/80">manifest.json</a>
        <a href="/index/generated-gallery.jsonl.gz" className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-white/55">full JSONL.GZ</a>
        <a href="/index/generated-gallery.prompts.jsonl.gz" className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-white/55">prompt-only JSONL.GZ</a>
        <a href="https://github.com/generatedgallerybot/generatedgallery" className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-white/55">GitHub</a>
      </div>
    </section>

    <section className="mt-12 grid gap-5 md:grid-cols-3">
      {bullets.map((item) => <div key={item} className="rounded-3xl border border-white/[0.06] bg-white/[0.035] p-5">
        <p className="text-sm leading-7 text-white/55">{item}</p>
      </div>)}
    </section>

    <section className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-6">
        <h2 className="font-display text-2xl text-white">Load it in one command</h2>
        <pre className="mt-4 overflow-auto rounded-2xl bg-black/40 p-4 text-xs leading-6 text-white/55"><code>{`curl -L https://generatedgallery.com/index/generated-gallery.jsonl.gz -o generated-gallery.jsonl.gz\npython examples/label_counts.py public/index/generated-gallery.jsonl.gz`}</code></pre>
        <p className="mt-4 text-sm leading-7 text-white/45">The export is designed for lightweight analysis, search, prompt evaluation, weak-label audits, and downstream agent tasks. It is a metadata and prompt index, not an image ownership claim.</p>
      </div>
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <h2 className="font-display text-2xl text-white">What is inside</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-white/45">
          <li>Prompt text and negative prompts where available</li>
          <li>Model family, source, category, tags, and safety flags</li>
          <li>Weak labels for subjects, styles, composition, medium, and use cases</li>
          <li>Provenance fields and source URLs for rights review</li>
          <li>Prompt-only split for lower-risk analysis workflows</li>
        </ul>
      </div>
    </section>

    <section className="mt-12 rounded-3xl border border-accent/15 bg-accent/[0.055] p-7">
      <h2 className="font-display text-2xl text-white">Built for {focus}</h2>
      <p className="mt-3 text-sm leading-7 text-white/55">Generated Gallery keeps the dataset public, versioned, and easy to inspect. If you build a loader, audit labels, or add a source adapter, open a GitHub issue or PR. The goblin machinery is accepting useful contributions.</p>
    </section>
  </main>;
}
