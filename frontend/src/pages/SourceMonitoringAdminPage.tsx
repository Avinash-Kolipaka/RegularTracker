import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  RefreshCw,
  GitPullRequest,
  Check,
  Server
} from 'lucide-react';
import { api } from '../api/client';
import { RegulationSource, SourceMonitoringRun } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const SourceMonitoringAdminPage: React.FC = () => {
  const [sources, setSources] = useState<RegulationSource[]>([]);
  const [runs, setRuns] = useState<SourceMonitoringRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringSourceId, setTriggeringSourceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sourcesData, runsData] = await Promise.all([
        api.getSources(),
        api.getMonitoringRuns(),
      ]);
      setSources(sourcesData);
      setRuns(runsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load source monitoring data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerRun = async (sourceId: string, sourceName: string) => {
    try {
      setTriggeringSourceId(sourceId);
      setSuccessMessage(null);
      setError(null);

      const result = await api.triggerMonitoringRun(sourceId);
      setSuccessMessage(
        `Monitoring check completed for ${sourceName}! Status: ${result.status_display}. Changes detected: ${result.changes_detected}.`
      );
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger monitoring scan.');
    } finally {
      setTriggeringSourceId(null);
    }
  };

  const getRunBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success">Changes Found</Badge>;
      case 'NO_CHANGES':
        return <Badge variant="info">Verified (No Changes)</Badge>;
      case 'RUNNING':
        return <Badge variant="warning">Scanning...</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Official Regulatory Source Monitoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated polling, change ingestion, and simulated source adapter verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/updates">
            <Button variant="outline" className="flex items-center gap-1.5 text-xs">
              <GitPullRequest className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              View Regulatory Diffs
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <Link to="/updates" className="text-xs font-semibold underline ml-4 shrink-0">
              Review Updates
            </Link>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Official Sources Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Supported Regulatory Sources ({sources.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                <th className="py-3 px-4">Source Name</th>
                <th className="py-3 px-4">Jurisdiction</th>
                <th className="py-3 px-4">Official Portal</th>
                <th className="py-3 px-4">Polling Frequency</th>
                <th className="py-3 px-4">Last Check</th>
                <th className="py-3 px-4 text-right">Manual Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {sources.map((src) => (
                <tr key={src.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{src.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{src.source_type}</div>
                  </td>

                  <td className="py-3 px-4">
                    <Badge variant="neutral">{src.jurisdiction}</Badge>
                  </td>

                  <td className="py-3 px-4">
                    <a
                      href={src.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Official Source <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>

                  <td className="py-3 px-4 text-xs text-slate-500">
                    Every {src.check_frequency_hours} hours
                  </td>

                  <td className="py-3 px-4 text-xs text-slate-500">
                    {src.last_checked_at
                      ? new Date(src.last_checked_at).toLocaleString()
                      : 'Never'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleTriggerRun(src.id, src.name)}
                      disabled={triggeringSourceId === src.id}
                      className="text-xs inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      {triggeringSourceId === src.id ? 'Running...' : 'Run Ingestion'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Monitoring Runs History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Ingestion & Polling Execution History
          </CardTitle>
        </CardHeader>
        {runs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No monitoring runs recorded yet. Click "Run Ingestion" above to simulate an ingestion check.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Items Scanned</th>
                  <th className="py-3 px-4">Changes Detected</th>
                  <th className="py-3 px-4">Execution Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {new Date(r.started_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white text-xs">
                      {r.source_name}
                    </td>

                    <td className="py-3 px-4">{getRunBadge(r.status)}</td>

                    <td className="py-3 px-4 text-xs font-mono">{r.items_scanned}</td>

                    <td className="py-3 px-4 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {r.changes_detected}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-sm truncate">
                      {r.execution_log || 'Run completed successfully without errors.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
