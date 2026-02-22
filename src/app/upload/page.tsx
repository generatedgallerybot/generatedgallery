'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface UploadFormData {
  title: string;
  description: string;
  prompt: string;
  negativePrompt: string;
  model: string;
  category: string;
  tags: string;
  isNsfw: boolean;
}

const categories = [
  'product-photography',
  'portraits',
  'landscapes',
  'architecture',
  'abstract',
  'animals',
  'food',
  'fashion',
  'interior-design',
  'vehicles',
  'fantasy',
  'sci-fi',
  'anime',
  'photorealistic',
  'digital-art',
  '3d-render'
];

export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    prompt: '',
    negativePrompt: '',
    model: '',
    category: '',
    tags: '',
    isNsfw: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (event.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select an image to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, you would:
      // 1. Upload the file to Supabase Storage
      // 2. Get the public URL
      // 3. Insert the image record into the database
      
      // For demo purposes, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      setSuccess(true);
      
      // Reset form after a delay
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Upload Successful!</h2>
        <p className="text-slate-400 mb-4">
          Your image has been uploaded and will be available in the gallery shortly.
        </p>
        <p className="text-sm text-slate-500">Redirecting to gallery...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Upload AI-Generated Image</h1>
        <p className="text-slate-400">
          Share your AI-generated artwork with the community
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* File Upload */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Image *
          </label>
          
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-slate-500 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 mb-2">
                  Drop your image here or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  Supports JPG, PNG, GIF up to 10MB
                </p>
              </label>
            </div>
          ) : (
            <div className="relative bg-slate-800 rounded-xl p-4">
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start space-x-4">
                {previewUrl && (
                  <div className="flex-shrink-0">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={200}
                      height={200}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-grow">
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-slate-400 text-sm">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Give your image a title"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe your image"
          />
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Prompt *
          </label>
          <textarea
            name="prompt"
            value={formData.prompt}
            onChange={handleInputChange}
            rows={4}
            required
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter the prompt used to generate this image"
          />
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Negative Prompt
          </label>
          <textarea
            name="negativePrompt"
            value={formData.negativePrompt}
            onChange={handleInputChange}
            rows={2}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter negative prompt if used"
          />
        </div>

        {/* Model and Tags */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Model */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              AI Model
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., DALL-E 3, Midjourney, Stable Diffusion"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Separate tags with commas"
            />
          </div>
        </div>

        {/* NSFW Checkbox */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="nsfw"
            name="isNsfw"
            checked={formData.isNsfw}
            onChange={handleInputChange}
            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="nsfw" className="text-sm text-slate-300">
            This image contains NSFW content
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span>{loading ? 'Uploading...' : 'Upload Image'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}