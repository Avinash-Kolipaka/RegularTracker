export type SystemRole = 'PLATFORM_ADMIN' | 'USER';

export type BusinessRole = 'OWNER' | 'COMPLIANCE_MANAGER' | 'EMPLOYEE' | 'CONSULTANT' | 'VIEWER';

export interface UserProfile {
  phone_number?: string;
  job_title?: string;
  timezone: string;
  avatar_url?: string;
  email_notifications_enabled: boolean;
  in_app_notifications_enabled: boolean;
}

export interface WorkspaceSummary {
  business_id: string;
  business_name: string;
  business_slug: string;
  role: BusinessRole;
  role_display: string;
  is_profile_complete: boolean;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  system_role: SystemRole;
  is_staff: boolean;
  profile?: UserProfile;
  active_workspaces: WorkspaceSummary[];
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  legal_name?: string;
  dba_name?: string;
  industry_category: string;
  industry_code?: string;
  country: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  operating_locations: string[];
  employee_count_band: string;
  annual_revenue_band: string;
  regulated_activities: string[];
  registration_identifier?: string;
  is_profile_complete: boolean;
  completeness_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessMembership {
  id: string;
  business: string;
  user: string;
  user_email: string;
  user_full_name: string;
  role: BusinessRole;
  role_display: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  business: string;
  business_name: string;
  email: string;
  role: BusinessRole;
  invited_by: string;
  invited_by_email: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expires_at: string;
  token: string;
  is_valid: boolean;
  created_at: string;
}

export interface RegulationSource {
  id: string;
  name: string;
  slug: string;
  source_type: string;
  official_url: string;
  jurisdiction: string;
  description?: string;
  is_active: boolean;
  check_frequency_hours: number;
  last_checked_at?: string;
  last_success_at?: string;
  created_at: string;
}

export interface RequirementVersion {
  id: string;
  version_number: number;
  title: string;
  summary: string;
  change_summary?: string;
  effective_date?: string;
  published_at: string;
}

export interface RegulatoryRequirement {
  id: string;
  source: string;
  source_name: string;
  source_type: string;
  reference_code: string;
  title: string;
  summary: string;
  full_text?: string;
  jurisdiction: string;
  industry_categories: string[];
  official_source_url?: string;
  publication_date?: string;
  effective_date?: string;
  mandatory_filing_deadline?: string;
  verification_status: 'VERIFIED' | 'UNVERIFIED' | 'COMMUNITY_DRAFT';
  verified_at?: string;
  last_reviewed_at?: string;
  version_number: number;
  applicability_criteria?: Record<string, any>;
  versions?: RequirementVersion[];
  created_at: string;
}

export interface BusinessRequirement {
  id: string;
  business: string;
  requirement: RegulatoryRequirement;
  status: 'POTENTIALLY_APPLICABLE' | 'CONFIRMED_APPLICABLE' | 'NOT_APPLICABLE' | 'UNDER_REVIEW';
  status_display: string;
  match_reasons: string[];
  is_pinned: boolean;
  notes?: string;
  last_evaluated_at: string;
  created_at: string;
}

export interface TaskChecklistItem {
  id: string;
  task: string;
  title: string;
  is_completed: boolean;
  completed_at?: string;
  sort_order: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task: string;
  author: string;
  author_email: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface ComplianceTask {
  id: string;
  business: string;
  requirement?: string;
  requirement_code?: string;
  requirement_title?: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'BLOCKED' | 'COMPLETED';
  status_display: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority_display: string;
  created_by?: string;
  assigned_to?: string;
  assignee_email?: string;
  assignee_name?: string;
  due_date?: string;
  completed_at?: string;
  is_ai_draft: boolean;
  checklist_items: TaskChecklistItem[];
  comments: TaskComment[];
  created_at: string;
  updated_at: string;
}

export interface ComplianceDeadline {
  id: string;
  business: string;
  requirement?: string;
  requirement_code?: string;
  requirement_title?: string;
  task?: string;
  task_title?: string;
  title: string;
  description?: string;
  deadline_type: string;
  deadline_type_display: string;
  due_date: string;
  is_official_statutory: boolean;
  status: 'UPCOMING' | 'COMPLETED' | 'OVERDUE' | 'WAIVED';
  status_display: string;
  reminder_days_before: number[];
  assigned_to?: string;
  assignee_name?: string;
  completed_at?: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  event_type: 'DEADLINE' | 'TASK' | 'RENEWAL' | 'INSPECTION';
  is_statutory: boolean;
  status: string;
  priority: string;
  description?: string;
}

export interface ComplianceDocument {
  id: string;
  business: string;
  requirement?: string;
  requirement_code?: string;
  task?: string;
  task_title?: string;
  title: string;
  description?: string;
  category: string;
  category_display: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  sha256_hash: string;
  expiration_date?: string;
  is_archived: boolean;
  version_number: number;
  uploaded_by?: string;
  uploader_email?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  business?: string;
  title: string;
  message: string;
  notification_type: string;
  notification_type_display: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface AuditEventItem {
  id: string;
  business?: string;
  actor?: string;
  actor_email?: string;
  action: string;
  action_display: string;
  entity_type: string;
  entity_id: string;
  description: string;
  ip_address?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SourceMonitoringRun {
  id: string;
  source: string;
  source_name: string;
  status: 'RUNNING' | 'SUCCESS' | 'NO_CHANGES' | 'FAILED';
  status_display: string;
  started_at: string;
  completed_at?: string;
  items_scanned: number;
  changes_detected: number;
  error_message?: string;
  execution_log?: string;
}

export interface RegulatoryChange {
  id: string;
  monitoring_run?: string;
  source: string;
  source_name: string;
  requirement?: string;
  reference_code: string;
  title: string;
  change_type: string;
  change_type_display: string;
  summary: string;
  previous_text: string;
  new_text: string;
  diff_payload: {
    has_changes?: boolean;
    added_lines?: string[];
    removed_lines?: string[];
    change_summary?: string;
  };
  previous_hash: string;
  new_hash: string;
  source_url: string;
  publication_date?: string;
  effective_date?: string;
  review_status: 'PENDING_REVIEW' | 'ACCEPTED' | 'DISMISSED';
  review_status_display: string;
  reviewed_by?: string;
  reviewer_email?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface DashboardMetrics {
  business: {
    id: string;
    name: string;
    is_profile_complete: boolean;
    completeness_percentage: number;
  };
  metrics: {
    total_tracked_requirements: number;
    verified_requirements_count: number;
    unverified_requirements_count: number;
    upcoming_deadlines_count: number;
    overdue_tasks_count: number;
    assigned_to_me_count: number;
    expiring_documents_count: number;
    pending_regulatory_updates_count: number;
    compliance_health_score: number;
    score_calculation_notes: string;
  };
  task_status_breakdown: Array<{ status: string; count: number }>;
  recent_activity: Array<{
    id: string;
    action: string;
    action_display: string;
    description: string;
    actor_email: string;
    created_at: string;
  }>;
}
