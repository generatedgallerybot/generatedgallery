import { DatasetSeoPage } from './SeoDatasetPage';

export const metadata = {
  title: 'AI Prompt Dataset | Generated Gallery',
  description: 'Download a prompt-focused AI image metadata dataset with JSONL exports, weak labels, and source provenance.',
};

export default function AiPromptDatasetPage() {
  return <DatasetSeoPage
    slug="ai-prompt-dataset"
    eyebrow="Prompt export"
    title="AI prompt dataset"
    description="A prompt-focused export from Generated Gallery for studying AI image prompts, style phrases, model-family patterns, and prompt engineering trends without redistributing source images."
    focus="prompt researchers, agents, and eval builders"
    bullets={[
      'Prompt-only JSONL keeps the useful language patterns while reducing image-rights risk.',
      'Weak labels summarize subjects, styles, aesthetics, medium, composition, and use cases for fast filtering.',
      'Examples and schema live in the public GitHub repo so loaders can be reviewed and improved.'
    ]}
  />;
}
