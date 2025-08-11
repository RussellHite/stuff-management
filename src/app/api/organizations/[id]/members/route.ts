import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member of this organization
    const { data: requesterMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!requesterMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const role = searchParams.get('role')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        permissions,
        joined_at,
        created_at,
        updated_at,
        user_profiles!organization_members_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          created_at
        )
      `)
      .eq('organization_id', organizationId)

    if (role) {
      query = query.eq('role', role)
    }

    if (!includeInactive) {
      // Only include active members (you might want to add an is_active column)
      query = query.not('user_profiles.id', 'is', null)
    }

    query = query
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: members, error } = await query

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, max_members')
      .eq('id', organizationId)
      .single()

    // Transform the data for response
    const membersData = members.map(member => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      permissions: member.permissions,
      joined_at: member.joined_at,
      profile: member.user_profiles ? {
        id: (member.user_profiles as any).id,
        email: (member.user_profiles as any).email,
        first_name: (member.user_profiles as any).first_name,
        last_name: (member.user_profiles as any).last_name,
        full_name: (member.user_profiles as any).first_name && (member.user_profiles as any).last_name 
          ? `${(member.user_profiles as any).first_name} ${(member.user_profiles as any).last_name}`.trim()
          : (member.user_profiles as any).email,
        avatar_url: (member.user_profiles as any).avatar_url,
        member_since: (member.user_profiles as any).created_at
      } : null
    }))

    return NextResponse.json({
      members: membersData,
      organization: {
        name: organization?.name,
        member_count: members.length,
        max_members: organization?.max_members
      },
      pagination: {
        limit,
        offset,
        total: members.length
      }
    })

  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to add members
    const { data: requesterMember } = await supabase
      .from('organization_members')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!requesterMember || !['admin', 'manager'].includes(requesterMember.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate request body
    if (!body.user_id || !body.role) {
      return NextResponse.json({ 
        error: 'user_id and role are required' 
      }, { status: 400 })
    }

    if (!['admin', 'manager', 'member'].includes(body.role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, manager, or member' 
      }, { status: 400 })
    }

    // Check if user exists
    const { data: targetUser } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .eq('id', body.user_id)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('user_id', body.user_id)
      .eq('organization_id', organizationId)
      .single()

    if (existingMember) {
      return NextResponse.json({ 
        error: 'User is already a member of this organization' 
      }, { status: 409 })
    }

    // Check organization member limit
    const { data: organization } = await supabase
      .from('organizations')
      .select('max_members')
      .eq('id', organizationId)
      .single()

    const { count: currentMembers } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if ((currentMembers || 0) >= (organization?.max_members || 5)) {
      return NextResponse.json({ 
        error: 'Organization has reached maximum member limit' 
      }, { status: 400 })
    }

    // Set default permissions based on role
    const defaultPermissions = {
      member: {
        can_view_items: true,
        can_add_items: true,
        can_edit_own_items: true,
        can_delete_own_items: true
      },
      manager: {
        can_view_items: true,
        can_add_items: true,
        can_edit_items: true,
        can_delete_items: true,
        can_manage_locations: true,
        can_invite_members: true
      },
      admin: {
        can_view_items: true,
        can_add_items: true,
        can_edit_items: true,
        can_delete_items: true,
        can_manage_locations: true,
        can_manage_members: true,
        can_invite_members: true,
        can_view_analytics: true
      }
    }

    const permissions = body.permissions || defaultPermissions[body.role as keyof typeof defaultPermissions]

    // Add user to organization
    const { data: newMember, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: body.user_id,
        organization_id: organizationId,
        role: body.role,
        permissions: permissions,
        joined_at: new Date().toISOString()
      })
      .select(`
        id,
        user_id,
        role,
        permissions,
        joined_at,
        user_profiles!organization_members_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .single()

    if (memberError) {
      console.error('Error adding member:', memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Log admin activity
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: user.id,
        action: 'add_member',
        target_type: 'user',
        target_id: body.user_id,
        organization_id: organizationId,
        details: {
          added_user_email: targetUser.email,
          role: body.role,
          method: 'direct_add'
        }
      })

    return NextResponse.json({
      member: {
        id: newMember.id,
        user_id: newMember.user_id,
        role: newMember.role,
        permissions: newMember.permissions,
        joined_at: newMember.joined_at,
        profile: newMember.user_profiles
      },
      message: 'Member added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding organization member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}