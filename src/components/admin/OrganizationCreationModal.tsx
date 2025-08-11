'use client'

import { useState } from 'react'
import { X, Building2, Mail, Lock, User, FileText, Zap, Crown, Star } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface OrganizationCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CreateOrganizationForm {
  name: string
  admin_email: string
  admin_password: string
  confirm_password: string
  type: 'household' | 'business' | 'organization'
  plan_type: 'free' | 'premium' | 'enterprise'
  description: string
}

export default function OrganizationCreationModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: OrganizationCreationModalProps) {
  const [form, setForm] = useState<CreateOrganizationForm>({
    name: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '',
    type: 'household',
    plan_type: 'free',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<CreateOrganizationForm>>({})
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateOrganizationForm> = {}

    if (!form.name.trim()) {
      newErrors.name = 'Organization name is required'
    } else if (form.name.length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters'
    } else if (form.name.length > 100) {
      newErrors.name = 'Organization name must be less than 100 characters'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.admin_email.trim()) {
      newErrors.admin_email = 'Admin email is required'
    } else if (!emailRegex.test(form.admin_email)) {
      newErrors.admin_email = 'Please enter a valid email address'
    }

    if (!form.admin_password) {
      newErrors.admin_password = 'Password is required'
    } else if (form.admin_password.length < 8) {
      newErrors.admin_password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.admin_password)) {
      newErrors.admin_password = 'Password must contain uppercase, lowercase, and number'
    }

    if (form.admin_password !== form.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    if (form.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          admin_email: form.admin_email.trim().toLowerCase(),
          admin_password: form.admin_password,
          type: form.type,
          plan_type: form.plan_type,
          description: form.description.trim() || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Organization "${data.organization.name}" created successfully!`)
        setForm({
          name: '',
          admin_email: '',
          admin_password: '',
          confirm_password: '',
          type: 'household',
          plan_type: 'free',
          description: ''
        })
        onSuccess()
        onClose()
      } else {
        toast.error(data.error || 'Failed to create organization')
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error('Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateOrganizationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const getPlanFeatures = (planType: string) => {
    switch (planType) {
      case 'free':
        return {
          members: 5,
          features: ['Basic inventory tracking', 'Location management', 'Mobile app access'],
          icon: <FileText className="w-5 h-5" />,
          color: 'text-gray-600'
        }
      case 'premium':
        return {
          members: 10,
          features: ['Advanced analytics', 'Custom categories', 'Priority support', 'Export data'],
          icon: <Zap className="w-5 h-5" />,
          color: 'text-blue-600'
        }
      case 'enterprise':
        return {
          members: 50,
          features: ['Unlimited everything', 'API access', 'Custom integrations', 'Dedicated support'],
          icon: <Crown className="w-5 h-5" />,
          color: 'text-purple-600'
        }
      default:
        return { members: 5, features: [], icon: null, color: 'text-gray-600' }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'household': return '🏠'
      case 'business': return '🏢'
      case 'organization': return '🏛️'
      default: return '🏠'
    }
  }

  if (!isOpen) return null

  const currentPlan = getPlanFeatures(form.plan_type)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Create Organization</h3>
                <p className="text-sm text-gray-500">Set up a new organization with an admin account</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                Organization Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Smith Family Household"
                    maxLength={100}
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="household">{getTypeIcon('household')} Household</option>
                    <option value="business">{getTypeIcon('business')} Business</option>
                    <option value="organization">{getTypeIcon('organization')} Organization</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Brief description of the organization..."
                  maxLength={500}
                />
                {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                <p className="text-xs text-gray-500 mt-1">{form.description.length}/500 characters</p>
              </div>
            </div>

            {/* Admin Account */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Admin Account
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="email"
                      value={form.admin_email}
                      onChange={(e) => handleInputChange('admin_email', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.admin_email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="admin@example.com"
                    />
                  </div>
                  {errors.admin_email && <p className="text-sm text-red-600 mt-1">{errors.admin_email}</p>}
                  <p className="text-xs text-gray-500 mt-1">This will be the primary admin account</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.admin_password}
                      onChange={(e) => handleInputChange('admin_password', e.target.value)}
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.admin_password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.admin_password && <p className="text-sm text-red-600 mt-1">{errors.admin_password}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.confirm_password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                {errors.confirm_password && <p className="text-sm text-red-600 mt-1">{errors.confirm_password}</p>}
              </div>
            </div>

            {/* Plan Selection */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Plan Selection
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['free', 'premium', 'enterprise'] as const).map((planType) => {
                  const plan = getPlanFeatures(planType)
                  return (
                    <label
                      key={planType}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer hover:bg-white transition-colors ${
                        form.plan_type === planType
                          ? 'border-red-500 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan_type"
                        value={planType}
                        checked={form.plan_type === planType}
                        onChange={(e) => handleInputChange('plan_type', e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className={`mx-auto mb-2 ${plan.color}`}>
                          {plan.icon}
                        </div>
                        <h5 className="font-medium text-gray-900 capitalize mb-1">{planType}</h5>
                        <p className="text-sm text-gray-500 mb-2">Up to {plan.members} members</p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          {plan.features.map((feature, index) => (
                            <li key={index}>• {feature}</li>
                          ))}
                        </ul>
                      </div>
                      {form.plan_type === planType && (
                        <div className="absolute top-2 right-2">
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Organization: <strong>{form.name || 'Not specified'}</strong></p>
                <p>• Type: <strong className="capitalize">{form.type}</strong></p>
                <p>• Plan: <strong className="capitalize">{form.plan_type}</strong> (up to {currentPlan.members} members)</p>
                <p>• Admin: <strong>{form.admin_email || 'Not specified'}</strong></p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Creating Organization...' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}