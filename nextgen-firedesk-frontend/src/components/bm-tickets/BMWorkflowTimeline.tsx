// BM Workflow Timeline Component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface BMWorkflowTimelineProps {
  currentState: string;
  stateTransitions: any[];
}

const BM_STATES = [
  { key: 'CREATED', label: 'Created', icon: Check },
  { key: 'NOTIFIED', label: 'Notified', icon: Check },
  { key: 'ASSIGNED', label: 'Assigned', icon: Check },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged', icon: Clock },
  { key: 'DIAGNOSIS', label: 'Diagnosis', icon: AlertCircle },
  { key: 'ACTION_IN_PROGRESS', label: 'Action In Progress', icon: Clock },
  { key: 'TESTING', label: 'Testing', icon: Check },
  { key: 'CLOSURE_SUBMITTED', label: 'Closure Submitted', icon: Check },
  { key: 'SUPERVISOR_REVIEW', label: 'Supervisor Review', icon: Clock },
  { key: 'CLOSED', label: 'Closed', icon: Check },
  { key: 'REWORK', label: 'Rework Required', icon: XCircle },
];

export function BMWorkflowTimeline({ currentState, stateTransitions }: BMWorkflowTimelineProps) {
  const getCurrentStateIndex = () => {
    return BM_STATES.findIndex(s => s.key === currentState);
  };

  const getStateStatus = (stateKey: string) => {
    const currentIdx = getCurrentStateIndex();
    const stateIdx = BM_STATES.findIndex(s => s.key === stateKey);
    
    // Check if this state was visited
    const transition = stateTransitions.find(t => t.to_state === stateKey);
    
    if (transition) {
      return 'completed';
    }
    if (stateKey === currentState) {
      return 'current';
    }
    if (stateIdx < currentIdx) {
      return 'completed';
    }
    return 'pending';
  };

  const getTransitionTime = (stateKey: string) => {
    const transition = stateTransitions.find(t => t.to_state === stateKey);
    return transition?.transitioned_at;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflow Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {BM_STATES.map((state, index) => {
            const status = getStateStatus(state.key);
            const transitionTime = getTransitionTime(state.key);
            const Icon = state.icon;

            return (
              <div key={state.key} className="flex items-start gap-4">
                {/* Icon */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  ${status === 'completed' ? 'bg-green-100 text-green-600' : ''}
                  ${status === 'current' ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-100' : ''}
                  ${status === 'pending' ? 'bg-gray-100 text-gray-400' : ''}
                  ${state.key === 'REWORK' && status === 'completed' ? 'bg-orange-100 text-orange-600' : ''}
                `}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-6 border-l-2 border-gray-200 pl-4 -ml-5 relative">
                  <div className={`
                    font-semibold
                    ${status === 'completed' ? 'text-green-700' : ''}
                    ${status === 'current' ? 'text-blue-700' : ''}
                    ${status === 'pending' ? 'text-gray-400' : ''}
                  `}>
                    {state.label}
                  </div>
                  
                  {transitionTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(transitionTime), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}

                  {status === 'current' && (
                    <div className="mt-2 text-sm text-blue-600 font-medium">
                      Current Stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
