import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  Shield,
  Code,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AuditEventItem } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const AuditLogPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAuditEvents = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (selectedAction !== 'ALL') params.action = selectedAction;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const data = await api.getAuditEvents(currentWorkspace.business_id, params);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditEvents();
  }, [currentWorkspace, selectedAction, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('LINK') || action.includes('UPLOAD')) {
      return <Badge variant="success">{action}</Badge>;
    }
    if (action.includes('DELETE') || action.includes('ARCHIVE') || action.includes('REMOVE')) {
      return <Badge variant="danger">{action}</Badge>;
    }
    if (action.includes('UPDATE') || action.includes('REVIEW')) {
      return <Badge variant="warning">{action}</Badge>;
    }
    return <Badge variant="info">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Workspace Audit Trail & Activity Log
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Immutable event log of operational decisions, requirement linkings, evidence uploads, and access changes.
        </p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit descriptions, actors, or entity types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Event Types</option>
              <option value="USER_LOGIN">User Login</option>
              <option value="WORKSPACE_CREATED">Workspace Created</option>
              <option value="REQUIREMENT_LINKED">Requirement Linked</option>
              <option value="APPLICABILITY_REVIEWED">Applicability Reviewed</option>
              <option value="TASK_CREATED">Task Created</option>
              <option value="TASK_COMPLETED">Task Completed</option>
              <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
              <option value="DOCUMENT_ARCHIVED">Document Archived</option>
              <option value="MEMBER_INVITED">Member Invited</option>
              <option value="MEMBER_REMOVED">Member Removed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
          Loading audit trail records...
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description={
            searchQuery || selectedAction !== 'ALL'
              ? 'Try clearing your search query or choosing another action filter.'
              : 'Audit events will appear here automatically as your team takes action in this workspace.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {events.map((ev) => (
                  <React.Fragment key={ev.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        {getActionBadge(ev.action_display || ev.action)}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.actor_email || 'System Routine'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {ev.entity_type}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-800 dark:text-slate-200 max-w-md">
                        {ev.description}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {ev.metadata && Object.keys(ev.metadata).length > 0 ? (
                          <button
                            onClick={() => toggleExpand(ev.id)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <Code className="w-3 h-3" />
                            {expandedId === ev.id ? 'Hide' : 'Inspect'}
                            {expandedId === ev.id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>

                    {expandedId === ev.id && ev.metadata && (
                      <tr className="bg-slate-50 dark:bg-slate-900/60">
                        <td colSpan={6} className="p-4">
                          <div className="bg-slate-950 text-slate-200 rounded p-3 text-xs font-mono overflow-x-auto border border-slate-800">
                            <pre>{JSON.stringify(ev.metadata, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
