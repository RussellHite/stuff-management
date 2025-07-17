import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { BarChart3, TrendingUp, Activity, PieChart, Calendar, Download, FileText } from 'lucide-react'

export default async function AdminAnalyticsPage() {
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
      currentPage="Analytics"
    >
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
          <p className="text-gray-600">Deep insights into application usage, trends, and performance metrics</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                <p className="text-3xl font-bold text-gray-900">+0%</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement</p>
                <p className="text-3xl font-bold text-gray-900">0%</p>
                <p className="text-xs text-gray-500 mt-1">Daily active</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retention</p>
                <p className="text-3xl font-bold text-gray-900">0%</p>
                <p className="text-xs text-gray-500 mt-1">30-day</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <PieChart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Session</p>
                <p className="text-3xl font-bold text-gray-900">0m</p>
                <p className="text-xs text-gray-500 mt-1">Duration</p>
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
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Comprehensive analytics and reporting features are currently under development. Soon you'll have access to:
            </p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Usage Trends</p>
                  <p className="text-sm text-gray-600">Track application usage patterns over time</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">User Behavior</p>
                  <p className="text-sm text-gray-600">Understand how users interact with features</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Performance Metrics</p>
                  <p className="text-sm text-gray-600">Monitor system performance and response times</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Custom Reports</p>
                  <p className="text-sm text-gray-600">Generate and export detailed reports</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Real-time Dashboards</p>
                  <p className="text-sm text-gray-600">Live data visualization and monitoring</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 mt-0.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Predictive Analytics</p>
                  <p className="text-sm text-gray-600">Forecast trends and user growth</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export Sample Report</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <FileText className="w-4 h-4" />
                <span>View Documentation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}