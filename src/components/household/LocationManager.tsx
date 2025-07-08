'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Camera, Tag, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'

interface Location {
  id: string
  room_name: string
  description: string | null
  is_primary_storage: boolean
  created_at: string
  updated_at: string
  location_photos?: LocationPhoto[]
}

interface LocationPhoto {
  id: string
  photo_url: string
  storage_path: string
  caption: string | null
  photo_type: string
  created_at: string
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
  const [isUploading, setIsUploading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

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
        .select(`
          *,
          location_photos (
            id,
            photo_url,
            storage_path,
            caption,
            photo_type,
            created_at
          )
        `)
        .eq('organization_id', householdId)
        .order('room_name')

      if (error) throw error
      setLocations(data || [])
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

  const handleAddLocation = async (formData: FormData) => {
    const room_name = formData.get('room_name') as string
    const description = formData.get('description') as string
    const is_primary_storage = formData.get('is_primary_storage') === 'on'

    try {
      const { data, error } = await supabase
        .from('household_locations')
        .insert([{
          organization_id: householdId,
          room_name,
          description: description || null,
          is_primary_storage
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
    const is_primary_storage = formData.get('is_primary_storage') === 'on'

    try {
      const { error } = await supabase
        .from('household_locations')
        .update({
          room_name,
          description: description || null,
          is_primary_storage
        })
        .eq('id', editingLocation.id)

      if (error) throw error
      
      setLocations(locations.map(loc => 
        loc.id === editingLocation.id 
          ? { ...loc, room_name, description, is_primary_storage }
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
      // First, delete any associated photos from storage and database
      const location = locations.find(loc => loc.id === locationId)
      if (location?.location_photos && location.location_photos.length > 0) {
        // Delete photos from storage
        for (const photo of location.location_photos) {
          if (photo.storage_path) {
            await supabase.storage
              .from('household-photos')
              .remove([photo.storage_path])
          }
        }
        
        // Delete photo records from database
        await supabase
          .from('location_photos')
          .delete()
          .eq('location_id', locationId)
      }

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

  const onDrop = async (acceptedFiles: File[], locationId: string) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${locationId}-${Date.now()}.${fileExt}`
      const filePath = `${householdId}/location-photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('household-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('household-photos')
        .getPublicUrl(filePath)

      // Store photo reference in database
      const { error: dbError } = await supabase
        .from('location_photos')
        .insert({
          location_id: locationId,
          organization_id: householdId,
          photo_url: publicUrl,
          storage_path: filePath,
          caption: file.name,
          photo_type: 'main',
          uploaded_by: null // Will be set by RLS
        })

      if (dbError) throw dbError
      
      toast.success('Photo uploaded successfully')
      
      // Refresh locations to show the new photo
      fetchLocations()
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
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

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="is_primary_storage"
            defaultChecked={location?.is_primary_storage}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Primary storage location</span>
        </label>
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

      {/* Add Location Form */}
      {isAddingLocation && (
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-4">Add New Location</h3>
          <LocationForm onSubmit={handleAddLocation} />
        </div>
      )}

      {/* Edit Location Form */}
      {editingLocation && (
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-4">Edit Location</h3>
          <LocationForm location={editingLocation} onSubmit={handleEditLocation} />
        </div>
      )}

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            canEdit={canEdit}
            onEdit={() => setEditingLocation(location)}
            onDelete={() => handleDeleteLocation(location.id)}
            onPhotoUpload={(files) => onDrop(files, location.id)}
            isUploading={isUploading}
          />
        ))}
      </div>

      {locations.length === 0 && (
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
      )}
    </div>
  )
}

function LocationCard({ 
  location, 
  canEdit, 
  onEdit, 
  onDelete, 
  onPhotoUpload, 
  isUploading 
}: {
  location: Location
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onPhotoUpload: (files: File[]) => void
  isUploading: boolean
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onPhotoUpload,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    disabled: !canEdit
  })

  const mainPhoto = location.location_photos?.[0]

  return (
    <div className="bg-white rounded-lg shadow-md border overflow-hidden">
      {/* Photo Upload Area */}
      <div
        {...getRootProps()}
        className={`h-32 bg-gray-50 flex items-center justify-center cursor-pointer transition-colors ${
          isDragActive ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-100'
        } ${!canEdit ? 'cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        ) : mainPhoto ? (
          <img 
            src={mainPhoto.photo_url} 
            alt={mainPhoto.caption || location.room_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {canEdit ? 'Click or drag to upload photo' : 'Photo area'}
            </p>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{location.room_name}</h3>
          {canEdit && (
            <div className="flex space-x-1">
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-blue-600"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {location.description && (
          <p className="text-sm text-gray-600 mb-2">{location.description}</p>
        )}

        <div className="flex items-center justify-between">
          {location.is_primary_storage && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Primary Storage
            </span>
          )}
          <span className="text-xs text-gray-500">
            {new Date(location.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}