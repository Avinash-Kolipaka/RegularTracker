import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  GitCompare,
  ArrowRight,
  Plus,
  Sparkles,
  Info,
  Calendar,
  Activity,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { api } from '../api/client';
import { DashboardMetrics } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const { activeBusiness } = useWorkspace();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  const loadMetrics = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardMetrics(activeBusiness.id);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [activeBusiness]);

  const handleRunEvaluation = async () => {
    if (!activeBusiness) return;
    setEvaluating(true);
    try {
      await api.evaluateApplicability(activeBusiness.id);
      await loadMetrics();
    } catch (err: any) {
      alert(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse col-span-2" />
          <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900">Dashboard Unavailable</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{error || 'Unable to retrieve workspace data.'}</p>
        <Button onClick={loadMetrics} size="sm" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const m = data.metrics;
  const barColors = ['#94a3b8', '#0ea5e9', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Header with Title and Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {activeBusiness?.name} Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational compliance tracking overview · Industry: {activeBusiness?.industry_category}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunEvaluation}
            isLoading={evaluating}
            icon={<Sparkles className="w-4 h-4 text-teal-600" />}
          >
            Run Applicability Matching
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/tasks')}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tracked Regulations */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracked Rules</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{m.total_tracked_requirements}</h3>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <span className="text-emerald-700 font-semibold">{m.verified_requirements_count} verified</span>
                <span>·</span>
                <span className="text-amber-700">{m.unverified_requirements_count} unverified</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">30-Day Deadlines</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{m.upcoming_deadlines_count}</h3>
              <p className="text-[11px] text-slate-500 mt-1.5">
                <Link to="/calendar" className="text-teal-600 hover:text-teal-700 font-semibold">
                  View calendar schedule →
                </Link>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Tasks Assigned & Overdue */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks Due</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{m.assigned_to_me_count} Assigned</h3>
              <div className="mt-1.5 text-[11px]">
                {m.overdue_tasks_count > 0 ? (
                  <span className="text-rose-600 font-semibold">{m.overdue_tasks_count} tasks overdue</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">0 overdue tasks</span>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Health Score */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Score</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-slate-900">{m.compliance_health_score}</span>
                <span className="text-xs text-slate-400 font-medium">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-1">Operational progress index</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm">
              {m.compliance_health_score}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transparent Calculation Explanatory Banner */}
      <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800">Operational Metric Transparency Notice:</p>
          <p className="mt-0.5 leading-relaxed">{m.score_calculation_notes}</p>
        </div>
      </div>

      {/* Main Charts & Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Progress Breakdown (Recharts) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compliance Task Pipeline</CardTitle>
            <Link to="/tasks" className="text-xs text-teal-600 hover:text-teal-700 font-semibold">
              Manage Task Board →
            </Link>
          </CardHeader>
          <CardContent>
            {data.task_status_breakdown.every((t) => t.count === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                <Layers className="w-8 h-8 mb-2 stroke-1" />
                <p className="text-sm font-medium">No tasks logged in this workspace yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/tasks')}>
                  Create your first task
                </Button>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.task_status_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#5eead4' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.task_status_breakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regulatory Updates & Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Regulatory Intelligence</CardTitle>
            {m.pending_regulatory_updates_count > 0 && (
              <Badge variant="warning" size="sm">
                {m.pending_regulatory_updates_count} Pending Review
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200">
              <div className="flex items-center gap-2 font-semibold text-sm text-teal-950">
                <GitCompare className="w-4 h-4 text-teal-700" />
                Source Monitoring
              </div>
              <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                {m.pending_regulatory_updates_count > 0
                  ? `There are ${m.pending_regulatory_updates_count} detected regulatory change(s) awaiting human review.`
                  : 'All tracked sources are synchronized with no pending change advisories.'}
              </p>
              <Link
                to="/regulations/updates"
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 mt-2"
              >
                Review updates & text diffs →
              </Link>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Quick Navigation</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/regulations/library"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium text-slate-800"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Library
                </Link>
                <Link
                  to="/calendar"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium text-slate-800"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Calendar
                </Link>
                <Link
                  to="/documents"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium text-slate-800"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  Vault
                </Link>
                <Link
                  to="/reports"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium text-slate-800"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  Export
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workspace Activity Audit Stream */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <CardTitle>Recent Workspace Activity & Audit Stream</CardTitle>
          </div>
          <Link to="/audit" className="text-xs text-teal-600 hover:text-teal-700 font-semibold">
            Full Audit Log →
          </Link>
        </CardHeader>
        <CardContent>
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No recent events recorded.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_activity.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block">{act.description}</span>
                    <span className="text-slate-500 mt-0.5 inline-block">
                      By <span className="text-slate-700 font-medium">{act.actor_email}</span>
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="slate" size="sm">
                      {act.action_display}
                    </Badge>
                    <span className="block text-[11px] text-slate-400 mt-1">
                      {new Date(act.created_at).toLocaleDateString()} {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
