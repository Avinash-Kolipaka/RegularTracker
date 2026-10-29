import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">403</h1>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-2">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            You do not possess the required permissions or workspace membership role to access this resource.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Link to="/dashboard">
            <Button className="flex items-center gap-1.5">
              <Home className="w-4 h-4" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
