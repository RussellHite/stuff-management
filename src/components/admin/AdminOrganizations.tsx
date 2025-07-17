'use client'

import { useState } from 'react'
import { 
  Search, 
  Filter, 
  Users, 
  Package, 
  MapPin, 
  Calendar,
  ExternalLink,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Shield,
  Home,
  Tag,
  Plus,
  X
} from 'lucide-react'
import Link from 'next/link'

interface AdminUser {
  id: string
  email: string
  name: string
}

interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  created_at: string
  onboarding_completed: boolean
  tags: Record<string, string> | null
  memberCount: number
  adminCount: number
  latestAnalytics: {
    total_consumables: number
    total_non_consumables: number
    total_locations: number
    total_containers: number
  } | null
}

interface AdminOrganizationsProps {
  organizations: Organization[]
  adminUser: AdminUser
}

export default function AdminOrganizations({ organizations, adminUser }: AdminOrganizationsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [tagFilter, setTagFilter] = useState('')
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [newTag, setNewTag] = useState({ category: '', value: '' })

  // Get available tag categories and values
  const tagCategories = ['account_status', 'testing', 'program', 'support']
  const tagValues = {
    account_status: ['free_user', 'subscribed_user', 'trial_user', 'suspended_user'],
    testing: ['test_account', 'beta_tester', 'production_user'],
    program: ['early_adopter', 'referral_user', 'invited_user'],
    support: ['priority_support', 'standard_support']
  }

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || org.type === filterType
    
    // Tag filter
    const matchesTag = tagFilter === '' || 
      (org.tags && Object.values(org.tags).some(value => 
        value.toLowerCase().includes(tagFilter.toLowerCase())
      ))
    
    return matchesSearch && matchesFilter && matchesTag
  }).sort((a, b) => {
    if (sortBy === 'created_at') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sortBy === 'members') {
      return b.memberCount - a.memberCount
    }
    return 0
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const updateOrganizationTags = async (orgId: string, category: string, value: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, value })
      })
      
      if (response.ok) {
        // Refresh the page to show updated tags
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating tags:', error)
    }
  }

  const removeOrganizationTag = async (orgId: string, category: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/tags/${category}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Refresh the page to show updated tags
        window.location.reload()
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const renderTags = (organization: Organization) => {
    if (!organization.tags) return null

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(organization.tags).map(([category, value]) => (
          <span
            key={category}
            className={`px-2 py-1 text-xs rounded-full ${
              category === 'account_status' ? 'bg-blue-100 text-blue-800' :
              category === 'testing' ? 'bg-green-100 text-green-800' :
              category === 'program' ? 'bg-purple-100 text-purple-800' :
              category === 'support' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}
          >
            {value}
            {editingTags === organization.id && (
              <button
                onClick={() => removeOrganizationTag(organization.id, category)}
                className="ml-1 text-red-500 hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <Shield className="w-6 h-6" />
              <span className="font-medium">Admin</span>
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
            <p className="text-xs text-gray-500">{adminUser.email}</p>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Types</option>
              <option value="household">Household</option>
              <option value="business">Business</option>
              <option value="organization">Organization</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="created_at">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="members">Sort by Members</option>
            </select>

            <div className="relative">
              <Tag className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by tags..."
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-48"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {filteredOrganizations.length} of {organizations.length} organizations
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(organizations.length)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(organizations.reduce((sum, org) => sum + org.memberCount, 0))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Onboarding</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(organizations.filter(org => org.onboarding_completed).length)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(organizations.reduce((sum, org) => 
                    sum + (org.latestAnalytics?.total_consumables || 0) + (org.latestAnalytics?.total_non_consumables || 0), 0
                  ))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.slug}</div>
                        {org.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">
                            {org.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {org.type}
                        </span>
                        {renderTags(org)}
                        {editingTags === org.id && (
                          <div className="mt-2 flex space-x-2">
                            <select
                              value={newTag.category}
                              onChange={(e) => setNewTag({...newTag, category: e.target.value})}
                              className="text-xs px-2 py-1 border rounded"
                            >
                              <option value="">Select category</option>
                              {tagCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <select
                              value={newTag.value}
                              onChange={(e) => setNewTag({...newTag, value: e.target.value})}
                              className="text-xs px-2 py-1 border rounded"
                              disabled={!newTag.category}
                            >
                              <option value="">Select value</option>
                              {newTag.category && tagValues[newTag.category as keyof typeof tagValues]?.map(val => (
                                <option key={val} value={val}>{val}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (newTag.category && newTag.value) {
                                  updateOrganizationTags(org.id, newTag.category, newTag.value)
                                }
                              }}
                              className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{org.memberCount}</span>
                        <span className="text-xs text-gray-500 ml-1">({org.adminCount} admin)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {formatNumber((org.latestAnalytics?.total_consumables || 0) + (org.latestAnalytics?.total_non_consumables || 0))}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {formatNumber(org.latestAnalytics?.total_locations || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        org.onboarding_completed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {org.onboarding_completed ? 'Active' : 'Onboarding'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(org.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link 
                          href={`/admin/organizations/${org.id}`}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => setEditingTags(editingTags === org.id ? null : org.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredOrganizations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏠</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No organizations have been created yet'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}