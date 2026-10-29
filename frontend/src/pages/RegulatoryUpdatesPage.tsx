import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { RegulatoryChange } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export const RegulatoryUpdatesPage: React.FC = () => {
  const [changes, setChanges] = useState<RegulatoryChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_REVIEW');

  // Review Modal State
  const [activeChange, setActiveChange] = useState<RegulatoryChange | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'ACCEPTED' | 'DISMISSED'>('ACCEPTED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadChanges = async () => {
    setLoading(true);
    try {
      const data = await api.getRegulatoryChanges(filterStatus || undefined);
      setChanges(data);
    } catch (err) {
      console.error('Failed to load regulatory changes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, [filterStatus]);

  const handleOpenReview = (change: RegulatoryChange, decision: 'ACCEPTED' | 'DISMISSED') => {
    setActiveChange(change);
    setReviewDecision(decision);
    setReviewNotes('');
  };

  const handleSubmitReview = async () => {
    if (!activeChange) return;
    setSubmitting(true);
    try {
      await api.reviewRegulatoryChange(activeChange.id, {
        decision: reviewDecision,
        notes: reviewNotes,
      });
      setActiveChange(null);
      await loadChanges();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Regulatory Updates & Text Diffs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review changes detected by automated source monitoring runs before promoting them to active rules.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterStatus('PENDING_REVIEW')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'PENDING_REVIEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setFilterStatus('ACCEPTED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'ACCEPTED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setFilterStatus('DISMISSED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'DISMISSED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dismissed
          </button>
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === '' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Human Review Requirement Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <strong className="block font-semibold">Human Review Workflow Required:</strong>
          <span className="leading-relaxed">
            A detected content difference does not automatically alter a company's statutory obligations. Each detected delta must be verified by a compliance manager or legal counsel before updates are applied.
          </span>
        </div>
      </div>

      {/* Change Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-60 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : changes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No regulatory updates in this state</h3>
          <p className="text-xs text-slate-500 mt-1">All monitored sources are up-to-date and reviewed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {changes.map((change) => {
            const diff = change.diff_payload || {};
            const added = diff.added_lines || [];
            const removed = diff.removed_lines || [];

            return (
              <Card key={change.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {change.reference_code}
                    </span>
                    <Badge
                      variant={
                        change.review_status === 'ACCEPTED'
                          ? 'success'
                          : change.review_status === 'DISMISSED'
                          ? 'slate'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {change.review_status_display}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">·</span>
                    <span className="text-xs font-medium text-slate-600">{change.source_name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {change.source_url && (
                      <a
                        href={change.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-700 font-medium"
                      >
                        Source Link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{change.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{change.summary}</p>
                  </div>

                  {/* Text Diff Comparison Area */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden text-xs font-mono">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
                      <span>Detected Text Differences</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        {diff.change_summary || `${added.length} lines added, ${removed.length} lines removed`}
                      </span>
                    </div>

                    <div className="p-4 space-y-1 bg-slate-900 text-slate-200 overflow-x-auto max-h-56">
                      {removed.map((line, idx) => (
                        <div key={`rem-${idx}`} className="text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded">
                          - {line}
                        </div>
                      ))}
                      {added.map((line, idx) => (
                        <div key={`add-${idx}`} className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded">
                          + {line}
                        </div>
                      ))}
                      {added.length === 0 && removed.length === 0 && (
                        <div className="text-slate-400 italic">Newly ingested publication text excerpt available.</div>
                      )}
                    </div>
                  </div>

                  {/* Review Actions if Pending */}
                  {change.review_status === 'PENDING_REVIEW' ? (
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReview(change, 'DISMISSED')}
                      >
                        Dismiss as Irrelevant
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleOpenReview(change, 'ACCEPTED')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept & Apply Update
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
                      <strong>Reviewed:</strong> Decision: <span className="font-semibold">{change.review_status_display}</span>
                      {change.reviewer_email && ` by ${change.reviewer_email}`}
                      {change.review_notes && <p className="mt-1 text-slate-500">Notes: {change.review_notes}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Decision Modal */}
      <Modal
        isOpen={!!activeChange}
        onClose={() => setActiveChange(null)}
        title={reviewDecision === 'ACCEPTED' ? 'Accept & Apply Regulatory Update' : 'Dismiss Regulatory Update'}
        description={`Submit official review for ${activeChange?.reference_code}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            {reviewDecision === 'ACCEPTED'
              ? 'Accepting this change will increment the requirement version and update the active compliance rule across applicable workspaces.'
              : 'Dismissing this change flags it as non-actionable or irrelevant to your organization.'}
          </p>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Review Notes / Legal Rationale</label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g. Verified against official Federal Register publication; affects warehouse labeling."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setActiveChange(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={submitting}
              className={reviewDecision === 'ACCEPTED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-800'}
              onClick={handleSubmitReview}
            >
              Confirm Decision
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
