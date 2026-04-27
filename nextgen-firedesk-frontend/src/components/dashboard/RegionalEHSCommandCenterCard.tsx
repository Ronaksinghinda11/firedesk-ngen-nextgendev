import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, ChevronRight, AlertTriangle, Calendar } from 'lucide-react';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useCachedFetch } from '@/hooks/useCachedFetch';

const API_BASE = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:5000/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RegionalEHSCommandCenterCardProps {
  regionId: string;
  basePath?: string;
}

interface FacilityBrief {
  id: string;
  name: string;
  location?: string;
  nocExpiresInDays?: number;
  openIssues: number;
}

interface RegionalSummaryData {
  totalFacilities: number;
  overallScore: number;
  statusCounts: { ready: number; attention: number; critical: number };
  criticalFacilities: Array<FacilityBrief>;
  attentionFacilities: Array<FacilityBrief>;
  totals: { openIssues: number; overdue: number; alarms: number };
  nextAuditDue: { facilityName: string; date: string; daysRemaining: number };
  lastUpdated: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RegionalEHSCommandCenterCard({ regionId, basePath = '/admin' }: RegionalEHSCommandCenterCardProps) {
  const { data, loading } = useCachedFetch<RegionalSummaryData>(
    `${API_BASE}/dashboard/region/${regionId}/facilities/summary`,
    `region_summary_${regionId}`,
    60_000, // 60 s stale
    60_000, // poll every 60 s
  );

  if (loading && !data) return <SkeletonCard />;

  const d: RegionalSummaryData = data ?? {
    totalFacilities: 0,
    overallScore: 0,
    statusCounts: { ready: 0, attention: 0, critical: 0 },
    criticalFacilities: [],
    attentionFacilities: [],
    totals: { openIssues: 0, overdue: 0, alarms: 0 },
    nextAuditDue: { facilityName: '-', date: '-', daysRemaining: 0 },
    lastUpdated: '',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 h-full">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Globe className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">Regional EHS Center</h3>
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {d.totalFacilities} FACILITIES
            </span>
          </div>
        </div>
        <CircularProgressRing value={d.overallScore} />
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 text-xs text-green-500">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Live Data
        <span className="text-gray-400 ml-1">
          {d.lastUpdated ? `Updated ${d.lastUpdated}` : 'Updated 1 min ago'}
        </span>
      </div>

      {/* ── Facility Status Overview ─────────────────────── */}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
          Facility Status Overview
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="font-semibold text-gray-900">{d.statusCounts.ready}</span>
            <span className="text-gray-500">Ready</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="font-semibold text-gray-900">{d.statusCounts.attention}</span>
            <span className="text-gray-500">Attention</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-semibold text-gray-900">{d.statusCounts.critical}</span>
            <span className="text-gray-500">Critical</span>
          </span>
        </div>
      </div>

      {/* ── Critical Facility ────────────────────────────── */}
      {d.criticalFacilities.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Critical Facility
          </p>
          {d.criticalFacilities.slice(0, 1).map((f) => (
            <div key={f.id}>
              <p className="text-sm font-semibold text-gray-900">{f.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                {f.nocExpiresInDays !== undefined && (
                  <span className="text-red-600 font-medium">
                    NOC Expiring in {f.nocExpiresInDays}d
                  </span>
                )}
                <span>|</span>
                <span>{f.openIssues} Open Issues</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Attention Facilities ─────────────────────────── */}
      {d.attentionFacilities.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Attention Facilities
          </p>
          <div className="space-y-0.5">
            {d.attentionFacilities.slice(0, 3).map((f) => (
              <p key={f.id} className="text-xs text-gray-700">
                {f.name} —{' '}
                <span className="text-orange-500 font-medium">{f.openIssues} Issues</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Totals ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-2 text-center">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Issues</p>
          <p className="text-lg font-bold text-red-600">{d.totals.openIssues}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Overdue</p>
          <p className="text-lg font-bold text-orange-500">{d.totals.overdue}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Alarms</p>
          <p className="text-lg font-bold text-red-600">{d.totals.alarms}</p>
        </div>
      </div>

      {/* ── Next Audit Due ───────────────────────────────── */}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Next Audit Due
        </p>
        <p className="text-xs text-gray-700">
          {d.nextAuditDue.facilityName} — {d.nextAuditDue.date}
          {d.nextAuditDue.daysRemaining > 0 && (
            <span className="text-orange-500 ml-1">({d.nextAuditDue.daysRemaining} days)</span>
          )}
        </p>
      </div>

      {/* ── View More ────────────────────────────────────── */}
      <Link
        to={`${basePath}/regional-ehs`}
        className="text-sm text-green-600 font-medium flex items-center justify-center gap-1 mt-auto pt-2 border-t border-gray-100 hover:text-green-700 transition-colors"
      >
        View More <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default RegionalEHSCommandCenterCard;
