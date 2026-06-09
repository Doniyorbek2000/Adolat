import { TrendingUp, TrendingDown } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number; // percentage, positive = up, negative = down
  prefix?: string;
  suffix?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

const iconBgMap = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  prefix,
  suffix,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">
            {prefix}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix}
          </p>
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                trend >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>
                {trend >= 0 ? '+' : ''}
                {trend}% vs last period
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg ${iconBgMap[color]}`}>{icon}</div>
        )}
      </div>
    </div>
  );
}
