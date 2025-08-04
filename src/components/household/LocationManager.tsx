'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Tag, X, Box, Camera, Upload } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Location {
  id: string
  room_name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface LocationTag {
  id: string
  tag_name: string
  usage_count: number
}

interface LocationManagerProps {
  householdId: string
  userRole: string
}

export default function LocationManager({ householdId, userRole }: LocationManagerProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [tags, setTags] = useState<LocationTag[]>([])
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [storageContainers, setStorageContainers] = useState<any[]>([])
  const [loadingContainers, setLoadingContainers] = useState(false)
  const [editingContainer, setEditingContainer] = useState<any>(null)
  const [selectedContainer, setSelectedContainer] = useState<any>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValues, setTempValues] = useState<any>({})

  const canEdit = userRole === 'admin' || userRole === 'manager'

  // Fetch locations and tags
  useEffect(() => {
    fetchLocations()
    fetchTags()
  }, [householdId])

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('household_locations')
        .select('*')
        .eq('organization_id', householdId)
        .order('room_name')

      if (error) throw error
      setLocations(data || [])
      
      // Auto-select first location if none selected
      if (data && data.length > 0 && !selectedLocation) {
        setSelectedLocation(data[0])
      }
    } catch (error) {
      toast.error('Failed to fetch locations')
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('location_tags')
        .select('tag_name, usage_count')
        .eq('organization_id', householdId)
        .order('usage_count', { ascending: false })

      if (error) throw error
      
      // Group by tag_name and sum usage_count
      const tagMap = new Map<string, number>()
      data?.forEach(item => {
        tagMap.set(item.tag_name, (tagMap.get(item.tag_name) || 0) + item.usage_count)
      })
      
      const uniqueTags = Array.from(tagMap.entries()).map(([tag_name, usage_count]) => ({
        id: tag_name,
        tag_name,
        usage_count
      }))
      
      setTags(uniqueTags)
    } catch (error) {
      toast.error('Failed to fetch tags')
    }
  }

  const fetchStorageContainers = async (locationId: string) => {
    setLoadingContainers(true)
    try {
      const { data, error } = await supabase
        .from('storage_containers')
        .select('*')
        .eq('location_id', locationId)
        .order('name')

      if (error) throw error
      setStorageContainers(data || [])
    } catch (error) {
      console.error('Error fetching storage containers:', error)
      setStorageContainers([])
    } finally {
      setLoadingContainers(false)
    }
  }

  const uploadPhoto = async (file: File, containerId: string): Promise<string | null> => {
    try {
      setUploadingPhoto(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${containerId}-${Date.now()}.${fileExt}`
      const filePath = `storage-containers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('household-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('household-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
      return null
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleAddContainer = async () => {
    if (!selectedLocation) return

    const containerData = {
      organization_id: householdId,
      location_id: selectedLocation.id,
      name: 'New Container',
      description: null,
      photo_url: null
    }

    try {
      const { data, error } = await supabase
        .from('storage_containers')
        .insert([containerData])
        .select()

      if (error) throw error
      
      const newContainer = data[0]
      
      setStorageContainers([...storageContainers, newContainer])
      setSelectedContainer(newContainer) // Auto-select the newly added container
      setEditingField('name') // Immediately start editing the name
      setTempValues({name: 'New Container'})
      toast.success('Storage container added')
    } catch (error) {
      toast.error('Failed to add storage container')
    }
  }

  const handleEditContainer = async (formData: FormData) => {
    if (!editingContainer) return

    let containerData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      photo_url: editingContainer.photo_url
    }

    try {
      // Handle photo upload if provided
      const photoFile = formData.get('photo') as File
      if (photoFile && photoFile.size > 0) {
        const photoUrl = await uploadPhoto(photoFile, editingContainer.id)
        if (photoUrl) {
          containerData.photo_url = photoUrl
        }
      }

      const { error } = await supabase
        .from('storage_containers')
        .update(containerData)
        .eq('id', editingContainer.id)

      if (error) throw error
      
      const updatedContainer = { ...editingContainer, ...containerData }
      
      setStorageContainers(storageContainers.map(container => 
        container.id === editingContainer.id 
          ? updatedContainer
          : container
      ))
      
      // Update selected container if it's the one being edited
      if (selectedContainer?.id === editingContainer.id) {
        setSelectedContainer(updatedContainer)
      }
      
      setEditingContainer(null)
      toast.success('Storage container updated successfully')
    } catch (error) {
      toast.error('Failed to update storage container')
    }
  }

  const handleDeleteContainer = async (containerId: string, containerName: string) => {
    if (!confirm(`Are you sure you want to delete "${containerName}"?`)) return

    try {
      const { error } = await supabase
        .from('storage_containers')
        .delete()
        .eq('id', containerId)

      if (error) throw error
      
      setStorageContainers(storageContainers.filter(container => container.id !== containerId))
      
      // Clear selected container if it's the one being deleted
      if (selectedContainer?.id === containerId) {
        setSelectedContainer(null)
      }
      
      toast.success('Storage container deleted successfully')
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(`Failed to delete container: ${error.message || 'Unknown error'}`)
    }
  }

  const handleInlineEdit = async (field: string, value: string) => {
    if (!selectedContainer || !canEdit) return

    const containerData = {
      [field]: value || null
    }

    try {
      const { error } = await supabase
        .from('storage_containers')
        .update(containerData)
        .eq('id', selectedContainer.id)

      if (error) throw error

      const updatedContainer = { ...selectedContainer, [field]: value }
      
      setStorageContainers(storageContainers.map(container => 
        container.id === selectedContainer.id ? updatedContainer : container
      ))
      
      setSelectedContainer(updatedContainer)
      setEditingField(null)
      setTempValues({})
      
      toast.success('Container updated successfully')
    } catch (error) {
      toast.error('Failed to update container')
      setEditingField(null)
      setTempValues({})
    }
  }

  const handlePhotoUpload = async (file: File) => {
    if (!selectedContainer || !canEdit) return

    const photoUrl = await uploadPhoto(file, selectedContainer.id)
    if (photoUrl) {
      await handleInlineEdit('photo_url', photoUrl)
    }
  }

  // Fetch containers when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      fetchStorageContainers(selectedLocation.id)
    }
  }, [selectedLocation])

  const handleAddLocation = async (formData: FormData) => {
    const room_name = formData.get('room_name') as string
    const description = formData.get('description') as string

    try {
      const { data, error } = await supabase
        .from('household_locations')
        .insert([{
          organization_id: householdId,
          room_name,
          description: description || null
        }])
        .select()

      if (error) throw error
      
      setLocations([...locations, data[0]])
      setIsAddingLocation(false)
      
      // Add tags if any
      if (selectedTags.length > 0 && data[0]) {
        await addTagsToLocation(data[0].id, selectedTags)
      }
      
      toast.success('Location added successfully')
    } catch (error) {
      toast.error('Failed to add location')
    }
  }

  const handleEditLocation = async (formData: FormData) => {
    if (!editingLocation) return

    const room_name = formData.get('room_name') as string
    const description = formData.get('description') as string

    try {
      const { error } = await supabase
        .from('household_locations')
        .update({
          room_name,
          description: description || null
        })
        .eq('id', editingLocation.id)

      if (error) throw error
      
      setLocations(locations.map(loc => 
        loc.id === editingLocation.id 
          ? { ...loc, room_name, description }
          : loc
      ))
      
      setEditingLocation(null)
      toast.success('Location updated successfully')
    } catch (error) {
      toast.error('Failed to update location')
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      // Delete location tags
      await supabase
        .from('location_tags')
        .delete()
        .eq('location_id', locationId)

      // Now delete the location
      const { error } = await supabase
        .from('household_locations')
        .delete()
        .eq('id', locationId)

      if (error) throw error
      
      setLocations(locations.filter(loc => loc.id !== locationId))
      toast.success('Location deleted successfully')
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(`Failed to delete location: ${error.message || 'Unknown error'}`)
    }
  }

  const addTagsToLocation = async (locationId: string, tags: string[]) => {
    try {
      const tagInserts = tags.map(tag => ({
        organization_id: householdId,
        location_id: locationId,
        tag_name: tag,
        usage_count: 1
      }))

      const { error } = await supabase
        .from('location_tags')
        .insert(tagInserts)

      if (error) throw error
      setSelectedTags([])
      fetchTags()
    } catch (error) {
      toast.error('Failed to add tags')
    }
  }

  const handleAddTag = (tagName: string) => {
    if (tagName && !selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagName))
  }


  const LocationForm = ({ location, onSubmit }: { location?: Location, onSubmit: (formData: FormData) => void }) => (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Room Name
        </label>
        <input
          type="text"
          name="room_name"
          defaultValue={location?.room_name}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Kitchen, Living Room, Garage"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          defaultValue={location?.description || ''}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of the room or storage area"
        />
      </div>


      {!location && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleRemoveTag(tag)}
                />
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(tagInput))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add tag (e.g., storage, pantry, garage)"
            />
            <button
              type="button"
              onClick={() => handleAddTag(tagInput)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 8).map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.tag_name)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    {tag.tag_name} ({tag.usage_count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setIsAddingLocation(false)
            setEditingLocation(null)
            setSelectedTags([])
          }}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {location ? 'Update' : 'Add'} Location
        </button>
      </div>
    </form>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🏠 Household Locations</h2>
        {canEdit && (
          <button
            onClick={() => setIsAddingLocation(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </button>
        )}
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No locations yet</h3>
          <p className="text-gray-500 mb-4">Add your first room or storage area to get started</p>
          {canEdit && (
            <button
              onClick={() => setIsAddingLocation(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add First Location
            </button>
          )}
        </div>
      ) : (
        /* Two-Panel Layout */
        <div className="flex gap-6 h-[600px]">
          {/* Left Panel - Locations List */}
          <div className="w-1/3 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Locations</h3>
            </div>
            <div className="overflow-y-auto h-full">
              {locations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocation(location)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedLocation?.id === location.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{location.room_name}</h4>
                      {location.description && (
                        <p className="text-sm text-gray-500 mt-1">{location.description}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingLocation(location)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit location"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteLocation(location.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete location"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Storage Containers */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
            {selectedLocation ? (
              <>
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">Storage Containers</h3>
                      <p className="text-sm text-gray-500">{selectedLocation.room_name}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={handleAddContainer}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Container
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex h-full">
                  {/* Left Half - Container List */}
                  <div className="w-1/2 border-r">
                    <div className="overflow-y-auto h-full">
                      {loadingContainers ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : storageContainers.length === 0 ? (
                        <div className="text-center py-12 px-4">
                          <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">No storage containers</h4>
                          <p className="text-gray-500 mb-4">Add your first storage container to organize items in this location</p>
                          {canEdit && (
                            <button 
                              onClick={handleAddContainer}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Add First Container
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {storageContainers.map((container) => (
                            <div 
                              key={container.id} 
                              onClick={() => setSelectedContainer(container)}
                              className={`border-b hover:bg-gray-50 cursor-pointer ${
                                selectedContainer?.id === container.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                              }`}
                            >
                              <div className="p-4 flex items-center space-x-3">
                                {/* Container Photo */}
                                {container.photo_url ? (
                                  <img
                                    src={container.photo_url}
                                    alt={container.name}
                                    className="w-12 h-12 object-cover rounded-md border flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded-md border flex items-center justify-center flex-shrink-0">
                                    <Box className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">{container.name}</h4>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Half - Container Details */}
                  <div className="w-1/2">
                    <div className="h-full overflow-y-auto">
                      {selectedContainer ? (
                        <div className="p-6">
                          <div className="space-y-6">
                            {/* Container Photo */}
                            <div>
                              {selectedContainer.photo_url ? (
                                <div className="relative group">
                                  <img
                                    src={selectedContainer.photo_url}
                                    alt={selectedContainer.name}
                                    className="w-full max-w-sm h-48 object-cover rounded-lg border mx-auto"
                                  />
                                  {canEdit && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                      <label className="cursor-pointer">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handlePhotoUpload(file)
                                          }}
                                        />
                                        <div className="flex items-center px-4 py-2 bg-white text-gray-900 rounded-md hover:bg-gray-100">
                                          <Upload className="h-4 w-4 mr-2" />
                                          Replace Photo
                                        </div>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              ) : canEdit ? (
                                <div className="w-full max-w-sm h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto hover:border-gray-400 transition-colors">
                                  <label className="cursor-pointer text-center">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handlePhotoUpload(file)
                                      }}
                                    />
                                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Click to add photo</p>
                                  </label>
                                </div>
                              ) : (
                                <div className="w-full max-w-sm h-48 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                                  <Box className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Container Info - Editable Fields */}
                            <div className="space-y-4">
                              {/* Container Name */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Container Name</label>
                                {editingField === 'name' ? (
                                  <input
                                    type="text"
                                    value={tempValues.name ?? selectedContainer.name}
                                    onChange={(e) => setTempValues({...tempValues, name: e.target.value})}
                                    onBlur={() => handleInlineEdit('name', tempValues.name ?? selectedContainer.name)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleInlineEdit('name', tempValues.name ?? selectedContainer.name)
                                      } else if (e.key === 'Escape') {
                                        setEditingField(null)
                                        setTempValues({})
                                      }
                                    }}
                                    autoFocus
                                    className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                ) : (
                                  <div
                                    onClick={() => canEdit && (setEditingField('name'), setTempValues({name: selectedContainer.name}))}
                                    className={`w-full px-3 py-2 border border-transparent rounded-md ${canEdit ? 'hover:bg-gray-50 cursor-text' : ''}`}
                                  >
                                    <span className="text-lg font-semibold text-gray-900">
                                      {selectedContainer.name}
                                    </span>
                                  </div>
                                )}
                              </div>


                              {/* Description */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                {editingField === 'description' ? (
                                  <textarea
                                    value={tempValues.description ?? selectedContainer.description ?? ''}
                                    onChange={(e) => setTempValues({...tempValues, description: e.target.value})}
                                    onBlur={() => handleInlineEdit('description', tempValues.description ?? selectedContainer.description ?? '')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        setEditingField(null)
                                        setTempValues({})
                                      }
                                    }}
                                    autoFocus
                                    rows={3}
                                    className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add a description..."
                                  />
                                ) : (
                                  <div
                                    onClick={() => canEdit && (setEditingField('description'), setTempValues({description: selectedContainer.description ?? ''}))}
                                    className={`w-full px-3 py-2 border border-transparent rounded-md min-h-[2.5rem] ${canEdit ? 'hover:bg-gray-50 cursor-text' : ''}`}
                                  >
                                    <span className="text-gray-900">
                                      {selectedContainer.description || (canEdit ? 'Click to add description...' : 'No description')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>


                            {/* Delete Action */}
                            {canEdit && (
                              <div className="pt-4 border-t">
                                <button
                                  onClick={() => handleDeleteContainer(selectedContainer.id, selectedContainer.name)}
                                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Container
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Select a container to view its details</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a location to view its storage containers</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Edit Container Form */}
      {editingContainer && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-4">Edit Container: {editingContainer.name}</h4>
          <form action={handleEditContainer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Name *
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingContainer.name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={editingContainer.description || ''}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description or notes about this container"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo
              </label>
              <div className="space-y-3">
                {editingContainer.photo_url && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Current photo:</p>
                    <img
                      src={editingContainer.photo_url}
                      alt={editingContainer.name}
                      className="w-32 h-24 object-cover rounded-md border"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        const label = e.target.nextElementSibling?.querySelector('.file-name')
                        if (label && file) {
                          label.textContent = file.name
                        }
                      }}
                    />
                    <div className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                      <Upload className="h-4 w-4 mr-2" />
                      <span>{editingContainer.photo_url ? 'Replace Photo' : 'Add Photo'}</span>
                      <span className="file-name ml-2 text-sm text-gray-600"></span>
                    </div>
                  </label>
                  <span className="text-sm text-gray-500">
                    {editingContainer.photo_url ? 'Choose a new photo to replace the current one' : 'Optional - helps identify the container'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingContainer(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingPhoto}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPhoto ? 'Uploading...' : 'Update Container'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Location Modal */}
      {isAddingLocation && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddingLocation(false)
              setSelectedTags([])
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Location</h3>
                <button
                  onClick={() => {
                    setIsAddingLocation(false)
                    setSelectedTags([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <LocationForm onSubmit={handleAddLocation} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editingLocation && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingLocation(null)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Location</h3>
                <button
                  onClick={() => setEditingLocation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <LocationForm location={editingLocation} onSubmit={handleEditLocation} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}