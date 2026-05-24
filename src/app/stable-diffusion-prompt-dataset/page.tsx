import { DatasetSeoPage } from '../ai-prompt-dataset/SeoDatasetPage';

export const metadata = {
  title: 'Stable Diffusion Prompt Dataset | Generated Gallery',
  description: 'Explore AI image prompts with model-family metadata, weak labels, source provenance, and JSONL downloads.',
};

export default function StableDiffusionPromptDatasetPage() {
  return <DatasetSeoPage
    slug="stable-diffusion-prompt-dataset"
    eyebrow="Stable Diffusion prompts"
    title="Stable Diffusion prompt dataset"
    description="A Civitai-adjacent prompt and metadata index for studying how Stable Diffusion, SDXL, Flux, Pony, and related image models are prompted in the wild."
    focus="Stable Diffusion users, LoRA creators, and prompt miners"
    bullets={[
      'Filter by model family, style labels, subjects, source, safety, and prompt ingredients.',
      'Use prompt patterns to create better LoRA examples, gallery tags, and generation workflows.',
      'The dataset is metadata-first with provenance fields, so serious users can inspect where records came from.'
    ]}
  />;
}
