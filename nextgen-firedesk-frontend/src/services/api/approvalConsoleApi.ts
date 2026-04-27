/**
 * Approval Console API Service
 * Frontend API client for the Service Approval Console
 */
import { api } from '@/lib/api';

// ────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────

export interface ApprovalKPIs {
  total_pending: number;
  total_submitted_today: number;
  high_risk_count: number;
  compliance_impact_count: number;
  overdue_count: number;
  ai_suggested_rejections: number;
}

export interface ApprovalSubmissionAsset {
  id: string;
  asset_code: string;
  location: string | null;
  current_health_status: string;
  category: { id: string; category_name: string; category_code: string } | null;
  product: { id: string; product_name: string } | null;
  building: { id: string; building_name: string } | null;
  floor: { id: string; floor_name: string } | null;
  wing: { id: string; wing_name: string } | null;
}

export interface ApprovalSubmission {
  id: string;
  submission_number: string;
  asset: ApprovalSubmissionAsset | null;
  plant: { id: string; plant_name: string; plant_code: string } | null;
  form: { id: string; service_name: string; form_code: string } | null;
  inspection_type: string;
  frequency: string | null;
  scheduled_date: string;
  submitted_at: string;
  started_at: string | null;
  technician: { id: string; name: string; email: string } | null;
  submitted_by: { id: string; name: string } | null;

  // Severity / Risk
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_priority_score: number;
  calculated_priority_score: number;
  calculated_health_status: string;
  risk_level: 'high' | 'medium' | 'low';

  // Derived fields
  before_health_status: string;
  has_photos: boolean;
  photo_count: number;
  has_compliance_impact: boolean;
  is_overdue: boolean;
  time_taken_minutes: number | null;
  status_changed: boolean;
  deviation_count: number;

  // Convenience accessors (flattened from nested objects)
  form_name: string;
  asset_name: string;
  category_name: string;
  technician_name: string;
  location: string | null;

  // AI placeholder
  ai_recommendation: string | null;
}

