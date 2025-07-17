import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { Users, UserPlus, Search, Filter, Mail, Calendar, Shield } from 'lucide-react'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/admin-login')
  }

  // Double-check admin status
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('is_application_admin, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!userProfile?.is_application_admin) {
    redirect('/dashboard')
  }

  // Get some basic user stats for the placeholder
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  const { count: adminUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_application_admin', true)

  return (
    <AdminLayout 
      adminUser={{
        id: user.id,
        email: user.email || '',
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Admin'
      }}
      currentPage="Users"
    >
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">User Management</h2>
          <p className="text-gray-600">Manage application users, permissions, and access levels</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{totalUsers || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-3xl font-bold text-gray-900">{adminUsers || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Week</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg border shadow-sm p-12">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">User Management Coming Soon</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              The user management interface is currently under development. Soon you'll be able to:
            </p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">View All Users</p>
                  <p className="text-sm text-gray-600">Browse and search through all registered users</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Manage Permissions</p>
                  <p className="text-sm text-gray-600">Control user roles and access levels</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">User Activity</p>
                  <p className="text-sm text-gray-600">Track login history and user actions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Bulk Actions</p>
                  <p className="text-sm text-gray-600">Perform bulk operations on multiple users</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}