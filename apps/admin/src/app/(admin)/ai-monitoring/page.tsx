'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import DataTable, { Column } from '../../../components/data-table';
import { AiRequest, AiStats } from '../../../types';
import { fetchAiAnalytics } from '../../../services/api.service';

const PIE_COLORS = ['#1A3A6C', '#2563eb', '#60a5fa', '#93c5fd'];

const mockStats: AiStats = {
  requestsByProvider: [
    { provider: 'OpenAI', count: 1842 },
    { provider: 'Anthropic', count: 623 },
    { provider: 'Gemini', count: 215 },
  ],
  avgLatency: 1.23,
  tokenUsage: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      tokens: Math.floor(Math.random() * 80000) + 20000,
    };
  }),
  failureRate: 2.4,
  latencyHistogram: [
    { bucket: '<0.5s', count: 320 },
    { bucket: '0.5-1s', count: 940 },
    { bucket: '1-2s', count: 1100 },
    { bucket: '2-5s', count: 285 },
    { bucket: '>5s', count: 35 },
  ],
  recentRequests: [
    { id: 'r1', provider: 'OpenAI', model: 'gpt-4o', tokens: 1245, latency: 1.1, status: 'success', createdAt: new Date(Date.now() - 60000).toISOString() },
    { id: 'r2', provider: 'Anthropic', model: 'claude-3-haiku', tokens: 980, latency: 0.9, status: 'success', createdAt: new Date(Date.now() - 120000).toISOString() },
    { id: 'r3', provider: 'OpenAI', model: 'gpt-4o', tokens: 2100, latency: 2.3, status: 'success', createdAt: new Date(Date.now() - 180000).toISOString() },
    { id: 'r4', provider: 'Gemini', model: 'gemini-pro', tokens: 450, latency: 0.5, status: 'failed', createdAt: new Date(Date.now() - 240000).toISOString() },
    { id: 'r5', provider: 'OpenAI', model: 'gpt-4o-mini', tokens: 875, latency: 0.8, status: 'success', createdAt: new Date(Date.now() - 300000).toISOString() },
  ],
};

const requestColumns: Column<AiRequest>[] = [
  { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
  {
    key: 'provider',
    header: 'Provider',
    render: (r) => (
      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
        {r.provider}
      </span>
    ),
  },
  { key: 'model', header: 'Model', render: (r) => <span className="text-xs">{r.model}</span> },
  {
    key: 'tokens',
    header: 'Tokens',
    render: (r) => <span>{r.tokens.toLocaleString()}</span>,
  },
  {
    key: 'latency',
    header: 'Latency',
    render: (r) => <span>{r.latency.toFixed(2)}s</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          r.status === 'success'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}
      >
        {r.status}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Time',
    render: (r) => (
      <span className="text-xs text-gray-400">
        {new Date(r.createdAt).toLocaleTimeString()}
      </span>
    ),
  },
];

export default function AiMonitoringPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-analytics'],
    queryFn: fetchAiAnalytics,
  });

  const stats = isError ? mockStats : data ?? mockStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">AI Monitoring</h1>
        <p className="text-gray-500 text-sm mt-1">
          Real-time AI provider usage, latency, and token consumption
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Latency', value: `${stats.avgLatency.toFixed(2)}s` },
          {
            label: 'Total Requests',
            value: stats.requestsByProvider
              .reduce((s, p) => s + p.count, 0)
              .toLocaleString(),
          },
          { label: 'Failure Rate', value: `${stats.failureRate.toFixed(1)}%` },
          {
            label: 'Providers',
            value: stats.requestsByProvider.length,
          },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Provider distribution */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Provider Distribution
          </h2>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.requestsByProvider}
                  dataKey="count"
                  nameKey="provider"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >
                  {stats.requestsByProvider.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Latency histogram */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Latency Distribution
          </h2>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.latencyHistogram ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1A3A6C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Token usage */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Token Usage — Last 7 Days
          </h2>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.tokenUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
                <Tooltip />
                <Line type="monotone" dataKey="tokens" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent requests table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700">Recent AI Requests</h2>
        <DataTable
          columns={requestColumns as Column<Record<string, unknown>>[]}
          data={(stats.recentRequests ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No recent requests."
          keyExtractor={(r) => r.id as string}
        />
      </div>
    </div>
  );
}
