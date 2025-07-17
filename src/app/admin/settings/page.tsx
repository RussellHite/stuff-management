import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Mail, 
  Key, 
  Globe, 
  Users,
  ToggleLeft,
  Server,
  Zap,
  AlertCircle
} from 'lucide-react'

export default async function AdminSettingsPage() {
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

  return (
    <AdminLayout 
      adminUser={{
        id: user.id,
        email: user.email || '',
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Admin'
      }}
      currentPage="Settings"
    >
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h2>
          <p className="text-gray-600">Configure application settings, security, and system preferences</p>
        </div>

        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">General Settings</h3>
                <p className="text-sm text-gray-600 mt-1">Application name, logo, and basic configuration</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Security</h3>
                <p className="text-sm text-gray-600 mt-1">Authentication, permissions, and access control</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-600 mt-1">Email settings and notification preferences</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <Database className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Database</h3>
                <p className="text-sm text-gray-600 mt-1">Backup, maintenance, and optimization settings</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-red-100">
                <Key className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">API Keys</h3>
                <p className="text-sm text-gray-600 mt-1">Manage API keys and integrations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-indigo-100">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">User Defaults</h3>
                <p className="text-sm text-gray-600 mt-1">Default roles and permissions for new users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg border shadow-sm p-12">
          <div className="text-center">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin-slow" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Settings Panel Coming Soon</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Advanced configuration options are currently under development. Soon you'll be able to:
            </p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="flex items-start space-x-3">
                <ToggleLeft className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Feature Toggles</p>
                  <p className="text-sm text-gray-600">Enable or disable application features</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Server className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">System Configuration</p>
                  <p className="text-sm text-gray-600">Configure system-wide settings</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Zap className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Performance Tuning</p>
                  <p className="text-sm text-gray-600">Optimize application performance</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Bell className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Alert Configuration</p>
                  <p className="text-sm text-gray-600">Set up system alerts and monitoring</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-900">Important Note</p>
                  <p className="text-sm text-amber-700 mt-1">
                    System settings will require super admin privileges to modify critical configurations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}