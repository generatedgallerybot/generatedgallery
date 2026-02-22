'use client';

import { useState, useEffect, useRef } from 'react';
import { getCategories } from '@/lib/supabase';
import type { Category } from '@/types';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'Portraits', slug: 'portraits', icon: null, count: 0 },
  { id: 2, name: 'Landscapes', slug: 'landscapes', icon: null, count: 0 },
  { id: 3, name: 'Fantasy', slug: 'fantasy', icon: null, count: 0 },
  { id: 4, name: 'Sci-Fi', slug: 'sci-fi', icon: null, count: 0 },
  { id: 5, name: 'Anime', slug: 'anime', icon: null, count: 0 },
  { id: 6, name: 'Abstract', slug: 'abstract', icon: null, count: 0 },
  { id: 7, name: 'Photorealistic', slug: 'photorealistic', icon: null, count: 0 },
  { id: 8, name: 'Architecture', slug: 'architecture', icon: null, count: 0 },
  { id: 9, name: 'Animals', slug: 'animals', icon: null, count: 0 },
  { id: 10, name: 'Digital Art', slug: 'digital-art', icon: null, count: 0 },
  { id: 11, name: '3D Render', slug: '3d-render', icon: null, count: 0 },
  { id: 12, name: 'Food', slug: 'food', icon: null, count: 0 },
  { id: 13, name: 'Fashion', slug: 'fashion', icon: null, count: 0 },
  { id: 14, name: 'Interior Design', slug: 'interior-design', icon: null, count: 0 },
  { id: 15, name: 'Vehicles', slug: 'vehicles', icon: null, count: 0 },
  { id: 16, name: 'Product Photography', slug: 'product-photography', icon: null, count: 0 },
];

export function CategoryFilter({ selectedCategory, onCategorySelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data.length > 0 ? data : FALLBACK_CATEGORIES);
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-white/[0.03] rounded-full w-20 shrink-0 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="category-scroll flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 lg:-mx-10 lg:px-10"
    >
      <button
        onClick={() => onCategorySelect('')}
        className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
          !selectedCategory
            ? 'bg-white text-surface-0'
            : 'bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.07]'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategorySelect(selectedCategory === cat.slug ? '' : cat.slug)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
            selectedCategory === cat.slug
              ? 'bg-white text-surface-0'
              : 'bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.07]'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
