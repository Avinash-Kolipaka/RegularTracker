import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Clock,
  History,
  CheckCircle2,
  Plus,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RegulatoryRequirement } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const RequirementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeBusiness } = useWorkspace();
  const navigate = useNavigate();

  const [req, setReq] = useState<RegulatoryRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'fulltext' | 'history'>('details');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getRequirement(id)
      .then((data) => setReq(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading requirement records...</div>;
  }

  if (!req) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold">Requirement Not Found</h3>
        <Link to="/regulations/library" className="mt-4 inline-block text-sm text-teal-600 font-semibold">
          ← Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/regulations/library"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Regulatory Library
        </Link>

        {activeBusiness && (
          <Button
            size="sm"
            onClick={() => navigate('/tasks')}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Compliance Task
          </Button>
        )}
      </div>

      {/* Title & Metadata Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              {req.reference_code}
            </span>
            <Badge variant={req.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
              {req.verification_status === 'VERIFIED' ? 'Verified Official' : 'Unverified Draft'}
            </Badge>
            <span className="text-xs text-slate-400 font-medium">·</span>
            <span className="text-xs font-medium text-slate-600">{req.source_name}</span>
            <span className="text-xs text-slate-400 font-medium">·</span>
            <span className="text-xs text-slate-600">v{req.version_number}</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 leading-snug">{req.title}</h1>

          {req.official_source_url && (
            <div className="mt-3">
              <a
                href={req.official_source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                Official Publication Reference <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Key Dates Banner */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Jurisdiction</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">{req.jurisdiction}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Effective Date</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">{req.effective_date || 'Ongoing / Indefinite'}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Statutory Deadline</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">{req.mandatory_filing_deadline || 'No fixed filing date'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'details' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Plain-Language Summary & Criteria
        </button>
        <button
          onClick={() => setActiveTab('fulltext')}
          className={`pb-3 font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'fulltext' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Full Regulatory Text
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'history' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Version History ({req.versions?.length || 0})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plain-Language Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{req.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Applicability Scope & Trigger Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 w-32 shrink-0">Target Industries:</span>
                <span>{req.industry_categories?.join(', ') || 'All commercial sectors'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-slate-900 w-32 shrink-0">Matching Criteria:</span>
                <pre className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-mono overflow-x-auto flex-1">
                  {JSON.stringify(req.applicability_criteria || {}, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'fulltext' && (
        <Card>
          <CardHeader>
            <CardTitle>Official Legal / Statutory Text</CardTitle>
          </CardHeader>
          <CardContent>
            {req.full_text ? (
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap">
                {req.full_text}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No excerpt stored. See official source publication link.</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Version Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            {!req.versions || req.versions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">This requirement is currently at initial release (v1). No past versions recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {req.versions.map((v) => (
                  <div key={v.id} className="py-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Version {v.version_number}</span>
                      <span className="text-slate-400">{new Date(v.published_at).toLocaleDateString()}</span>
                    </div>
                    {v.change_summary && <p className="text-slate-600 font-medium">Summary: {v.change_summary}</p>}
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[11px] font-mono text-slate-700 whitespace-pre-wrap">
                      {v.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
