'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ImageGrid } from '@/components/ImageGrid';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getImages, getTrendingImages, searchImages, getImagesByCategory } from '@/lib/supabase';
import type { Image } from '@/types';

export default function HomePage() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentView, setCurrentView] = useState<'recent' | 'trending'>('recent');
  const [showNsfw, setShowNsfw] = useState(false);

  useEffect(() => {
    loadImages();
  }, [searchQuery, selectedCategory, currentView, showNsfw]);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: Image[];
      
      if (searchQuery) {
        data = await searchImages(searchQuery, 20, 0, showNsfw);
      } else if (selectedCategory) {
        data = await getImagesByCategory(selectedCategory, 20, 0, showNsfw);
      } else if (currentView === 'trending') {
        data = await getTrendingImages(20, showNsfw);
      } else {
        data = await getImages(20, 0, showNsfw);
      }
      
      setImages(data);
    } catch (err) {
      console.error('Failed to load images:', err);
      setError('Failed to load images. Please try again.');
      // For demo purposes, show placeholder data
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory('');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  const handleViewChange = (view: 'recent' | 'trending') => {
    setCurrentView(view);
    setSearchQuery('');
    setSelectedCategory('');
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          GeneratedGallery
        </h1>
        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
          Discover amazing AI-generated art from across the internet. 
          Search, upvote, and download thousands of creative images.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-6">
        <SearchBar onSearch={handleSearch} />
        
        {/* View Toggle + NSFW */}
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => handleViewChange('recent')}
            className={`px-6 py-2 rounded-full transition-all ${
              currentView === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => handleViewChange('trending')}
            className={`px-6 py-2 rounded-full transition-all ${
              currentView === 'trending'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Trending
          </button>
          <div className="border-l border-slate-600 pl-4 flex items-center space-x-2">
            <button
              onClick={() => setShowNsfw(!showNsfw)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showNsfw ? 'bg-red-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showNsfw ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-slate-400">NSFW</span>
          </div>
        </div>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />
      </div>

      {/* Current View Indicator */}
      {(searchQuery || selectedCategory || currentView === 'trending') && (
        <div className="text-center text-slate-400">
          {searchQuery && `Search results for "${searchQuery}"`}
          {selectedCategory && `Images in ${selectedCategory}`}
          {!searchQuery && !selectedCategory && currentView === 'trending' && 'Trending images'}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadImages}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg mb-4">
            {searchQuery || selectedCategory
              ? 'No images found for your search.'
              : 'No images available yet.'}
          </p>
          <p className="text-slate-500">
            Images will appear here once the database is populated with AI-generated art.
          </p>
        </div>
      ) : (
        <ImageGrid images={images} />
      )}
    </div>
  );
}