export interface ApprovalQueueResponse {
  submissions: ApprovalSubmission[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface SubmissionDeviation {
  id?: string;
  question_text: string;
  section: string | null;
  condition_name: string | null;
  condition_code: string | null;
  compliance_status: string;
  severity_level: string;
  priority_score: number;
  health_impact: string | null;
  notes: string | null;
  answer_value: string | null;
  photo_urls: string[] | null;
}

export interface SubmissionDetails {
  submission_id: string;
  submission_number: string;
  asset: { id: string; asset_code: string; health_status: string } | null;
  form: { id: string; service_name: string } | null;
  deviations: SubmissionDeviation[];
  remarks: { question_text: string; notes: string }[];
  photos: { question_text: string; url: string }[];
  failure_history: Array<{
    id: string;
    submission_number: string;
    inspection_type: string;
    scheduled_date: string;
    submitted_at: string;
    status: string;
    approval_status: string;
    calculated_health_status: string;
    calculated_priority_score: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  }>;
  answer_summary: {
    total: number;
    compliant: number;
    non_compliant: number;
    na: number;
    compliance_rate: number;
  };
  ai_recommendation: string | null;
}

export interface BulkActionResult {
  approved?: number;
  rejected?: number;
  approved_count?: number;
  rejected_count?: number;
  results?: Array<{ submissionId: string; success: boolean; error?: string }>;
  failed: Array<{ id: string; error: string }>;
}

export interface AlertsData {
  not_working: Array<{
    asset_id: string;
    asset_code: string;
    location: string | null;
    current_health: string;
    category_name: string | null;
    product_name: string | null;
    building_name: string | null;
    form_name: string | null;
    submission_id: string;
    submission_number: string;
    inspection_type: string | null;
    submitted_at: string | null;
    technician_name: string | null;
  }>;
  repeated_failures: Array<{
    asset_id: string;
    asset_code: string;
    location: string | null;
    current_health: string;
    category_name: string | null;
    product_name: string | null;
    building_name: string | null;
    nc_count: number;
    service_count: number;
    form_names: string[] | null;
  }>;
  critical_compliance: Array<{
    answer_id: string;
    submission_id: string;
    severity_level: 'CRITICAL' | 'HIGH';
    priority_score: number;
    health_impact: string | null;
    compliance_status: string;
    condition_name: string | null;
    question_text: string;
    question_code: string;
    submission_number: string;
    inspection_type: string | null;
    submitted_at: string | null;
    asset_id: string;
    asset_code: string;
    location: string | null;
    category_name: string | null;
    product_name: string | null;
    building_name: string | null;
    form_name: string | null;
    technician_name: string | null;
  }>;
}

export interface FilterDropdownData {
  service_types: string[];
  technicians: Array<{ id: string; name: string; email: string }>;
  categories: Array<{ id: string; name: string; category_name: string; category_code: string }>;
}

export interface ApprovalQueueFilters {
  page?: number;
  limit?: number;
  search?: string;
  service_type?: string;
  inspection_type?: string;
  technician_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  risk_level?: string;
  high_risk?: boolean;
  has_compliance_impact?: string;
  compliance_impact?: boolean;
  is_overdue?: string;
  overdue?: boolean;
  no_photo?: boolean;
  no_photo_evidence?: string;
  status_changed?: boolean | string;
  sort_by?: string;
  sort_order?: string;
}

// ────────────────────────────────────────────────
//  API Methods
// ────────────────────────────────────────────────

const BASE = '/manager/approval-console';

/** Backend wraps responses in { success, data } */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const approvalConsoleApi = {
  /**
   * Get KPI summary
   */
  async getKPIs(): Promise<ApprovalKPIs> {
    const res = await api.get<ApiEnvelope<ApprovalKPIs>>(`${BASE}/kpis`);
    return res.data;
  },

  /**
   * Get approval queue (main table)
   */
  async getApprovalQueue(filters: ApprovalQueueFilters = {}): Promise<ApprovalQueueResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    const url = queryString ? `${BASE}?${queryString}` : BASE;
    const res = await api.get<ApiEnvelope<ApprovalQueueResponse>>(url);
    return res.data;
  },

  /**
   * Get submission details for inline expansion
   */
  async getSubmissionDetails(submissionId: string): Promise<SubmissionDetails> {
    const res = await api.get<ApiEnvelope<SubmissionDetails>>(`${BASE}/submissions/${submissionId}/details`);
    return res.data;
  },

  /**
   * Bulk approve submissions
   */
  async bulkApprove(submissionIds: string[], remarks?: string): Promise<BulkActionResult> {
    const res = await api.post<ApiEnvelope<BulkActionResult>>(`${BASE}/bulk-approve`, { submissionIds, remarks });
    return res.data;
  },

  /**
   * Bulk reject submissions
   */
  async bulkReject(submissionIds: string[], remarks: string): Promise<BulkActionResult> {
    const res = await api.post<ApiEnvelope<BulkActionResult>>(`${BASE}/bulk-reject`, { submissionIds, remarks });
    return res.data;
  },

  /**
   * Get alerts for right-side panel
   */
  async getAlerts(): Promise<AlertsData> {
    const res = await api.get<ApiEnvelope<AlertsData>>(`${BASE}/alerts`);
    return res.data;
  },

  /**
   * Get filter dropdown data (technicians, categories)
   */
  async getFilterDropdownData(): Promise<FilterDropdownData> {
    const res = await api.get<ApiEnvelope<FilterDropdownData>>(`${BASE}/filter-data`);
    return res.data;
  },

  /**
   * Approve a single submission (delegates to existing endpoint)
   */
  async approveService(serviceId: string, remarks?: string): Promise<any> {
    const response = await api.post(`/manager/services/${serviceId}/approve`, {
      remarks: remarks || null,
    });
    return response;
  },

  /**
   * Reject a single submission (delegates to existing endpoint)
   */
  async rejectService(serviceId: string, remarks: string): Promise<any> {
    const response = await api.post(`/manager/services/${serviceId}/reject`, {
      remarks,
    });
    return response;
  },
};

export default approvalConsoleApi;
