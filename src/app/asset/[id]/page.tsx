import AssetDetailClient from './AssetDetailClient';

export const metadata = {
  title: 'Model Asset | Generated Gallery',
  description: 'LoRA, checkpoint, workflow, and dataset asset details on Generated Gallery.',
};

export default function AssetPage({ params }: { params: { id: string } }) {
  return <AssetDetailClient id={params.id} />;
}
