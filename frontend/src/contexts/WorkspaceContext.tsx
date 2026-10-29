import React, { createContext, useContext, useEffect, useState } from 'react';
import { Business, BusinessRole, WorkspaceSummary } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

export interface WorkspaceContextType {
  activeBusiness: Business | null;
  currentWorkspace: {
    business_id: string;
    business_name: string;
    business_slug: string;
    role?: BusinessRole;
  } | null;
  workspaces: WorkspaceSummary[];
  activeRole: BusinessRole | null;
  isOwner: boolean;
  isManager: boolean;
  isConsultant: boolean;
  canManage: boolean;
  canManageCompliance: boolean;
  isLoading: boolean;
  switchWorkspace: (businessId: string) => Promise<void>;
  reloadWorkspace: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const workspaces = user?.active_workspaces || [];

  const loadWorkspace = async (businessId: string) => {
    setIsLoading(true);
    try {
      const biz = await api.getBusiness(businessId);
      setActiveBusiness(biz);
      localStorage.setItem('regulatrack_active_business_id', businessId);
    } catch (err) {
      console.error('Failed to load business workspace:', err);
      setActiveBusiness(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveBusiness(null);
      setIsLoading(false);
      return;
    }

    if (workspaces.length === 0) {
      setActiveBusiness(null);
      setIsLoading(false);
      return;
    }

    const savedId = localStorage.getItem('regulatrack_active_business_id');
    const targetId = workspaces.some((w) => w.business_id === savedId)
      ? savedId!
      : workspaces[0].business_id;

    loadWorkspace(targetId);
  }, [user]);

  const switchWorkspace = async (businessId: string) => {
    await loadWorkspace(businessId);
  };

  const reloadWorkspace = async () => {
    if (activeBusiness) {
      await loadWorkspace(activeBusiness.id);
    }
  };

  const refreshWorkspaces = async () => {
    await refreshUser();
    await reloadWorkspace();
  };

  const currentSummary = workspaces.find((w) => w.business_id === activeBusiness?.id);
  const activeRole = currentSummary?.role || null;
  const isOwner = activeRole === 'OWNER';
  const isManager = activeRole === 'COMPLIANCE_MANAGER';
  const isConsultant = activeRole === 'CONSULTANT';
  const canManage = isOwner || isManager || user?.system_role === 'PLATFORM_ADMIN';

  const currentWorkspace = activeBusiness
    ? {
        business_id: activeBusiness.id,
        business_name: activeBusiness.name,
        business_slug: activeBusiness.slug,
        role: activeRole || undefined,
      }
    : null;

  return (
    <WorkspaceContext.Provider
      value={{
        activeBusiness,
        currentWorkspace,
        workspaces,
        activeRole,
        isOwner,
        isManager,
        isConsultant,
        canManage,
        canManageCompliance: canManage,
        isLoading,
        switchWorkspace,
        reloadWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
