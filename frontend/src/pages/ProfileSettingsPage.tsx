import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  MapPin,
  Users,
  DollarSign,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Business } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const REGULATED_ACTIVITIES = [
  { id: 'chemical_storage', label: 'Hazardous Chemicals / Flammable Liquids Storage' },
  { id: 'hazardous_waste', label: 'Hazardous Waste Generation or Disposal' },
  { id: 'remote_workforce', label: 'Remote or Multi-State Workforce' },
  { id: 'food_handling', label: 'Food Handling, Processing or Commercial Kitchen' },
  { id: 'data_processing', label: 'Consumer Personal Information & Data Processing (GDPR/CCPA)' },
  { id: 'payment_processing', label: 'Payment Card / Financial Transaction Processing (PCI-DSS)' },
  { id: 'medical_devices', label: 'Medical Devices, Clinical or Healthcare Services (HIPAA)' },
  { id: 'import_export', label: 'International Trade, Customs Import / Export' },
];

export const ProfileSettingsPage: React.FC = () => {
  const { currentWorkspace, canManageCompliance, refreshWorkspaces } = useWorkspace();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [dbaName, setDbaName] = useState('');
  const [industryCategory, setIndustryCategory] = useState('');
  const [country, setCountry] = useState('US');
  const [stateProvince, setStateProvince] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [operatingLocationsText, setOperatingLocationsText] = useState('');
  const [employeeCountBand, setEmployeeCountBand] = useState('10-19');
  const [annualRevenueBand, setAnnualRevenueBand] = useState('$1M-$5M');
  const [activities, setActivities] = useState<string[]>([]);
  const [registrationIdentifier, setRegistrationIdentifier] = useState('');

  const loadBusiness = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBusiness(currentWorkspace.business_id);
      setBusiness(data);
      setName(data.name || '');
      setLegalName(data.legal_name || '');
      setDbaName(data.dba_name || '');
      setIndustryCategory(data.industry_category || '');
      setCountry(data.country || 'US');
      setStateProvince(data.state_province || '');
      setCity(data.city || '');
      setPostalCode(data.postal_code || '');
      setOperatingLocationsText((data.operating_locations || []).join(', '));
      setEmployeeCountBand(data.employee_count_band || '10-19');
      setAnnualRevenueBand(data.annual_revenue_band || '$1M-$5M');
      setActivities(data.regulated_activities || []);
      setRegistrationIdentifier(data.registration_identifier || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load business profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, [currentWorkspace]);

  const toggleActivity = (id: string) => {
    setActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const parsedLocations = operatingLocationsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await api.updateBusinessProfile(currentWorkspace.business_id, {
        name,
        legal_name: legalName,
        dba_name: dbaName,
        industry_category: industryCategory,
        country,
        state_province: stateProvince,
        city,
        postal_code: postalCode,
        operating_locations: parsedLocations,
        employee_count_band: employeeCountBand,
        annual_revenue_band: annualRevenueBand,
        regulated_activities: activities,
        registration_identifier: registrationIdentifier,
      });

      setBusiness(updated);
      setSuccessMessage('Business profile saved successfully!');
      refreshWorkspaces();
    } catch (err: any) {
      setError(err.message || 'Failed to update business profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleReevaluate = async () => {
    if (!currentWorkspace) return;
    try {
      setReEvaluating(true);
      setError(null);
      const res = await api.evaluateApplicability(currentWorkspace.business_id);
      setSuccessMessage(
        `Applicability assessment re-evaluated! Matched ${res.matched_requirements_count || 'all applicable'} statutory requirements.`
      );
      loadBusiness();
    } catch (err: any) {
      setError(err.message || 'Failed to re-evaluate applicability.');
    } finally {
      setReEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        Loading profile settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Business Profile & Operational Baseline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your enterprise characteristics to power the deterministic regulatory applicability engine.
          </p>
        </div>

        {canManageCompliance && (
          <Button
            variant="outline"
            onClick={handleReevaluate}
            disabled={reEvaluating}
            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            {reEvaluating ? 'Evaluating...' : 'Re-run Applicability Engine'}
          </Button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {successMessage}
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

      {/* Completeness Banner */}
      {business && (
        <Card className="p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Profile Completeness: {business.completeness_percentage}%
                {business.is_profile_complete ? (
                  <Badge variant="success">Complete</Badge>
                ) : (
                  <Badge variant="warning">Incomplete</Badge>
                )}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Accurate profile data enables RegulaTrack to eliminate irrelevant mandates and flag applicable rules.
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${business.completeness_percentage}%` }}
            />
          </div>
        </Card>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Basic Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Company Identity & Industry Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g., Apex Manufacturing LLC"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Industry Category *
                </label>
                <select
                  required
                  value={industryCategory}
                  onChange={(e) => setIndustryCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="">Select Primary Sector...</option>
                  <option value="MANUFACTURING">Manufacturing & Industrial</option>
                  <option value="HEALTHCARE">Healthcare & Life Sciences</option>
                  <option value="TECHNOLOGY">Software, SaaS & IT Services</option>
                  <option value="RETAIL">Retail, E-Commerce & Consumer Goods</option>
                  <option value="CONSTRUCTION">Construction & Contracting</option>
                  <option value="FINANCIAL_SERVICES">Financial Services & Fintech</option>
                  <option value="FOOD_BEVERAGE">Food, Beverage & Hospitality</option>
                  <option value="PROFESSIONAL_SERVICES">Professional Services & Consulting</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Registration / EIN Identifier
                </label>
                <input
                  type="text"
                  value={registrationIdentifier}
                  onChange={(e) => setRegistrationIdentifier(e.target.value)}
                  placeholder="e.g., XX-XXXXXXX"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geographic Jurisdiction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              Jurisdiction & Operating Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Country *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="US">United States (Federal & State)</option>
                  <option value="CA">Canada (Federal & Provincial)</option>
                  <option value="UK">United Kingdom</option>
                  <option value="EU">European Union</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary State / Province
                </label>
                <input
                  type="text"
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  placeholder="e.g., CA or California"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  City / Municipality
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., San Jose"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                All Operating Locations & States (Comma separated)
              </label>
              <input
                type="text"
                value={operatingLocationsText}
                onChange={(e) => setOperatingLocationsText(e.target.value)}
                placeholder="e.g., California, Texas, New York, Washington"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">
                Enter all jurisdictions where you have physical premises, inventory, or remote employees.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Company Scale & Regulated Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Scale & Operational Characteristics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Employee Count Band *
                </label>
                <select
                  value={employeeCountBand}
                  onChange={(e) => setEmployeeCountBand(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="1-4">1 – 4 Employees</option>
                  <option value="5-9">5 – 9 Employees</option>
                  <option value="10-19">10 – 19 Employees (OSHA Threshold)</option>
                  <option value="20-49">20 – 49 Employees</option>
                  <option value="50-99">50 – 99 Employees (FMLA / ACA Threshold)</option>
                  <option value="100-249">100 – 249 Employees (EEO-1 Threshold)</option>
                  <option value="250-499">250 – 499 Employees</option>
                  <option value="500+">500+ Large Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Annual Revenue Band
                </label>
                <select
                  value={annualRevenueBand}
                  onChange={(e) => setAnnualRevenueBand(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="<$100k">Under $100,000</option>
                  <option value="$100k-$500k">$100k – $500k</option>
                  <option value="$500k-$1M">$500k – $1M</option>
                  <option value="$1M-$5M">$1M – $5M</option>
                  <option value="$5M-$25M">$5M – $25M</option>
                  <option value="$25M+">$25M+ Enterprise</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Operational Activities & Regulatory Triggers
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REGULATED_ACTIVITIES.map((act) => (
                  <label
                    key={act.id}
                    className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={activities.includes(act.id)}
                      onChange={() => toggleActivity(act.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                    />
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {act.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        {canManageCompliance && (
          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving Profile...' : 'Save Profile Changes'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
