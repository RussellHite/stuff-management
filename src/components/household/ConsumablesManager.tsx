'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Minus, QrCode, AlertTriangle, Package, Search, Filter } from 'lucide-react'
import { toast } from 'react-hot-toast'
import QRCodeGenerator from './QRCodeGenerator'
import RichTextEditor from './RichTextEditor'
import StorageSelector from './StorageSelector'

interface Consumable {
  id: string
  name: string
  description: string | null
  brand: string | null
  size_quantity: string | null
  current_quantity: number
  reorder_threshold: number
  reorder_info: string | null
  cost_per_unit: number | null
  primary_location_id: string | null
  storage_container_id: string | null
  qr_code: string | null
  barcode: string | null
  expiration_date: string | null
  purchase_date: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  household_locations?: {
    id: string
    room_name: string
  }
  storage_containers?: {
    name: string
    container_type: string
  }
}

interface Location {
  id: string
  room_name: string
}

interface ConsumablesManagerProps {
  householdId: string
  userRole: string
  userId: string
}

export default function ConsumablesManager({ householdId, userRole, userId }: ConsumablesManagerProps) {
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<Consumable | null>(null)
  const [showQRCode, setShowQRCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'low_stock' | 'expired'>('all')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null)
  const [editLocationId, setEditLocationId] = useState('')
  const [editContainerId, setEditContainerId] = useState<string | null>(null)

  const canEdit = userRole === 'admin' || userRole === 'manager' || userRole === 'employee'

  useEffect(() => {
    fetchConsumables()
    fetchLocations()
  }, [householdId])

  const fetchConsumables = async () => {
    try {
      const { data, error } = await supabase
        .from('consumables')
        .select(`
          *,
          household_locations (
            id,
            room_name
          ),
          storage_containers (
            name,
            container_type
          )
        `)
        .eq('organization_id', householdId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setConsumables(data || [])
    } catch (error) {
      toast.error('Failed to fetch consumables')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('household_locations')
        .select('id, room_name')
        .eq('organization_id', householdId)
        .order('room_name')

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      toast.error('Failed to fetch locations')
    }
  }

  const handleAddItem = async (formData: FormData) => {
    const itemData = {
      organization_id: householdId,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      brand: formData.get('brand') as string || null,
      size_quantity: formData.get('size_quantity') as string || null,
      current_quantity: parseInt(formData.get('current_quantity') as string) || 0,
      reorder_threshold: parseInt(formData.get('reorder_threshold') as string) || 1,
      reorder_info: formData.get('reorder_info') as string || null,
      cost_per_unit: parseFloat(formData.get('cost_per_unit') as string) || null,
      primary_location_id: selectedLocationId || null,
      storage_container_id: selectedContainerId,
      barcode: formData.get('barcode') as string || null,
      expiration_date: formData.get('expiration_date') as string || null,
      purchase_date: formData.get('purchase_date') as string || null,
      notes: formData.get('notes') as string || null,
      created_by: userId,
      qr_code: `CONSUMABLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    try {
      const { data, error } = await supabase
        .from('consumables')
        .insert([itemData])
        .select(`
          *,
          household_locations (
            id,
            room_name
          ),
          storage_containers (
            name,
            container_type
          )
        `)

      if (error) throw error
      
      setConsumables([...consumables, data[0]])
      setIsAddingItem(false)
      setSelectedLocationId('')
      setSelectedContainerId(null)
      
      // Log activity
      await logActivity('added_item', `Added ${itemData.name} to household inventory`, data[0].id)
      
      toast.success('Item added successfully')
    } catch (error) {
      toast.error('Failed to add item')
    }
  }

  const handleEditItem = async (formData: FormData) => {
    if (!editingItem) return

    const itemData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      brand: formData.get('brand') as string || null,
      size_quantity: formData.get('size_quantity') as string || null,
      reorder_threshold: parseInt(formData.get('reorder_threshold') as string) || 1,
      reorder_info: formData.get('reorder_info') as string || null,
      cost_per_unit: parseFloat(formData.get('cost_per_unit') as string) || null,
      primary_location_id: editLocationId || null,
      storage_container_id: editContainerId,
      barcode: formData.get('barcode') as string || null,
      expiration_date: formData.get('expiration_date') as string || null,
      purchase_date: formData.get('purchase_date') as string || null,
      notes: formData.get('notes') as string || null,
      updated_at: new Date().toISOString()
    }

    try {
      const { error } = await supabase
        .from('consumables')
        .update(itemData)
        .eq('id', editingItem.id)

      if (error) throw error
      
      setConsumables(consumables.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...itemData }
          : item
      ))
      
      setEditingItem(null)
      setEditLocationId('')
      setEditContainerId(null)
      
      // Log activity
      await logActivity('updated_item', `Updated ${itemData.name} details`, editingItem.id)
      
      toast.success('Item updated successfully')
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete ${itemName}?`)) return

    try {
      const { error } = await supabase
        .from('consumables')
        .update({ is_active: false })
        .eq('id', itemId)

      if (error) throw error
      
      setConsumables(consumables.filter(item => item.id !== itemId))
      
      // Log activity
      await logActivity('deleted_item', `Removed ${itemName} from household inventory`, itemId)
      
      toast.success('Item deleted successfully')
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  const handleQuantityChange = async (itemId: string, newQuantity: number, itemName: string) => {
    if (newQuantity < 0) return

    const item = consumables.find(c => c.id === itemId)
    if (!item) return

    const oldQuantity = item.current_quantity

    try {
      const { error } = await supabase
        .from('consumables')
        .update({ current_quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error
      
      setConsumables(consumables.map(item => 
        item.id === itemId 
          ? { ...item, current_quantity: newQuantity }
          : item
      ))
      
      // Log activity
      const change = newQuantity - oldQuantity
      const changeText = change > 0 ? `increased by ${change}` : `decreased by ${Math.abs(change)}`
      await logActivity('updated_quantity', `${itemName} quantity ${changeText} (${oldQuantity} → ${newQuantity})`, itemId)
      
      // Check if it went below reorder threshold
      if (oldQuantity > item.reorder_threshold && newQuantity <= item.reorder_threshold) {
        toast.success('Quantity updated - Item automatically added to shopping list', { duration: 4000 })
      } else {
        toast.success('Quantity updated')
      }
    } catch (error) {
      toast.error('Failed to update quantity')
    }
  }

  const logActivity = async (activityType: string, description: string, itemId?: string) => {
    try {
      await supabase.rpc('log_family_activity', {
        org_id: householdId,
        user_id: userId,
        activity_type: activityType,
        description: description,
        item_id: itemId,
        item_type: 'consumable',
        metadata: {}
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  const filteredConsumables = consumables.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.household_locations?.room_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    switch (filterBy) {
      case 'low_stock':
        return item.current_quantity <= item.reorder_threshold
      case 'expired':
        return item.expiration_date && new Date(item.expiration_date) < new Date()
      default:
        return true
    }
  })

  const ConsumableForm = ({ item, onSubmit }: { item?: Consumable, onSubmit: (formData: FormData) => void }) => (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <input
            type="text"
            name="name"
            defaultValue={item?.name}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Laundry Detergent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand
          </label>
          <input
            type="text"
            name="brand"
            defaultValue={item?.brand || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Tide"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Size/Quantity
          </label>
          <input
            type="text"
            name="size_quantity"
            defaultValue={item?.size_quantity || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 64 fl oz, 12 pack"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Quantity *
          </label>
          <input
            type="number"
            name="current_quantity"
            defaultValue={item?.current_quantity || 0}
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reorder Threshold *
          </label>
          <input
            type="number"
            name="reorder_threshold"
            defaultValue={item?.reorder_threshold || 1}
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost per Unit
          </label>
          <input
            type="number"
            name="cost_per_unit"
            defaultValue={item?.cost_per_unit || ''}
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <StorageSelector
            householdId={householdId}
            selectedLocationId={item ? editLocationId : selectedLocationId}
            selectedContainerId={item ? editContainerId : selectedContainerId}
            onLocationChange={item ? (id) => { setEditLocationId(id); setEditContainerId(null); } : (id) => { setSelectedLocationId(id); setSelectedContainerId(null); }}
            onContainerChange={item ? setEditContainerId : setSelectedContainerId}
            showContainerSelection={true}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Barcode
          </label>
          <input
            type="text"
            name="barcode"
            defaultValue={item?.barcode || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Scan or enter barcode"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiration Date
          </label>
          <input
            type="date"
            name="expiration_date"
            defaultValue={item?.expiration_date || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Date
          </label>
          <input
            type="date"
            name="purchase_date"
            defaultValue={item?.purchase_date || ''}
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
          defaultValue={item?.description || ''}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of the item"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reorder Information
        </label>
        <RichTextEditor
          name="reorder_info"
          defaultValue={item?.reorder_info || ''}
          placeholder="Add store links, specific product details, or purchasing notes..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          defaultValue={item?.notes || ''}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional notes"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setIsAddingItem(false)
            setEditingItem(null)
            setSelectedLocationId('')
            setSelectedContainerId(null)
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
          {item ? 'Update' : 'Add'} Item
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
        <h2 className="text-2xl font-bold text-gray-900">🥫 Consumables</h2>
        {canEdit && (
          <button
            onClick={() => setIsAddingItem(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search consumables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Items</option>
            <option value="low_stock">Low Stock</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddingItem(false)
              setSelectedLocationId('')
              setSelectedContainerId(null)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Consumable</h3>
                <button
                  onClick={() => {
                    setIsAddingItem(false)
                    setSelectedLocationId('')
                    setSelectedContainerId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <ConsumableForm onSubmit={handleAddItem} />
            </div>
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Consumable</h3>
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
              <ConsumableForm item={editingItem} onSubmit={handleEditItem} />
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <QRCodeGenerator
          value={showQRCode}
          itemName={consumables.find(c => c.qr_code === showQRCode)?.name || ''}
          onClose={() => setShowQRCode(null)}
        />
      )}

      {/* Consumables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConsumables.map((item) => (
          <ConsumableCard
            key={item.id}
            item={item}
            canEdit={canEdit}
            onEdit={() => {
              setEditingItem(item)
              setEditLocationId(item.primary_location_id || '')
              setEditContainerId(item.storage_container_id)
            }}
            onDelete={() => handleDeleteItem(item.id, item.name)}
            onQuantityChange={(newQuantity) => handleQuantityChange(item.id, newQuantity, item.name)}
            onShowQRCode={() => setShowQRCode(item.qr_code)}
          />
        ))}
      </div>

      {filteredConsumables.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🥫</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterBy !== 'all' ? 'No items found' : 'No consumables yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterBy !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Add your first consumable item to get started'
            }
          </p>
          {canEdit && !searchTerm && filterBy === 'all' && (
            <button
              onClick={() => setIsAddingItem(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add First Item
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ConsumableCard({ 
  item, 
  canEdit, 
  onEdit, 
  onDelete, 
  onQuantityChange,
  onShowQRCode 
}: {
  item: Consumable
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onQuantityChange: (newQuantity: number) => void
  onShowQRCode: () => void
}) {
  const isLowStock = item.current_quantity <= item.reorder_threshold
  const isExpired = item.expiration_date && new Date(item.expiration_date) < new Date()

  return (
    <div className="bg-white rounded-lg shadow-md border overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
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

        {item.brand && (
          <p className="text-sm text-gray-600 mb-2">{item.brand}</p>
        )}

        {item.size_quantity && (
          <p className="text-sm text-gray-500 mb-2">{item.size_quantity}</p>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {canEdit && (
              <button
                onClick={() => onQuantityChange(item.current_quantity - 1)}
                disabled={item.current_quantity <= 0}
                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
            <span className="text-xl font-bold text-gray-900 px-3">
              {item.current_quantity}
            </span>
            {canEdit && (
              <button
                onClick={() => onQuantityChange(item.current_quantity + 1)}
                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={onShowQRCode}
            className="p-1 text-gray-400 hover:text-blue-600"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap gap-1 mb-3">
          {isLowStock && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Low Stock
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Expired
            </span>
          )}
        </div>

        {/* Location */}
        {item.household_locations && (
          <p className="text-sm text-gray-500 mb-2">
            📍 {item.household_locations.room_name}
            {item.storage_containers && ` → ${item.storage_containers.name}`}
          </p>
        )}

        {/* Reorder threshold */}
        <p className="text-xs text-gray-500">
          Reorder at: {item.reorder_threshold}
        </p>
      </div>
    </div>
  )
}