'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Download, Eye, ExternalLink } from 'lucide-react';
import type { Image as ImageType } from '@/types';

interface ImageGridProps {
  images: ImageType[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (imageId: string) => {
    setLoadedImages(prev => new Set(prev).add(imageId));
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="masonry">
      {images.map((image) => (
        <div
          key={image.id}
          className="masonry-item group relative bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <Link href={`/image/${image.id}`}>
            <div className="relative">
              {/* Image */}
              <div className="relative overflow-hidden">
                <Image
                  src={image.thumbnail_url || image.image_url}
                  alt={image.title || image.prompt || 'AI Generated Image'}
                  width={image.width || 400}
                  height={image.height || 600}
                  className={`w-full h-auto object-cover transition-all duration-300 group-hover:scale-105 ${
                    loadedImages.has(image.id) ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => handleImageLoad(image.id)}
                  unoptimized
                />
                
                {/* Loading placeholder */}
                {!loadedImages.has(image.id) && (
                  <div className="absolute inset-0 bg-slate-700 animate-pulse flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                    <ExternalLink className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Title */}
            {image.title && (
              <h3 className="font-semibold text-white text-sm line-clamp-2">
                {image.title}
              </h3>
            )}

            {/* Prompt */}
            {image.prompt && (
              <p className="text-slate-300 text-xs line-clamp-3 leading-relaxed">
                {image.prompt}
              </p>
            )}

            {/* Model */}
            {image.model && (
              <div className="flex items-center">
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                  {image.model}
                </span>
              </div>
            )}

            {/* Tags */}
            {image.tags && image.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {image.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {image.tags.length > 3 && (
                  <span className="text-xs text-slate-500">
                    +{image.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <div className="flex items-center space-x-4 text-slate-400">
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">{formatNumber(image.upvotes)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Download className="w-4 h-4" />
                  <span className="text-xs">{formatNumber(image.downloads)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs">{formatNumber(image.views)}</span>
                </div>
              </div>
              
              {/* Source */}
              {image.source_site && (
                <div className="text-xs text-slate-500">
                  {image.source_site}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}