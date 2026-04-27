import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { approvalConsoleApi } from '@/services/api/approvalConsoleApi';
import type { AlertsData } from '@/services/api/approvalConsoleApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Power,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Bell,
  Loader2,
  MapPin,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface AlertPanelProps {
  onScrollToSubmission?: (submissionId: string) => void;
}

/* ──────────────────────── helper ──────────────────────── */
const fmtDate = (iso: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

/* ──────────────── collapsible section shell ──────────────── */
interface SectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon: Icon,
  iconColor,
  count,
  defaultExpanded = true,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (count === 0) return null;

  return (
    <div className="space-y-1">
      <button
        className="flex items-center gap-2 w-full text-left py-1.5 hover:bg-muted/50 rounded px-1 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-xs font-semibold flex-1">{title}</span>
        <Badge variant="secondary" className="text-[10px] h-5">
          {count}
        </Badge>
      </button>

      {expanded && (
        <div className="space-y-1.5 pl-4 animate-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
};

/* ───────────────────── tiny detail row ────────────────── */
const Detail: React.FC<{ icon: React.ElementType; text: string | null | undefined }> = ({
  icon: Ic,
  text,
}) =>
  text ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <Ic className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  ) : null;

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
const AlertPanel: React.FC<AlertPanelProps> = ({ onScrollToSubmission }) => {
  const [collapsed, setCollapsed] = useState(false);

  const { data: alerts, isLoading } = useQuery<AlertsData>({
    queryKey: ['approval-alerts'],
    queryFn: () => approvalConsoleApi.getAlerts(),
    staleTime: 120_000,
    refetchInterval: 300_000,
  });

  const totalAlerts =
    (alerts?.not_working?.length || 0) +
    (alerts?.repeated_failures?.length || 0) +
    (alerts?.critical_compliance?.length || 0);

  /* ── collapsed state ── */
  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 relative"
          onClick={() => setCollapsed(false)}
        >
          <Bell className="h-4 w-4" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {totalAlerts}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-[300px] flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Alerts</h3>
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {totalAlerts}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setCollapsed(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-300px)]">
        <div className="p-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">Loading alerts...</span>
            </div>
          ) : totalAlerts === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No alerts at this time</p>
            </div>
          ) : (
            <>
              {/* ── 1  Assets "Not Working" ── */}
              <Section
                title='Assets "Not Working"'
                icon={Power}
                iconColor="text-red-500"
                count={alerts?.not_working?.length || 0}
              >
                {alerts?.not_working?.map((item) => (
                  <button
                    key={item.submission_id}
                    className="w-full text-left py-2 px-2 hover:bg-muted/50 rounded transition-colors group border border-transparent hover:border-red-200"
                    onClick={() => onScrollToSubmission?.(item.submission_id)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold truncate group-hover:text-primary">
                        {item.asset_code}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[9px] flex-shrink-0 bg-red-50 text-red-700 border-red-200"
                      >
                        Not Working
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <Detail icon={MapPin} text={[item.building_name, item.location].filter(Boolean).join(' · ') || null} />
                      <Detail icon={FileText} text={item.form_name} />
                      <Detail icon={User} text={item.technician_name} />
                    </div>
                    {(item.category_name || item.product_name) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {[item.category_name, item.product_name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {item.submission_number}
                      </span>
                      {item.submitted_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {fmtDate(item.submitted_at)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </Section>

              {/* ── 2  Repeated Failures ── */}
              <Section
                title="Repeated Failures"
                icon={RotateCcw}
                iconColor="text-orange-500"
                count={alerts?.repeated_failures?.length || 0}
              >
                {alerts?.repeated_failures?.map((item) => (
                  <button
                    key={item.asset_id}
                    className="w-full text-left py-2 px-2 hover:bg-muted/50 rounded transition-colors group border border-transparent hover:border-orange-200"
                    onClick={() => onScrollToSubmission?.(item.asset_id)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold truncate group-hover:text-primary">
                        {item.asset_code}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[9px] flex-shrink-0 bg-orange-50 text-orange-700 border-orange-200"
                      >
                        {item.nc_count} non-compliant
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <Detail icon={MapPin} text={[item.building_name, item.location].filter(Boolean).join(' · ') || null} />
                    </div>
                    {(item.category_name || item.product_name) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {[item.category_name, item.product_name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Across {item.service_count} service{Number(item.service_count) !== 1 ? 's' : ''}
                      {item.form_names?.length ? ` · ${item.form_names.join(', ')}` : ''}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        Current status:
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          item.current_health === 'NOT_WORKING'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : item.current_health === 'NEEDS_ATTENTION'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}
                      >
                        {item.current_health?.replace(/_/g, ' ') || 'Healthy'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </Section>

              {/* ── 3  Critical Compliance ── */}
              <Section
                title="Critical Compliance"
                icon={ShieldAlert}
                iconColor="text-amber-500"
                count={alerts?.critical_compliance?.length || 0}
              >
                {alerts?.critical_compliance?.map((item, idx) => (
                  <button
                    key={`${item.answer_id}-${idx}`}
                    className="w-full text-left py-2 px-2 hover:bg-muted/50 rounded transition-colors group border border-transparent hover:border-amber-200"
                    onClick={() => onScrollToSubmission?.(item.submission_id)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold truncate group-hover:text-primary flex-1 mr-2">
                        {item.asset_code}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] flex-shrink-0 ${
                          item.severity_level === 'CRITICAL'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                      >
                        {item.severity_level}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-foreground/80 line-clamp-2 leading-relaxed">
                      <AlertTriangle className="h-3 w-3 inline mr-0.5 text-amber-500" />
                      {item.question_text}
                    </p>
                    {item.condition_name && (
                      <p className="text-[10px] text-red-600 mt-0.5 truncate">
                        Condition: {item.condition_name}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <Detail icon={MapPin} text={[item.building_name, item.location].filter(Boolean).join(' · ') || null} />
                      <Detail icon={FileText} text={item.form_name} />
                      <Detail icon={User} text={item.technician_name} />
                    </div>
                    {(item.category_name || item.product_name) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {[item.category_name, item.product_name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {item.submission_number}
                      </span>
                      {item.submitted_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {fmtDate(item.submitted_at)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </Section>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default AlertPanel;
