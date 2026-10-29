import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  CheckSquare,
  Clock,
  Send,
  Trash2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Plus
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { ComplianceTask, TaskChecklistItem, TaskComment } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const TaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace, canManageCompliance } = useWorkspace();
  const { user } = useAuth();

  const [task, setTask] = useState<ComplianceTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New checklist item state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingChecklist, setAddingChecklist] = useState(false);

  // New comment state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadTask = async () => {
    if (!currentWorkspace || !taskId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTask(currentWorkspace.business_id, taskId);
      setTask(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [currentWorkspace, taskId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!currentWorkspace || !taskId) return;
    try {
      const updated = await api.updateTask(currentWorkspace.business_id, taskId, { status: newStatus });
      setTask(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleToggleChecklist = async (itemId: string, currentState: boolean) => {
    if (!currentWorkspace || !taskId) return;
    try {
      await api.toggleTaskChecklist(currentWorkspace.business_id, taskId, itemId, !currentState);
      setTask((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          checklist_items: prev.checklist_items.map((item) =>
            item.id === itemId ? { ...item, is_completed: !currentState } : item
          ),
        };
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update checklist item.');
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !taskId || !newChecklistTitle.trim()) return;

    try {
      setAddingChecklist(true);
      const item = await api.addTaskChecklist(currentWorkspace.business_id, taskId, newChecklistTitle.trim());
      setTask((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          checklist_items: [...(prev.checklist_items || []), item],
        };
      });
      setNewChecklistTitle('');
    } catch (err: any) {
      alert(err.message || 'Failed to add checklist item.');
    } finally {
      setAddingChecklist(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !taskId || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const comment = await api.addTaskComment(currentWorkspace.business_id, taskId, newComment.trim());
      setTask((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [...(prev.comments || []), comment],
        };
      });
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!currentWorkspace || !taskId) return;
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

    try {
      await api.deleteTask(currentWorkspace.business_id, taskId);
      navigate('/tasks');
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        Loading task details...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/tasks')} className="flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </Button>
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error || 'Task not found.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedChecklistCount = (task.checklist_items || []).filter((i) => i.is_completed).length;
  const totalChecklistCount = (task.checklist_items || []).length;
  const checklistProgress = totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/tasks')} className="flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={task.status === 'COMPLETED' ? 'success' : task.status === 'BLOCKED' ? 'danger' : 'info'}>
              {task.status_display}
            </Badge>
            <Badge variant={task.priority === 'CRITICAL' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'neutral'}>
              {task.priority_display}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick status change */}
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {canManageCompliance && (
            <Button variant="outline" size="sm" onClick={handleDeleteTask} className="text-rose-600 hover:text-rose-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {task.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {task.description || 'No description provided for this task.'}
                </p>
              </div>

              {task.requirement && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    Linked Regulatory Requirement
                  </h4>
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 block">
                        {task.requirement_code}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {task.requirement_title}
                      </span>
                    </div>
                    <Link
                      to={`/requirements/${task.requirement}`}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-3"
                    >
                      View Requirement
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Execution Checklist
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {completedChecklistCount} of {totalChecklistCount} items completed ({checklistProgress}%)
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {(task.checklist_items || []).map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span
                      className={`text-sm select-none ${
                        item.is_completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.title}
                    </span>
                  </label>
                ))}

                {(!task.checklist_items || task.checklist_items.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-2">
                    No checklist items yet. Add subtasks or verification steps below.
                  </p>
                )}
              </div>

              {/* Add checklist item */}
              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Add a step or verification item..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                <Button type="submit" size="sm" disabled={addingChecklist || !newChecklistTitle.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Comments / Discussion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Team Discussion & Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(task.comments || []).map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {comment.author_name || comment.author_email}
                      </span>
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {comment.content}
                    </p>
                  </div>
                ))}

                {(!task.comments || task.comments.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-2">
                    No comments yet. Start a discussion or document progress updates.
                  </p>
                )}
              </div>

              {/* Add comment */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Write a comment or status note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                <Button type="submit" disabled={submittingComment || !newComment.trim()}>
                  <Send className="w-4 h-4 mr-1" /> Post
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Metadata & Assignment info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Task Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Assignee</span>
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">
                    {task.assignee_name || task.assignee_email || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Due Date</span>
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{task.due_date || 'No due date specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Priority</span>
                <div>{task.priority_display}</div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Status</span>
                <div>{task.status_display}</div>
              </div>

              {task.completed_at && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Completed At</span>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{new Date(task.completed_at).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 space-y-1">
                <div>Created: {new Date(task.created_at).toLocaleDateString()}</div>
                <div>Last Updated: {new Date(task.updated_at).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
