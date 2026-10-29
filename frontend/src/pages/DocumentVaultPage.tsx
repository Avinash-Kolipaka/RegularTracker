import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Upload,
  Search,
  Filter,
  Download,
  Trash2,
  FileCheck,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  File
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ComplianceDocument, RegulatoryRequirement } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'POLICY', label: 'Internal Policies & SOPs' },
  { value: 'PERMIT_LICENSE', label: 'Permits & Operating Licenses' },
  { value: 'INSPECTION_RECORD', label: 'Inspection Records' },
  { value: 'TRAINING_CERTIFICATE', label: 'Staff Certifications' },
  { value: 'AUDIT_REPORT', label: 'Audit Reports' },
  { value: 'EVIDENCE', label: 'Proof of Compliance Evidence' },
];

export const DocumentVaultPage: React.FC = () => {
  const { currentWorkspace, canManageCompliance } = useWorkspace();
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docCategory, setDocCategory] = useState('POLICY');
  const [expirationDate, setExpirationDate] = useState('');
  const [linkedReq, setLinkedReq] = useState('');
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const loadDocuments = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const data = await api.getDocuments(currentWorkspace.business_id, params);
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [currentWorkspace, selectedCategory, searchQuery]);

  const handleOpenUpload = async () => {
    if (!currentWorkspace) return;
    setIsUploadModalOpen(true);
    try {
      const reqs = await api.getRequirements();
      setRequirements(reqs);
    } catch (err) {
      console.error('Failed to load requirements for upload modal', err);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !uploadFile || !docTitle.trim()) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', docTitle.trim());
      formData.append('category', docCategory);
      if (docDescription.trim()) formData.append('description', docDescription.trim());
      if (expirationDate) formData.append('expiration_date', expirationDate);
      if (linkedReq) formData.append('requirement', linkedReq);

      await api.uploadDocument(currentWorkspace.business_id, formData);

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setDocTitle('');
      setDocDescription('');
      setDocCategory('POLICY');
      setExpirationDate('');
      setLinkedReq('');
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: ComplianceDocument) => {
    if (!currentWorkspace) return;
    try {
      const url = api.getDocumentDownloadUrl(currentWorkspace.business_id, doc.id);
      const token = api.getAccessToken();

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Download failed');
      }

      const blob = await res.blob();
      const downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = doc.original_filename || `${doc.title}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
    } catch (err: any) {
      alert(err.message || 'Failed to download document.');
    }
  };

  const handleArchive = async (docId: string) => {
    if (!currentWorkspace) return;
    if (!window.confirm('Are you sure you want to archive this compliance document?')) return;

    try {
      await api.archiveDocument(currentWorkspace.business_id, docId);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to archive document.');
    }
  };

  const copyHash = (hash: string, docId: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(docId);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderLock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Secure Document & Evidence Vault
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Store permits, audit reports, and compliance records with cryptographic SHA-256 integrity checks.
          </p>
        </div>

        {canManageCompliance && (
          <Button onClick={handleOpenUpload} className="flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by title or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
          Loading document vault...
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No compliance documents found"
          description={
            searchQuery || selectedCategory !== 'ALL'
              ? 'Try adjusting your search criteria or category filter.'
              : 'Upload your operating permits, insurance policies, or inspection evidence to protect your workspace records.'
          }
          action={
            canManageCompliance ? (
              <Button onClick={handleOpenUpload} className="flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Upload Document
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {documents.map((doc) => {
                  const isExpired = doc.expiration_date && new Date(doc.expiration_date) < new Date();
                  const isApproaching =
                    doc.expiration_date &&
                    !isExpired &&
                    new Date(doc.expiration_date).getTime() - new Date().getTime() < 30 * 86400000;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <File className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {doc.title}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {doc.original_filename} (v{doc.version_number})
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="neutral">{doc.category_display}</Badge>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {formatFileSize(doc.file_size_bytes)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                          <span title={doc.sha256_hash}>
                            {doc.sha256_hash ? doc.sha256_hash.substring(0, 10) + '...' : '—'}
                          </span>
                          {doc.sha256_hash && (
                            <button
                              onClick={() => copyHash(doc.sha256_hash, doc.id)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Copy SHA-256 Checksum"
                            >
                              {copiedHashId === doc.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {doc.expiration_date ? (
                          <div className="flex items-center gap-1.5">
                            {isExpired ? (
                              <Badge variant="danger">Expired ({doc.expiration_date})</Badge>
                            ) : isApproaching ? (
                              <Badge variant="warning">Expiring Soon ({doc.expiration_date})</Badge>
                            ) : (
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {doc.expiration_date}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Never</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </Button>

                          {canManageCompliance && (
                            <button
                              onClick={() => handleArchive(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Archive Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Compliance Document to Secure Vault"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select File *
            </label>
            <input
              type="file"
              required
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
            />
            <p className="text-xs text-slate-400 mt-1">
              Supported formats: PDF, PNG, JPG, JPEG, DOCX, XLSX, TXT (Max 25MB)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g., 2026 Facility Operating Permit"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="POLICY">Internal Policies & SOPs</option>
                <option value="PERMIT_LICENSE">Permits & Operating Licenses</option>
                <option value="INSPECTION_RECORD">Inspection Records</option>
                <option value="TRAINING_CERTIFICATE">Staff Certifications</option>
                <option value="AUDIT_REPORT">Audit Reports</option>
                <option value="EVIDENCE">Proof of Compliance Evidence</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expiration Date (Optional)
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Linked Regulatory Requirement (Optional)
            </label>
            <select
              value={linkedReq}
              onChange={(e) => setLinkedReq(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="">None / General Document</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.reference_code}] {r.title.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Scope, issuing authority, or regulatory notes..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Encrypting & Uploading...' : 'Upload File'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
