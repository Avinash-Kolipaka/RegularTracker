import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  Plus,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Badge } from './ui/Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeBusiness, workspaces, switchWorkspace, activeRole } = useWorkspace();
  const navigate = useNavigate();

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Workspace Switcher */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100 transition-all text-sm font-medium text-slate-800"
          >
            <div className="w-6 h-6 rounded bg-teal-100 text-teal-700 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-900 max-w-[180px] truncate">
              {activeBusiness ? activeBusiness.name : 'Select Workspace'}
            </span>
            {activeRole && (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                {activeRole}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {isWorkspaceOpen && (
            <div
              className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setIsWorkspaceOpen(false)}
            >
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Workspaces ({workspaces.length})
              </div>
              {workspaces.map((w) => (
                <button
                  key={w.business_id}
                  onClick={() => switchWorkspace(w.business_id)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    activeBusiness?.id === w.business_id ? 'bg-teal-50/60 font-semibold text-teal-900' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate text-sm">{w.business_name}</span>
                  <Badge variant={w.role === 'OWNER' ? 'purple' : 'slate'} size="sm">
                    {w.role_display}
                  </Badge>
                </button>
              ))}
              <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                <button
                  onClick={() => navigate('/onboarding')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Business Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Notifications, Profile, User menu */}
      <div className="flex items-center gap-4">
        {/* Compliance Legal Notice Pill */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/60">
          <Shield className="w-3.5 h-3.5 text-teal-600" />
          <span>Operational compliance aid · Not legal advice</span>
        </div>

        {/* Notifications Icon */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white"></span>
        </button>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-lg hover:bg-slate-100 transition-colors text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs">
              {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
            </div>
            <span className="font-medium text-slate-800 hidden sm:inline max-w-[120px] truncate">
              {user?.full_name || user?.email}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                {user?.system_role === 'PLATFORM_ADMIN' && (
                  <Badge variant="purple" size="sm" className="mt-1">
                    Platform Administrator
                  </Badge>
                )}
              </div>
              <Link
                to="/settings/account"
                className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                Account Settings
              </Link>
              <Link
                to="/settings/profile"
                className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Business Settings
              </Link>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
