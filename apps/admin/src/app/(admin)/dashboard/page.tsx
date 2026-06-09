'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  CreditCard,
  Zap,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import StatCard from '../../../components/stat-card';
import { fetchDashboardOverview } from '../../../services/api.service';

// Fallback mock data when API is unavailable
const mockData = {
  stats: {
    totalUsers: 1240,
    activeSubscriptions: 389,
    todayRequests: 2847,
    totalRevenue: 48320,
    recentErrors: 14,
    failedJobs: 3,
  },
  requestsOverTime: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      requests: Math.floor(Math.random() * 1500) + 800,
    };
  }),
};

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: fetchDashboardOverview,
  });

  const stats = isError ? mockData.stats : data?.stats ?? mockData.stats;
  const chartData = isError
    ? mockData.requestsOverTime
    : data?.requestsOverTime ?? mockData.requestsOverTime;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back — here&apos;s what&apos;s happening on Adolat AI.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={isLoading ? '...' : stats.totalUsers}
          icon={<Users size={20} />}
          color="blue"
          trend={4.2}
        />
        <StatCard
          title="Active Subscriptions"
          value={isLoading ? '...' : stats.activeSubscriptions}
          icon={<CreditCard size={20} />}
          color="green"
          trend={1.8}
        />
        <StatCard
          title="Today AI Requests"
          value={isLoading ? '...' : stats.todayRequests}
          icon={<Zap size={20} />}
          color="purple"
          trend={12.5}
        />
        <StatCard
          title="Total Revenue"
          value={isLoading ? '...' : stats.totalRevenue}
          icon={<DollarSign size={20} />}
          color="yellow"
          prefix="$"
          trend={7.3}
        />
        <StatCard
          title="Recent Errors"
          value={isLoading ? '...' : stats.recentErrors}
          icon={<AlertTriangle size={20} />}
          color="red"
          trend={-2.1}
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          AI Requests — Last 7 Days
        </h2>
        {isLoading ? (
          <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
            Loading chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#1A3A6C"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Activity placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          Recent Activity
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            <li className="py-2 flex items-center justify-between">
              <span className="text-gray-600">New user registered: user123@gmail.com</span>
              <span className="text-gray-400 text-xs">2 min ago</span>
            </li>
            <li className="py-2 flex items-center justify-between">
              <span className="text-gray-600">Subscription upgraded: PRO plan</span>
              <span className="text-gray-400 text-xs">15 min ago</span>
            </li>
            <li className="py-2 flex items-center justify-between">
              <span className="text-gray-600">Legal source synced: lex.uz</span>
              <span className="text-gray-400 text-xs">1 hr ago</span>
            </li>
            <li className="py-2 flex items-center justify-between">
              <span className="text-gray-600">Payment received: $49.00 via Payme</span>
              <span className="text-gray-400 text-xs">2 hr ago</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
