'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Mail,
  Plus,
  MoreVertical,
  Send,
  X,
  Trash2,
  RefreshCw,
  UserPlus,
  Calendar,
  Shield,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Member {
  id: string
  user_id: string
  role: 'admin' | 'manager' | 'member'
  permissions: Record<string, boolean>
  joined_at: string
  profile: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    full_name: string
    avatar_url?: string
  } | null
}

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'manager' | 'member'
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  personal_message?: string
  created_at: string
  resent_count?: number
  invited_by?: {
    name: string
    email: string
  }
}

interface OrganizationMemberManagerProps {
  organizationId: string
  organizationName: string
  maxMembers: number
}

export default function OrganizationMemberManager({
  organizationId,
  organizationName,
  maxMembers
}: OrganizationMemberManagerProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([])

  // Invitation form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as 'admin' | 'manager' | 'member',
    personal_message: ''
  })

  // Bulk invite state
  const [bulkInviteText, setBulkInviteText] = useState('')
  const [bulkInviteRole, setBulkInviteRole] = useState<'admin' | 'manager' | 'member'>('member')

  useEffect(() => {
    fetchData()
  }, [organizationId])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchMembers(), fetchInvitations()])
    setLoading(false)
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations?status=pending`)
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteForm.email.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Invitation sent successfully')
        setShowInviteModal(false)
        setInviteForm({ email: '', role: 'member', personal_message: '' })
        fetchInvitations()
      } else {
        toast.error(data.error || 'Failed to send invitation')
      }
    } catch (error) {
      toast.error('Failed to send invitation')
    }
  }

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bulkInviteText.trim()) {
      toast.error('Please enter email addresses')
      return
    }

    // Parse emails from text (comma, semicolon, or newline separated)
    const emails = bulkInviteText
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'))

    if (emails.length === 0) {
      toast.error('No valid email addresses found')
      return
    }

    if (emails.length > 20) {
      toast.error('Maximum 20 invitations per batch')
      return
    }

    const invitations = emails.map(email => ({
      email,
      role: bulkInviteRole
    }))

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitations })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${data.successful} invitations sent successfully`)
        if (data.failed > 0) {
          toast.error(`${data.failed} invitations failed`)
        }
        setShowBulkInviteModal(false)
        setBulkInviteText('')
        fetchInvitations()
      } else {
        toast.error(data.error || 'Failed to send invitations')
      }
    } catch (error) {
      toast.error('Failed to send invitations')
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' })
      })

      if (response.ok) {
        toast.success('Invitation resent successfully')
        fetchInvitations()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to resend invitation')
      }
    } catch (error) {
      toast.error('Failed to resend invitation')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Invitation cancelled')
        fetchInvitations()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      toast.error('Failed to cancel invitation')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) return

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Member removed successfully')
        fetchMembers()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove member')
      }
    } catch (error) {
      toast.error('Failed to remove member')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'expired': return <XCircle className="w-4 h-4 text-red-500" />
      case 'cancelled': return <X className="w-4 h-4 text-gray-500" />
      default: return <AlertTriangle className="w-4 h-4 text-orange-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const currentMemberCount = members.length
  const totalPendingCount = invitations.filter(inv => inv.status === 'pending').length
  const totalSlots = currentMemberCount + totalPendingCount

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
            <p className="text-sm text-gray-500 mt-1">
              {currentMemberCount} active members, {totalPendingCount} pending invitations ({totalSlots}/{maxMembers} slots used)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBulkInviteModal(true)}
              className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={totalSlots >= maxMembers}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Invite
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              disabled={totalSlots >= maxMembers}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </button>
          </div>
        </div>

        {/* Member limit warning */}
        {totalSlots >= maxMembers && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                Organization has reached maximum member limit ({maxMembers} members)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Members ({currentMemberCount})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Invitations ({totalPendingCount})
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'members' && (
          <div className="space-y-4">
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No members yet</h4>
                <p className="text-gray-500">Start by inviting team members to join this organization.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {member.profile?.full_name || 'Unknown User'}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{member.profile?.email}</p>
                        <p className="text-xs text-gray-400">Joined {formatDate(member.joined_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRemoveMember(member.id, member.profile?.full_name || 'this member')}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        disabled={member.role === 'admin' && members.filter(m => m.role === 'admin').length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h4>
                <p className="text-gray-500">Invitations you send will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {getStatusIcon(invitation.status)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{invitation.email}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(invitation.role)}`}>
                            {invitation.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Invited {formatDate(invitation.created_at)} • Expires {formatDate(invitation.expires_at)}
                        </p>
                        {invitation.personal_message && (
                          <p className="text-xs text-gray-400 italic">"{invitation.personal_message}"</p>
                        )}
                        {invitation.resent_count && invitation.resent_count > 0 && (
                          <p className="text-xs text-orange-600">Resent {invitation.resent_count} times</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleResendInvitation(invitation.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        disabled={invitation.status !== 'pending'}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        disabled={invitation.status !== 'pending'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={inviteForm.personal_message}
                    onChange={(e) => setInviteForm({ ...inviteForm, personal_message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Add a personal note to the invitation..."
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Bulk Invite Team Members</h3>
                <button
                  onClick={() => setShowBulkInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleBulkInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Addresses
                  </label>
                  <textarea
                    value={bulkInviteText}
                    onChange={(e) => setBulkInviteText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={6}
                    placeholder="Enter email addresses separated by commas, semicolons, or new lines:&#10;&#10;user1@example.com&#10;user2@example.com, user3@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum 20 invitations per batch
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role for All Invitees
                  </label>
                  <select
                    value={bulkInviteRole}
                    onChange={(e) => setBulkInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBulkInviteModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Send Invitations
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}