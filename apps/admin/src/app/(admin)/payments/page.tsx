'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable, { Column } from '../../../components/data-table';
import { Invoice } from '../../../types';
import { fetchPayments } from '../../../services/api.service';

const mockInvoices: Invoice[] = [
  {
    id: 'inv_001', userId: 'u1', userEmail: 'alice@example.com',
    amount: 29.99, currency: 'USD', status: 'paid', provider: 'Payme',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'inv_002', userId: 'u2', userEmail: 'bob@example.com',
    amount: 9.99, currency: 'USD', status: 'paid', provider: 'Click',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'inv_003', userId: 'u3', userEmail: 'carol@example.com',
    amount: 99.99, currency: 'USD', status: 'pending', provider: 'Stripe',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'inv_004', userId: 'u4', userEmail: 'dave@example.com',
    amount: 29.99, currency: 'USD', status: 'failed', provider: 'Payme',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'inv_005', userId: 'u5', userEmail: 'eve@example.com',
    amount: 9.99, currency: 'USD', status: 'refunded', provider: 'Click',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
];

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payments', page],
    queryFn: () => fetchPayments({ page, limit: 20 }),
  });

  const invoices = isError ? mockInvoices : data?.data ?? mockInvoices;
  const totalPages = isError ? 1 : data?.totalPages ?? 1;

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
        loading={isLoading}
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
