import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  Calendar,
  User,
  Clock,
  ArrowRight,
  List,
  Columns3,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { ComplianceTask, BusinessMembership, RegulatoryRequirement } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

const STATUS_COLUMNS = [
  { key: 'TODO', label: 'To Do', color: 'border-slate-300 dark:border-slate-700' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-400' },
  { key: 'AWAITING_REVIEW', label: 'Awaiting Review', color: 'border-amber-400' },
  { key: 'BLOCKED', label: 'Blocked', color: 'border-rose-400' },
  { key: 'COMPLETED', label: 'Completed', color: 'border-emerald-400' },
];

export const TaskBoardPage: React.FC = () => {
  const { currentWorkspace, canManageCompliance } = useWorkspace();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [members, setMembers] = useState<BusinessMembership[]>([]);
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newRequirement, setNewRequirement] = useState('');

  const loadTasks = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;
      if (assignedToMeOnly) params.assigned_to_me = true;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const data = await api.getTasks(currentWorkspace.business_id, params);
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [currentWorkspace, selectedStatus, selectedPriority, assignedToMeOnly, searchQuery]);

  // Load members and requirements when opening create modal
  const handleOpenCreateModal = async () => {
    if (!currentWorkspace) return;
    setIsCreateModalOpen(true);
    try {
      const [membersData, reqsData] = await Promise.all([
        api.getBusinessMembers(currentWorkspace.business_id),
        api.getRequirements()
      ]);
      setMembers(membersData);
      setRequirements(reqsData);
    } catch (err) {
      console.error('Failed to load members or requirements for modal', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !newTitle.trim()) return;

    try {
      setSubmitting(true);
      await api.createTask(currentWorkspace.business_id, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        due_date: newDueDate || null,
        assigned_to: newAssignee || null,
        requirement: newRequirement || null,
      });

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('MEDIUM');
      setNewDueDate('');
      setNewAssignee('');
      setNewRequirement('');
      loadTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!currentWorkspace) return;
    try {
      await api.updateTask(currentWorkspace.business_id, taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update task status.');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge variant="danger">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">Medium</Badge>;
      case 'LOW':
        return <Badge variant="neutral">Low</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="info">In Progress</Badge>;
      case 'AWAITING_REVIEW':
        return <Badge variant="warning">In Review</Badge>;
      case 'BLOCKED':
        return <Badge variant="danger">Blocked</Badge>;
      default:
        return <Badge variant="neutral">To Do</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Compliance Tasks & Workflow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize compliance obligations, assign responsible owners, and monitor progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Board View"
            >
              <Columns3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {canManageCompliance && (
            <Button onClick={handleOpenCreateModal} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_REVIEW">Awaiting Review</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={assignedToMeOnly}
                  onChange={(e) => setAssignedToMeOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Assigned to me
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Content */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
          Loading compliance tasks...
        </div>
      ) : error ? (
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No compliance tasks found"
          description={
            searchQuery || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || assignedToMeOnly
              ? 'Try adjusting your filters or search query.'
              : 'Create your first compliance task to track internal actions and regulatory assignments.'
          }
          action={
            canManageCompliance ? (
              <Button onClick={handleOpenCreateModal} className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'board' ? (
        /* Board / Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-50/60 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        col.key === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : col.key === 'IN_PROGRESS'
                          ? 'bg-blue-500'
                          : col.key === 'BLOCKED'
                          ? 'bg-rose-500'
                          : col.key === 'AWAITING_REVIEW'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    {col.label}
                  </span>
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="p-3.5 hover:shadow-md transition-shadow duration-150 border-slate-200 dark:border-slate-700 group cursor-pointer"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2"
                          >
                            {task.title}
                          </Link>
                          {getPriorityBadge(task.priority)}
                        </div>

                        {task.requirement_code && (
                          <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{task.requirement_code}</span>
                          </div>
                        )}

                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1" title={task.assignee_email || 'Unassigned'}>
                            <User className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[90px]">
                              {task.assignee_name || (task.assignee_email ? task.assignee_email.split('@')[0] : 'Unassigned')}
                            </span>
                          </div>

                          {task.due_date && (
                            <div className="flex items-center gap-1" title={`Due: ${task.due_date}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{task.due_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Status transition dropdown */}
                        <div className="pt-1">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="AWAITING_REVIEW">Awaiting Review</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Linked Requirement</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      <Link to={`/tasks/${task.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                        {task.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      {task.requirement_code || '—'}
                    </td>
                    <td className="py-3 px-4">{getPriorityBadge(task.priority)}</td>
                    <td className="py-3 px-4">{getStatusBadge(task.status)}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                      {task.assignee_name || task.assignee_email || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                      {task.due_date || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                      >
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Compliance Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Conduct annual hazardous waste inventory audit"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description & Protocol Notes
            </label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Provide procedural instructions, required evidence, or specific checklists..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assigned Team Member
              </label>
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user} value={m.user}>
                    {m.user_full_name || m.user_email} ({m.role_display})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Linked Requirement (Optional)
              </label>
              <select
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="">None / General Task</option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.reference_code}] {r.title.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
