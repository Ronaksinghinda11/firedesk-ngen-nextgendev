import React from 'react';
import { TrendingUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface StatCard {
  label: string;
  value: number | string;
  type?: 'neutral' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

interface ReportSummaryCardsProps {
  stats: StatCard[];
}

/**
 * ReportSummaryCards Component
 *
 * Displays summary statistics in a grid of cards
 * Orange/Slate theme styling
 *
 * @example
 * <ReportSummaryCards
 *   stats={[
 *     { label: 'Total', value: 100 },
 *     { label: 'Completed', value: 80, type: 'success' },
 *     { label: 'Pending', value: 20, type: 'warning' }
 *   ]}
 * />
 */
export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({ stats }) => {
  const getColors = (type: string = 'neutral') => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-white border-orange-200 text-slate-700';
    }
  };

  const getIcon = (type: string = 'neutral') => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-orange-500" />;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`
            p-4 rounded-lg border shadow-sm
            flex flex-col items-center justify-center text-center
            transition-all duration-200 hover:shadow-md
            ${getColors(stat.type)}
          `}
        >
          <div className="mb-2 opacity-80">
            {stat.icon || getIcon(stat.type)}
          </div>
          <div className="text-2xl font-bold mb-1">
            {stat.value}
          </div>
          <div className="text-xs font-medium uppercase tracking-wider opacity-70">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportSummaryCards;
