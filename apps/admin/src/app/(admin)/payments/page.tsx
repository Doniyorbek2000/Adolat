'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable, { Column } from '../../../components/data-table';
import { Invoice } from '../../../types';
import { fetchPayments } from '../../../services/api.service';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? 'bg-gray-100 text-gray-500'
      }`}
    >
      {status}
    </span>
  );
};

export default function PaymentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['payments', page],
    queryFn: () => fetchPayments({ page, limit: 20 }),
  });

  const invoices = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const columns: Column<Invoice>[] = [
    {
      key: 'id',
      header: 'Invoice ID',
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">{row.id}</span>
      ),
    },
    {
      key: 'userEmail',
      header: 'User',
      render: (row) => (
        <span className="text-sm text-gray-800">{row.userEmail ?? '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold text-gray-800">
          {row.currency} {row.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
          {row.provider}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  // Compute summary
  const paidTotal = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">
            All payment transactions across users
          </p>
        </div>

        {/* Summary strip skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="h-3 bg-gray-100 rounded animate-pulse mb-2 w-20" />
              <div className="h-6 bg-gray-100 rounded animate-pulse w-16" />
            </div>
          ))}
        </div>

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
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">
            All payment transactions across users
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

  if (invoices.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">
            All payment transactions across users
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500 text-sm">To&apos;lovlar topilmadi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <p className="text-gray-500 text-sm mt-1">
          All payment transactions across users
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Paid', value: `$${paidTotal.toFixed(2)}`, color: 'text-green-600' },
          { label: 'Paid', value: invoices.filter((i) => i.status === 'paid').length, color: 'text-green-600' },
          { label: 'Pending', value: invoices.filter((i) => i.status === 'pending').length, color: 'text-yellow-600' },
          { label: 'Failed', value: invoices.filter((i) => i.status === 'failed').length, color: 'text-red-600' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <p className="text-xs font-medium text-gray-500">{item.label}</p>
            <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns as Column<Record<string, unknown>>[]}
        data={invoices as unknown as Record<string, unknown>[]}
        loading={false}
        emptyMessage="No payments found."
        keyExtractor={(row) => row.id as string}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
