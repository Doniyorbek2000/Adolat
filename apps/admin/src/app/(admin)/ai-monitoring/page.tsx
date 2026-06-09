'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import DataTable, { Column } from '../../../components/data-table';
import { AiRequest } from '../../../types';
import { fetchAiAnalytics } from '../../../services/api.service';

const PIE_COLORS = ['#1A3A6C', '#2563eb', '#60a5fa', '#93c5fd'];

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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-analytics'],
    queryFn: fetchAiAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time AI provider usage, latency, and token consumption
          </p>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="h-3 bg-gray-100 rounded animate-pulse mb-2 w-20" />
              <div className="h-6 bg-gray-100 rounded animate-pulse w-16" />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="h-4 bg-gray-100 rounded animate-pulse mb-4 w-32" />
              <div className="h-40 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time AI provider usage, latency, and token consumption
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Ma&apos;lumot yuklanmadi</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time AI provider usage, latency, and token consumption
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500 text-sm">Ma&apos;lumotlar topilmadi</p>
        </div>
      </div>
    );
  }

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
          { label: 'Avg Latency', value: `${data.avgLatency.toFixed(2)}s` },
          {
            label: 'Total Requests',
            value: data.requestsByProvider
              .reduce((s, p) => s + p.count, 0)
              .toLocaleString(),
          },
          { label: 'Failure Rate', value: `${data.failureRate.toFixed(1)}%` },
          {
            label: 'Providers',
            value: data.requestsByProvider.length,
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
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.requestsByProvider}
                dataKey="count"
                nameKey="provider"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {data.requestsByProvider.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Latency histogram */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Latency Distribution
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.latencyHistogram ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1A3A6C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Token usage */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Token Usage — Last 7 Days
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.tokenUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
              <Tooltip />
              <Line type="monotone" dataKey="tokens" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent requests table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700">Recent AI Requests</h2>
        <DataTable
          columns={requestColumns as Column<Record<string, unknown>>[]}
          data={(data.recentRequests ?? []) as unknown as Record<string, unknown>[]}
          loading={false}
          emptyMessage="No recent requests."
          keyExtractor={(r) => r.id as string}
        />
      </div>
    </div>
  );
}
