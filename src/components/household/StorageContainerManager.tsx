'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Camera, Package, Box, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface StorageContainer {
  id: string
  organization_id: string
  location_id: string
  name: string
  description: string | null
  photo_url: string | null
  storage_path: string | null
  capacity_info: string | null
  container_type: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  items_count?: {
    consumables_count: number
    non_consumables_count: number
  }
}

interface Location {
  id: string
  room_name: string
}

interface StorageContainerManagerProps {
  locationId: string
  householdId: string
  userRole: string
  onClose: () => void
}

const containerTypes = [
  { value: 'shelf', label: 'Shelf', icon: '📚' },
  { value: 'cabinet', label: 'Cabinet', icon: '🗄️' },
  { value: 'drawer', label: 'Drawer', icon: '🗃️' },
  { value: 'box', label: 'Box', icon: '📦' },
  { value: 'closet', label: 'Closet', icon: '🚪' },
  { value: 'bin', label: 'Bin', icon: '🗑️' },
  { value: 'rack', label: 'Rack', icon: '🪜' },
  { value: 'other', label: 'Other', icon: '📋' }
]

export default function StorageContainerManager({ 
  locationId, 
  householdId, 
  userRole,
  onClose 
}: StorageContainerManagerProps) {
  const [containers, setContainers] = useState<StorageContainer[]>([])
  const [location, setLocation] = useState<Location | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingContainer, setEditingContainer] = useState<StorageContainer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  const canManage = userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    fetchLocation()
    fetchContainers()
  }, [locationId])

  const fetchLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('household_locations')
        .select('id, room_name')
        .eq('id', locationId)
        .single()

      if (error) throw error
      setLocation(data)
    } catch (error) {
      console.error('Error fetching location:', error)
    }
  }

  const fetchContainers = async () => {
    try {
      const { data, error } = await supabase
        .from('storage_containers')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      // Fetch item counts for each container
      const containersWithCounts = await Promise.all(
        (data || []).map(async (container) => {
          const { data: countData } = await supabase
            .rpc('get_container_items_count', { container_id: container.id })
          
          return {
            ...container,
            items_count: countData?.[0] || { consumables_count: 0, non_consumables_count: 0 }
          }
        })
      )

      setContainers(containersWithCounts)
    } catch (error) {
      console.error('Error fetching containers:', error)
      toast.error('Failed to fetch storage containers')
    } finally {
      setLoading(false)
    }
  }

  const handleAddContainer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    
    const containerData = {
      organization_id: householdId,
      location_id: locationId,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      capacity_info: formData.get('capacity_info') as string || null,
      container_type: formData.get('container_type') as string || null,
      is_active: true
    }

    try {
      const { error } = await supabase
        .from('storage_containers')
        .insert([containerData])

      if (error) throw error
      
      await fetchContainers()
      setIsAdding(false)
      toast.success('Storage container added successfully')
    } catch (error) {
      console.error('Error adding container:', error)
      toast.error('Failed to add storage container')
    }
  }

  const handleUpdateContainer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingContainer) return

    const formData = new FormData(event.currentTarget)
    
    const updateData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      capacity_info: formData.get('capacity_info') as string || null,
      container_type: formData.get('container_type') as string || null,
      updated_at: new Date().toISOString()
    }

    try {
      const { error } = await supabase
        .from('storage_containers')
        .update(updateData)
        .eq('id', editingContainer.id)

      if (error) throw error
      
      await fetchContainers()
      setEditingContainer(null)
      toast.success('Storage container updated successfully')
    } catch (error) {
      console.error('Error updating container:', error)
      toast.error('Failed to update storage container')
    }
  }

  const handleDeleteContainer = async (container: StorageContainer) => {
    const totalItems = (container.items_count?.consumables_count || 0) + 
                      (container.items_count?.non_consumables_count || 0)
    
    if (totalItems > 0) {
      toast.error(`Cannot delete container with ${totalItems} items. Please move or remove items first.`)
      return
    }

    if (!confirm(`Are you sure you want to delete "${container.name}"?`)) return

    try {
      const { error } = await supabase
        .from('storage_containers')
        .update({ is_active: false })
        .eq('id', container.id)

      if (error) throw error
      
      await fetchContainers()
      toast.success('Storage container deleted successfully')
    } catch (error) {
      console.error('Error deleting container:', error)
      toast.error('Failed to delete storage container')
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, containerId: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${containerId}-${Date.now()}.${fileExt}`
      const filePath = `${householdId}/container-photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('household-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('household-photos')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('storage_containers')
        .update({ 
          photo_url: publicUrl,
          storage_path: filePath
        })
        .eq('id', containerId)

      if (updateError) throw updateError
      
      await fetchContainers()
      toast.success('Photo uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Storage Containers
              </h2>
              <p className="text-gray-600 mt-1">
                {location?.room_name} - Manage storage areas
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Container Button */}
          {canManage && !isAdding && !editingContainer && (
            <button
              onClick={() => setIsAdding(true)}
              className="mb-6 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Storage Container
            </button>
          )}

          {/* Add/Edit Form */}
          {(isAdding || editingContainer) && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingContainer ? 'Edit' : 'Add'} Storage Container
              </h3>
              <form onSubmit={editingContainer ? handleUpdateContainer : handleAddContainer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingContainer?.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Upper Cabinet, Shelf A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      name="container_type"
                      defaultValue={editingContainer?.container_type || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      {containerTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity Info
                    </label>
                    <input
                      type="text"
                      name="capacity_info"
                      defaultValue={editingContainer?.capacity_info || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 4 shelves, 20L capacity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      name="description"
                      defaultValue={editingContainer?.description || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false)
                      setEditingContainer(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingContainer ? 'Update' : 'Add'} Container
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Containers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {containers.map((container) => (
              <div key={container.id} className="bg-white border rounded-lg overflow-hidden">
                {/* Photo Section */}
                <div className="h-32 bg-gray-100 relative">
                  {container.photo_url ? (
                    <img
                      src={container.photo_url}
                      alt={container.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Box className="h-12 w-12" />
                    </div>
                  )}
                  
                  {canManage && (
                    <label className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-100">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, container.id)}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>

                {/* Info Section */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{container.name}</h4>
                      {container.container_type && (
                        <span className="text-sm text-gray-500">
                          {containerTypes.find(t => t.value === container.container_type)?.icon} {' '}
                          {containerTypes.find(t => t.value === container.container_type)?.label}
                        </span>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setEditingContainer(container)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContainer(container)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {container.description && (
                    <p className="text-sm text-gray-600 mb-2">{container.description}</p>
                  )}

                  {container.capacity_info && (
                    <p className="text-sm text-gray-500 mb-2">
                      Capacity: {container.capacity_info}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center text-gray-500">
                      <Package className="h-3 w-3 mr-1" />
                      {container.items_count?.consumables_count || 0} consumables, {' '}
                      {container.items_count?.non_consumables_count || 0} items
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {containers.length === 0 && !isAdding && (
            <div className="text-center py-12">
              <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No storage containers yet</p>
              {canManage && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add First Container
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}