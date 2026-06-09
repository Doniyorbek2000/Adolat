'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import DataTable, { Column } from '../../../components/data-table';
import { UserRecord } from '../../../types';
import { fetchUsers, blockUser, unblockUser } from '../../../services/api.service';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => fetchUsers({ page, limit: 20, search }),
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  const unblockMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const columns: Column<UserRecord>[] = [
    {
      key: 'email',
      header: 'User',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-800">{row.email}</div>
          {row.phone && <div className="text-xs text-gray-400">{row.phone}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'subscription',
      header: 'Plan',
      render: (row) =>
        row.subscription ? (
          <div>
            <div className="text-sm font-medium">{row.subscription.plan}</div>
            <div className="text-xs text-gray-400">{row.subscription.status}</div>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">No plan</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.status === 'blocked' ? (
            <button
              onClick={() => unblockMutation.mutate(row.id)}
              disabled={unblockMutation.isPending}
              className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition disabled:opacity-50"
            >
              Unblock
            </button>
          ) : (
            <button
              onClick={() => blockMutation.mutate(row.id)}
              disabled={blockMutation.isPending}
              className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition disabled:opacity-50"
            >
              Block
            </button>
          )}
        </div>
      ),
    },
  ];

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} total users registered
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by email or phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C] focus:border-transparent"
        />
      </div>

      <DataTable
        columns={columns as Column<Record<string, unknown>>[]}
        data={users as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage="No users found."
        keyExtractor={(row) => row.id as string}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
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
