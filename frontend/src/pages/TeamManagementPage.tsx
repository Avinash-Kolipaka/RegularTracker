import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { BusinessMembership, WorkspaceInvitation, BusinessRole } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export const TeamManagementPage: React.FC = () => {
  const { currentWorkspace, isOwner, canManageCompliance } = useWorkspace();
  const { user } = useAuth();

  const [members, setMembers] = useState<BusinessMembership[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BusinessRole>('EMPLOYEE');
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const [membersData, invitationsData] = await Promise.all([
        api.getBusinessMembers(currentWorkspace.business_id),
        api.getWorkspaceInvitations(currentWorkspace.business_id),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      await api.updateMemberRole(currentWorkspace.business_id, memberId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole as any, role_display: newRole } : m))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!currentWorkspace) return;
    if (memberEmail === user?.email) {
      alert('You cannot remove yourself from the workspace.');
      return;
    }
    if (!window.confirm(`Are you sure you want to revoke access for ${memberEmail}?`)) return;

    try {
      await api.removeMember(currentWorkspace.business_id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail.trim()) return;

    try {
      setInviting(true);
      await api.sendWorkspaceInvitation(currentWorkspace.business_id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('EMPLOYEE');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to send workspace invitation.');
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?invitation=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Badge variant="info">Owner</Badge>;
      case 'COMPLIANCE_MANAGER':
        return <Badge variant="success">Compliance Manager</Badge>;
      case 'CONSULTANT':
        return <Badge variant="warning">External Consultant</Badge>;
      default:
        return <Badge variant="neutral">Employee</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Team & Access Control
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage workspace permissions, assign compliance duties, and grant consultant access.
          </p>
        </div>

        {isOwner && (
          <Button onClick={() => setIsInviteOpen(true)} className="flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Role explanation alert */}
      <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-semibold block text-indigo-950 dark:text-indigo-200">
            Role-Based Access Principles:
          </span>
          <p>
            <strong>Owners & Managers:</strong> Can manage requirements, assign tasks, review regulatory updates, and upload documents.
            <br />
            <strong>Employees:</strong> Can view assigned requirements, execute assigned tasks, and submit compliance proof.
            <br />
            <strong>Consultants:</strong> Access is strictly scoped to this workspace only; consultants never receive access to other client organizations without explicit membership.
          </p>
        </div>
      </div>

      {/* Members Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
            Active Members ({members.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                        {(m.user_full_name || m.user_email).slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {m.user_full_name || 'Team Member'}
                          {m.user_email === user?.email && (
                            <span className="ml-2 text-xs text-slate-400">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{m.user_email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {isOwner && m.user_email !== user?.email ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md font-medium text-slate-800 dark:text-slate-200"
                      >
                        <option value="OWNER">Owner</option>
                        <option value="COMPLIANCE_MANAGER">Compliance Manager</option>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="CONSULTANT">Consultant</option>
                      </select>
                    ) : (
                      getRoleBadge(m.role)
                    )}
                  </td>

                  <td className="py-3 px-4 text-xs text-slate-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {isOwner && m.user_email !== user?.email && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.user_email)}
                        className="text-rose-600 hover:text-rose-700 p-1.5 transition-colors"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending Invitations Card */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Workspace Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Recipient Email</th>
                  <th className="py-3 px-4">Invited Role</th>
                  <th className="py-3 px-4">Invited By</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Invitation Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {inv.email}
                    </td>
                    <td className="py-3 px-4">{getRoleBadge(inv.role)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {inv.invited_by_email || 'Workspace Admin'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(inv.token)}
                        className="text-xs flex items-center gap-1.5 ml-auto"
                      >
                        {copiedToken === inv.token ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Invite Link
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Team Member or Consultant"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Colleague or Consultant Email *
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g., advisor@auditpartner.com"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Workspace Role *
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="EMPLOYEE">Employee (Execute tasks & upload evidence)</option>
              <option value="COMPLIANCE_MANAGER">Compliance Manager (Full requirement & task management)</option>
              <option value="CONSULTANT">Consultant (Scoped advisory access to this workspace)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
