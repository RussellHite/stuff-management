import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Check if required environment variables are present
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return response
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    
    // If there's an error getting the user, continue without authentication
    if (error) {
      console.error('Error getting user in middleware:', error)
      return response
    }
  
    // Admin routes (requires admin authentication)
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        return NextResponse.redirect(new URL('/auth/admin-login', request.url))
      }
      
      // Check if user is an application admin
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_application_admin')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('Error getting user profile in middleware:', profileError)
        return NextResponse.redirect(new URL('/auth/admin-login', request.url))
      }
      
      if (!userProfile?.is_application_admin) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  
    // Protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!user) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    // Auth routes (redirect to dashboard if already logged in, except for reset-password)
    if (request.nextUrl.pathname.startsWith('/auth')) {
      // Allow reset-password even if user is authenticated (password reset flow)
      if (request.nextUrl.pathname === '/auth/reset-password') {
        return response
      }
      
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // On any error, just continue to the requested page
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}