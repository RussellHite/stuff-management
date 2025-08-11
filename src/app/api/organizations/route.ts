import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/services/apiKeyService'

interface CreateOrganizationRequest {
  name: string
  admin_email: string
  admin_password: string
  plan_type?: 'free' | 'premium' | 'enterprise'
  type?: 'household' | 'business' | 'organization'
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: CreateOrganizationRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.admin_email || !body.admin_password) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, admin_email, admin_password' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.admin_email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 })
    }

    // Check if organization name already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', body.name)
      .single()

    if (existingOrg) {
      return NextResponse.json({ 
        error: 'Organization name already exists' 
      }, { status: 409 })
    }

    // Check if admin email already has an organization
    const { data: existingAdmin } = await supabase
      .from('organization_members')
      .select('id, organizations!inner(id, name)')
      .eq('role', 'admin')
      .single()

    if (existingAdmin) {
      // Get the user profile for this email to check if they're already an admin
      const { data: adminUser } = await supabase.auth.admin.listUsers()
      const userWithEmail = adminUser.users?.find(u => u.email === body.admin_email)
      
      if (userWithEmail) {
        const { data: memberRecord } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', userWithEmail.id)
          .eq('role', 'admin')
          .single()
        
        if (memberRecord) {
          return NextResponse.json({ 
            error: 'Admin email already associated with an organization' 
          }, { status: 409 })
        }
      }
    }

    // Create the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        type: body.type || 'household',
        description: body.description,
        slug: body.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        max_members: body.plan_type === 'enterprise' ? 50 : body.plan_type === 'premium' ? 10 : 5,
        plan_type: body.plan_type || 'free'
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    // Create admin user account
    const { data: adminUser, error: userError } = await supabase.auth.admin.createUser({
      email: body.admin_email,
      password: body.admin_password,
      email_confirm: true
    })

    if (userError) {
      console.error('Error creating admin user:', userError)
      // Cleanup: delete the organization we just created
      await supabase.from('organizations').delete().eq('id', organization.id)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: adminUser.user.id,
        email: body.admin_email,
        first_name: body.name.split(' ')[0] || 'Admin',
        last_name: body.name.split(' ').slice(1).join(' ') || 'User'
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    // Add admin to organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: adminUser.user.id,
        organization_id: organization.id,
        role: 'admin',
        permissions: {
          can_manage_members: true,
          can_manage_locations: true,
          can_manage_items: true,
          can_view_analytics: true
        }
      })

    if (memberError) {
      console.error('Error adding admin to organization:', memberError)
      // Cleanup
      await supabase.auth.admin.deleteUser(adminUser.user.id)
      await supabase.from('organizations').delete().eq('id', organization.id)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Generate API key for the organization
    const apiKey = generateApiKey(organization.id)
    
    // Store API key (you might want to create an api_keys table)
    // For now, we'll return it directly

    // Initialize analytics for the organization
    const { error: analyticsError } = await supabase
      .from('organization_analytics')
      .insert({
        organization_id: organization.id,
        total_members: 1,
        active_members: 1
      })

    if (analyticsError) {
      console.error('Error initializing analytics:', analyticsError)
    }

    // Return success response
    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        plan_type: organization.plan_type,
        max_members: organization.max_members,
        created_at: organization.created_at
      },
      admin: {
        id: adminUser.user.id,
        email: adminUser.user.email,
        created_at: adminUser.user.created_at
      },
      api_key: apiKey,
      message: 'Organization created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in organization creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Check if user is authenticated and is application admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_application_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_application_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type')

    // Build query
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        type,
        description,
        plan_type,
        max_members,
        created_at,
        updated_at
      `)

    if (search) {
      query = query.or(`name.ilike.%${search}%, slug.ilike.%${search}%, description.ilike.%${search}%`)
    }

    if (type) {
      query = query.eq('type', type)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: organizations, error } = await query

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get member counts for each organization
    const organizationsWithCounts = await Promise.all(
      organizations.map(async (org) => {
        const { count: memberCount } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)

        return {
          ...org,
          member_count: memberCount || 0
        }
      })
    )

    return NextResponse.json({
      organizations: organizationsWithCounts,
      pagination: {
        limit,
        offset,
        total: organizations.length
      }
    })

  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}