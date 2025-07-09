'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { 
  Plus, 
  Camera, 
  Upload, 
  X, 
  Calendar, 
  User,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'
import { useDropzone } from 'react-dropzone'

interface ConditionLog {
  id: string
  non_consumable_id: string
  condition_rating: 'excellent' | 'good' | 'fair' | 'poor' | 'broken'
  condition_notes: string
  maintenance_performed: string
  estimated_repair_cost: number
  photos: string[]
  created_at: string
  logged_by: string
  user_profiles: {
    first_name: string
    last_name: string
  }
  condition_log_photos: Array<{
    id: string
    photo_url: string
    photo_type: string
    caption: string
    created_at: string
  }>
}

interface ConditionTrackerProps {
  nonConsumableId: string
  householdId: string
  userId: string
  itemName: string
  currentCondition: string
  onConditionUpdated: () => void
}

export default function ConditionTracker({
  nonConsumableId,
  householdId,
  userId,
  itemName,
  currentCondition,
  onConditionUpdated
}: ConditionTrackerProps) {
  const [logs, setLogs] = useState<ConditionLog[]>([])
  const [isAddingLog, setIsAddingLog] = useState(false)
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploadingPhotos, setUploadingPhotos] = useState<File[]>([])

  const conditions = [
    { value: 'excellent', label: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200', icon: '✨' },
    { value: 'good', label: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '👍' },
    { value: 'fair', label: 'Fair', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⚠️' },
    { value: 'poor', label: 'Poor', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🔧' },
    { value: 'broken', label: 'Broken', color: 'bg-red-100 text-red-800 border-red-200', icon: '🛠️' }
  ]

  const photoTypes = [
    { value: 'general', label: 'General', icon: '📷' },
    { value: 'before', label: 'Before', icon: '🔵' },
    { value: 'after', label: 'After', icon: '🟢' },
    { value: 'damage', label: 'Damage', icon: '🔴' },
    { value: 'repair', label: 'Repair', icon: '🔧' }
  ]

  useEffect(() => {
    fetchConditionLogs()
  }, [nonConsumableId])

  const fetchConditionLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('condition_logs')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name
          ),
          condition_log_photos (
            id,
            photo_url,
            photo_type,
            caption,
            created_at
          )
        `)
        .eq('non_consumable_id', nonConsumableId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching condition logs:', error)
      toast.error('Failed to fetch condition history')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (acceptedFiles: File[]) => {
    setUploadingPhotos(prev => [...prev, ...acceptedFiles])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  const removeUploadingPhoto = (index: number) => {
    setUploadingPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const uploadPhotosToStorage = async (files: File[], logId: string) => {
    const uploadedPhotos = []
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${logId}_${Date.now()}.${fileExt}`
      const filePath = `${householdId}/condition-logs/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('household-photos')
        .upload(filePath, file)
      
      if (uploadError) {
        console.error('Error uploading photo:', uploadError)
        continue
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('household-photos')
        .getPublicUrl(filePath)
      
      // Save photo record to database
      const { error: dbError } = await supabase
        .from('condition_log_photos')
        .insert({
          condition_log_id: logId,
          organization_id: householdId,
          uploaded_by: userId,
          photo_url: publicUrl,
          photo_type: 'general',
          file_size: file.size,
          mime_type: file.type
        })
      
      if (!dbError) {
        uploadedPhotos.push(publicUrl)
      }
    }
    
    return uploadedPhotos
  }

  const addConditionLog = async (formData: FormData) => {
    try {
      const repairCost = formData.get('estimated_repair_cost') as string
      const logData = {
        non_consumable_id: nonConsumableId,
        organization_id: householdId,
        logged_by: userId,
        condition_rating: formData.get('condition_rating') as string,
        condition_notes: formData.get('condition_notes') as string,
        maintenance_performed: formData.get('maintenance_performed') as string,
        estimated_repair_cost: repairCost ? parseFloat(repairCost) : null
      }

      const { data, error } = await supabase
        .from('condition_logs')
        .insert(logData)
        .select()
        .single()

      if (error) throw error
      
      // Upload photos if any
      if (uploadingPhotos.length > 0) {
        await uploadPhotosToStorage(uploadingPhotos, data.id)
      }
      
      await fetchConditionLogs()
      onConditionUpdated()
      setIsAddingLog(false)
      setUploadingPhotos([])
      toast.success('Condition log added successfully')
      
      // Log activity
      await logActivity('added_condition_log', `Added condition log for ${itemName}: ${logData.condition_rating}`)
    } catch (error) {
      console.error('Error adding condition log:', error)
      toast.error('Failed to add condition log')
    }
  }

  const logActivity = async (activityType: string, description: string) => {
    try {
      await supabase.rpc('log_family_activity', {
        org_id: householdId,
        user_id: userId,
        activity_type: activityType,
        description: description,
        metadata: {}
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  const getConditionDisplay = (condition: string) => {
    return conditions.find(c => c.value === condition) || conditions[1]
  }

  const openPhotoViewer = (photos: string[], startIndex: number = 0) => {
    setViewingPhotos(photos)
    setCurrentPhotoIndex(startIndex)
  }

  const closePhotoViewer = () => {
    setViewingPhotos([])
    setCurrentPhotoIndex(0)
  }

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev < viewingPhotos.length - 1 ? prev + 1 : 0
    )
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev > 0 ? prev - 1 : viewingPhotos.length - 1
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📊 Condition History</h3>
          <p className="text-sm text-gray-600">Track condition changes and maintenance over time</p>
        </div>
        <button
          onClick={() => setIsAddingLog(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Log Entry
        </button>
      </div>

      {/* Current Condition Display */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Current Condition:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getConditionDisplay(currentCondition).color}`}>
              {getConditionDisplay(currentCondition).icon} {getConditionDisplay(currentCondition).label}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Add Log Entry Form */}
      {isAddingLog && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-md font-semibold mb-4">Add Condition Log Entry</h4>
          <form action={addConditionLog} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Rating *
                </label>
                <select
                  name="condition_rating"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {conditions.map(condition => (
                    <option key={condition.value} value={condition.value}>
                      {condition.icon} {condition.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Repair Cost
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    name="estimated_repair_cost"
                    step="0.01"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition Notes
              </label>
              <textarea
                name="condition_notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the current condition, any issues, or observations..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Performed
              </label>
              <textarea
                name="maintenance_performed"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe any maintenance, repairs, or improvements made..."
              />
            </div>
            
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {isDragActive ? 'Drop photos here...' : 'Drag photos here or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF up to 10MB each
                </p>
              </div>
              
              {uploadingPhotos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Photos to upload ({uploadingPhotos.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {uploadingPhotos.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-20 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => removeUploadingPhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddingLog(false)
                  setUploadingPhotos([])
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Log Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Condition Timeline */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No condition logs yet.</p>
            <p className="text-sm">Add the first entry to start tracking condition changes.</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const conditionConfig = getConditionDisplay(log.condition_rating)
            const isLatest = index === 0
            
            return (
              <div key={log.id} className="relative">
                {/* Timeline line */}
                {index < logs.length - 1 && (
                  <div className="absolute left-4 top-12 w-0.5 h-full bg-gray-200"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ${conditionConfig.color}`}>
                    {conditionConfig.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conditionConfig.color}`}>
                          {conditionConfig.label}
                        </span>
                        {isLatest && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Current
                          </span>
                        )}
                        {log.estimated_repair_cost && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ${log.estimated_repair_cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        {log.user_profiles.first_name} {log.user_profiles.last_name}
                        <span className="mx-2">•</span>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    {log.condition_notes && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Condition Notes:</p>
                        <p className="text-sm text-gray-600">{log.condition_notes}</p>
                      </div>
                    )}
                    
                    {log.maintenance_performed && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Maintenance Performed:</p>
                        <p className="text-sm text-gray-600">{log.maintenance_performed}</p>
                      </div>
                    )}
                    
                    {log.condition_log_photos && log.condition_log_photos.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Photos ({log.condition_log_photos.length})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {log.condition_log_photos.map((photo, photoIndex) => (
                            <div key={photo.id} className="relative">
                              <img
                                src={photo.photo_url}
                                alt={`Condition photo ${photoIndex + 1}`}
                                className="w-full h-20 object-cover rounded-md border cursor-pointer hover:opacity-80"
                                onClick={() => openPhotoViewer(
                                  log.condition_log_photos.map(p => p.photo_url),
                                  photoIndex
                                )}
                              />
                              <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                                {photoTypes.find(t => t.value === photo.photo_type)?.icon || '📷'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Photo Viewer Modal */}
      {viewingPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closePhotoViewer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
            
            <img
              src={viewingPhotos[currentPhotoIndex]}
              alt={`Photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-screen object-contain"
            />
            
            {viewingPhotos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  onClick={prevPhoto}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  ←
                </button>
                <span className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-full text-sm">
                  {currentPhotoIndex + 1} / {viewingPhotos.length}
                </span>
                <button
                  onClick={nextPhoto}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}