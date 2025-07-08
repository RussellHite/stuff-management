'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Package, Home, ShoppingCart, User, AlertCircle, Plus, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

interface Activity {
  id: string
  organization_id: string
  user_id: string
  activity_type: string
  description: string
  item_id: string | null
  item_type: 'consumable' | 'non_consumable' | null
  metadata: any
  created_at: string
  user_profiles: {
    first_name: string
    last_name: string
  }
}

interface ActivityFeedProps {
  householdId: string
  limit?: number
  realtime?: boolean
}

export default function ActivityFeed({ householdId, limit = 20, realtime = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()

    if (realtime) {
      // Subscribe to real-time updates
      const channel = supabase
        .channel(`activity-${householdId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'family_activity_log',
            filter: `organization_id=eq.${householdId}`
          },
          async (payload) => {
            // Fetch the complete activity with user profile
            const { data } = await supabase
              .from('family_activity_log')
              .select(`
                *,
                user_profiles (
                  first_name,
                  last_name
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setActivities(prev => [data, ...prev].slice(0, limit))
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [householdId, limit, realtime])

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('family_activity_log')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', householdId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'added_item':
        return <Plus className="h-4 w-4" />
      case 'updated_item':
        return <Edit2 className="h-4 w-4" />
      case 'deleted_item':
        return <Trash2 className="h-4 w-4" />
      case 'updated_quantity':
        return <Package className="h-4 w-4" />
      case 'quantity_increased':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'quantity_decreased':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'added_to_shopping_list':
        return <ShoppingCart className="h-4 w-4" />
      case 'location_change':
        return <Home className="h-4 w-4" />
      case 'member_joined':
        return <User className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'added_item':
        return 'bg-green-100 text-green-800'
      case 'deleted_item':
        return 'bg-red-100 text-red-800'
      case 'updated_quantity':
      case 'quantity_increased':
      case 'quantity_decreased':
        return 'bg-blue-100 text-blue-800'
      case 'added_to_shopping_list':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-3">📋</div>
        <p className="text-gray-500">No activity yet</p>
        <p className="text-sm text-gray-400 mt-1">Activities will appear here as family members use the system</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3 group">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
            {getActivityIcon(activity.activity_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-medium">
                {activity.user_profiles?.first_name || 'Someone'}
              </span>{' '}
              {activity.description}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}