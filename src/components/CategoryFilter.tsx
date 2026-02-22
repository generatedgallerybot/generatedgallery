'use client';

import { useState, useEffect } from 'react';
import { getCategories } from '@/lib/supabase';
import type { Category } from '@/types';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export function CategoryFilter({ selectedCategory, onCategorySelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to hardcoded categories
      setCategories([
        { id: 1, name: 'Product Photography', slug: 'product-photography', icon: null, count: 0 },
        { id: 2, name: 'Portraits', slug: 'portraits', icon: null, count: 0 },
        { id: 3, name: 'Landscapes', slug: 'landscapes', icon: null, count: 0 },
        { id: 4, name: 'Architecture', slug: 'architecture', icon: null, count: 0 },
        { id: 5, name: 'Abstract', slug: 'abstract', icon: null, count: 0 },
        { id: 6, name: 'Animals', slug: 'animals', icon: null, count: 0 },
        { id: 7, name: 'Food', slug: 'food', icon: null, count: 0 },
        { id: 8, name: 'Fashion', slug: 'fashion', icon: null, count: 0 },
        { id: 9, name: 'Interior Design', slug: 'interior-design', icon: null, count: 0 },
        { id: 10, name: 'Vehicles', slug: 'vehicles', icon: null, count: 0 },
        { id: 11, name: 'Fantasy', slug: 'fantasy', icon: null, count: 0 },
        { id: 12, name: 'Sci-Fi', slug: 'sci-fi', icon: null, count: 0 },
        { id: 13, name: 'Anime', slug: 'anime', icon: null, count: 0 },
        { id: 14, name: 'Photorealistic', slug: 'photorealistic', icon: null, count: 0 },
        { id: 15, name: 'Digital Art', slug: 'digital-art', icon: null, count: 0 },
        { id: 16, name: '3D Render', slug: '3d-render', icon: null, count: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (slug: string) => {
    if (selectedCategory === slug) {
      onCategorySelect(''); // Deselect if already selected
    } else {
      onCategorySelect(slug);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center">
        <div className="animate-pulse flex space-x-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-700 rounded-full w-24"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-300 text-center">
        Browse by Category
      </h3>
      <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
              selectedCategory === category.slug
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
          >
            {category.name}
            {category.count > 0 && (
              <span className="ml-1 text-xs opacity-75">
                ({category.count})
              </span>
            )}
          </button>
        ))}
      </div>
      
      {selectedCategory && (
        <div className="text-center">
          <button
            onClick={() => onCategorySelect('')}
            className="text-blue-400 hover:text-blue-300 text-sm underline"
          >
            Clear category filter
          </button>
        </div>
      )}
    </div>
  );
}