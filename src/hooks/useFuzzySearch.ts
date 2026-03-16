import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';

export interface FuzzySearchConfig {
  threshold?: number;
  ignoreLocation?: boolean;
  minMatchCharLength?: number;
}

/**
 * Reusable fuzzy search hook using Fuse.js
 * Results are automatically sorted by relevance (best matches first)
 *
 * @param data - Array of items to search
 * @param searchKeys - Keys to search within each item
 * @param config - Optional Fuse.js configuration
 *
 * @example
 * const { searchTerm, setSearchTerm, results } = useFuzzySearch(
 *   riders,
 *   ['name', 'phone', 'rider_id']
 * );
 */
export function useFuzzySearch<T>(
  data: T[],
  searchKeys: string[],
  config: FuzzySearchConfig = {}
): {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: T[];
  isSearching: boolean;
  clearSearch: () => void;
} {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    threshold = 0.3,
    ignoreLocation = true,
    minMatchCharLength = 1,
  } = config;

  // Create Fuse instance with memoization
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: searchKeys,
      threshold,
      ignoreLocation,
      minMatchCharLength,
      includeScore: true,
      shouldSort: true, // Auto-sort by relevance
    });
  }, [data, searchKeys, threshold, ignoreLocation, minMatchCharLength]);

  // Perform search - results auto-sorted by Fuse.js relevance score
  const results = useMemo(() => {
    if (!searchTerm.trim()) {
      return data;
    }

    const searchResults = fuse.search(searchTerm);
    return searchResults.map(result => result.item);
  }, [fuse, searchTerm, data]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching: searchTerm.trim().length > 0,
    clearSearch: () => setSearchTerm(''),
  };
}

/**
 * Combined fuzzy search with filter hook
 * Applies filter first, then fuzzy search on filtered results
 *
 * @param data - Array of items
 * @param searchKeys - Keys to search
 * @param filterFn - Optional filter function (e.g., status filter)
 * @param config - Optional Fuse.js configuration
 */
export function useFuzzySearchWithFilter<T>(
  data: T[],
  searchKeys: string[],
  filterFn?: (item: T) => boolean,
  config: FuzzySearchConfig = {}
): {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: T[];
  isSearching: boolean;
  clearSearch: () => void;
  filteredCount: number;
} {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    threshold = 0.3,
    ignoreLocation = true,
    minMatchCharLength = 1,
  } = config;

  // Apply filter first
  const filteredData = useMemo(() => {
    if (!filterFn) return data;
    return data.filter(filterFn);
  }, [data, filterFn]);

  // Create Fuse on filtered data
  const fuse = useMemo(() => {
    return new Fuse(filteredData, {
      keys: searchKeys,
      threshold,
      ignoreLocation,
      minMatchCharLength,
      includeScore: true,
      shouldSort: true,
    });
  }, [filteredData, searchKeys, threshold, ignoreLocation, minMatchCharLength]);

  // Search with auto-sort by relevance
  const results = useMemo(() => {
    if (!searchTerm.trim()) {
      return filteredData;
    }

    const searchResults = fuse.search(searchTerm);
    return searchResults.map(result => result.item);
  }, [fuse, searchTerm, filteredData]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching: searchTerm.trim().length > 0,
    clearSearch: () => setSearchTerm(''),
    filteredCount: filteredData.length,
  };
}
