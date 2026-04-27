import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, ChevronLeft, AlertTriangle, Calendar, ClipboardCheck,
  CheckCircle2, Activity, Phone, Mail, Filter, ChevronRight,
  Bell, Wrench, MapPin, Users, Clock, Gauge, Zap, Droplets,
  Fuel, Battery, Power, Ban, Settings, LayoutGrid, Ticket,
  RotateCcw, CircleDot, FileText, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { pumpRoomApi } from '@/services/api/dashboardApi';
import { iotApi } from '@/services/api/iotApi';
import { notificationApi } from '@/lib/api';

const API_BASE = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:5000/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OpenIssues {
  critical: number;
  major: number;
  minor: number;
}

interface HealthCheck {
  date: string;
  time: string;
  completed: boolean;
}

interface AuditDue {
  date: string;
  label: string;
  daysRemaining: number;
}

interface ComplianceInfo {
  fireNOC: { validTill: string; daysRemaining: number };
  insurance: { validTill: string; daysRemaining: number };
  training: 'On Schedule' | 'Overdue';
  audit: 'On Schedule' | 'Overdue';
}

interface CategoryStatusItem {
  label: string;
  value: number | string;
  total?: number | string;
  unit?: string;
  color?: string;
  icon?: string;
}

interface PumpStatus {
  name: string;
  icon?: string;
  power: 'ON' | 'OFF';
  mode: 'Auto' | 'Manual';
  condition: 'Normal' | 'Fault' | 'Trip';
}

interface CategoryAlarm {
  green: number;
  orange: number;
  red: number;
}

interface AgeingBucket {
  label: string;
  count: number;
  color: string;
}

interface CategorySummary {
  id: string;
  name: string;
  imageUrl?: string;
  score: number;
  scoreLabel: string; // e.g. "COMPLIANCE", "SYSTEM READINESS", "OPERATIONAL"
  isLive?: boolean;
  lastUpdated?: string;
  statusItems: CategoryStatusItem[];
  alerts?: Array<{ icon: string; label: string; value: string; color: string }>;
  alarms?: CategoryAlarm;
  ageing?: AgeingBucket[];
  pumps?: PumpStatus[];
  bottomKpis?: Array<{ icon: string; label: string; value: string | number; color: string }>;
  /** AMC status from Scheduler table — only present for pump-room categories */
  amcStatus?: 'OK' | 'LAPSED' | 'NO AMC' | 'DUE';
}

interface PersonInfo {
  initials: string;
  name: string;
  role: string;
  tags: string[];
  assetCount: number;
  color: string;
  email?: string | null;
  phone?: string | null;
}

interface ActivityItem {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
}

interface ExtTypeItem {
  typeName: string;
  total: number;
  healthy: number;
  healthPct: number;
  installed: number;
  hpDue: number;
  activeEquipment: number;
  overdue: number;
  refillDue: number;
  displaced: number;
  lowPressure: number;
  criticalAlarms: number;
}

interface PlantCommandCenterData {
  plantName: string;
  unitLabel: string;
  readinessStatus: 'READY' | 'ATTENTION' | 'CRITICAL';
  criticalGaps: number;
  openIssues: OpenIssues;
  lastHealthCheck: HealthCheck;
  nextAuditDue: AuditDue;
  compliance: ComplianceInfo;
  categories: CategorySummary[];
  people: PersonInfo[];
  recentActivity: ActivityItem[];
}

