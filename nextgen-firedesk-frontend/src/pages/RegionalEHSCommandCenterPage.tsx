import React, { useState, useMemo, useDeferredValue } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Globe, Filter, ChevronRight, Phone, Mail, Clock,
  AlertTriangle, Calendar, Shield, Activity
} from 'lucide-react';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useCachedFetch } from '@/hooks/useCachedFetch';

const API_BASE = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:5000/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CategoryStatus {
  name: string;
  score?: number;
  status?: 'READY' | 'WARNING' | 'CRITICAL';
  total?: number;
  serviceable?: number;
}

interface ComplianceGov {
  fireNOCStatus: string;
  fireNOCLabel: string;
  auditLast: string;
  auditNext: string;
  trainingLast: string;
  trainingNext: string;
}

interface RiskIssues {
  openIssues: number;
  overdue: number;
  alarms: number;
}

interface EHSManager {
  name: string;
  phone: string;
  email: string;
  lastSeen: string;
}

interface FacilityCard {
  id: string;
  name: string;
  location: string;
  imageUrl?: string;
  status: 'CRITICAL' | 'ATTENTION' | 'READY';
  categories: CategoryStatus[];
  compliance: ComplianceGov;
  risk: RiskIssues;
  manager: EHSManager;
}

interface RegionalEHSData {
  totalFacilities: number;
  statusCounts: { ready: number; attention: number; critical: number };
  facilities: FacilityCard[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_BORDER: Record<string, string> = {
  CRITICAL: 'border-red-500',
  ATTENTION: 'border-orange-400',
  READY: 'border-green-400',
};

const STATUS_BG: Record<string, string> = {
  CRITICAL: 'bg-red-600',
  ATTENTION: 'bg-orange-500',
  READY: 'bg-green-600',
};

const MANAGER_BG: Record<string, string> = {
  CRITICAL: 'bg-red-900',
  ATTENTION: 'bg-emerald-900',
  READY: 'bg-teal-900',
};

type SortKey = 'critical' | 'attention' | 'ready';

function sortFacilities(list: FacilityCard[], key: SortKey): FacilityCard[] {
  const ORDER: Record<string, number> = {
    CRITICAL: key === 'critical' ? 0 : 2,
    ATTENTION: key === 'attention' ? 0 : key === 'critical' ? 1 : 2,
    READY: key === 'ready' ? 0 : 2,
  };
  return [...list].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RegionalEHSCommandCenterPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Derive basePath from current URL, e.g. /admin or /manager or /dashboard
  const basePath = pathname.replace(/\/regional-ehs.*$/, '');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [locationFilter, setLocationFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('critical');

  const { data, loading } = useCachedFetch<RegionalEHSData>(
    `${API_BASE}/dashboard/regional-ehs/facilities`,
    'regional_ehs_full',
    60_000,
    60_000,
  );

  const d: RegionalEHSData = data ?? {
    totalFacilities: 0,
    statusCounts: { ready: 0, attention: 0, critical: 0 },
    facilities: [],
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let list = d.facilities;

    // Search
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q),
      );
    }

    // Location
    if (locationFilter !== 'all') {
      list = list.filter((f) => f.location.toLowerCase().includes(locationFilter.toLowerCase()));
    }

    return sortFacilities(list, sortKey);
  }, [d.facilities, deferredSearch, locationFilter, sortKey]);

  // Unique locations for filter
  const locations = useMemo(
    () => Array.from(new Set(d.facilities.map((f) => f.location))),
    [d.facilities],
  );

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="h-10 w-96 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase">Regional EHS Command Center</h1>
              <p className="text-sm text-blue-600">Real-time Status Across All Facilities</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* ── Filter Bar ─────────────────────────────────── */}
        {/* ── Filter Bar Commented out ─────────────────────────────────── 
        <div className="flex flex-wrap items-center gap-3">
          // Search
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search plant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          // Location
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="all">📍 All Locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          // Country
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="all">🌐 All Countries</option>
          </select>

          // Date
          <div className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 bg-white flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Today
          </div>

          // Spacer
          <div className="flex-1" />

          // Sort
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>Sort By:</span>
            {(['critical', 'attention', 'ready'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${sortKey === k
                    ? k === 'critical'
                      ? 'bg-red-600 text-white'
                      : k === 'attention'
                        ? 'bg-orange-500 text-white'
                        : 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
        */}

        {/* ── Overview counts ────────────────────────────── */}
        {/* ── Overview counts Commented out ────────────────────────────── 
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Plant Overview — {d.totalFacilities} Facilities
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              {d.statusCounts.ready} Ready
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              {d.statusCounts.attention} Attention
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              {d.statusCounts.critical} Critical
            </span>
          </div>
        </div>
        */}

        {/* ── Facility Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`rounded-xl overflow-hidden shadow-sm border-2 ${STATUS_BORDER[f.status]} flex flex-col`}
            >
              {/* Image + Badge */}
              <div className="relative h-44">
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                {/* Status badge */}
                <span className={`absolute top-3 right-3 px-3 py-1 rounded text-xs font-bold text-white ${STATUS_BG[f.status]}`}>
                  {f.status}
                </span>

                {/* Plant name overlay */}
                <div className="absolute bottom-3 left-4">
                  <h3 className="text-lg font-bold text-white">{f.name}</h3>
                  <p className="text-xs text-gray-300 flex items-center gap-1">
                    📍 {f.location}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white p-4 flex-1 flex flex-col gap-4">
                {/* 
                // Commented out Regional EHS Command metrics as per user request
                
                // System Status — dynamic categories
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    System Status
                  </p>
                  <div className="space-y-1">
                    {f.categories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 flex items-center gap-1.5">
                          🔥 {cat.name}
                        </span>
                        <span>
                          {cat.score !== undefined ? (
                            <span className={`font-bold ${cat.score >= 85 ? 'text-green-600' : cat.score >= 70 ? 'text-orange-500' : 'text-red-600'}`}>
                              {cat.score}%{' '}
                              {cat.total !== undefined && (
                                <span className="text-gray-400 text-xs font-normal">
                                  ({cat.serviceable ?? 0}/{cat.total})
                                </span>
                              )}
                            </span>
                          ) : cat.status ? (
                            <StatusBadge status={cat.status} className="text-[10px] px-1.5 py-0" />
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                // Compliance & Governance
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Compliance & Governance
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-700">Fire NOC Status</span>
                      <span className={`text-xs font-semibold ${
                        f.compliance.fireNOCStatus === 'Valid'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {f.compliance.fireNOCLabel}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs text-gray-600">
                      <span>Audit Status</span>
                      <span>Last: {f.compliance.auditLast} → Next: {f.compliance.auditNext}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs text-gray-600">
                      <span>Training Status</span>
                      <span>Last: {f.compliance.trainingLast} → Next: {f.compliance.trainingNext}</span>
                    </div>
                  </div>
                </div>

                // Risk & Issues
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Risk & Issues
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xl font-bold text-red-600">{f.risk.openIssues}</p>
                      <p className="text-[10px] text-gray-400">Open Issues</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-orange-500">{f.risk.overdue}</p>
                      <p className="text-[10px] text-gray-400">Overdue</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-red-600">{f.risk.alarms}</p>
                      <p className="text-[10px] text-gray-400">Alarms</p>
                    </div>
                  </div>
                </div>
                */}

                {/* View Plant Command Center CTA */}
                <button
                  onClick={() => navigate(`${basePath}/plant-command-center/${f.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition shadow-sm active:scale-[0.98]"
                >
                  View Plant Command Center <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* 
              // Dark manager footer commented out
              <div className={`px-4 py-3 ${MANAGER_BG[f.status] || 'bg-gray-900'} text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">EHS Manager</p>
                    <p className="text-sm font-bold">{f.manager.name}</p>
                    <p className="text-xs text-gray-300 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {f.manager.phone}
                    </p>
                    <p className="text-xs text-gray-300 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {f.manager.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" /> {f.manager.lastSeen}
                    </p>
                  </div>
                </div>
              </div>
              */}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No facilities match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
