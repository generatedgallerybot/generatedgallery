'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Heart, Download, Eye, ExternalLink, Copy, Check, Share2 } from 'lucide-react';
import { getImage, upvoteImage, incrementDownloads, incrementViews } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Image as ImageType } from '@/types';

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [image, setImage] = useState<ImageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadImage(params.id as string);
    }
  }, [params.id]);

  const loadImage = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getImage(id);
      setImage(data);
      
      // Increment view count
      await incrementViews(id);
      
      // Check if user has already upvoted (from localStorage)
      const upvotedImages = JSON.parse(localStorage.getItem('upvoted_images') || '[]');
      setHasUpvoted(upvotedImages.includes(id));
    } catch (err) {
      console.error('Failed to load image:', err);
      setError('Image not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!image || hasUpvoted) return;
    
    try {
      const voterIp = '127.0.0.1'; // In a real app, get this from server
      const success = await upvoteImage(image.id, voterIp);
      
      if (success) {
        setImage(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : null);
        setHasUpvoted(true);
        
        // Store in localStorage
        const upvotedImages = JSON.parse(localStorage.getItem('upvoted_images') || '[]');
        upvotedImages.push(image.id);
        localStorage.setItem('upvoted_images', JSON.stringify(upvotedImages));
      }
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const handleDownload = async () => {
    if (!image) return;
    
    try {
      // Increment download count
      await incrementDownloads(image.id);
      setImage(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : null);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = image.image_url;
      link.download = `generated-image-${image.id}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const copyPrompt = () => {
    if (!image?.prompt) return;
    
    navigator.clipboard.writeText(image.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const shareImage = () => {
    if (navigator.share) {
      navigator.share({
        title: image?.title || 'AI Generated Image',
        text: image?.description || image?.prompt || 'Check out this AI-generated image!',
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !image) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Gallery</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Gallery</span>
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="space-y-4">
          <div className="relative bg-slate-800 rounded-xl overflow-hidden">
            <Image
              src={image.image_url}
              alt={image.title || image.prompt || 'AI Generated Image'}
              width={image.width || 800}
              height={image.height || 800}
              className={`w-full h-auto transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              unoptimized
            />
            
            {!imageLoaded && (
              <div className="absolute inset-0 bg-slate-700 animate-pulse flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleUpvote}
              disabled={hasUpvoted}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                hasUpvoted
                  ? 'bg-red-600 text-white cursor-not-allowed'
                  : 'bg-slate-700 text-slate-300 hover:bg-red-600 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasUpvoted ? 'fill-current' : ''}`} />
              <span>{image.upvotes}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            <button
              onClick={shareImage}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            {image.source_url && (
              <a
                href={image.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Source</span>
              </a>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title */}
          {image.title && (
            <h1 className="text-3xl font-bold text-white">{image.title}</h1>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-6 text-slate-400">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <span>{image.upvotes} upvotes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>{image.downloads} downloads</span>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>{image.views} views</span>
            </div>
          </div>

          {/* Description */}
          {image.description && (
            <div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Description</h3>
              <p className="text-slate-400">{image.description}</p>
            </div>
          )}

          {/* Prompt */}
          {image.prompt && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-slate-300">Prompt</h3>
                <button
                  onClick={copyPrompt}
                  className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-slate-400 bg-slate-800 p-3 rounded-lg">{image.prompt}</p>
            </div>
          )}

          {/* Negative Prompt */}
          {image.negative_prompt && (
            <div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Negative Prompt</h3>
              <p className="text-slate-400 bg-slate-800 p-3 rounded-lg">{image.negative_prompt}</p>
            </div>
          )}

          {/* Technical Details */}
          <div className="grid grid-cols-2 gap-4">
            {image.model && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-1">Model</h4>
                <p className="text-white">{image.model}</p>
              </div>
            )}
            {image.width && image.height && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-1">Dimensions</h4>
                <p className="text-white">{image.width} × {image.height}</p>
              </div>
            )}
            {image.source_site && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-1">Source Site</h4>
                <p className="text-white">{image.source_site}</p>
              </div>
            )}
            {image.category && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-1">Category</h4>
                <p className="text-white">{image.category}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {image.tags && image.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-300 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {image.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Upload info */}
          <div className="pt-4 border-t border-slate-700 text-sm text-slate-500">
            {image.uploaded_by && (
              <p>Uploaded by: {image.uploaded_by}</p>
            )}
            <p>Added: {new Date(image.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}