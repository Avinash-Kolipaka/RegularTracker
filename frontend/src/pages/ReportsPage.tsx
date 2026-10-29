import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Eye,
  ShieldAlert,
  FileSpreadsheet,
  FileCode,
  Calendar,
  CheckSquare,
  FolderLock,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface ReportCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  onDownloadCsv: (type: string) => void;
  onPreviewJson: (type: string, title: string) => void;
  downloading: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({
  id,
  title,
  description,
  icon,
  tags,
  onDownloadCsv,
  onPreviewJson,
  downloading,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow duration-150 flex flex-col justify-between">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge key={t} variant="neutral" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreviewJson(id, title)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Eye className="w-3.5 h-3.5" /> Preview JSON
          </Button>

          <Button
            size="sm"
            onClick={() => onDownloadCsv(id)}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ReportsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadCsv = async (reportType: string) => {
    if (!currentWorkspace) return;
    try {
      setDownloadingType(reportType);
      const url = api.getReportExportUrl(currentWorkspace.business_id, reportType, 'CSV');
      const token = api.getAccessToken();

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Export failed. Please verify permissions.');
      }

      const blob = await response.blob();
      const downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = `${currentWorkspace.business_slug}_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
    } catch (err: any) {
      alert(err.message || 'Failed to download report.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handlePreviewJson = async (reportType: string, title: string) => {
    if (!currentWorkspace) return;
    setPreviewTitle(title);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const data = await api.exportReportJson(currentWorkspace.business_id, reportType);
      setPreviewData(data);
    } catch (err: any) {
      setPreviewData({ error: err.message || 'Failed to load preview data' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(previewData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reports = [
    {
      id: 'REQUIREMENTS_REGISTER',
      title: 'Applicable Regulatory Register',
      description:
        'Complete inventory of confirmed and potentially applicable statutory rules, verification statuses, official citations, and mandatory requirements.',
      icon: <Layers className="w-5 h-5" />,
      tags: ['Statutory', 'Legal Citations', 'Auditor Ready'],
    },
    {
      id: 'DEADLINES_SCHEDULE',
      title: 'Statutory Deadlines & Filing Schedule',
      description:
        'Master chronology of mandatory agency filings, regulatory deadlines, permit renewal windows, and scheduled periodic audits.',
      icon: <Calendar className="w-5 h-5" />,
      tags: ['Calendar', 'Filings', 'Statutory'],
    },
    {
      id: 'TASK_COMPLETION',
      title: 'Internal Compliance Task Audit',
      description:
        'Operational task performance log detailing completion rates, assigned personnel, verification checklists, and overdue items.',
      icon: <CheckSquare className="w-5 h-5" />,
      tags: ['Operations', 'Team Accountability', 'Audit Trail'],
    },
    {
      id: 'EXPIRING_DOCUMENTS',
      title: 'Document Expiration & Vault Status',
      description:
        'Inventory of critical permits, operating licenses, certifications, and compliance evidence flagged with cryptographic checksums and renewal timelines.',
      icon: <FolderLock className="w-5 h-5" />,
      tags: ['Permits', 'SHA-256', 'Expirations'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileBarChart className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Compliance Reporting & Audit Export Center
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export auditor-ready registers, deadline schedules, and operational evidence in CSV and JSON formats.
        </p>
      </div>

      {/* Legal & Regulatory Disclaimer Box */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-amber-950 dark:text-amber-200">
            Official Compliance & Legal Disclaimer:
          </span>
          <p className="leading-relaxed">
            RegulaTrack is an operational compliance management system, not a law firm. Exported reports summarize tracked internal data and official statutory references for management review; they do not guarantee legal compliance or replace certified legal advice from licensed regulatory counsel.
          </p>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((r) => (
          <ReportCard
            key={r.id}
            id={r.id}
            title={r.title}
            description={r.description}
            icon={r.icon}
            tags={r.tags}
            onDownloadCsv={handleDownloadCsv}
            onPreviewJson={handlePreviewJson}
            downloading={downloadingType === r.id}
          />
        ))}
      </div>

      {/* JSON Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Report Preview: ${previewTitle}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Raw structured JSON payload</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              className="flex items-center gap-1 text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy JSON
                </>
              )}
            </Button>
          </div>

          <div className="bg-slate-950 text-slate-200 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto border border-slate-800">
            {previewLoading ? (
              <div className="py-8 text-center text-slate-400">Loading structured report data...</div>
            ) : (
              <pre>{JSON.stringify(previewData, null, 2)}</pre>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
