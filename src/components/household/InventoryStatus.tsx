'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Package, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react'

interface ConsumableStatus {
  id: string
  name: string
  current_quantity: number
  reorder_threshold: number
  household_locations?: {
    room_name: string
  }
}

interface InventoryStatusProps {
  householdId: string
  compact?: boolean
}

export default function InventoryStatus({ householdId, compact = false }: InventoryStatusProps) {
  const [lowStockItems, setLowStockItems] = useState<ConsumableStatus[]>([])
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLowStockItems()

    // Subscribe to real-time updates for consumables
    const channel = supabase
      .channel(`inventory-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consumables',
          filter: `organization_id=eq.${householdId}`
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Flash animation for updated items
            setRecentlyUpdated(prev => new Set(prev).add(payload.new.id))
            setTimeout(() => {
              setRecentlyUpdated(prev => {
                const newSet = new Set(prev)
                newSet.delete(payload.new.id)
                return newSet
              })
            }, 2000)
          }
          
          // Refresh low stock items
          fetchLowStockItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId])

  const fetchLowStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('consumables')
        .select(`
          id,
          name,
          current_quantity,
          reorder_threshold,
          household_locations (
            room_name
          )
        `)
        .eq('organization_id', householdId)
        .eq('is_active', true)

      if (error) throw error

      const filtered = data?.filter(item => 
        item.current_quantity <= item.reorder_threshold
      ) || []
      
      setLowStockItems(filtered)
    } catch (error) {
      console.error('Failed to fetch low stock items:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockLevel = (current: number, threshold: number) => {
    const percentage = (current / threshold) * 100
    if (percentage === 0) return 'out'
    if (percentage <= 50) return 'critical'
    if (percentage <= 100) return 'low'
    return 'ok'
  }

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case 'out': return 'text-red-600 bg-red-100'
      case 'critical': return 'text-orange-600 bg-orange-100'
      case 'low': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Low Stock Alerts</h3>
          <span className="text-xs text-gray-500">{lowStockItems.length} items</span>
        </div>
        {lowStockItems.length === 0 ? (
          <div className="flex items-center space-x-2 text-green-600 py-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">All items well stocked!</span>
          </div>
        ) : (
          <div className="space-y-1">
            {lowStockItems.slice(0, 5).map((item) => {
              const level = getStockLevel(item.current_quantity, item.reorder_threshold)
              const isUpdating = recentlyUpdated.has(item.id)
              
              return (
                <div
                  key={item.id}
                  className={`p-2 rounded-md border transition-all duration-300 ${
                    isUpdating ? 'ring-2 ring-blue-400 scale-[1.02]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.household_locations?.room_name || 'No location'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStockLevelColor(level)}`}>
                      {item.current_quantity} left
                    </div>
                  </div>
                </div>
              )
            })}
            {lowStockItems.length > 5 && (
              <p className="text-xs text-gray-500 text-center py-1">
                +{lowStockItems.length - 5} more items
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Inventory Status
          </h2>
          <span className="text-sm text-gray-500">
            Real-time updates enabled
          </span>
        </div>
      </div>
      
      <div className="p-6">
        {lowStockItems.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">All items are well stocked!</p>
            <p className="text-sm text-gray-500 mt-1">No items need reordering at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockItems.map((item) => {
              const level = getStockLevel(item.current_quantity, item.reorder_threshold)
              const isUpdating = recentlyUpdated.has(item.id)
              
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-all duration-300 ${
                    isUpdating ? 'ring-2 ring-blue-400 shadow-md scale-[1.02]' : 'hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${getStockLevelColor(level)}`}>
                        {level === 'out' ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.household_locations?.room_name || 'No location'} • 
                          Reorder at {item.reorder_threshold}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        level === 'out' ? 'text-red-600' : 
                        level === 'critical' ? 'text-orange-600' : 
                        'text-yellow-600'
                      }`}>
                        {item.current_quantity}
                      </p>
                      <p className="text-xs text-gray-500">remaining</p>
                    </div>
                  </div>
                  
                  {isUpdating && (
                    <div className="mt-2 text-xs text-blue-600 animate-pulse">
                      ✨ Just updated
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}