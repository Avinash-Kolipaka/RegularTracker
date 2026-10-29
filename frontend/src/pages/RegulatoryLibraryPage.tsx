import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Plus,
  BookOpen,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RegulatoryRequirement, RegulationSource } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const RegulatoryLibraryPage: React.FC = () => {
  const { activeBusiness } = useWorkspace();
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [sources, setSources] = useState<RegulationSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, srcs] = await Promise.all([
        api.getRequirements({
          q: search,
          jurisdiction: selectedJurisdiction || undefined,
          verification_status: selectedStatus || undefined,
          source_id: selectedSource || undefined,
        }),
        api.getSources(),
      ]);
      setRequirements(reqs);
      setSources(srcs);
    } catch (err) {
      console.error('Failed to load regulations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedJurisdiction, selectedStatus, selectedSource]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleLinkToWorkspace = async (reqId: string) => {
    if (!activeBusiness) return;
    try {
      await api.linkRequirementToBusiness(activeBusiness.id, reqId);
      alert('Requirement linked to your workspace.');
    } catch (err: any) {
      alert(err.message || 'Failed to link requirement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Regulatory Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Searchable repository of official mandates, agency standards, and compliance rules.
          </p>
        </div>
        <Link to="/regulations/applicability">
          <Button size="sm" variant="outline" icon={<CheckCircle className="w-4 h-4 text-teal-600" />}>
            View Applicable Rules
          </Button>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference code, title, or keywords (e.g. OSHA, hazardous waste, SDS)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">All Jurisdictions</option>
                <option value="Federal (US)">Federal (US)</option>
                <option value="California">California</option>
                <option value="New York">New York</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">All Verification States</option>
                <option value="VERIFIED">Verified Official</option>
                <option value="UNVERIFIED">Unverified / Auto-Ingested</option>
              </select>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none max-w-[160px] truncate"
              >
                <option value="">All Sources</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <Button type="submit" size="sm">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Requirements List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3 stroke-1" />
          <h3 className="text-base font-semibold text-slate-800">No regulatory requirements match criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search keyword or clearing the filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map((req) => (
            <Card key={req.id} className="hover:border-slate-300 transition-all">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {req.reference_code}
                      </span>
                      <Badge variant={req.verification_status === 'VERIFIED' ? 'success' : 'warning'} size="sm">
                        {req.verification_status === 'VERIFIED' ? 'Verified Official' : 'Unverified Draft'}
                      </Badge>
                      <span className="text-xs text-slate-400 font-medium">·</span>
                      <span className="text-xs font-medium text-slate-600">{req.source_name}</span>
                      <span className="text-xs text-slate-400 font-medium">·</span>
                      <span className="text-xs text-slate-500">{req.jurisdiction}</span>
                    </div>

                    <Link to={`/regulations/${req.id}`} className="block group">
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                        {req.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{req.summary}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                      {req.effective_date && (
                        <span>
                          <strong>Effective:</strong> {req.effective_date}
                        </span>
                      )}
                      {req.mandatory_filing_deadline && (
                        <span>
                          <strong>Deadline:</strong> {req.mandatory_filing_deadline}
                        </span>
                      )}
                      {req.industry_categories?.length > 0 && (
                        <span>
                          <strong>Industries:</strong> {req.industry_categories.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    {req.official_source_url && (
                      <a
                        href={req.official_source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-700 font-medium"
                      >
                        Official Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Link to={`/regulations/${req.id}`}>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => handleLinkToWorkspace(req.id)} title="Track in Workspace">
                        <Plus className="w-4 h-4 text-teal-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
