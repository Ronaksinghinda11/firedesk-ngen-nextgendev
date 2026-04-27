import React from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ApprovalKPIs } from '@/services/api/approvalConsoleApi';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Bot,
} from 'lucide-react';

interface ApprovalKPIStripProps {
  kpis: ApprovalKPIs | null;
  loading: boolean;
  onKPIClick: (filterKey: string) => void;
  activeFilter: string | null;
}

interface KPICardConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  getValue: (k: ApprovalKPIs) => number;
  color: string;
  bgColor: string;
  borderColor: string;
  tooltip: string;
}

const kpiCards: KPICardConfig[] = [
  {
    key: 'total',
    label: 'Total Pending',
    icon: FileText,
    getValue: (k) => k.total_pending,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    tooltip: 'All services awaiting your review',
  },
  {
    key: 'high_risk',
    label: 'High Risk',
    icon: AlertTriangle,
    getValue: (k) => k.high_risk_count,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    tooltip: 'Services with priority score ≥ 70',
  },
  {
    key: 'compliance',
    label: 'Compliance Impact',
    icon: ShieldAlert,
    getValue: (k) => k.compliance_impact_count,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    tooltip: 'Services with non-compliant findings',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: Clock,
    getValue: (k) => k.overdue_count,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    tooltip: 'Services past their scheduled date',
  }
  
];

const ApprovalKPIStrip: React.FC<ApprovalKPIStripProps> = ({
  kpis,
  loading,
  onKPIClick,
  activeFilter,
}) => {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const isActive = activeFilter === card.key;
          const Icon = card.icon;
          const value = kpis ? card.getValue(kpis) : 0;

          return (
            <Tooltip key={card.key}>
              <TooltipTrigger asChild>
                <Card
                  className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${
                    isActive
                      ? `${card.borderColor} ${card.bgColor} shadow-md ring-2 ring-offset-1 ring-${card.borderColor.replace('border-', '')}`
                      : 'border-transparent hover:border-muted-foreground/20'
                  }`}
                  onClick={() => onKPIClick(card.key)}
                >
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${card.bgColor}`}
                    >
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {loading ? (
                        <div className="space-y-1.5">
                          <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                          <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
                        </div>
                      ) : (
                        <>
                          <p className="text-2xl font-bold tracking-tight">
                            {value}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium truncate">
                            {card.label}
                          </p>
                        </>
                      )}
                    </div>
                    
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{card.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ApprovalKPIStrip;
