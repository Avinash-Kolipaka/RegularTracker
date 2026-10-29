import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  GitCompare,
  CheckCircle2,
  ListTodo,
  CalendarDays,
  FileLock2,
  Users,
  FileSpreadsheet,
  History,
  Radio,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.system_role === 'PLATFORM_ADMIN';

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Regulatory Library', to: '/regulations/library', icon: BookOpen },
    { label: 'Updates & Diffs', to: '/regulations/updates', icon: GitCompare },
    { label: 'Applicability Review', to: '/regulations/applicability', icon: CheckCircle2 },
    { label: 'Compliance Tasks', to: '/tasks', icon: ListTodo },
    { label: 'Deadline Calendar', to: '/calendar', icon: CalendarDays },
    { label: 'Document Vault', to: '/documents', icon: FileLock2 },
    { label: 'Team & Access', to: '/team', icon: Users },
    { label: 'Reports & Exports', to: '/reports', icon: FileSpreadsheet },
    { label: 'Audit Trail', to: '/audit', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">RegulaTrack</span>
            <span className="block text-[10px] font-medium text-teal-400 tracking-wider uppercase -mt-0.5">Intelligence</span>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-300 font-semibold border-l-2 border-teal-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div className="px-3 pt-4 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Platform Admin
              </div>
              <NavLink
                to="/admin/sources"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-300 font-semibold border-l-2 border-teal-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Radio className="w-4 h-4 shrink-0" />
                <span className="truncate">Source Monitoring</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Footer Navigation: Settings & Disclaimer */}
      <div className="p-3 border-t border-slate-800/80">
        <NavLink
          to="/settings/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-teal-600/20 text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>Business Settings</span>
        </NavLink>

        <div className="mt-3 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-300 mb-0.5">Notice</p>
          Operational compliance aid. Does not provide or replace legal advice.
        </div>
      </div>
    </aside>
  );
};
