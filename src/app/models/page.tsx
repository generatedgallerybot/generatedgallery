import UploadClient from '../upload/UploadClient';

export const metadata = {
  title: 'AI Model Assets, LoRAs, Workflows and Checkpoints | Generated Gallery',
  description: 'Browse and share LoRAs, checkpoints, workflows, datasets, trigger words, preview images, and generation-ready AI model assets.',
  alternates: { canonical: 'https://generatedgallery.com/models' },
};

export default function ModelsPage() {
  return <UploadClient />;
}
