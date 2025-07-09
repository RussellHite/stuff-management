'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Package, 
  User, 
  Clock, 
  QrCode,
  AlertCircle,
  CheckCircle2,
  Edit
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'
import ConditionTracker from './ConditionTracker'
import QRCodeGenerator from './QRCodeGenerator'

interface NonConsumableDetail {
  id: string
  name: string
  description: string
  brand: string
  model: string
  serial_number: string
  current_quality_rating: string
  purchase_date: string
  warranty_expiration: string
  purchase_price: number
  notes: string
  created_at: string
  updated_at: string
  household_locations: {
    id: string
    room_name: string
    description: string
  }
  storage_containers?: {
    id: string
    name: string
    container_type: string
    description: string
  }
  user_profiles: {
    first_name: string
    last_name: string
  }
}

interface NonConsumableDetailViewProps {
  itemId: string
  householdId: string
  userId: string
  userRole: string
  onBack: () => void
}

export default function NonConsumableDetailView({
  itemId,
  householdId,
  userId,
  userRole,
  onBack
}: NonConsumableDetailViewProps) {
  const [item, setItem] = useState<NonConsumableDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQRCode, setShowQRCode] = useState(false)

  const conditions = [
    { value: 'excellent', label: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200', icon: '✨' },
    { value: 'good', label: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '👍' },
    { value: 'fair', label: 'Fair', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⚠️' },
    { value: 'poor', label: 'Poor', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🔧' },
    { value: 'broken', label: 'Broken', color: 'bg-red-100 text-red-800 border-red-200', icon: '🛠️' }
  ]

  useEffect(() => {
    fetchItemDetails()
  }, [itemId])

  const fetchItemDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('non_consumables')
        .select(`
          *,
          household_locations (
            id,
            room_name,
            description
          ),
          storage_containers (
            id,
            name,
            container_type,
            description
          ),
          user_profiles (
            first_name,
            last_name
          )
        `)
        .eq('id', itemId)
        .single()

      if (error) throw error
      setItem(data)
    } catch (error) {
      console.error('Error fetching item details:', error)
      toast.error('Failed to fetch item details')
    } finally {
      setLoading(false)
    }
  }

  const getConditionDisplay = (condition: string) => {
    return conditions.find(c => c.value === condition) || conditions[1]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getWarrantyStatus = (warrantyExpiry: string) => {
    if (!warrantyExpiry) return null
    
    const expiryDate = new Date(warrantyExpiry)
    const now = new Date()
    const isExpired = expiryDate < now
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (isExpired) {
      return {
        status: 'expired',
        label: 'Expired',
        color: 'bg-red-100 text-red-800',
        icon: '⚠️'
      }
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'expiring',
        label: `Expires in ${daysUntilExpiry} days`,
        color: 'bg-orange-100 text-orange-800',
        icon: '⏰'
      }
    } else {
      return {
        status: 'valid',
        label: `Valid until ${format(expiryDate, 'MMM d, yyyy')}`,
        color: 'bg-green-100 text-green-800',
        icon: '✅'
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Item not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Go back
        </button>
      </div>
    )
  }

  const conditionConfig = getConditionDisplay(item.current_quality_rating)
  const warrantyStatus = getWarrantyStatus(item.warranty_expiration)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Items
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowQRCode(true)}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </button>
        </div>
      </div>

      {/* Item Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${conditionConfig.color}`}>
                {conditionConfig.icon} {conditionConfig.label}
              </span>
              {warrantyStatus && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${warrantyStatus.color}`}>
                  {warrantyStatus.icon} {warrantyStatus.label}
                </span>
              )}
            </div>
            
            {item.description && (
              <p className="text-gray-600 mb-4">{item.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">Brand:</span>
                  <span className="ml-2 text-gray-600">{item.brand || 'Not specified'}</span>
                </div>
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">Model:</span>
                  <span className="ml-2 text-gray-600">{item.model || 'Not specified'}</span>
                </div>
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">Serial:</span>
                  <span className="ml-2 text-gray-600 font-mono">{item.serial_number || 'Not specified'}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">Location:</span>
                  <span className="ml-2 text-gray-600">
                    {item.household_locations.room_name}
                    {item.storage_containers && (
                      <span className="text-blue-600">
                        {" → "}{item.storage_containers.name}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">Purchased:</span>
                  <span className="ml-2 text-gray-600">
                    {item.purchase_date ? format(new Date(item.purchase_date), 'MMM d, yyyy') : 'Not specified'}
                  </span>
                </div>
                {item.purchase_price && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">Cost:</span>
                    <span className="ml-2 text-gray-600">{formatCurrency(item.purchase_price)}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">Added by:</span>
                  <span className="ml-2 text-gray-600">
                    {item.user_profiles.first_name} {item.user_profiles.last_name}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">Added:</span>
                  <span className="ml-2 text-gray-600">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Storage & Maintenance Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Storage & Maintenance</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Storage Location:</span>
                <p className="text-gray-600">
                  📍 {item.household_locations.room_name}
                  {item.storage_containers && (
                    <span className="block text-blue-600 mt-1">
                      📦 {item.storage_containers.name}
                      {item.storage_containers.container_type && (
                        <span className="text-gray-500 ml-2">
                          ({item.storage_containers.container_type})
                        </span>
                      )}
                    </span>
                  )}
                </p>
                {item.storage_containers?.description && (
                  <p className="text-gray-500 text-xs mt-1">
                    {item.storage_containers.description}
                  </p>
                )}
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Last Maintenance:</span>
                <p className="text-gray-600">
                  {item.last_maintenance_date 
                    ? format(new Date(item.last_maintenance_date), 'MMM d, yyyy')
                    : 'Never'
                  }
                </p>
              </div>
              
              {item.notes && (
                <div>
                  <span className="font-medium text-gray-700">Notes:</span>
                  <p className="text-gray-600 text-xs mt-1">{item.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Condition Tracking */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <ConditionTracker
          nonConsumableId={item.id}
          householdId={householdId}
          userId={userId}
          itemName={item.name}
          currentCondition={item.current_condition}
          onConditionUpdated={fetchItemDetails}
        />
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code for {item.name}</h3>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <QRCodeGenerator
              value={`ITEM:${item.id}:${item.name}:non-consumable`}
              itemName={item.name}
              onClose={() => setShowQRCode(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}