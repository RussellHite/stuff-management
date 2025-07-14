'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Logged in successfully!')
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        toast.error(error.message)
      } else {
        setMagicLinkSent(true)
        toast.success('Magic link sent to your email!')
      }
    } catch (error) {
      toast.error('An error occurred sending the magic link')
    } finally {
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">Check Your Email</h2>
        <p className="text-center text-gray-600 mb-4">
          We've sent a magic link to <strong>{email}</strong>
        </p>
        <p className="text-center text-sm text-gray-500 mb-4">
          Click the link in your email to sign in. You can close this window.
        </p>
        <button
          onClick={() => {
            setMagicLinkSent(false)
            setEmail('')
          }}
          className="w-full text-blue-600 hover:text-blue-700 text-sm"
        >
          Try a different email
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-gray-500">or</span>
      </div>

      <button
        onClick={handleMagicLink}
        disabled={loading}
        className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <a href="/auth/signup" className="text-blue-600 hover:text-blue-700">
          Sign up
        </a>
      </p>
    </div>
  )
}