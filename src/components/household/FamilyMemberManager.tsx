'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, UserX, Edit, Crown, Users, Mail, Shield, Clock, AlertCircle, User } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface FamilyMember {
  id: string
  user_id: string
  organization_id: string
  role: string
  joined_at: string
  invited_by: string | null
  user_profiles: {
    id: string
    first_name: string
    last_name: string
    email: string
    created_at: string
  }
  invited_by_profile?: {
    first_name: string
    last_name: string
  }
}

interface PendingInvite {
  id: string
  organization_id: string
  email: string
  role: string
  invited_by: string
  created_at: string
  expires_at: string
  user_profiles: {
    first_name: string
    last_name: string
  }
}

interface FamilyMemberManagerProps {
  householdId: string
  userId: string
  userRole: string
  householdName: string
}

export default function FamilyMemberManager({ 
  householdId, 
  userId, 
  userRole, 
  householdName 
}: FamilyMemberManagerProps) {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isInviting, setIsInviting] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [editingProfile, setEditingProfile] = useState<FamilyMember | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = userRole === 'admin'
  const canManageMembers = isAdmin

  useEffect(() => {
    fetchMembers()
    fetchPendingInvites()
  }, [householdId])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          user_profiles!organization_members_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            created_at
          ),
          invited_by_profile:user_profiles!organization_members_invited_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', householdId)
        .order('joined_at', { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      toast.error('Failed to fetch family members')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingInvites = async () => {
    try {
      // First check if the invitations table exists
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'family_invitations')

      if (!tables || tables.length === 0) {
        // Table doesn't exist, skip fetching pending invites
        setPendingInvites([])
        return
      }

      const { data, error } = await supabase
        .from('family_invitations')
        .select(`
          *,
          user_profiles!family_invitations_invited_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', householdId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error && !error.message.includes('does not exist')) {
        throw error
      }
      
      setPendingInvites(data || [])
    } catch (error) {
      console.warn('Pending invites feature not available:', error)
      setPendingInvites([])
    }
  }

  const inviteMember = async (formData: FormData) => {
    const email = formData.get('email') as string
    const role = formData.get('role') as string

    try {
      // Check if user already exists in the household
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', householdId)
        .eq('user_profiles.email', email)
        .single()

      if (existingMember) {
        toast.error('This person is already a member of your household')
        return
      }

      // For now, we'll show a message about manual invitation
      // In a real app, you'd send an email invitation
      toast.success(`Invitation would be sent to ${email}`, { duration: 5000 })
      toast('For now, share your household details manually', { 
        icon: '💡',
        duration: 8000 
      })
      
      setIsInviting(false)
      
      // Log activity
      await logActivity('invited_member', `Invited ${email} to join the household`)
    } catch (error) {
      toast.error('Failed to send invitation')
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string, memberName: string) => {
    if (!canManageMembers) {
      toast.error('You do not have permission to change member roles')
      return
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
      
      await fetchMembers()
      setEditingMember(null)
      
      toast.success(`${memberName}'s role updated to ${getRoleDisplayName(newRole)}`)
      
      // Log activity
      await logActivity('updated_member_role', `Changed ${memberName}'s role to ${getRoleDisplayName(newRole)}`)
    } catch (error) {
      toast.error('Failed to update member role')
    }
  }

  const updateMemberProfile = async (userId: string, firstName: string, lastName: string, originalName: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName 
        })
        .eq('id', userId)

      if (error) throw error
      
      await fetchMembers()
      setEditingProfile(null)
      
      toast.success(`Profile updated successfully`)
      
      // Log activity
      await logActivity('updated_member_profile', `Updated ${originalName}'s name to ${firstName} ${lastName}`)
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const removeMember = async (memberId: string, memberName: string) => {
    if (!canManageMembers) {
      toast.error('You do not have permission to remove members')
      return
    }

    if (memberId === userId) {
      toast.error('You cannot remove yourself from the household')
      return
    }

    if (!confirm(`Remove ${memberName} from the household? They will lose access to all household data.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      
      await fetchMembers()
      
      toast.success(`${memberName} has been removed from the household`)
      
      // Log activity
      await logActivity('removed_member', `Removed ${memberName} from the household`)
    } catch (error) {
      toast.error('Failed to remove member')
    }
  }

  const logActivity = async (activityType: string, description: string) => {
    try {
      await supabase.rpc('log_family_activity', {
        org_id: householdId,
        user_id: userId,
        activity_type: activityType,
        description: description,
        metadata: {}
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'manager': return 'Manager'
      case 'employee': return 'Family Member'
      case 'viewer': return 'Limited Access'
      default: return role
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'manager': return <Shield className="h-4 w-4 text-blue-600" />
      case 'employee': return <Users className="h-4 w-4 text-green-600" />
      case 'viewer': return <Users className="h-4 w-4 text-gray-600" />
      default: return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full access to all features and settings'
      case 'manager': return 'Can manage inventory and family members'
      case 'employee': return 'Can add, edit, and track household items'
      case 'viewer': return 'Can view items but cannot make changes'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Family Members</h2>
          <p className="text-gray-600 mt-1">Manage who has access to your household inventory</p>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setIsInviting(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviting && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsInviting(false)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Invite Family Member</h3>
                <button
                  onClick={() => setIsInviting(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <form action={inviteMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="family.member@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="employee">Family Member - Can manage inventory</option>
                    <option value="manager">Manager - Can manage inventory and members</option>
                    <option value="viewer">Limited Access - View only</option>
                  </select>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Invitation Process</p>
                      <p>For now, share your household details manually with the person you want to invite. Email invitations will be available in a future update.</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsInviting(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Current Members */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Current Members ({members.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {members.map((member) => (
            <div key={member.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {member.user_profiles.first_name?.[0]?.toUpperCase() || 
                       member.user_profiles.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {member.user_profiles.first_name} {member.user_profiles.last_name}
                      </h4>
                      {member.user_id === userId && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{member.user_profiles.email}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getRoleIcon(member.role)}
                        <span className="ml-1">{getRoleDisplayName(member.role)}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                      </span>
                      {member.invited_by_profile && (
                        <span className="text-xs text-gray-500">
                          Invited by {member.invited_by_profile.first_name} {member.invited_by_profile.last_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Everyone can edit their own profile */}
                  <button
                    onClick={() => setEditingProfile(member)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    title="Edit name"
                  >
                    <User className="h-4 w-4" />
                  </button>
                  
                  {canManageMembers && member.user_id !== userId && (
                    <>
                      <button
                        onClick={() => setEditingMember(member)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit role"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeMember(
                          member.id, 
                          `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                        )}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove member"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Role Description */}
              <div className="mt-3 ml-14">
                <p className="text-sm text-gray-500">{getRoleDescription(member.role)}</p>
              </div>

              {/* Edit Profile Form */}
              {editingProfile?.id === member.id && (
                <div className="mt-4 ml-14 p-4 bg-green-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">Edit Name</h5>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      const firstName = formData.get('first_name') as string
                      const lastName = formData.get('last_name') as string
                      const originalName = `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                      updateMemberProfile(member.user_profiles.id, firstName, lastName, originalName)
                    }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          defaultValue={member.user_profiles.first_name || ''}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="last_name"
                          defaultValue={member.user_profiles.last_name || ''}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingProfile(null)}
                        className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Update Name
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Edit Role Form */}
              {editingMember?.id === member.id && (
                <div className="mt-4 ml-14 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">Change Role</h5>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      const newRole = formData.get('role') as string
                      updateMemberRole(
                        member.id, 
                        newRole, 
                        `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                      )
                    }}
                    className="space-y-3"
                  >
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="admin">Admin - Full access</option>
                      <option value="manager">Manager - Can manage inventory and members</option>
                      <option value="employee">Family Member - Can manage inventory</option>
                      <option value="viewer">Limited Access - View only</option>
                    </select>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingMember(null)}
                        className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Update Role
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pending Invitations ({pendingInvites.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{invite.email}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {getRoleDisplayName(invite.role)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Invited {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {invite.user_profiles.first_name} {invite.user_profiles.last_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Permissions Guide */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👮 Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Crown className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Admin</p>
                <p className="text-sm text-gray-600">Complete control over household and family members</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Manager</p>
                <p className="text-sm text-gray-600">Can manage inventory and invite/remove family members</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Family Member</p>
                <p className="text-sm text-gray-600">Can add, edit, and track household inventory items</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Limited Access</p>
                <p className="text-sm text-gray-600">Can only view inventory, cannot make changes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}