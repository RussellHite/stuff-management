'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Package, Settings, MapPin, Clock, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { debounce } from 'lodash'

interface SearchResult {
  id: string
  name: string
  type: 'consumable' | 'non-consumable'
  location: string
  description?: string
  current_quantity?: number
  reorder_threshold?: number
  current_condition?: string
  room_name?: string
}

interface SearchHistory {
  query: string
  timestamp: Date
}

interface GlobalSearchProps {
  householdId: string
  onItemSelect?: (item: SearchResult) => void
}

const SEARCH_HISTORY_KEY = 'stuff-happens-search-history'
const MAX_HISTORY_ITEMS = 10
const MAX_SEARCH_RESULTS = 20

export default function GlobalSearch({ householdId, onItemSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'consumable', 'non-consumable'
    location: 'all'
  })

  const searchRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSearchHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })))
      } catch (error) {
        console.error('Failed to parse search history:', error)
      }
    }
  }, [])

  // Save search to history
  const saveSearchToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    const newHistory = [
      { query: searchQuery, timestamp: new Date() },
      ...searchHistory.filter(item => item.query !== searchQuery)
    ].slice(0, MAX_HISTORY_ITEMS)

    setSearchHistory(newHistory)
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  }

  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  }

  // Search function with debouncing
  const searchItems = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // Search consumables
      const consumablesQuery = supabase
        .from('consumables')
        .select(`
          id,
          name,
          description,
          current_quantity,
          reorder_threshold,
          household_locations (
            room_name
          )
        `)
        .eq('organization_id', householdId)
        .eq('is_active', true)
        .ilike('name', `%${searchQuery}%`)
        .limit(MAX_SEARCH_RESULTS / 2)

      // Search non-consumables
      const nonConsumablesQuery = supabase
        .from('non_consumables')
        .select(`
          id,
          name,
          description,
          current_condition: current_quality_rating,
          household_locations (
            room_name
          )
        `)
        .eq('organization_id', householdId)
        .eq('is_active', true)
        .ilike('name', `%${searchQuery}%`)
        .limit(MAX_SEARCH_RESULTS / 2)

      const [consumablesResult, nonConsumablesResult] = await Promise.all([
        consumablesQuery,
        nonConsumablesQuery
      ])

      const combinedResults: SearchResult[] = []

      // Process consumables
      if (consumablesResult.data) {
        combinedResults.push(...consumablesResult.data.map(item => ({
          id: item.id,
          name: item.name,
          type: 'consumable' as const,
          location: Array.isArray(item.household_locations) 
            ? item.household_locations[0]?.room_name || 'No Location'
            : item.household_locations?.room_name || 'No Location',
          description: item.description,
          current_quantity: item.current_quantity,
          reorder_threshold: item.reorder_threshold,
          room_name: Array.isArray(item.household_locations) 
            ? item.household_locations[0]?.room_name || 'No Location'
            : item.household_locations?.room_name || 'No Location'
        })))
      }

      // Process non-consumables
      if (nonConsumablesResult.data) {
        combinedResults.push(...nonConsumablesResult.data.map(item => ({
          id: item.id,
          name: item.name,
          type: 'non-consumable' as const,
          location: Array.isArray(item.household_locations) 
            ? item.household_locations[0]?.room_name || 'No Location'
            : item.household_locations?.room_name || 'No Location',
          description: item.description,
          current_condition: item.current_condition,
          room_name: Array.isArray(item.household_locations) 
            ? item.household_locations[0]?.room_name || 'No Location'
            : item.household_locations?.room_name || 'No Location'
        })))
      }

      // Apply filters
      let filteredResults = combinedResults
      if (filters.type !== 'all') {
        filteredResults = filteredResults.filter(item => item.type === filters.type)
      }
      if (filters.location !== 'all') {
        filteredResults = filteredResults.filter(item => item.location === filters.location)
      }

      // Sort by relevance (exact matches first, then partial matches)
      const sortedResults = filteredResults.sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchQuery.toLowerCase()
        const bExact = b.name.toLowerCase() === searchQuery.toLowerCase()
        
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        const aStartsWith = a.name.toLowerCase().startsWith(searchQuery.toLowerCase())
        const bStartsWith = b.name.toLowerCase().startsWith(searchQuery.toLowerCase())
        
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        
        return a.name.localeCompare(b.name)
      })

      setResults(sortedResults.slice(0, MAX_SEARCH_RESULTS))
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search function
  const debouncedSearch = debounce(searchItems, 300)

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    if (value.length >= 2) {
      debouncedSearch(value)
    } else {
      setResults([])
      setIsLoading(false)
    }
  }

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true)
  }

  // Handle input blur
  const handleInputBlur = () => {
    // Delay closing to allow clicking on results
    setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  // Handle item selection
  const handleItemSelect = (item: SearchResult) => {
    saveSearchToHistory(query)
    setQuery('')
    setResults([])
    setIsOpen(false)
    
    if (onItemSelect) {
      onItemSelect(item)
    }
  }

  // Handle history item click
  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery)
    searchItems(historyQuery)
    searchRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleItemSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      searchRef.current?.blur()
    }
  }

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setIsLoading(false)
    setSelectedIndex(-1)
    searchRef.current?.focus()
  }

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-medium">{part}</span>
      ) : (
        part
      )
    )
  }

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search consumables and household goods..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search items"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        
        {/* Clear button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
            showFilters || filters.type !== 'all' || filters.location !== 'all'
              ? 'text-blue-500' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label="Toggle filters"
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Search results"
        >
          {/* Filters */}
          {showFilters && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="all">All Types</option>
                    <option value="consumable">Consumables</option>
                    <option value="non-consumable">Household Items</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="all">All Locations</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                    selectedIndex === index ? 'bg-blue-50' : ''
                  }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    item.type === 'consumable' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {item.type === 'consumable' ? (
                      <Package className="h-4 w-4" />
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 truncate">
                        {highlightMatch(item.name, query)}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.type === 'consumable' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {item.type === 'consumable' ? 'Consumable' : 'Household Item'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        {item.location}
                      </div>
                      
                      {item.type === 'consumable' && item.current_quantity !== undefined && (
                        <div className="text-sm text-gray-500">
                          Qty: {item.current_quantity}
                        </div>
                      )}
                      
                      {item.type === 'non-consumable' && item.current_condition && (
                        <div className={`text-sm ${
                          item.current_condition === 'excellent' ? 'text-green-600' :
                          item.current_condition === 'good' ? 'text-blue-600' :
                          item.current_condition === 'fair' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {item.current_condition}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p>No items found for "{query}"</p>
              <p className="text-sm mt-1">Try adjusting your search terms or filters</p>
            </div>
          )}

          {/* Search History */}
          {!isLoading && query.length < 2 && searchHistory.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleHistorySelect(item.query)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{item.query}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}