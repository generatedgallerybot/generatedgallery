import { DatasetSeoPage } from '../ai-prompt-dataset/SeoDatasetPage';

export const metadata = {
  title: 'JSONL AI Image Dataset | Generated Gallery',
  description: 'Download a metadata-only AI image dataset as JSONL.GZ with prompts, weak labels, provenance, and schema files.',
};

export default function JsonlAiImageDatasetPage() {
  return <DatasetSeoPage
    slug="jsonl-ai-image-dataset"
    eyebrow="JSONL export"
    title="JSONL AI image dataset"
    description="A free metadata-only AI image dataset packaged for scripts, agents, DuckDB, Python, and search experiments. Download compressed JSONL with prompt text, weak labels, source metadata, and schema links."
    focus="builders who want data they can actually parse"
    bullets={[
      'Compressed JSONL.GZ exports keep the dataset simple to mirror, diff, and process in batch jobs.',
      'Every record keeps provenance fields so builders can review source context instead of blindly treating the web as soup.',
      'Includes a prompt-only split for lower-risk analysis, prompt clustering, model evals, and search tooling.'
    ]}
  />;
}
