import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/services/emailService'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const { id: organizationId, invitationId } = await params
    const supabase = await createClient()

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

    // Get invitation details
    const { data: invitation } = await supabase
      .from('invitations')
      .select('email, role, status')
      .eq('id', invitationId)
      .eq('organization_id', organizationId)
      .single()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: `Cannot cancel ${invitation.status} invitation` 
      }, { status: 400 })
    }

    // Cancel invitation
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .eq('organization_id', organizationId)

    if (updateError) {
      console.error('Error cancelling invitation:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: user.id,
        action: 'cancel_invitation',
        target_type: 'invitation',
        target_id: invitationId,
        organization_id: organizationId,
        details: {
          email: invitation.email,
          role: invitation.role
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const { id: organizationId, invitationId } = await params
    const supabase = await createClient()
    const { action } = await request.json()

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

    if (action === 'resend') {
      return await handleResendInvitation(supabase, organizationId, invitationId, user.id)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing invitation action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleResendInvitation(
  supabase: any, 
  organizationId: string, 
  invitationId: string, 
  userId: string
) {
  // Get invitation details
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .select(`
      id,
      email,
      role,
      status,
      expires_at,
      resent_count,
      personal_message,
      organizations!inner (
        name
      )
    `)
    .eq('id', invitationId)
    .eq('organization_id', organizationId)
    .single()

  if (inviteError || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ 
      error: `Cannot resend ${invitation.status} invitation` 
    }, { status: 400 })
  }

  // Check if invitation has expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Extend expiration for resend
    const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    await supabase
      .from('invitations')
      .update({ 
        expires_at: newExpiryDate.toISOString(),
        status: 'pending' // Reset to pending if was expired
      })
      .eq('id', invitationId)
    
    invitation.expires_at = newExpiryDate.toISOString()
  }

  // Check resend limit
  if (invitation.resent_count >= 5) {
    return NextResponse.json({ 
      error: 'Maximum resend limit reached (5 attempts)' 
    }, { status: 400 })
  }

  // Get inviter details
  const { data: inviterProfile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, email')
    .eq('id', userId)
    .single()

  const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
    ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
    : inviterProfile?.email || 'Someone'

  // Resend email
  try {
    // Generate new token for security
    const { data: updatedInvitation } = await supabase
      .from('invitations')
      .update({
        resent_count: invitation.resent_count + 1,
        last_resent_at: new Date().toISOString(),
        // Optionally generate new token
        token: await generateNewToken(supabase)
      })
      .eq('id', invitationId)
      .select('token')
      .single()

    await sendInvitationEmail({
      to: invitation.email,
      organizationName: invitation.organizations.name,
      inviterName: inviterName,
      invitationToken: updatedInvitation?.token || invitation.token,
      role: invitation.role,
      personalMessage: invitation.personal_message,
      expiresAt: invitation.expires_at
    })

    // Log activity
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: userId,
        action: 'resend_invitation',
        target_type: 'invitation',
        target_id: invitationId,
        organization_id: organizationId,
        details: {
          email: invitation.email,
          resend_count: invitation.resent_count + 1
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      resent_count: invitation.resent_count + 1
    })

  } catch (emailError) {
    console.error('Error resending invitation email:', emailError)
    return NextResponse.json({ 
      error: 'Failed to resend invitation email' 
    }, { status: 500 })
  }
}

async function generateNewToken(supabase: any): Promise<string> {
  // Use the database function to generate a secure token
  const { data, error } = await supabase.rpc('generate_invitation_token')
  if (error || !data) {
    // Fallback to a simple random string
    return Buffer.from(Date.now().toString() + Math.random().toString()).toString('base64url').slice(0, 32)
  }
  return data
}