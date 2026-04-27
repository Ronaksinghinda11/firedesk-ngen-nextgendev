import React from 'react';

interface PriorityScoreSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 76) return 'bg-red-500';
  if (score >= 51) return 'bg-orange-500';
  if (score >= 26) return 'bg-amber-500';
  return 'bg-slate-500';
};

const getScoreLabel = (score: number) => {
  if (score >= 76) return 'Critical (76-100)';
  if (score >= 51) return 'High (51-75)';
  if (score >= 26) return 'Medium (26-50)';
  return 'Low (0-25)';
};

const PriorityScoreSlider: React.FC<PriorityScoreSliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Priority Score *
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            value={normalizedValue}
            onChange={(e) => onChange(Math.min(Math.max(parseInt(e.target.value) || 0, 0), 100))}
            disabled={disabled}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-center font-semibold"
          />
          <span className="text-sm text-gray-500">/100</span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={normalizedValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed slider-thumb"
          style={{
            background: `linear-gradient(to right, ${getScoreColor(normalizedValue)} 0%, ${getScoreColor(normalizedValue)} ${normalizedValue}%, #e5e7eb ${normalizedValue}%, #e5e7eb 100%)`
          }}
        />
      </div>

      {/* Range indicators */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      {/* Current range label */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
        normalizedValue >= 76 ? 'bg-red-100 text-red-700' :
        normalizedValue >= 51 ? 'bg-orange-100 text-orange-700' :
        normalizedValue >= 26 ? 'bg-amber-100 text-amber-700' :
        'bg-slate-100 text-slate-700'
      }`}>
        {getScoreLabel(normalizedValue)}
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid ${getScoreColor(normalizedValue)};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.15s ease;
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        }

        .slider-thumb::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid ${getScoreColor(normalizedValue)};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.15s ease;
        }

        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default PriorityScoreSlider;
