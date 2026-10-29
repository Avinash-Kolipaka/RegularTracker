import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  List,
  Grid
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { CalendarEvent, ComplianceDeadline } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export const CalendarPage: React.FC = () => {
  const { currentWorkspace, canManageCompliance } = useWorkspace();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statutoryOnly, setStatutoryOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('timeline');

  // Month state for calendar view
  const [currentDate, setCurrentDate] = useState(new Date());

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDeadlineType, setNewDeadlineType] = useState('FILING');
  const [isStatutory, setIsStatutory] = useState(false);

  const loadEvents = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCalendarEvents(currentWorkspace.business_id);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentWorkspace]);

  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !newTitle.trim() || !newDueDate) return;

    try {
      setSubmitting(true);
      await api.createDeadline(currentWorkspace.business_id, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        due_date: newDueDate,
        deadline_type: newDeadlineType,
        is_official_statutory: isStatutory,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewDeadlineType('FILING');
      setIsStatutory(false);
      loadEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to create compliance deadline.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered events
  const filteredEvents = events.filter((ev) => {
    if (typeFilter !== 'ALL' && ev.event_type !== typeFilter) return false;
    if (statutoryOnly && !ev.is_statutory) return false;
    return true;
  });

  // Sort chronologically
  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const getEventBadge = (type: string, isStatutory: boolean) => {
    switch (type) {
      case 'DEADLINE':
        return isStatutory ? (
          <Badge variant="danger" className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Statutory Deadline
          </Badge>
        ) : (
          <Badge variant="warning">Filing Deadline</Badge>
        );
      case 'RENEWAL':
        return <Badge variant="info">Permit Renewal</Badge>;
      case 'INSPECTION':
        return <Badge variant="neutral">Inspection</Badge>;
      case 'TASK':
        return <Badge variant="neutral">Task Due</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  // Helpers for month grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Compliance Calendar & Deadlines
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unified schedule of statutory filings, permit renewals, inspections, and task due dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Timeline List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Month Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {canManageCompliance && (
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Add Deadline
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="DEADLINE">Statutory Deadlines</option>
              <option value="RENEWAL">Permit Renewals</option>
              <option value="INSPECTION">Inspections</option>
              <option value="TASK">Task Due Dates</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={statutoryOnly}
                onChange={(e) => setStatutoryOnly(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Official Statutory Mandates Only
            </label>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{sortedEvents.length}</span> scheduled events
          </div>
        </CardContent>
      </Card>

      {/* Main View */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
          Loading compliance schedule...
        </div>
      ) : sortedEvents.length === 0 ? (
        <EmptyState
          title="No scheduled compliance events"
          description="There are no deadlines, renewals, or inspection records matching your current filter."
          action={
            canManageCompliance ? (
              <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Deadline
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'timeline' ? (
        /* Timeline View */
        <div className="space-y-4">
          {sortedEvents.map((ev) => {
            const eventDate = new Date(ev.date);
            const isOverdue = eventDate < new Date() && ev.status !== 'COMPLETED';

            return (
              <Card
                key={ev.id}
                className={`p-4 transition-all hover:shadow-md ${
                  ev.is_statutory
                    ? 'border-l-4 border-l-rose-500'
                    : isOverdue
                    ? 'border-l-4 border-l-amber-500'
                    : 'border-l-4 border-l-indigo-500'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white text-base">
                        {ev.title}
                      </span>
                      {getEventBadge(ev.event_type, ev.is_statutory)}
                      {isOverdue && <Badge variant="danger">Overdue</Badge>}
                    </div>

                    {ev.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-end gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {ev.date}
                      </div>
                      <div className="text-xs text-slate-400">
                        {ev.event_type} • Status: {ev.status}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Calendar Month Grid */
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="bg-slate-50 dark:bg-slate-900 p-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                {day}
              </div>
            ))}

            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-white dark:bg-slate-950 p-2 min-h-[90px]" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNumber = idx + 1;
              const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
              const dayEvents = sortedEvents.filter((ev) => ev.date === dateString);
              const isToday =
                new Date().toDateString() === new Date(year, month, dayNumber).toDateString();

              return (
                <div
                  key={dayNumber}
                  className={`bg-white dark:bg-slate-950 p-2 min-h-[100px] border-t border-slate-100 dark:border-slate-800 flex flex-col justify-between ${
                    isToday ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-y-auto max-h-16">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        title={ev.title}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                          ev.is_statutory
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : ev.event_type === 'RENEWAL'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add Deadline Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Compliance Deadline"
      >
        <form onSubmit={handleCreateDeadline} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Annual OSHA Form 300A Electronic Submission"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Filing instructions, submission portal URL, or agency specifics..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Deadline Type
              </label>
              <select
                value={newDeadlineType}
                onChange={(e) => setNewDeadlineType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="FILING">Statutory Filing</option>
                <option value="RENEWAL">Permit / License Renewal</option>
                <option value="INSPECTION">Mandatory Inspection</option>
                <option value="AUDIT">Periodic Audit</option>
                <option value="TRAINING">Staff Recertification</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <label className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isStatutory}
                onChange={(e) => setIsStatutory(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              Official Statutory / Regulatory Mandate
            </label>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 pl-6">
              Mark if this deadline carries legal penalties, revocation risks, or official governmental enforcement.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Deadline'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
