import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';

export const OnboardingWizardPage: React.FC = () => {
  const { activeBusiness, reloadWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [legalName, setLegalName] = useState('');
  const [industryCategory, setIndustryCategory] = useState('Manufacturing');
  const [industryCode, setIndustryCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [stateProvince, setStateProvince] = useState('California');
  const [city, setCity] = useState('');
  const [employeeBand, setEmployeeBand] = useState('11-50');
  const [revenueBand, setRevenueBand] = useState('1M_TO_5M');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([
    'chemical_storage',
    'hazardous_waste',
  ]);

  useEffect(() => {
    if (activeBusiness) {
      setLegalName(activeBusiness.legal_name || activeBusiness.name);
      if (activeBusiness.industry_category) setIndustryCategory(activeBusiness.industry_category);
      if (activeBusiness.country) setCountry(activeBusiness.country);
      if (activeBusiness.state_province) setStateProvince(activeBusiness.state_province);
      if (activeBusiness.city) setCity(activeBusiness.city);
      if (activeBusiness.employee_count_band) setEmployeeBand(activeBusiness.employee_count_band);
      if (activeBusiness.regulated_activities?.length) setSelectedActivities(activeBusiness.regulated_activities);
    }
  }, [activeBusiness]);

  const toggleActivity = (activityKey: string) => {
    if (selectedActivities.includes(activityKey)) {
      setSelectedActivities(selectedActivities.filter((a) => a !== activityKey));
    } else {
      setSelectedActivities([...selectedActivities, activityKey]);
    }
  };

  const handleFinish = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      await api.updateBusinessProfile(activeBusiness.id, {
        legal_name: legalName,
        industry_category: industryCategory,
        industry_code: industryCode,
        country,
        state_province: stateProvince,
        city,
        employee_count_band: employeeBand,
        annual_revenue_band: revenueBand,
        regulated_activities: selectedActivities,
      });

      // Trigger automatic initial applicability evaluation
      try {
        await api.evaluateApplicability(activeBusiness.id);
      } catch (e) {
        console.warn('Initial evaluation trigger deferred:', e);
      }

      await reloadWorkspace();
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to update business profile.');
    } finally {
      setLoading(false);
    }
  };

  const activityOptions = [
    { id: 'chemical_storage', label: 'Chemical Storage & Handling', desc: 'Stores, blends, or uses OSHA-regulated hazardous chemicals' },
    { id: 'hazardous_waste', label: 'Hazardous Waste Generation', desc: 'Produces regulated waste subject to EPA RCRA manifests' },
    { id: 'heavy_machinery', label: 'Heavy Machinery & Lockout/Tagout', desc: 'Operates industrial plant equipment or automated presses' },
    { id: 'health_data_hipaa', label: 'Protected Health Information (PHI)', desc: 'Collects or processes medical data covered by HIPAA' },
    { id: 'customer_pii', label: 'Consumer Personal Data & Payments', desc: 'Stores customer PII, subject to CCPA, FTC Safeguards, GDPR' },
    { id: 'outdoor_high_heat', label: 'High Heat / Outdoor Operations', desc: 'Employs workers in warehouses or outdoor high-heat environments' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto w-full">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Step {step} of 3</span>
            <span>Profile Completeness: {step === 1 ? '35%' : step === 2 ? '70%' : '100%'}</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300"
              style={{ width: step === 1 ? '35%' : step === 2 ? '70%' : '100%' }}
            />
          </div>
        </div>

        {/* Wizard Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-8">
          {/* Transparency Callout */}
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-2.5 mb-6">
            <Info className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
            <p>
              <strong>Applicability Accuracy Notice:</strong> Regulatory applicability matches depend directly on the precision of these details. RegulaTrack uses transparent deterministic rules to suggest applicable requirements.
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Entity & Industry Classification</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Define your legal identity and business sector for regulatory matching.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Legal Company Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. Apex Manufacturing Labs, Inc."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Primary Industry Category</label>
                <select
                  value={industryCategory}
                  onChange={(e) => setIndustryCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Manufacturing">Manufacturing & Industrial</option>
                  <option value="Healthcare">Healthcare, Medical Devices & Biotech</option>
                  <option value="Construction">Construction, Engineering & Contractors</option>
                  <option value="Technology">Technology, SaaS & Digital Services</option>
                  <option value="Retail">Retail, Wholesale & Distribution</option>
                  <option value="Food & Beverage">Food Processing & Agriculture</option>
                  <option value="GENERAL">General Commercial Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NAICS / Industry Code (Optional)
                </label>
                <input
                  type="text"
                  value={industryCode}
                  onChange={(e) => setIndustryCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. 332813 or 541511"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)}>
                  Next: Jurisdiction & Operating Locations <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Jurisdiction & Operating Locations</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Compliance obligations vary heavily by physical state and municipal jurisdiction.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Primary State / Province</label>
                  <input
                    type="text"
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. California"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City / Headquarters</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. San Jose"
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Next: Operational Activities & Scale <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Scale & Regulated Operations</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select activities performed by your business. These trigger specific statutory rules.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Employee Count</label>
                  <select
                    value={employeeBand}
                    onChange={(e) => setEmployeeBand(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="1-10">1 - 10 employees</option>
                    <option value="11-50">11 - 50 employees</option>
                    <option value="51-200">51 - 200 employees</option>
                    <option value="201-500">201 - 500 employees</option>
                    <option value="501+">500+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Revenue Range</label>
                  <select
                    value={revenueBand}
                    onChange={(e) => setRevenueBand(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="UNDER_1M">Under $1 Million</option>
                    <option value="1M_TO_5M">$1M - $5 Million</option>
                    <option value="5M_TO_25M">$5M - $25 Million</option>
                    <option value="25M_PLUS">$25 Million+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Regulated Operational Activities (Select all that apply)
                </label>
                <div className="space-y-2">
                  {activityOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedActivities.includes(opt.id)
                          ? 'border-teal-500 bg-teal-50/40 text-slate-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedActivities.includes(opt.id)}
                        onChange={() => toggleActivity(opt.id)}
                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <span className="text-sm font-semibold block">{opt.label}</span>
                        <span className="text-xs text-slate-500">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={handleFinish} isLoading={loading} className="bg-teal-600 hover:bg-teal-700">
                  <Sparkles className="w-4 h-4 mr-1.5" /> Complete Setup & Evaluate Matches
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
