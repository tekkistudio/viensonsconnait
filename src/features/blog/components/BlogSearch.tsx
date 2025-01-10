// features/blog/components/BlogSearch.tsx
"use client"

import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlogSearchProps {
  onSearch: (query: string) => void;
}

export default function BlogSearch({ onSearch }: BlogSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    onSearch(searchQuery);
  }, [onSearch]);

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div 
        className={`relative flex items-center transition-shadow rounded-lg bg-white
          ${isFocused ? 'shadow-lg ring-2 ring-brand-pink' : 'shadow'}`}
      >
        <Search className="absolute left-4 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Rechercher un article..."
          className="w-full pl-12 pr-10 py-4 rounded-lg focus:outline-none"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={clearSearch}
              className="absolute right-4 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}