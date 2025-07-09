'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown, Home, Box } from 'lucide-react'

interface Location {
  id: string
  room_name: string
  description: string | null
}

interface StorageContainer {
  id: string
  location_id: string
  name: string
  description: string | null
  container_type: string | null
  photo_url: string | null
}

interface StorageSelectorProps {
  householdId: string
  selectedLocationId?: string
  selectedContainerId?: string
  onLocationChange?: (locationId: string) => void
  onContainerChange?: (containerId: string | null) => void
  required?: boolean
  showContainerSelection?: boolean
  className?: string
  locationLabel?: string
  containerLabel?: string
}

const containerTypeIcons: { [key: string]: string } = {
  shelf: '📚',
  cabinet: '🗄️',
  drawer: '🗃️',
  box: '📦',
  closet: '🚪',
  bin: '🗑️',
  rack: '🪜',
  other: '📋'
}

export default function StorageSelector({
  householdId,
  selectedLocationId,
  selectedContainerId,
  onLocationChange,
  onContainerChange,
  required = false,
  showContainerSelection = true,
  className = '',
  locationLabel = 'Location',
  containerLabel = 'Storage Container'
}: StorageSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [containers, setContainers] = useState<StorageContainer[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingContainers, setLoadingContainers] = useState(false)

  useEffect(() => {
    fetchLocations()
  }, [householdId])

  useEffect(() => {
    if (selectedLocationId) {
      fetchContainers(selectedLocationId)
    } else {
      setContainers([])
    }
  }, [selectedLocationId])

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('household_locations')
        .select('id, room_name, description')
        .eq('organization_id', householdId)
        .order('room_name')

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoadingLocations(false)
    }
  }

  const fetchContainers = async (locationId: string) => {
    setLoadingContainers(true)
    try {
      const { data, error } = await supabase
        .from('storage_containers')
        .select('id, location_id, name, description, container_type, photo_url')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setContainers(data || [])
    } catch (error) {
      console.error('Error fetching containers:', error)
    } finally {
      setLoadingContainers(false)
    }
  }

  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const locationId = event.target.value
    onLocationChange?.(locationId)
    
    // Reset container selection when location changes
    if (onContainerChange) {
      onContainerChange(null)
    }
  }

  const handleContainerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const containerId = event.target.value || null
    onContainerChange?.(containerId)
  }

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId)
  const selectedContainer = containers.find(cont => cont.id === selectedContainerId)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {locationLabel} {required && '*'}
        </label>
        <div className="relative">
          <select
            value={selectedLocationId || ''}
            onChange={handleLocationChange}
            required={required}
            className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            disabled={loadingLocations}
          >
            <option value="">Select location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.room_name}
                {location.description && ` - ${location.description}`}
              </option>
            ))}
          </select>
          <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        {selectedLocation && (
          <p className="mt-1 text-xs text-gray-500">
            📍 {selectedLocation.room_name}
            {selectedLocation.description && ` - ${selectedLocation.description}`}
          </p>
        )}
      </div>

      {/* Storage Container Selection */}
      {showContainerSelection && selectedLocationId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {containerLabel}
            <span className="text-xs text-gray-500 ml-1">(optional)</span>
          </label>
          <div className="relative">
            <select
              value={selectedContainerId || ''}
              onChange={handleContainerChange}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              disabled={loadingContainers}
            >
              <option value="">No specific container</option>
              {containers.map(container => (
                <option key={container.id} value={container.id}>
                  {containerTypeIcons[container.container_type || 'other'] || '📋'} {container.name}
                  {container.description && ` - ${container.description}`}
                </option>
              ))}
            </select>
            <Box className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {loadingContainers && (
            <p className="mt-1 text-xs text-gray-500">Loading containers...</p>
          )}
          
          {containers.length === 0 && !loadingContainers && selectedLocationId && (
            <p className="mt-1 text-xs text-gray-500">
              No storage containers in this location. Items will be stored at the room level.
            </p>
          )}

          {selectedContainer && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md">
              <div className="flex items-center text-xs text-gray-600">
                <span className="mr-1">
                  {containerTypeIcons[selectedContainer.container_type || 'other'] || '📋'}
                </span>
                <span className="font-medium">{selectedContainer.name}</span>
                {selectedContainer.description && (
                  <span className="ml-1">- {selectedContainer.description}</span>
                )}
              </div>
              {selectedContainer.photo_url && (
                <img
                  src={selectedContainer.photo_url}
                  alt={selectedContainer.name}
                  className="mt-1 w-16 h-12 object-cover rounded border"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Storage Path Display */}
      {selectedLocationId && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <span className="font-medium">Storage Path:</span>
          <span className="ml-1">
            🏠 {selectedLocation?.room_name}
            {selectedContainer && (
              <>
                {' → '}
                <span className="mr-1">
                  {containerTypeIcons[selectedContainer.container_type || 'other'] || '📋'}
                </span>
                {selectedContainer.name}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}