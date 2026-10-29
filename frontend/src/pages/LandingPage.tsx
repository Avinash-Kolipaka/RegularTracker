import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  FileLock2,
  GitCompare,
  ArrowRight,
  Building,
  Scale,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
            </div>
            <span className="font-bold text-lg text-white">RegulaTrack</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-8">
            <Scale className="w-3.5 h-3.5" />
            Compliance Intelligence & Management Platform
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Confident regulatory tracking for <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-200">modern businesses</span>.
          </h1>

          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Organize potentially applicable regulations, monitor official sources for updates, track statutory deadlines, and securely store compliance evidence in an audit-ready platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-8">
                Create Free Workspace <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                Explore Demo Environment
              </Button>
            </Link>
          </div>

          {/* Legal Disclaimer Pill */}
          <div className="mt-8 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 max-w-lg mx-auto">
            <strong className="text-slate-300">Important Disclaimer:</strong> RegulaTrack is an operational compliance management aid and does not constitute a law firm, certified audit body, or qualified legal advice.
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-slate-950 border-t border-slate-800/80 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Engineered for operational compliance clarity</h2>
            <p className="mt-3 text-slate-400 max-w-xl mx-auto">
              Replace scattered spreadsheets and manual email threads with a single source of truth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mb-6">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Deterministic Applicability</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Matches requirements to your business characteristics, operating locations, and employee count with transparent, source-backed explanations.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-6">
                <GitCompare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Source Monitoring & Diffs</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Pluggable adapters monitor official publications. Side-by-side text diff engine highlights added, removed, and modified regulatory text.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Statutory Deadlines & Calendar</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Distinguishes official mandatory filing dates from internal operational targets with automated advance notifications and calendar export.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-6">
                <FileLock2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Secure Document Vault</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Store permits, inspection records, and policies privately. Cryptographic SHA-256 integrity hashing and expiration alerts.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Role-Based Team Access</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Granular permissions for Owners, Compliance Managers, Employees, and Consultants with strict cross-workspace data isolation.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-6">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Immutable Audit Trail</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every review decision, task completion, and document change produces an immutable audit record for internal and external inspections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 px-6 text-center text-xs text-slate-400">
        <p>© 2026 RegulaTrack. All rights reserved. Regulatory intelligence & compliance operations platform.</p>
        <p className="mt-2 text-slate-400 max-w-2xl mx-auto">
          Notice: RegulaTrack provides operational compliance management software. It is not an attorney, law firm, or legal services provider. Use of this application does not create an attorney-client relationship.
        </p>
      </footer>
    </div>
  );
};
