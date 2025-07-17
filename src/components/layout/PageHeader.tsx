'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings,
  Menu,
  X,
  LogOut,
  Crown
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

interface PageHeaderProps {
  userName?: string
  userRole?: string
}

export default function PageHeader({ userName, userRole }: PageHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard/household', icon: Home },
    { name: 'Manage', href: '/dashboard/household/manage', icon: Settings },
    { name: 'Shopping', href: '/dashboard/household/shopping', icon: ShoppingCart },
    { name: 'Family', href: '/dashboard/household/family', icon: Users },
  ]

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      window.location.href = '/auth/login'
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const isActive = (href: string) => {
    if (href === '/dashboard/household') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and App Name */}
          <div className="flex items-center">
            <a href="/dashboard/household" className="flex items-center space-x-3">
              {/* Creative Logo */}
              <div className="relative">
                {/* Main container */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  {/* Package/Box icon */}
                  <Package className="h-5 w-5 text-white" />
                </div>
                {/* Small accent dot */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                {/* Small accent line */}
                <div className="absolute -bottom-1 -left-1 w-4 h-1 bg-orange-400 rounded-full"></div>
              </div>
              
              {/* App Name */}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Stuff Happens
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Household Inventory</p>
              </div>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            {userName && (
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {userName}
                  </p>
                  {userRole === 'admin' ? (
                    <div className="flex justify-end">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Crown className="h-3 w-3 mr-1" />
                        Admin
                      </span>
                    </div>
                  ) : userRole && (
                    <p className="text-xs text-gray-500">
                      {userRole === 'manager' ? 'Manager' : 
                       userRole === 'employee' ? 'Member' : 'Viewer'}
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userName[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
            
            {/* Mobile User Info */}
            {userName && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center px-4 py-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-medium">
                      {userName[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    {userRole === 'admin' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                        <Crown className="h-3 w-3 mr-1" />
                        Admin
                      </span>
                    ) : userRole && (
                      <p className="text-xs text-gray-500">
                        {userRole === 'manager' ? 'Manager' : 
                         userRole === 'employee' ? 'Member' : 'Viewer'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}