'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '../../../components/stat-card';
import ErrorCard from '../../../components/error-card';
import { Users, DollarSign, Zap, TrendingUp } from 'lucide-react';
import { fetchAnalytics } from '../../../services/api.service';

type Period = '7d' | '30d' | '90d';

function generateMockData(period: Period) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const usersGrowth = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      count: Math.floor(Math.random() * 30) + 5 + i * 2,
    };
  });
  const revenueTrend = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      amount: Math.floor(Math.random() * 500) + 200 + i * 5,
    };
  });
  const aiUsage = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      requests: Math.floor(Math.random() * 1000) + 500 + i * 10,
    };
  });
  return { usersGrowth, revenueTrend, aiUsage, stats: {
    totalUsers: 1240 + days * 2,
    activeSubscriptions: 389,
    todayRequests: 2847,
    totalRevenue: 48320 + days * 120,
    recentErrors: 14,
  }};
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => fetchAnalytics(period),
  });

  const fallbackData = generateMockData(period);
  const analytics = data ?? fallbackData;

  const periodOptions: Period[] = ['7d', '30d', '90d'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Platform growth and usage metrics
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {periodOptions.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                period === p
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <ErrorCard message="Analitika ma'lumotlarini yuklashda xatolik" onRetry={() => refetch()} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={isLoading ? '...' : analytics.stats.totalUsers}
          icon={<Users size={20} />}
          color="blue"
          trend={4.2}
        />
        <StatCard
          title="Revenue"
          value={isLoading ? '...' : analytics.stats.totalRevenue}
          icon={<DollarSign size={20} />}
          color="green"
          prefix="$"
          trend={7.3}
        />
        <StatCard
          title="AI Requests Today"
          value={isLoading ? '...' : analytics.stats.todayRequests}
          icon={<Zap size={20} />}
          color="purple"
          trend={12.5}
        />
        <StatCard
          title="Active Subs"
          value={isLoading ? '...' : analytics.stats.activeSubscriptions}
          icon={<TrendingUp size={20} />}
          color="yellow"
          trend={1.8}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            User Growth
          </h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.usersGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(analytics.usersGrowth.length / 6)}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1A3A6C"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Revenue Trend
          </h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(analytics.revenueTrend.length / 6)}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(val) => [`$${val}`, 'Revenue']} />
                <Bar dataKey="amount" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Usage */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          AI Requests Over Time
        </h2>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.aiUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(analytics.aiUsage.length / 6)}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
