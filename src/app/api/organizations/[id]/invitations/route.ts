import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/services/emailService'

interface SendInvitationRequest {
  email: string
  role?: 'admin' | 'manager' | 'member'
  personal_message?: string
  permissions?: Record<string, boolean>
}

interface BulkInvitationRequest {
  invitations: Array<{
    email: string
    role?: 'admin' | 'manager' | 'member'
    personal_message?: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to invite members
    const { data: member } = await supabase
      .from('organization_members')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!member || !['admin', 'manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const contentType = request.headers.get('content-type')
    
    // Handle bulk invitations
    if (body.invitations && Array.isArray(body.invitations)) {
      return handleBulkInvitations(supabase, organizationId, user.id, body as BulkInvitationRequest)
    }

    // Handle single invitation
    return handleSingleInvitation(supabase, organizationId, user.id, body as SendInvitationRequest)

  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleSingleInvitation(
  supabase: any,
  organizationId: string,
  inviterId: string,
  body: SendInvitationRequest
) {
  // Validate required fields
  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Get organization details
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('name, max_members')
    .eq('id', organizationId)
    .single()

  if (orgError || !organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Check member limit
  const { count: currentMembers } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  const { count: pendingInvitations } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')

  if ((currentMembers || 0) + (pendingInvitations || 0) >= organization.max_members) {
    return NextResponse.json({ 
      error: `Organization has reached maximum member limit of ${organization.max_members}` 
    }, { status: 400 })
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', (await getUserByEmail(supabase, body.email))?.id)
    .single()

  if (existingMember) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
  }

  // Check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id, expires_at')
    .eq('organization_id', organizationId)
    .eq('email', body.email.toLowerCase())
    .eq('status', 'pending')
    .single()

  if (existingInvitation) {
    // Check if invitation is still valid
    if (new Date(existingInvitation.expires_at) > new Date()) {
      return NextResponse.json({ 
        error: 'Pending invitation already exists for this email' 
      }, { status: 409 })
    } else {
      // Mark expired invitation as expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', existingInvitation.id)
    }
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

  const role = body.role || 'member'
  const permissions = body.permissions || defaultPermissions[role]

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email: body.email.toLowerCase(),
      role: role,
      permissions: permissions,
      personal_message: body.personal_message,
      created_by: inviterId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    })
    .select()
    .single()

  if (inviteError) {
    console.error('Error creating invitation:', inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Send invitation email
  try {
    await sendInvitationEmail({
      to: body.email,
      organizationName: organization.name,
      inviterName: await getInviterName(supabase, inviterId),
      invitationToken: invitation.token,
      role: role,
      personalMessage: body.personal_message,
      expiresAt: invitation.expires_at
    })

    // Update invitation with sent timestamp
    await supabase
      .from('invitations')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', invitation.id)

  } catch (emailError) {
    console.error('Error sending invitation email:', emailError)
    // Don't fail the request if email fails, just log it
  }

  // Log admin activity
  await supabase
    .from('admin_activity_log')
    .insert({
      admin_user_id: inviterId,
      action: 'send_invitation',
      target_type: 'invitation',
      target_id: invitation.id,
      organization_id: organizationId,
      details: {
        email: body.email,
        role: role,
        has_personal_message: !!body.personal_message
      }
    })

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at
    },
    message: 'Invitation sent successfully'
  }, { status: 201 })
}

async function handleBulkInvitations(
  supabase: any,
  organizationId: string,
  inviterId: string,
  body: BulkInvitationRequest
) {
  if (!body.invitations || body.invitations.length === 0) {
    return NextResponse.json({ error: 'No invitations provided' }, { status: 400 })
  }

  if (body.invitations.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 invitations per batch' }, { status: 400 })
  }

  const results = []
  const errors = []

  for (const invitation of body.invitations) {
    try {
      const result = await handleSingleInvitation(supabase, organizationId, inviterId, invitation)
      const response = await result.json()
      
      if (result.status === 201) {
        results.push({ email: invitation.email, success: true, data: response })
      } else {
        errors.push({ email: invitation.email, error: response.error })
      }
    } catch (error) {
      errors.push({ email: invitation.email, error: 'Failed to process invitation' })
    }
  }

  return NextResponse.json({
    successful: results.length,
    failed: errors.length,
    results,
    errors
  }, { status: 200 })
}

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

    // Check permissions
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!member || !['admin', 'manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const status = searchParams.get('status') || 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch invitations
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        status,
        personal_message,
        created_at,
        expires_at,
        sent_at,
        resent_count,
        user_profiles!invitations_created_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      invitations,
      pagination: {
        limit,
        offset,
        total: invitations.length
      }
    })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
async function getUserByEmail(supabase: any, email: string) {
  try {
    const { data } = await supabase.auth.admin.listUsers()
    return data.users?.find((user: any) => user.email === email.toLowerCase())
  } catch (error) {
    return null
  }
}

async function getInviterName(supabase: any, userId: string): Promise<string> {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single()

    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    return profile?.email || 'Someone'
  } catch (error) {
    return 'Someone'
  }
}