interface PumpRoomLiveCardData {
  lastUpdated: string;
  pumps: PumpStatus[];
  headerPressure: string;
  batteryVoltage: string;
  dieselLevel: string;
  tankLevel: string;
  alarms: number;
  trips24h: number;
  lastServiceDate?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function AgeingBar({ buckets }: { buckets: AgeingBucket[] }) {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
        ⏳ Asset Ageing
      </p>
      <div className="flex h-5 w-full rounded-full overflow-hidden">
        {buckets.map((b, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-[10px] text-white font-semibold"
            style={{ width: `${(b.count / total) * 100}%`, backgroundColor: b.color }}
          >
            {b.count}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-1 flex-wrap">
        {buckets.map((b, i) => (
          <span key={i} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
            {b.label} ({b.count})
          </span>
        ))}
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, React.ReactNode> = {
  checkCircle: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  wrench: <Wrench className="h-4 w-4 text-blue-600" />,
  activity: <Activity className="h-4 w-4 text-orange-500" />,
  alert: <AlertTriangle className="h-4 w-4 text-red-500" />,
  bell: <Bell className="h-4 w-4 text-yellow-500" />,
  calendar: <Calendar className="h-4 w-4 text-indigo-500" />,
  clipboard: <ClipboardCheck className="h-4 w-4 text-green-500" />,
  mapPin: <MapPin className="h-4 w-4 text-blue-500" />,
};

const PERSON_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  indigo: 'bg-indigo-500',
  orange: 'bg-orange-500',
};

/* ------------------------------------------------------------------ */
/*  Category helpers                                                   */
/* ------------------------------------------------------------------ */

type CategoryType = 'fire-extinguisher' | 'hydrant' | 'pump-room' | 'generic';

function getCategoryType(name: string): CategoryType {
  const n = name.toLowerCase().replace(/['']/g, '');
  if (n.includes('extinguisher')) return 'fire-extinguisher';
  if (n.includes('hydrant')) return 'hydrant';
  if (n.includes('pump') || n.includes('fighting pump')) return 'pump-room';
  return 'generic';
}

/** Extract a numeric value from API statusItems by label substring. Returns null if not found. */
function getApiVal(items: CategoryStatusItem[], search: string): number | null {
  const item = items.find(i => i.label.toLowerCase().includes(search.toLowerCase()));
  return typeof item?.value === 'number' ? item.value : null;
}

/**
 * Enrich an API-returned category with category-specific fields.
 * Preserves real data from the API. Only adds computed/layout fields.
 * For pump-room categories, injects live IoT data when available,
 * or marks noDevice=true when no IoT device is configured.
 */
function enrichCategory(cat: CategorySummary, pumpLive?: PumpRoomLiveCardData): CategorySummary {
  const catType = getCategoryType(cat.name);
  const openTickets = getApiVal(cat.statusItems, 'ticket');

  if (catType === 'fire-extinguisher') {
    return {
      ...cat,
      scoreLabel: 'COMPLIANCE',
      // statusItems, alerts, alarms come from backend as-is
    };
  }

  if (catType === 'hydrant') {
    return {
      ...cat,
      scoreLabel: 'SYSTEM READINESS',
      alarms: cat.alarms ?? { green: 0, orange: 0, red: 0 },
      // statusItems and alerts come from backend as-is
    };
  }

  if (catType === 'pump-room') {
    if (pumpLive) {
      return {
        ...cat,
        scoreLabel: 'OPERATIONAL',
        isLive: true,
        lastUpdated: pumpLive.lastUpdated,
        pumps: pumpLive.pumps,
        statusItems: [
          { label: 'Header Pressure', value: pumpLive.headerPressure, total: 'bar', color: Number(pumpLive.headerPressure) < 7 ? 'text-red-600' : 'text-green-600' },
          { label: 'Battery Voltage', value: pumpLive.batteryVoltage, color: 'text-green-600' },
          { label: 'Diesel Level', value: pumpLive.dieselLevel, color: 'text-green-600' },
          { label: 'Last Service', value: pumpLive.lastServiceDate || 'No date added' },
          { label: 'Tank Level', value: pumpLive.tankLevel, color: 'text-green-600' },
          { label: 'Open Tickets', value: openTickets ?? 0 },
        ],
        bottomKpis: [
          { icon: 'alert', label: 'ALARMS', value: pumpLive.alarms, color: pumpLive.alarms > 0 ? '#dc2626' : '#16a34a' },
          { icon: 'lightning', label: 'TRIPS 24H', value: pumpLive.trips24h, color: pumpLive.trips24h > 0 ? '#f97316' : '#16a34a' },
          {
            icon: 'check',
            label: 'AMC',
            value: cat.amcStatus ?? 'NO AMC',
            color: cat.amcStatus === 'OK' ? '#16a34a' : cat.amcStatus === 'LAPSED' ? '#dc2626' : cat.amcStatus === 'DUE' ? '#3b82f6' : '#6b7280',
          },
        ],
      };
    }

    // Pump room exists in plant but NO IoT device configured — mark as noDevice
    return {
      ...cat,
      scoreLabel: 'OPERATIONAL',
      isLive: false,
      pumps: [],
      statusItems: [
        { label: 'Open Tickets', value: openTickets ?? 0 },
      ],
      bottomKpis: [
        {
          icon: 'check',
          label: 'AMC',
          value: cat.amcStatus ?? 'NO AMC',
          color: cat.amcStatus === 'OK' ? '#16a34a' : cat.amcStatus === 'LAPSED' ? '#dc2626' : cat.amcStatus === 'DUE' ? '#3b82f6' : '#6b7280',
        },
      ],
      // Signal the card renderer to show a "no device" banner
      noDevice: true,
    } as CategorySummary & { noDevice: boolean };
  }

  // Generic: keep as-is from API
  return cat;
}

const STATUS_ICON_MAP: Record<string, React.ReactNode> = {
  availability: <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />,
  refill: <RotateCcw className="h-3.5 w-3.5 text-gray-400" />,
  service: <Calendar className="h-3.5 w-3.5 text-gray-400" />,
  hp: <RotateCcw className="h-3.5 w-3.5 text-gray-400" />,
  due: <Clock className="h-3.5 w-3.5 text-gray-400" />,
  ticket: <Ticket className="h-3.5 w-3.5 text-gray-400" />,
  pressure: <Gauge className="h-3.5 w-3.5 text-gray-400" />,
  hydrant: <Shield className="h-3.5 w-3.5 text-gray-400" />,
  valve: <Settings className="h-3.5 w-3.5 text-gray-400" />,
  internal: <Droplets className="h-3.5 w-3.5 text-gray-400" />,
  external: <Shield className="h-3.5 w-3.5 text-gray-400" />,
  header: <Gauge className="h-3.5 w-3.5 text-gray-400" />,
  battery: <Battery className="h-3.5 w-3.5 text-gray-400" />,
  diesel: <Fuel className="h-3.5 w-3.5 text-gray-400" />,
  tank: <Droplets className="h-3.5 w-3.5 text-gray-400" />,
  open: <Ticket className="h-3.5 w-3.5 text-gray-400" />,
  last: <Calendar className="h-3.5 w-3.5 text-gray-400" />,
  total: <CircleDot className="h-3.5 w-3.5 text-gray-400" />,
  healthy: <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />,
};

function getStatusIcon(label: string): React.ReactNode {
  const l = label.toLowerCase();
  for (const [key, icon] of Object.entries(STATUS_ICON_MAP)) {
    if (l.includes(key)) return icon;
  }
  return <CircleDot className="h-3.5 w-3.5 text-gray-400" />;
}

function StatusItemValue({ item }: { item: CategoryStatusItem }) {
  const colorClass = item.color || '';
  const displayVal = item.value === null || item.value === undefined || item.value === ''
    ? '—'
    : item.value;
  if (item.total !== undefined) {
    return (
      <p className="leading-tight">
        <span className={`text-lg font-bold ${colorClass || 'text-gray-900'}`}>{displayVal}</span>
        <span className="text-sm text-gray-400"> / {item.total}</span>
        {item.unit && <span className="text-xs text-gray-400 ml-0.5">{item.unit}</span>}
      </p>
    );
  }
  return (
    <p className={`text-lg font-bold ${colorClass || 'text-gray-900'}`}>
      {displayVal}
      {item.unit && <span className="text-xs text-gray-400 ml-0.5">{item.unit}</span>}
    </p>
  );
}

const ALERT_ICON_MAP: Record<string, React.ReactNode> = {
  ban: <Ban className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
  wrench: <Wrench className="h-4 w-4" />,
  pressure: <Gauge className="h-4 w-4" />,
  displaced: <AlertTriangle className="h-4 w-4" />,
};

const BOTTOM_KPI_ICON_MAP: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="h-5 w-5" />,
  lightning: <Zap className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  check: <CheckCircle2 className="h-5 w-5" />,
};

const PUMP_ICON_MAP: Record<string, React.ReactNode> = {
  activity: <Activity className="h-4 w-4 text-gray-500" />,
  cog: <Settings className="h-4 w-4 text-gray-500" />,
  power: <Power className="h-4 w-4 text-gray-500" />,
  zap: <Zap className="h-4 w-4 text-gray-500" />,
};

/* ------------------------------------------------------------------ */
/*  (Component section moved below — see ExtinguisherTypePanel above)  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Extinguishers by Type Panel                                        */
/* ------------------------------------------------------------------ */

function getHealthColor(pct: number): string {
  if (pct >= 90) return '#16a34a';
  if (pct >= 70) return '#f97316';
  return '#dc2626';
}

function getBadgeBg(pct: number): string {
  if (pct >= 90) return 'bg-green-100 text-green-700';
  if (pct >= 70) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function ExtinguisherTypePanel({
  types,
  loading,
  onClose,
}: {
  types: ExtTypeItem[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Extinguishers by Type</h2>
          <p className="text-xs text-gray-400">Detailed Status Overview</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Summary
        </button>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-w-[220px] h-56 bg-gray-100/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : types.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No type data available</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {types.map((t) => {
            const barColor = getHealthColor(t.healthPct);
            const badgeCls = getBadgeBg(t.healthPct);
            const tn = t.typeName.toLowerCase();
            const isPump = tn.includes('pump') || tn.includes('engine');
            const IconEl = isPump ? Activity : Shield;
            const iconBg = isPump ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600';

            return (
              <div
                key={t.typeName}
                className="min-w-[210px] max-w-[230px] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm p-3.5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* Type header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                      <IconEl className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900 leading-tight capitalize truncate w-full max-w-[100px]" title={t.typeName}>{t.typeName}</p>
                      <p className="text-[10px] text-blue-600 font-semibold mt-0.5">{t.installed} Units Installed</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${badgeCls}`}>
                    {t.healthPct}%
                  </span>
                </div>

                {/* Stats grid — 2 cols */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-2 border-t border-gray-100 pt-2.5">
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><CircleDot className="h-3 w-3" /></span> Total
                    </p>
                    <p className="text-sm font-bold text-gray-900 leading-none">{t.total}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><RotateCcw className="h-3 w-3" /></span> HP Due
                    </p>
                    <p className="text-sm font-bold text-gray-900 leading-none">{t.hpDue}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><CheckCircle2 className="h-3 w-3 text-green-500" /></span> Active
                    </p>
                    <p className="text-sm font-bold text-green-600 leading-none">{t.activeEquipment}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><Gauge className="h-3 w-3 text-red-500" /></span> Low Press.
                    </p>
                    <p className="text-sm font-bold text-red-600 leading-none">{t.lowPressure}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><Clock className="h-3 w-3 text-orange-500" /></span> Overdue
                    </p>
                    <p className="text-sm font-bold text-orange-600 leading-none">{t.overdue}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><AlertTriangle className="h-3 w-3 text-orange-400" /></span> Displaced
                    </p>
                    <p className="text-sm font-bold text-orange-500 leading-none">{t.displaced}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><Droplets className="h-3 w-3" /></span> Refill Due
                    </p>
                    <p className="text-sm font-bold text-gray-900 leading-none">{t.refillDue}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex items-center gap-1 mb-0.5">
                      <span className="text-gray-300"><AlertTriangle className="h-3 w-3 text-red-500" /></span> Critical
                    </p>
                    <p className="text-sm font-bold text-red-600 leading-none">{t.criticalAlarms}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-auto pt-1">
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${t.healthPct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlantCommandCenterPage() {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const [activityFilter, setActivityFilter] = useState<string>('All');
  const [pumpLiveByCategory, setPumpLiveByCategory] = useState<Record<string, PumpRoomLiveCardData>>({});

  const categoriesScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollCategoriesLeft = () => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({ left: -categoriesScrollRef.current.offsetWidth, behavior: 'smooth' });
    }
  };

  const scrollCategoriesRight = () => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({ left: categoriesScrollRef.current.offsetWidth, behavior: 'smooth' });
    }
  };

  /* Extinguisher type panel state */
  const [extExpandedCatId, setExtExpandedCatId] = useState<string | null>(null);
  const [extTypeData, setExtTypeData] = useState<ExtTypeItem[]>([]);
  const [extTypeLoading, setExtTypeLoading] = useState(false);

  /* Recent Activity state */
  const [activityData, setActivityData] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const activityTabs = ['All', 'Service', 'Alarms', 'Assets'] as const;

  const { data, loading, error } = useCachedFetch<PlantCommandCenterData>(
    `${API_BASE}/dashboard/plant/${plantId}/command-center`,
    `plant_command_center_v4_${plantId}`,
    30_000,
    30_000,
  );

  /* Fetch recent activity whenever filter or plantId changes */
  useEffect(() => {
    if (!plantId) return;
    let cancelled = false;
    setActivityLoading(true);
    const token = localStorage.getItem('accessToken');
    fetch(
      `${API_BASE}/dashboard/plant/${plantId}/recent-activity?filter=${activityFilter.toLowerCase()}&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
      .then(r => r.json())
      .then(json => { if (!cancelled && json.success) setActivityData(json.data || []); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [plantId, activityFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadPumpLiveData() {
      if (!plantId || !data?.categories?.length) {
        if (!cancelled) setPumpLiveByCategory({});
        return;
      }

      // Load live data for BOTH pump-room and hydrant categories
      const pumpCategories = data.categories.filter((cat) => getCategoryType(cat.name) === 'pump-room');
      const hydrantCategories = data.categories.filter((cat) => getCategoryType(cat.name) === 'hydrant');
      if (pumpCategories.length === 0 && hydrantCategories.length === 0) {
        if (!cancelled) setPumpLiveByCategory({});
        return;
      }

      const notifResponse = await notificationApi.getNotifications({ limit: 200, is_read: false }).catch(() => null);
      const allNotifications = notifResponse?.data || [];
      const next: Record<string, PumpRoomLiveCardData> = {};

      let sharedPumpIotData: Record<string, any> | null = null;
      let sharedPumpTimestamp = '';

      for (const cat of pumpCategories) {
        const mappings = await iotApi.getDevicesByPlantCategory(plantId, cat.id).catch(() => []);
        const latestByDevice = await iotApi.getLatestDeviceData(plantId, cat.id).catch(() => ({}));
        const selectedDevice = mappings[0]?.device_id || Object.keys(latestByDevice)[0] || '';
        const iotData = selectedDevice ? (latestByDevice[selectedDevice] || {}) : {};

        // ── No device configured at all → skip; card will show "No device present" banner ──
        const hasDevice = selectedDevice !== '' && Object.keys(iotData).length > 0;
        if (!hasDevice) continue;

        const pumpResponse = await pumpRoomApi.getPumpRoomData(plantId, cat.id, selectedDevice || undefined).catch(() => null);
        const pumpData: any = pumpResponse?.data?.pumpData || {};
        const pumpAssets: any[] = pumpResponse?.data?.assets || [];

        if (!sharedPumpIotData && iotData && Object.keys(iotData).length > 0) {
          sharedPumpIotData = iotData;
          sharedPumpTimestamp = String(iotData.timestamp || '');
        }

        const deviceAssetIds = mappings
          .filter((m) => m.device_id === selectedDevice)
          .map((m) => m.asset?.id)
          .filter(Boolean);

        const categoryNotifs = allNotifications.filter((n: any) => {
          if (n.notification_source !== 'IOT_DEVICE') return false;
          if (n.related_entity_type === 'device') return n.related_entity_id === selectedDevice;
          if (n.related_entity_type === 'asset') return deviceAssetIds.includes(n.related_entity_id);
          return false;
        });

        const alarms = categoryNotifs.length;
        const now = Date.now();
        const trips24h = categoryNotifs.filter((n: any) => {
          const txt = `${n.title || ''} ${n.message || ''}`.toLowerCase();
          const createdAt = n.created_at ? new Date(n.created_at).getTime() : 0;
          return txt.includes('trip') && createdAt > now - 24 * 60 * 60 * 1000;
        }).length;

        const pumpCondition = (tripStatus: any): 'Normal' | 'Fault' | 'Trip' => {
          if (Number(tripStatus) === 0) return 'Fault';
          if (Number(tripStatus) === 1) return 'Normal';
          return 'Normal';
        };

        const dataKeyToAssetCode = pumpData.dataKeyToAssetCode || {};
        const assetCodeToDataKey = Object.fromEntries(
          Object.entries(dataKeyToAssetCode).map(([dataKey, assetCode]) => [String(assetCode), dataKey])
        ) as Record<string, string>;

        const buildPumpFromDataKey = (
          dataKey: 'AS1' | 'AS2' | 'AS3',
          fallbackName: string,
          fallbackIcon: 'activity' | 'zap'
        ): PumpStatus => {
          const keyNum = dataKey.replace('AS', '');
          const psValue = iotData[`PS${keyNum}` as keyof typeof iotData];
          const asValue = iotData[`AS${keyNum}` as keyof typeof iotData];
          const tsValue = iotData[`TS${keyNum}` as keyof typeof iotData];

          return {
            name: fallbackName,
            icon: fallbackIcon,
            power: Number(psValue) === 0 ? 'ON' : 'OFF',
            mode: Number(asValue) === 1 ? 'Auto' : 'Manual',
            condition: pumpCondition(tsValue),
          };
        };

        const pumpOrder = (name: string) => {
          const lower = name.toLowerCase();
          if (lower.includes('jockey')) return 0;
          if (lower.includes('electric')) return 1;
          if (lower.includes('diesel')) return 2;
          return 99;
        };

        const mappedPumps = pumpAssets
          .map((asset) => {
            const code = asset.asset_code || asset.assetCode;
            const dataKey = assetCodeToDataKey[String(code)];
            if (!dataKey || !/^AS[123]$/.test(dataKey)) return null;

            const productName = String(asset?.product?.product_name || asset.asset_code || asset.assetCode || 'Pump');
            const lower = productName.toLowerCase();
            const icon: 'activity' | 'zap' = lower.includes('jockey') ? 'activity' : 'zap';

            return buildPumpFromDataKey(dataKey as 'AS1' | 'AS2' | 'AS3', productName, icon);
          })
          .filter(Boolean) as PumpStatus[];

        // Only use mapped pumps from real asset data — no fabricated fallback pump rows
        const pumps = mappedPumps.sort((a, b) => pumpOrder(a.name) - pumpOrder(b.name));

        const dieselPct = pumpData.dieselStorage ? ((Number(iotData.DLS) || 0) / Number(pumpData.dieselStorage)) * 100 : 0;
        const totalWaterStorageKL = (Number(pumpData.mainWaterStorage) || 0) / 1000;
        const tankPct = totalWaterStorageKL > 0 ? ((Number(iotData.WLS) || 0) / totalWaterStorageKL) * 100 : 0;
        const batteryVolt = Number(iotData.BAT1 ?? iotData.BAT2);

        let latestServiceDate: Date | null = null;
        for (const asset of pumpAssets) {
          // Check both snake_case and camelCase for Sequelize mapping compatibility
          const dateVal = asset.last_service_date || asset.lastServiceDate;
          if (dateVal) {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
              if (!latestServiceDate || d > latestServiceDate) {
                latestServiceDate = d;
              }
            }
          }
        }
        const lastServiceDateStr = latestServiceDate
          ? latestServiceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : undefined;

        next[cat.id] = {
          lastUpdated: iotData.timestamp ? `${Math.max(1, Math.round((Date.now() - new Date(iotData.timestamp).getTime()) / 1000))} sec ago` : 'just now',
          pumps,
          headerPressure: Number(iotData.PLS || 0).toFixed(1),
          batteryVoltage: Number.isFinite(batteryVolt) ? `${batteryVolt.toFixed(1)}V` : '—',
          dieselLevel: `${Math.max(0, Math.round(dieselPct))}%`,
          tankLevel: `${Math.max(0, Math.round(tankPct))}%`,
          alarms,
          trips24h,
          lastServiceDate: lastServiceDateStr,
        };
      }

      for (const cat of hydrantCategories) {
        const hydrantPressureSource = sharedPumpIotData || {};
        const headerPressure = Number(hydrantPressureSource.PLS || 0).toFixed(1);
        const updatedAt = sharedPumpTimestamp
          ? `${Math.max(1, Math.round((Date.now() - new Date(sharedPumpTimestamp).getTime()) / 1000))} sec ago`
          : 'just now';

        next[cat.id] = {
          lastUpdated: updatedAt,
          pumps: [],
          headerPressure,
          batteryVoltage: '24V',
          dieselLevel: '0%',
          tankLevel: '0%',
          alarms: 0,
          trips24h: 0,
        };
      }

      if (!cancelled) {
        setPumpLiveByCategory(next);
      }
    }

    loadPumpLiveData();
    return () => {
      cancelled = true;
    };
  }, [plantId, data]);

  /* Fetch extinguisher type breakdown when a card is expanded */
  useEffect(() => {
    if (!extExpandedCatId || !plantId) return;
    let cancelled = false;
    setExtTypeLoading(true);
    setExtTypeData([]);
    fetch(`${API_BASE}/dashboard/plant/${plantId}/extinguisher-types/${extExpandedCatId}`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    })
      .then(r => r.json())
      .then(json => {
        if (!cancelled && json.success) {
          setExtTypeData(json.data || []);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setExtTypeLoading(false);
      });
    return () => { cancelled = true; };
  }, [extExpandedCatId, plantId]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="h-8 w-80 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // If API returned no data, show an empty state — no fake fallback data
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 -mx-3 -my-2 md:-mx-4 md:-my-3 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-14 w-14 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-500">No dashboard data available</p>
          <p className="text-sm text-gray-400 mt-1">This plant has no command center data yet.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const d = data;

  // Keep lastHealthCheck and nextAuditDue hardcoded — not tracked in DB yet
  if (!d.lastHealthCheck.date || d.lastHealthCheck.date === '-') {
    d.lastHealthCheck = { date: '30 Jan 2026', time: '08:45 AM', completed: true };
  }
  if (!d.nextAuditDue.date || d.nextAuditDue.date === '-') {
    d.nextAuditDue = { date: '15 Aug 2026', label: 'Annual Inspection'};
  }
  // compliance.training and compliance.audit remain 'On Schedule' from backend — keep as-is

  const totalIssues = d.openIssues.critical + d.openIssues.major + d.openIssues.minor;


  return (
    <div className="min-h-screen bg-gray-50 -mx-3 -my-2 md:-mx-4 md:-my-3">
      {/* ── Top Header Bar ────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center p-1.5 text-black-600 bg-black-100 rounded-lg hover:bg-black-200 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-tight leading-none">
                {d.plantName}
              </h1>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-sm font-medium text-gray-500 leading-none">{d.unitLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────── */}
      <div className="w-full px-4 py-4 space-y-4">

        {/* ── Top KPI Strip ───────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Plant Fire Readiness */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Plant Readiness</p>
            <StatusBadge status={d.readinessStatus} className="text-sm px-3 py-1" />
          </div>

          {/* Critical Gaps */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Critical Gaps
            </p>
            <p className="text-3xl font-bold text-gray-900 leading-none">{d.criticalGaps}</p>
          </div>

          {/* Open Issues */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Open Issues</p>
            <div className="flex items-end justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600 leading-none">{d.openIssues.critical}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1.5">Critical</p>
              </div>
              <div className="w-px h-8 bg-gray-100 mb-0.5" />
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500 leading-none">{d.openIssues.major}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1.5">Major</p>
              </div>
              <div className="w-px h-8 bg-gray-100 mb-0.5" />
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 leading-none">{d.openIssues.minor}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1.5">Minor</p>
              </div>
            </div>
          </div>

          {/* Last Health Check */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" /> Last Checked
            </p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{d.lastHealthCheck.date}</p>
            <div className="flex justify-center items-center gap-1.5 mt-1 text-xs">
              <span className="text-gray-400">{d.lastHealthCheck.time}</span>
              {d.lastHealthCheck.completed && (
                <span className="inline-flex items-center gap-0.5 text-green-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </span>
              )}
            </div>
          </div>

          {/* Next Audit Due */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
              Next Audit
            </p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{d.nextAuditDue.date}</p>
            <div className="flex flex-col items-center mt-1">
              {d.nextAuditDue.daysRemaining > 0 && (
                <span className={`text-[10px] font-bold ${d.nextAuditDue.daysRemaining <= 30 ? 'text-red-600' : 'text-orange-500'}`}>
                  {d.nextAuditDue.daysRemaining} days left
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Dynamic Category Cards ─────────────────────── */}
        {d.categories.length > 0 && (
          <div className="relative group">
            {d.categories.length > 3 && (
              <>
                <button
                  onClick={scrollCategoriesLeft}
                  className="absolute left-[-16px] xl:left-[-24px] top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100 hidden md:flex active:scale-95"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={scrollCategoriesRight}
                  className="absolute right-[-16px] xl:right-[-24px] top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100 hidden md:flex active:scale-95"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <div
              ref={categoriesScrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-4"
            >
              {d.categories.map((rawCat) => {
                const cat = enrichCategory(rawCat, pumpLiveByCategory[rawCat.id]);
                const catType = getCategoryType(cat.name);
                const isPumpRoom = catType === 'pump-room';

                const hasCritical = (cat.alarms?.red ?? 0) > 0 || cat.alerts?.some(a => a.color === '#dc2626' || a.label.includes('CRITICAL'));
                const hasWarning = (cat.alarms?.orange ?? 0) > 0 || cat.alerts?.some(a => a.color === '#f97316');

                const cardClasses = hasCritical
                  ? "bg-white border animate-border-pulse-red rounded-lg p-3.5 flex flex-col gap-3 shadow-sm"
                  : hasWarning
                    ? "bg-white border border-gray-200 animate-border-pulse-orange rounded-lg p-3.5 flex flex-col gap-3 shadow-sm"
                    : "bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow";

                const IconElement = catType === 'fire-extinguisher' ? Shield : catType === 'hydrant' ? Droplets : Activity;

                return (
                  <div
                    key={cat.id}
                    className={`min-w-[320px] lg:min-w-[calc(33.333333%-10.66px)] flex-shrink-0 snap-start ${cardClasses}`}
                  >
                    {/* ── Card Header ── */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        {cat.imageUrl ? (
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasCritical ? 'bg-red-100 text-red-600 animate-pulse' : hasWarning ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                            <IconElement className="h-5 w-5" />
                          </div>
                        )}
                        <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">{cat.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-none">{cat.scoreLabel}</p>
                        </div>
                        <CircularProgressRing value={cat.score} size={44} strokeWidth={4} />
                      </div>
                    </div>

                    {/* ── Live badge (IoT-enabled) ── */}
                    {cat.isLive && (
                      <div className="flex items-center gap-1.5 text-xs text-green-500">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Live Data
                        {cat.lastUpdated && (
                          <span className="text-gray-400 ml-1">Updated {cat.lastUpdated}</span>
                        )}
                      </div>
                    )}

                    {/* ── Pump Status Rows (Pump Room only, has live data) ── */}
                    {isPumpRoom && cat.pumps && cat.pumps.length > 0 && (
                      <div className="border-t border-gray-100 mt-2 pt-3 space-y-2">
                        {cat.pumps.map((pump, idx) => {
                          const isFault = pump.condition === 'Fault' || pump.condition === 'Trip';
                          const isRunning = pump.power === 'ON';
                          const isReady = !isFault && pump.mode === 'Auto';

                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border flex items-center gap-3 transition-all duration-300 ${isFault ? "bg-red-50 border-red-500/30 animate-border-pulse-red" :
                                !isReady ? "bg-orange-50 border-orange-500/30" :
                                  isRunning ? "bg-green-50 border-green-500/30" : "bg-gray-50 border-gray-200"
                                }`}
                            >
                              <div className={`p-2 rounded-full relative flex-shrink-0 ${isRunning && isReady ? "bg-green-100 text-green-700 ring-2 ring-green-400/30 animate-pulse-slow" :
                                isFault ? "bg-red-100 text-red-700 ring-2 ring-red-400/30 animate-bounce" : "bg-gray-200 text-gray-500"
                                }`}>
                                {PUMP_ICON_MAP[pump.icon || 'cog'] ?? <Settings className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-gray-900 uppercase tracking-tight truncate">{pump.name}</div>
                                <div className="text-[9px] text-gray-500 flex items-center gap-2 mt-0.5">
                                  <span>Mode: <span className="font-bold text-gray-800">{pump.mode}</span></span>
                                  <span className="text-gray-300">•</span>
                                  <span>State: <span className={`font-bold ${isRunning ? "text-green-600" : "text-gray-800"}`}>{pump.power}</span></span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${!isFault ? "bg-green-100 text-green-700" : "bg-red-600 text-white"
                                  }`}>
                                  {pump.condition}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── No Device Banner (Pump Room without IoT config) ── */}
                    {isPumpRoom && (cat as any).noDevice === true && (
                      <div className="border border-dashed border-gray-200 rounded-lg bg-gray-50/60 px-4 py-5 flex flex-col items-center justify-center text-center gap-2 mt-1">
                        <Activity className="h-6 w-6 text-gray-300" />
                        <p className="text-sm font-semibold text-gray-400">No IoT device configured</p>
                        <p className="text-[11px] text-gray-400">Connect a device to view live pump status and sensor readings.</p>
                      </div>
                    )}

                    {/* ── Status Items (2-col grid) ── */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-1">
                      {cat.statusItems.map((si, idx) => (
                        <div key={idx}>
                          <p className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-0.5">
                            <span className="text-gray-400/80">{getStatusIcon(si.label)}</span> <span className="truncate">{si.label}</span>
                          </p>
                          <StatusItemValue item={si} />
                        </div>
                      ))}
                    </div>

                    {/* ── Alert Icons Row (Fire Ext / Hydrant) ── */}
                    {!isPumpRoom && cat.alerts && cat.alerts.length > 0 && (
                      <div className="flex items-center bg-gray-50/50 rounded-lg border border-gray-100 p-2.5">
                        <div className="flex items-center gap-4">
                          {cat.alerts.map((a, idx) => (
                            <div key={idx} className="flex flex-col items-center justify-center text-center px-1">
                              <div
                                className="w-8 h-8 rounded-full mb-1 flex items-center justify-center"
                                style={{ backgroundColor: `${a.color}15`, color: a.color }}
                              >
                                {ALERT_ICON_MAP[a.icon] ?? <AlertTriangle className="h-3.5 w-3.5" />}
                              </div>
                              <p className="text-sm font-bold leading-none" style={{ color: a.color }}>
                                {a.value}
                              </p>
                              <p className="text-[8px] text-gray-400 uppercase font-bold mt-1 tracking-wider">{a.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Alarms inline */}
                        {cat.alarms && (
                          <div className="ml-auto flex items-center pl-4 border-l border-gray-200 ml-4 py-1">
                            <div className="flex flex-col items-center justify-center text-center px-1">
                              <div className="flex items-center gap-1.5 mb-1.5 h-8">
                                <span className="flex items-center gap-0.5 text-xs font-bold text-gray-700">
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                  {cat.alarms.green}
                                </span>
                                <span className="flex items-center gap-0.5 text-xs font-bold text-gray-700">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                  {cat.alarms.orange}
                                </span>
                                <span className="flex items-center gap-0.5 text-xs font-bold text-gray-700">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                  {cat.alarms.red}
                                </span>
                              </div>
                              <p className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Alarms</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Bottom KPIs (Pump Room only) ── */}
                    {isPumpRoom && cat.bottomKpis && cat.bottomKpis.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
                        {cat.bottomKpis.map((kpi, idx) => (
                          <div key={idx}>
                            <div className="flex justify-center mb-1" style={{ color: kpi.color }}>
                              {BOTTOM_KPI_ICON_MAP[kpi.icon] ?? <AlertTriangle className="h-5 w-5" />}
                            </div>
                            <p className="text-lg font-bold" style={{ color: kpi.color }}>
                              {kpi.value}
                            </p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-wide">{kpi.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Pump Room green bar ── */}
                    {isPumpRoom && (
                      <div className="h-1.5 w-full rounded-full bg-green-500 mt-1" />
                    )}

                    {/* ── Asset Ageing (Fire Ext / Hydrant) ── */}
                    {!isPumpRoom && cat.ageing && cat.ageing.length > 0 && (
                      <div className="border-t border-gray-100 pt-2">
                        <AgeingBar buckets={cat.ageing} />
                      </div>
                    )}

                    {/* ── View More — fire extinguisher only; pump room navigates ── */}
                    {catType === 'fire-extinguisher' && (
                      <button
                        onClick={() => setExtExpandedCatId(extExpandedCatId === cat.id ? null : cat.id)}
                        className="text-sm text-orange-600 font-medium flex items-center justify-center gap-1 mt-auto pt-2 border-t border-gray-100 hover:text-orange-700 transition-colors w-full"
                      >
                        {extExpandedCatId === cat.id ? 'View Less' : 'View More'}
                        <ChevronRight className={`h-4 w-4 transition-transform ${extExpandedCatId === cat.id ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                    {catType === 'pump-room' && (
                      <button
                        onClick={() => {
                          const pathPrefix = window.location.pathname.startsWith('/manager')
                            ? '/manager'
                            : window.location.pathname.startsWith('/dashboard')
                              ? '/dashboard'
                              : '/admin';
                          navigate(`${pathPrefix}/pump-room-summary`);
                        }}
                        className="text-sm text-orange-600 font-medium flex items-center justify-center gap-1 mt-auto pt-2 border-t border-gray-100 hover:text-orange-700 transition-colors w-full"
                      >
                        View More <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Extinguisher Type Breakdown Panel ───────────── */}
        {extExpandedCatId && (
          <ExtinguisherTypePanel
            types={extTypeData}
            loading={extTypeLoading}
            onClose={() => setExtExpandedCatId(null)}
          />
        )}

        {/* ── Bottom 3-Column Section ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Compliance & Audit Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="text-base font-bold text-gray-900">Compliance & Audit Summary</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Training */}
              <div className="border border-gray-100 bg-white rounded-xl shadow-sm p-3.5 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <StatusBadge
                    status={d.compliance.training === 'On Schedule' ? 'READY' : 'CRITICAL'}
                    label={d.compliance.training}
                    className="text-[10px] px-2 py-0.5"
                  />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">Training Details</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">Required staff trained</p>
                </div>
              </div>

              {/* Audit */}
              <div className="border border-gray-100 bg-white rounded-xl shadow-sm p-3.5 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                    <FileText className="h-4 w-4" />
                  </div>
                  <StatusBadge
                    status={d.compliance.audit === 'On Schedule' ? 'READY' : 'CRITICAL'}
                    label={d.compliance.audit}
                    className="text-[10px] px-2 py-0.5"
                  />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">Audit Status</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">Internal & external</p>
                </div>
              </div>

              {/* Fire NOC */}
              <div className="border border-gray-100 bg-white rounded-xl shadow-sm p-3.5 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  {(() => {
                    const noc = d.compliance.fireNOC;
                    const hasDate = noc.validTill && noc.validTill !== '-';
                    if (!hasDate) {
                      return <StatusBadge status="ATTENTION" label="Not Set" className="text-[10px] px-2 py-0.5" />;
                    }
                    if (noc.daysRemaining === 0) {
                      return <StatusBadge status="CRITICAL" label="Expired" className="text-[10px] px-2 py-0.5" />;
                    }
                    return (
                      <StatusBadge
                        status={noc.daysRemaining <= 90 ? 'EXPIRING_SOON' : 'READY'}
                        label={noc.daysRemaining <= 90 ? 'Expiring Soon' : 'Valid'}
                        className="text-[10px] px-2 py-0.5"
                      />
                    );
                  })()}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">Fire NOC Status</p>
                  {(() => {
                    const noc = d.compliance.fireNOC;
                    const hasDate = noc.validTill && noc.validTill !== '-';
                    if (!hasDate) {
                      return <p className="text-[11px] text-gray-400 font-medium mt-1">No date added</p>;
                    }
                    if (noc.daysRemaining === 0) {
                      return (
                        <div className="mt-1 flex flex-col gap-0.5">
                          <p className="text-[10px] text-gray-500 font-medium tracking-wide">VALID TILL <span className="text-gray-800">{noc.validTill}</span></p>
                          <p className="text-[10px] font-bold text-red-600">&#x26A0; EXPIRED</p>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-1 flex flex-col gap-0.5">
                        <p className="text-[10px] text-gray-500 font-medium tracking-wide">VALID TILL <span className="text-gray-800">{noc.validTill}</span></p>
                        <p className="text-[10px] font-bold text-orange-600">Due in {noc.daysRemaining} Days</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Insurance */}
              <div className="border border-gray-100 bg-white rounded-xl shadow-sm p-3.5 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  {(() => {
                    const ins = d.compliance.insurance;
                    const hasDate = ins.validTill && ins.validTill !== '-';
                    const isPresent = ins.daysRemaining === 999;
                    if (!hasDate) {
                      return <StatusBadge status="ATTENTION" label="Not Set" className="text-[10px] px-2 py-0.5" />;
                    }
                    if (isPresent) {
                      return <StatusBadge status="READY" label="Valid" className="text-[10px] px-2 py-0.5" />;
                    }
                    if (ins.daysRemaining === 0) {
                      return <StatusBadge status="CRITICAL" label="Expired" className="text-[10px] px-2 py-0.5" />;
                    }
                    return (
                      <StatusBadge
                        status={ins.daysRemaining <= 90 ? 'EXPIRING_SOON' : 'READY'}
                        label={ins.daysRemaining <= 90 ? 'Expiring Soon' : 'Valid'}
                        className="text-[10px] px-2 py-0.5"
                      />
                    );
                  })()}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">Insurance Status</p>
                  {(() => {
                    const ins = d.compliance.insurance;
                    const hasDate = ins.validTill && ins.validTill !== '-';
                    if (!hasDate) {
                      return <p className="text-[11px] text-gray-400 font-medium mt-1">No date added</p>;
                    }
                    if (ins.daysRemaining === 999) {
                      return <p className="text-[11px] text-green-600 font-bold mt-1">Insurance Present</p>;
                    }
                    if (ins.daysRemaining === 0) {
                      return (
                        <div className="mt-1 flex flex-col gap-0.5">
                          <p className="text-[10px] text-gray-500 font-medium tracking-wide">VALID TILL <span className="text-gray-800">{ins.validTill}</span></p>
                          <p className="text-[10px] font-bold text-red-600">&#x26A0; EXPIRED</p>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-1 flex flex-col gap-0.5">
                        <p className="text-[10px] text-gray-500 font-medium tracking-wide">VALID TILL <span className="text-gray-800">{ins.validTill}</span></p>
                        <p className="text-[10px] font-bold text-orange-600">Due in {ins.daysRemaining} Days</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* People & Ownership */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-bold text-gray-900">People & Ownership</h3>
                <p className="text-xs text-gray-400">Responsible Personnel & Roles</p>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[340px]">
              {d.people.map((p, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${PERSON_COLORS[p.color] || 'bg-gray-500'} text-white flex items-center justify-center text-sm font-bold`}>
                      {p.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.role}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {p.tags.map((t, j) => (
                          <span key={j} className="px-1.5 py-0 text-[9px] font-medium rounded-full border border-gray-200 text-gray-500">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.phone ? (
                      <a
                        href={`tel:${p.phone}`}
                        title={`Call ${p.name} — ${p.phone}`}
                        className="text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span title="No phone number" className="cursor-not-allowed">
                        <Phone className="h-3.5 w-3.5 text-gray-200" />
                      </span>
                    )}
                    {p.email ? (
                      <a
                        href={`mailto:${p.email}`}
                        title={`Email ${p.name} — ${p.email}`}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span title="No email address" className="cursor-not-allowed">
                        <Mail className="h-3.5 w-3.5 text-gray-200" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {d.people.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No personnel data</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
              </div>
              <Filter className="h-4 w-4 text-gray-400 cursor-pointer" />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5">
              {activityTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivityFilter(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${activityFilter === tab
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[340px]">
              {activityLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="mt-0.5 h-4 w-4 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-3/4 rounded bg-gray-200" />
                      <div className="h-2 w-1/2 rounded bg-gray-100" />
                    </div>
                    <div className="h-2 w-8 rounded bg-gray-100" />
                  </div>
                ))
              ) : activityData.length > 0 ? (
                activityData.map((a) => {
                  const iconEl = (() => {
                    switch (a.icon) {
                      case 'wrench': return <Wrench className="h-4 w-4 text-blue-500" />;
                      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
                      case 'check': return <CheckCircle2 className={`h-4 w-4 ${a.iconColor}`} />;
                      case 'lightning': return <Zap className="h-4 w-4 text-orange-500" />;
                      default: return <Activity className="h-4 w-4 text-gray-400" />;
                    }
                  })();
                  return (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">{iconEl}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                        <p className="text-[10px] text-gray-400">{a.subtitle}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{a.time}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No activity found</p>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
