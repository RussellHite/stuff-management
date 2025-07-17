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
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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
    <div className="p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
                  {org.type || 'household'}
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
  )
}