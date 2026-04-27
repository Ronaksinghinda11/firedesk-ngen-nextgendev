import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronRight, AlertTriangle, Calendar, ClipboardCheck } from 'lucide-react';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useCachedFetch } from '@/hooks/useCachedFetch';

const API_BASE = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:5000/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlantCommandCenterCardProps {
  plantId: string;
  basePath?: string;
}

interface PlantSummaryData {
  readinessStatus: 'READY' | 'ATTENTION' | 'CRITICAL';
  operationalScore: number;
  criticalGaps: number;
  openIssues: { critical: number; major: number; minor: number };
  lastHealthCheck: { date: string; time: string; completed: boolean };
  nextAuditDue: { date: string; label: string; daysRemaining: number };
  compliance: {
    fireNOC: { validTill: string; daysRemaining: number };
    insurance: { validTill: string; daysRemaining: number };
    training: 'On Schedule' | 'Overdue';
    audit: 'On Schedule' | 'Overdue';
  };
  openIssuesCount: number;
  alarmsCount: number;
  lastServiceDate: string;
  /** Dynamic category summaries fetched from the plant's categories */
  categories?: Array<{
    id: string;
    name: string;
    score: number;
    scoreLabel: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PlantCommandCenterCard({ plantId, basePath = '/admin' }: PlantCommandCenterCardProps) {
  const { data, loading, error } = useCachedFetch<PlantSummaryData>(
    `${API_BASE}/dashboard/plant/${plantId}/summary`,
    `plant_summary_${plantId}`,
    30_000, // 30 s stale
    30_000, // poll every 30 s
  );

  if (loading && !data) return <SkeletonCard />;

  // Graceful fallback when the API hasn't been wired yet
  const d: PlantSummaryData = data ?? {
    readinessStatus: 'READY',
    operationalScore: 0,
    criticalGaps: 0,
    openIssues: { critical: 0, major: 0, minor: 0 },
    lastHealthCheck: { date: '-', time: '-', completed: false },
    nextAuditDue: { date: '-', label: '-', daysRemaining: 0 },
    compliance: {
      fireNOC: { validTill: '-', daysRemaining: 0 },
      insurance: { validTill: '-', daysRemaining: 0 },
      training: 'On Schedule',
      audit: 'On Schedule',
    },
    openIssuesCount: 0,
    alarmsCount: 0,
    lastServiceDate: '-',
  };

  const totalIssues = d.openIssues.critical + d.openIssues.major + d.openIssues.minor;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 h-full">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <Shield className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">Plant Command Center</h3>
          </div>
        </div>
      </div>

      {/* 
      // Commented out EHS Command metrics as per user request
      
      // Live indicator
      <div className="flex items-center gap-1.5 text-xs text-green-500">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Live Data
        <span className="text-gray-400 ml-1">Updated 12 sec ago</span>
      </div>

      // Plant Fire Readiness
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Plant Fire Readiness</p>
        <div className="flex items-center gap-2">
          <StatusBadge status={d.readinessStatus} />
          {d.readinessStatus === 'READY' && (
            <span className="text-xs text-green-600">✓ All Systems Operational</span>
          )}
          {d.readinessStatus === 'ATTENTION' && (
            <span className="text-xs text-orange-500">Needs Attention</span>
          )}
          {d.readinessStatus === 'CRITICAL' && (
            <span className="text-xs text-red-600">Critical Issues Found</span>
          )}
        </div>
      </div>

      // Critical Gaps & Open Issues
      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-2">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Critical Gaps
          </p>
          <p className="text-2xl font-bold text-gray-900">{d.criticalGaps}</p>
          <p className="text-[10px] text-gray-400">Zero Critical Issues</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Open Issues</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-red-600">{d.openIssues.critical}</span>
            <span className="text-[10px] text-gray-400">Critical</span>
            <span className="text-lg font-bold text-orange-500 ml-1">{d.openIssues.major}</span>
            <span className="text-[10px] text-gray-400">Major</span>
            <span className="text-lg font-bold text-blue-600 ml-1">{d.openIssues.minor}</span>
            <span className="text-[10px] text-gray-400">Minor</span>
          </div>
        </div>
      </div>

      // Last Health Check & Next Audit
      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-2">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Last Health Check
          </p>
          <p className="text-sm font-semibold text-gray-900">{d.lastHealthCheck.date}</p>
          <p className="text-[10px] text-gray-400">{d.lastHealthCheck.time}</p>
          {d.lastHealthCheck.completed && (
            <span className="text-[10px] text-green-600">✓ Completed</span>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" /> Next Audit Due
          </p>
          <p className="text-sm font-semibold text-gray-900">{d.nextAuditDue.date}</p>
          <p className="text-[10px] text-gray-400">{d.nextAuditDue.label}</p>
          {d.nextAuditDue.daysRemaining > 0 && (
            <span className={`text-[10px] ${d.nextAuditDue.daysRemaining <= 30 ? 'text-red-600' : 'text-gray-500'}`}>
              🔴 {d.nextAuditDue.daysRemaining} days remaining
            </span>
          )}
        </div>
      </div>

      // Compliance Snapshot
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Compliance Snapshot</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Fire NOC</span>
            <span className={d.compliance.fireNOC.daysRemaining <= 90 ? 'text-orange-500 font-medium' : 'text-green-600 font-medium'}>
              Valid till {d.compliance.fireNOC.validTill} ({d.compliance.fireNOC.daysRemaining}d)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Insurance</span>
            <span className={d.compliance.insurance.daysRemaining <= 90 ? 'text-orange-500 font-medium' : 'text-green-600 font-medium'}>
              Valid till {d.compliance.insurance.validTill} ({d.compliance.insurance.daysRemaining}d)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Training</span>
            <StatusBadge
              status={d.compliance.training === 'On Schedule' ? 'READY' : 'CRITICAL'}
              label={d.compliance.training}
              className="text-[10px] px-1.5 py-0"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Audit</span>
            <StatusBadge
              status={d.compliance.audit === 'On Schedule' ? 'READY' : 'CRITICAL'}
              label={d.compliance.audit}
              className="text-[10px] px-1.5 py-0"
            />
          </div>
        </div>
      </div>

      // Bottom KPIs
      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-2 text-center">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Open Issues</p>
          <p className="text-lg font-bold text-orange-500">{d.openIssuesCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Alarms</p>
          <p className="text-lg font-bold text-green-600">{d.alarmsCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Last Service</p>
          <p className="text-xs font-semibold text-gray-900 mt-0.5">{d.lastServiceDate}</p>
        </div>
      </div>
      */}

      {/* ── View More ────────────────────────────────────── */}
      <Link
        to={`${basePath}/plant-command-center/${plantId}`}
        className="text-sm text-orange-600 font-medium flex items-center justify-center gap-1 mt-auto pt-2 border-t border-gray-100 hover:text-orange-700 transition-colors"
      >
        View More <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default PlantCommandCenterCard;
