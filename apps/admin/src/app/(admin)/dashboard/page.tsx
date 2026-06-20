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
import { fetchDashboardOverview, fetchAuditLogs } from '../../../services/api.service';

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: fetchDashboardOverview,
  });

  const { data: auditData } = useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: () => fetchAuditLogs({ page: 1, limit: 5 }),
  });

  const stats = data?.stats;
  const chartData = data?.requestsOverTime ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back — here&apos;s what&apos;s happening on Adolat AI.
        </p>
      </div>

      {isError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle size={16} />
          API bilan bog&apos;lanishda xatolik yuz berdi. Qayta urinib ko&apos;ring.
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={isLoading ? '...' : stats?.totalUsers ?? 0}
          icon={<Users size={20} />}
          color="blue"
          trend={4.2}
        />
        <StatCard
          title="Active Subscriptions"
          value={isLoading ? '...' : stats?.activeSubscriptions ?? 0}
          icon={<CreditCard size={20} />}
          color="green"
          trend={1.8}
        />
        <StatCard
          title="Today AI Requests"
          value={isLoading ? '...' : stats?.todayRequests ?? 0}
          icon={<Zap size={20} />}
          color="purple"
          trend={12.5}
        />
        <StatCard
          title="Total Revenue"
          value={isLoading ? '...' : stats?.totalRevenue ?? 0}
          icon={<DollarSign size={20} />}
          color="yellow"
          prefix="$"
          trend={7.3}
        />
        <StatCard
          title="Recent Errors"
          value={isLoading ? '...' : stats?.recentErrors ?? 0}
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

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          So&apos;nggi faoliyat
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (auditData?.data ?? []).length > 0 ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {auditData!.data.map((log) => (
              <li key={log.id} className="py-2 flex items-center justify-between">
                <span className="text-gray-600">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                    log.action === 'BLOCK' ? 'bg-red-50 text-red-700' :
                    log.action === 'UNBLOCK' ? 'bg-green-50 text-green-700' :
                    log.action === 'LOGIN' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{log.action}</span>
                  {log.entityType} {log.user?.email ? `(${log.user.email})` : ''}
                </span>
                <span className="text-gray-400 text-xs whitespace-nowrap ml-2">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">Faoliyat hali yo&apos;q</p>
        )}
      </div>
    </div>
  );
}
