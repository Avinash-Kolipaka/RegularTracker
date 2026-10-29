import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { BusinessRequirement } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export const ApplicabilityReviewPage: React.FC = () => {
  const { activeBusiness } = useWorkspace();
  const [bizRequirements, setBizRequirements] = useState<BusinessRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Review Modal
  const [selectedReq, setSelectedReq] = useState<BusinessRequirement | null>(null);
  const [newStatus, setNewStatus] = useState<string>('CONFIRMED_APPLICABLE');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const data = await api.getBusinessRequirements(activeBusiness.id, filterStatus || undefined);
      setBizRequirements(data);
    } catch (err) {
      console.error('Failed to load business requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness, filterStatus]);

  const handleRunEvaluation = async () => {
    if (!activeBusiness) return;
    setEvaluating(true);
    try {
      const res = await api.evaluateApplicability(activeBusiness.id);
      alert(`Applicability matching completed: ${res.potentially_applicable_count} requirements matched.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleOpenReview = (req: BusinessRequirement, status: string) => {
    setSelectedReq(req);
    setNewStatus(status);
    setRationale('');
  };

  const handleSubmitReview = async () => {
    if (!activeBusiness || !selectedReq) return;
    setSubmitting(true);
    try {
      await api.reviewBusinessRequirement(activeBusiness.id, selectedReq.id, {
        status: newStatus,
        rationale: rationale || 'Status confirmed by compliance manager.',
      });
      setSelectedReq(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'CONFIRMED_APPLICABLE':
        return 'success';
      case 'POTENTIALLY_APPLICABLE':
        return 'warning';
      case 'NOT_APPLICABLE':
        return 'slate';
      case 'UNDER_REVIEW':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Applicability Assessment & Review
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent comparison of {activeBusiness?.name} operational characteristics against regulatory mandates.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleRunEvaluation}
          isLoading={evaluating}
          icon={<Sparkles className="w-4 h-4 text-teal-600" />}
        >
          Re-evaluate Matches Against Profile
        </Button>
      </div>

      {/* Transparency Disclaimer */}
      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 text-teal-600 mt-0.5" />
        <div>
          <strong className="block font-semibold">Deterministic Rule Transparency:</strong>
          <span className="leading-relaxed">
            RegulaTrack evaluates rules strictly using jurisdiction, industry codes, headcount scale, and operational activities. An automated match is an operational suggestion and does not constitute a conclusive legal determination.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-fit">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterStatus === '' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({bizRequirements.length})
        </button>
        <button
          onClick={() => setFilterStatus('POTENTIALLY_APPLICABLE')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterStatus === 'POTENTIALLY_APPLICABLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Potentially Applicable
        </button>
        <button
          onClick={() => setFilterStatus('CONFIRMED_APPLICABLE')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterStatus === 'CONFIRMED_APPLICABLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Confirmed Applicable
        </button>
        <button
          onClick={() => setFilterStatus('NOT_APPLICABLE')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterStatus === 'NOT_APPLICABLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Not Applicable / Exempt
        </button>
      </div>

      {/* Requirements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : bizRequirements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No requirements matched this filter</h3>
          <p className="text-xs text-slate-500 mt-1">Run applicability matching or check the general library.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bizRequirements.map((item) => {
            const req = item.requirement;
            return (
              <Card key={item.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {req.reference_code}
                        </span>
                        <Badge variant={getStatusBadgeVariant(item.status)} size="sm">
                          {item.status_display}
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium">·</span>
                        <span className="text-xs font-medium text-slate-600">{req.source_name}</span>
                        <span className="text-xs text-slate-400 font-medium">·</span>
                        <span className="text-xs text-slate-500">{req.jurisdiction}</span>
                      </div>

                      <Link to={`/regulations/${req.id}`}>
                        <h3 className="text-base font-bold text-slate-900 hover:text-teal-700 transition-colors">
                          {req.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-slate-600 leading-relaxed">{req.summary}</p>

                      {/* Explainable Match Reasons */}
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-700 block mb-1">
                          Evaluated Match Reasoning:
                        </span>
                        {item.match_reasons?.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                            {item.match_reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-500 italic">Manually linked by workspace manager.</span>
                        )}
                        {item.notes && (
                          <p className="mt-2 text-teal-900 font-medium border-t border-slate-200 pt-1">
                            Reviewer Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Review Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleOpenReview(item, 'CONFIRMED_APPLICABLE')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm Applicable
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReview(item, 'NOT_APPLICABLE')}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1 text-slate-500" /> Mark Not Applicable
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenReview(item, 'UNDER_REVIEW')}
                      >
                        Request Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Confirmation Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title="Update Applicability Status"
        description={`Set status for ${selectedReq?.requirement.reference_code}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Status Decision</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="CONFIRMED_APPLICABLE">Confirmed Applicable</option>
              <option value="POTENTIALLY_APPLICABLE">Potentially Applicable</option>
              <option value="NOT_APPLICABLE">Not Applicable / Exempt</option>
              <option value="UNDER_REVIEW">Under Review</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Decision Rationale / Legal Justification</label>
            <textarea
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g. Confirmed: our chemical wash tanks trigger OSHA 1910.1200 labeling requirements."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedReq(null)}>
              Cancel
            </Button>
            <Button size="sm" isLoading={submitting} onClick={handleSubmitReview}>
              Save Determination
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
