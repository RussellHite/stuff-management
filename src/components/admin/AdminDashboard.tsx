'use client'

import { useState } from 'react'
import { 
  Users, 
  Building2, 
  Package, 
  MapPin, 
  TrendingUp, 
  Activity,
  Calendar,
  Search,
  Settings,
  BarChart3,
  Shield,
  LogOut
} from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  name: string
}

interface UsageStats {
  total_organizations: number
  total_users: number
  total_items: number
  total_locations: number
  active_organizations: number
  active_users: number
  new_organizations_today: number
  new_users_today: number
  items_created_today: number
  logins_today: number
}

interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  type: string
}

interface AdminDashboardProps {
  adminUser: AdminUser
  stats: UsageStats
  recentOrganizations: Organization[]
  topOrganizations: any[]
}

export default function AdminDashboard({ 
  adminUser, 
  stats, 
  recentOrganizations,
  topOrganizations 
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleLogout = async () => {
    // TODO: Implement logout
    window.location.href = '/auth/admin-login'
  }

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }: {
    title: string
    value: number | string
    change?: number
    icon: any
    color?: string
  }) => (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(Number(value))}</p>
          {change !== undefined && (
            <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {change >= 0 ? '+' : ''}{change} today
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${
          color === 'blue' ? 'bg-blue-100' :
          color === 'green' ? 'bg-green-100' :
          color === 'purple' ? 'bg-purple-100' :
          color === 'orange' ? 'bg-orange-100' :
          'bg-blue-100'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'blue' ? 'text-blue-600' :
            color === 'green' ? 'text-green-600' :
            color === 'purple' ? 'text-purple-600' :
            color === 'orange' ? 'text-orange-600' :
            'text-blue-600'
          }`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
              <p className="text-xs text-gray-500">{adminUser.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'organizations', label: 'Organizations', icon: Building2 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Organizations"
                value={stats.total_organizations}
                change={stats.new_organizations_today}
                icon={Building2}
                color="blue"
              />
              <StatCard
                title="Total Users"
                value={stats.total_users}
                change={stats.new_users_today}
                icon={Users}
                color="green"
              />
              <StatCard
                title="Total Items"
                value={stats.total_items}
                change={stats.items_created_today}
                icon={Package}
                color="purple"
              />
              <StatCard
                title="Active Organizations"
                value={stats.active_organizations}
                icon={Activity}
                color="orange"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Organizations */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Organizations</h3>
                <div className="space-y-4">
                  {recentOrganizations.slice(0, 5).map((org) => (
                    <div key={org.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-sm text-gray-500">Created {formatDate(org.created_at)}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {org.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Health */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database Status</span>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Healthy
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Users Today</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNumber(stats.active_users)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Logins Today</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNumber(stats.logins_today)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Items Created Today</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNumber(stats.items_created_today)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'organizations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Members
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrganizations.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{org.name}</div>
                            <div className="text-sm text-gray-500">{org.slug}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {org.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(org.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-red-600 hover:text-red-900">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
            <p className="text-gray-600">User management functionality coming soon...</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h2>
            <p className="text-gray-600">Advanced analytics dashboard coming soon...</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h2>
            <p className="text-gray-600">System configuration options coming soon...</p>
          </div>
        )}
      </main>
    </div>
  )
}