'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Upload, Image as ImageIcon, Search } from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <ImageIcon className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              GeneratedGallery
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-slate-300 hover:text-white transition-colors flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Browse</span>
            </Link>
            <Link
              href="/categories"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Categories
            </Link>
            <Link
              href="/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-slate-300 hover:text-white transition-colors flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Search className="w-4 h-4" />
                <span>Browse</span>
              </Link>
              <Link
                href="/categories"
                className="text-slate-300 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
              <Link
                href="/upload"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 w-fit"
                onClick={() => setIsMenuOpen(false)}
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}