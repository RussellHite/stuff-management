'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { 
  Plus, 
  Edit, 
  Trash2, 
  QrCode, 
  Clock,
  Package,
  Search,
  Eye,
  Filter
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import QRCodeGenerator from './QRCodeGenerator'
import NonConsumableDetailView from './NonConsumableDetailView'
import StorageSelector from './StorageSelector'

interface NonConsumable {
  id: string
  name: string
  description: string
  brand: string
  model: string
  serial_number: string
  current_quality_rating: 'excellent' | 'good' | 'fair' | 'poor' | 'broken'
  purchase_date: string
  warranty_expiration: string
  purchase_price: number
  notes: string
  is_active: boolean
  created_at: string
  primary_location_id: string
  storage_container_id: string | null
  household_locations: {
    room_name: string
  }
  storage_containers?: {
    name: string
    container_type: string
  }
  created_by: string
  user_profiles: {
    first_name: string
    last_name: string
  }
}

interface Location {
  id: string
  room_name: string
  description: string
  is_primary_storage: boolean
}

interface NonConsumablesManagerProps {
  householdId: string
  userId: string
  userRole: string
}

export default function NonConsumablesManager({ 
  householdId, 
  userId, 
  userRole 
}: NonConsumablesManagerProps) {
  console.log('NonConsumablesManager component rendered')
  const [items, setItems] = useState<NonConsumable[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<NonConsumable | null>(null)
  const [showQRCode, setShowQRCode] = useState<NonConsumable | null>(null)
  const [viewingDetail, setViewingDetail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null)
  const [editLocationId, setEditLocationId] = useState('')
  const [editContainerId, setEditContainerId] = useState<string | null>(null)

  const canManageItems = userRole === 'admin' || userRole === 'manager' || userRole === 'employee'

  const validateForm = (formData: FormData, isEdit: boolean = false) => {
    const errors: {[key: string]: string} = {}
    
    const name = formData.get('name')?.toString().trim()
    
    // Required field validation
    if (!name) {
      errors.name = 'Name is required'
    }
    
    if (isEdit) {
      if (!editLocationId) {
        errors.primary_location_id = 'Location is required'
      }
    } else {
      if (!selectedLocationId) {
        errors.primary_location_id = 'Location is required'
      }
    }
    
    return errors
  }

  const conditions = [
    { value: 'excellent', label: 'Excellent', color: 'bg-green-100 text-green-800', icon: '✨' },
    { value: 'good', label: 'Good', color: 'bg-blue-100 text-blue-800', icon: '👍' },
    { value: 'fair', label: 'Fair', color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' },
    { value: 'poor', label: 'Poor', color: 'bg-orange-100 text-orange-800', icon: '🔧' },
    { value: 'broken', label: 'Broken', color: 'bg-red-100 text-red-800', icon: '🛠️' }
  ]

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('non_consumables')
        .select(`
          *,
          household_locations (
            room_name
          ),
          storage_containers (
            name,
            container_type
          ),
          user_profiles (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', householdId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching non-consumables:', error)
      toast.error('Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }, [householdId])

  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('household_locations')
        .select('*')
        .eq('organization_id', householdId)
        .order('room_name')

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }, [householdId])

  useEffect(() => {
    fetchItems()
    fetchLocations()
  }, [householdId, fetchItems, fetchLocations])

  const addItem = async (event: React.FormEvent<HTMLFormElement>) => {
    console.log('addItem function called')
    event.preventDefault()
    
    if (!canManageItems) {
      toast.error('You do not have permission to add items')
      return
    }

    try {
      const formData = new FormData(event.currentTarget)
      console.log('Form data created:', Object.fromEntries(formData))
      
      // Validate form
      const errors = validateForm(formData)
      console.log('Validation errors:', errors)
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        toast.error('Please fix the validation errors')
        return
      }
      
      // Clear previous errors
      setValidationErrors({})
      
      const purchasePrice = formData.get('purchase_price') as string
      const itemData = {
        organization_id: householdId,
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        brand: formData.get('brand') as string || null,
        model: formData.get('model') as string || null,
        serial_number: formData.get('serial_number') as string || null,
        current_quality_rating: formData.get('current_condition') as string || 'good',
        purchase_date: formData.get('purchase_date') as string || null,
        warranty_expiration: formData.get('warranty_expiry') as string || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        primary_location_id: selectedLocationId,
        storage_container_id: selectedContainerId,
        notes: formData.get('maintenance_notes') as string || null,
        created_by: userId
      }

      const { error } = await supabase
        .from('non_consumables')
        .insert(itemData)

      if (error) throw error
      
      await fetchItems()
      setIsAdding(false)
      setSelectedLocationId('')
      setSelectedContainerId(null)
      toast.success('Item added successfully')
      
      // Log activity
      await logActivity('added_non_consumable', `Added ${itemData.name} to inventory`)
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item')
    }
  }

  const updateItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!editingItem || !canManageItems) {
      toast.error('You do not have permission to update items')
      return
    }

    try {
      const formData = new FormData(event.currentTarget)
      
      // Validate form
      const errors = validateForm(formData, true)
      if (Object.keys(errors).length > 0) {
          setValidationErrors(errors)
        toast.error('Please fix the validation errors')
        return
      }
      
      // Clear previous errors
      setValidationErrors({})
      
      const purchasePrice = formData.get('purchase_price') as string
      const itemData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        brand: formData.get('brand') as string || null,
        model: formData.get('model') as string || null,
        serial_number: formData.get('serial_number') as string || null,
        current_quality_rating: formData.get('current_condition') as string,
        purchase_date: formData.get('purchase_date') as string || null,
        warranty_expiration: formData.get('warranty_expiry') as string || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        primary_location_id: editLocationId,
        storage_container_id: editContainerId,
        notes: formData.get('maintenance_notes') as string || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('non_consumables')
        .update(itemData)
        .eq('id', editingItem.id)

      if (error) throw error
      
      await fetchItems()
      setEditingItem(null)
      setEditLocationId('')
      setEditContainerId(null)
      toast.success('Item updated successfully')
      
      // Log activity
      await logActivity('updated_non_consumable', `Updated ${itemData.name}`)
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const deleteItem = async (item: NonConsumable) => {
    if (!canManageItems) {
      toast.error('You do not have permission to delete items')
      return
    }

    if (!confirm(`Delete ${item.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('non_consumables')
        .update({ is_active: false })
        .eq('id', item.id)

      if (error) throw error
      
      await fetchItems()
      toast.success('Item deleted successfully')
      
      // Log activity
      await logActivity('deleted_non_consumable', `Deleted ${item.name}`)
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
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
    const conditionConfig = conditions.find(c => c.value === condition)
    return conditionConfig || conditions[1] // Default to 'good'
  }

  const getFilteredItems = () => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.model?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCondition = !selectedCondition || item.current_quality_rating === selectedCondition
      
      return matchesSearch && matchesCondition
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show detail view if viewing a specific item
  if (viewingDetail) {
    return (
      <NonConsumableDetailView
        itemId={viewingDetail}
        householdId={householdId}
        userId={userId}
        userRole={userRole}
        onBack={() => setViewingDetail(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🔧 Household Items</h2>
        {canManageItems && (
          <button
            onClick={() => {
              console.log('Add Item button clicked')
              setIsAdding(true)
              setValidationErrors({})
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search household items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Conditions</option>
            {conditions.map(condition => (
              <option key={condition.value} value={condition.value}>
                {condition.icon} {condition.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAdding && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAdding(false)
              setSelectedLocationId('')
              setSelectedContainerId(null)
              setValidationErrors({})
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Item</h3>
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setSelectedLocationId('')
                    setSelectedContainerId(null)
                    setValidationErrors({})
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
          <form onSubmit={(e) => {
            console.log('Form onSubmit triggered')
            addItem(e)
          }} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={validationErrors.name ? 'has-error' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DeWalt Drill"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>
              
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DeWalt"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DCD771C2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  name="serial_number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className={validationErrors.primary_location_id ? 'has-error' : ''}>
                <StorageSelector
                  householdId={householdId}
                  selectedLocationId={selectedLocationId}
                  selectedContainerId={selectedContainerId}
                  onLocationChange={setSelectedLocationId}
                  onContainerChange={setSelectedContainerId}
                  required={true}
                />
                {validationErrors.primary_location_id && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.primary_location_id}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Condition
                </label>
                <select
                  name="current_condition"
                  defaultValue="good"
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
                  Purchase Date
                </label>
                <input
                  type="date"
                  name="purchase_date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty Expiry
                </label>
                <input
                  type="date"
                  name="warranty_expiry"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price
                </label>
                <input
                  type="number"
                  name="purchase_price"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Item description..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Notes
              </label>
              <textarea
                name="maintenance_notes"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Maintenance instructions or notes..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false)
                  setSelectedLocationId('')
                  setSelectedContainerId(null)
                  setValidationErrors({})
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  console.log('Button clicked')
                  const form = e.currentTarget.closest('form')
                  if (form) {
                    const formData = new FormData(form)
                    const errors = validateForm(formData)
                    console.log('Validation errors:', errors)
                    
                    if (Object.keys(errors).length > 0) {
                      setValidationErrors(errors)
                      toast.error('Please fix the validation errors')
                    } else {
                      setValidationErrors({})
                      console.log('Form is valid, submitting...')
                      // Create a fake form event to pass to addItem
                      const fakeEvent = {
                        preventDefault: () => {},
                        currentTarget: form
                      } as React.FormEvent<HTMLFormElement>
                      addItem(fakeEvent)
                    }
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getFilteredItems().map((item) => (
          <NonConsumableCard
            key={item.id}
            item={item}
            canEdit={canManageItems}
            onEdit={() => {
              setEditingItem(item)
              setEditLocationId(item.primary_location_id)
              setEditContainerId(item.storage_container_id)
              setValidationErrors({})
            }}
            onDelete={() => deleteItem(item)}
            onShowQRCode={() => setShowQRCode(item)}
            onViewDetail={() => setViewingDetail(item.id)}
            getConditionDisplay={getConditionDisplay}
          />
        ))}
      </div>

      {getFilteredItems().length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedCondition ? 'No items found' : 'No household items yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCondition 
              ? 'Try adjusting your search or filter criteria'
              : 'Add your first household item to get started'
            }
          </p>
          {canManageItems && !searchTerm && !selectedCondition && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add First Item
            </button>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQRCode(null)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code for {showQRCode.name}</h3>
              <button
                onClick={() => setShowQRCode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <QRCodeGenerator
              value={`ITEM:${showQRCode.id}:${showQRCode.name}:non-consumable`}
              itemName={showQRCode.name}
              onClose={() => setShowQRCode(null)}
            />
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingItem(null)
              setEditLocationId('')
              setEditContainerId(null)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit {editingItem.name}</h3>
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setEditLocationId('')
                    setEditContainerId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={updateItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={validationErrors.name ? 'has-error' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingItem.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                    )}
                  </div>
                  
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      defaultValue={editingItem.brand || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      defaultValue={editingItem.model || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      name="serial_number"
                      defaultValue={editingItem.serial_number || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className={validationErrors.primary_location_id ? 'has-error' : ''}>
                    <StorageSelector
                      householdId={householdId}
                      selectedLocationId={editLocationId}
                      selectedContainerId={editContainerId}
                      onLocationChange={(locationId) => {
                        setEditLocationId(locationId)
                        setEditContainerId(null)
                      }}
                      onContainerChange={setEditContainerId}
                      required={true}
                    />
                    {validationErrors.primary_location_id && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.primary_location_id}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Condition
                    </label>
                    <select
                      name="current_condition"
                      defaultValue={editingItem.current_quality_rating}
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
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      name="purchase_date"
                      defaultValue={editingItem.purchase_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      name="warranty_expiry"
                      defaultValue={editingItem.warranty_expiration || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      name="purchase_price"
                      step="0.01"
                      defaultValue={editingItem.purchase_price || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingItem.description || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maintenance Notes
                  </label>
                  <textarea
                    name="maintenance_notes"
                    rows={2}
                    defaultValue={editingItem.notes || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null)
                      setEditLocationId('')
                      setEditContainerId(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NonConsumableCard({ 
  item, 
  canEdit, 
  onEdit, 
  onDelete, 
  onShowQRCode,
  onViewDetail,
  getConditionDisplay
}: {
  item: NonConsumable
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onShowQRCode: () => void
  onViewDetail: () => void
  getConditionDisplay: (condition: string) => any
}) {
  const conditionConfig = getConditionDisplay(item.current_quality_rating)
  
  return (
    <div className="bg-white rounded-lg shadow-md border overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
          {canEdit && (
            <div className="flex space-x-1">
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-blue-600"
                title="Edit item"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Condition Badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conditionConfig.color}`}>
            {conditionConfig.icon} {conditionConfig.label}
          </span>
        </div>

        {/* Item Details */}
        <div className="space-y-2 text-sm text-gray-600 mb-3">
          {item.brand && (
            <p><strong>Brand:</strong> {item.brand}</p>
          )}
          {item.model && (
            <p><strong>Model:</strong> {item.model}</p>
          )}
          {item.household_locations && (
            <p><strong>Location:</strong> {item.household_locations.room_name}
              {item.storage_containers && ` → ${item.storage_containers.name}`}
            </p>
          )}
          {item.purchase_date && (
            <p><strong>Purchased:</strong> {new Date(item.purchase_date).toLocaleDateString()}</p>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onViewDetail}
              className="p-1 text-gray-400 hover:text-green-600"
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={onShowQRCode}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="Generate QR Code"
            >
              <QrCode className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(item.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}