// SLA Timer Widget Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SLATimerProps {
  slaStatus: {
    status: 'NOT_STARTED' | 'ON_TRACK' | 'WARNING' | 'CRITICAL' | 'BREACHED';
    remaining?: number;
    remainingHours?: number;
    overdueHours?: number;
  };
  acknowledgedAt?: string;
  slaDeadline?: string;
  priority: string;
}

export function SLATimer({ slaStatus, acknowledgedAt, slaDeadline, priority }: SLATimerProps) {
  const [, setTick] = useState(0);

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch (slaStatus.status) {
      case 'NOT_STARTED':
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300',
          label: 'SLA Not Started',
          message: 'Waiting for technician acknowledgment',
        };
      case 'ON_TRACK':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
          label: 'On Track',
          message: `${Math.floor(slaStatus.remainingHours || 0)}h ${Math.floor(((slaStatus.remainingHours || 0) % 1) * 60)}m remaining`,
        };
      case 'WARNING':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
          label: 'Warning',
          message: `${Math.floor(slaStatus.remainingHours || 0)}h ${Math.floor(((slaStatus.remainingHours || 0) % 1) * 60)}m remaining`,
        };
      case 'CRITICAL':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300',
          label: 'Critical',
          message: `Only ${Math.floor(slaStatus.remainingHours || 0)}h ${Math.floor(((slaStatus.remainingHours || 0) % 1) * 60)}m left!`,
        };
      case 'BREACHED':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          label: 'SLA Breached',
          message: `Overdue by ${Math.floor(slaStatus.overdueHours || 0)}h ${Math.floor(((slaStatus.overdueHours || 0) % 1) * 60)}m`,
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300',
          label: 'Unknown',
          message: 'Status unknown',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getPriorityLabel = () => {
    const priorityMap: Record<string, { label: string; sla: string }> = {
      CRITICAL: { label: 'Critical', sla: '4 hours' },
      HIGH: { label: 'High', sla: '24 hours' },
      MEDIUM: { label: 'Medium', sla: '48 hours' },
      LOW: { label: 'Low', sla: '72 hours' },
    };
    return priorityMap[priority] || { label: priority, sla: 'N/A' };
  };

  const priorityInfo = getPriorityLabel();

  return (
    <Card className={`border-2 ${config.borderColor} ${config.bgColor}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <span className={`font-semibold ${config.color}`}>
                {config.label}
              </span>
            </div>
            <div className="text-sm px-2 py-1 rounded bg-white border border-gray-200">
              {priorityInfo.label} Priority
            </div>
          </div>

          {/* Message */}
          <div className={`text-sm font-medium ${config.color}`}>
            {config.message}
          </div>

          {/* Details */}
          <div className="space-y-1 text-xs text-gray-600 pt-2 border-t border-gray-200">
            {acknowledgedAt && (
              <div className="flex justify-between">
                <span>Acknowledged:</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(acknowledgedAt), { addSuffix: true })}
                </span>
              </div>
            )}
            {slaDeadline && (
              <div className="flex justify-between">
                <span>Deadline:</span>
                <span className="font-medium">
                  {new Date(slaDeadline).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Target SLA:</span>
              <span className="font-medium">{priorityInfo.sla}</span>
            </div>
          </div>

          {/* Progress Bar (if not breached) */}
          {slaStatus.status !== 'NOT_STARTED' && slaStatus.status !== 'BREACHED' && slaStatus.remaining !== undefined && (
            <div className="pt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    slaStatus.status === 'ON_TRACK' ? 'bg-green-500' :
                    slaStatus.status === 'WARNING' ? 'bg-yellow-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(slaStatus.remaining * 100, 0), 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
