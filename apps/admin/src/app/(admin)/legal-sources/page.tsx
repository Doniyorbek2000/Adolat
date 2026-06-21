'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, X, Trash2 } from 'lucide-react';
import DataTable, { Column } from '../../../components/data-table';
import { LegalSource } from '../../../types';
import {
  fetchLegalSources,
  syncLegalSource,
  toggleLegalSource,
  createLegalSource,
  deleteLegalSource,
} from '../../../services/api.service';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    syncing: 'bg-blue-100 text-blue-700',
    error: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
};

function AddSourceModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: Omit<LegalSource, 'id' | 'lastSyncedAt' | 'chunkCount'>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: '', type: 'web', baseUrl: '', status: 'active' as 'active' | 'inactive',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Add Legal Source</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. lex.uz"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="web">Web Scraper</option>
                <option value="pdf">PDF</option>
                <option value="api">API</option>
                <option value="manual">Manual Upload</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
              value={form.baseUrl}
              onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.name || !form.baseUrl}
            className="flex-1 py-2 bg-[#1A3A6C] text-white rounded-lg text-sm font-medium hover:bg-[#15305a] disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Source'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LegalSourcesPage() {
  const [showModal, setShowModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['legal-sources'],
    queryFn: fetchLegalSources,
  });

  const sources = data ?? [];

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      setSyncingId(id);
      await syncLegalSource(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-sources'] });
      setSyncingId(null);
    },
    onError: () => setSyncingId(null),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      toggleLegalSource(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-sources'] }),
  });

  const createMutation = useMutation({
    mutationFn: createLegalSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-sources'] });
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLegalSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-sources'] });
      setDeleteTargetId(null);
    },
  });

  const columns: Column<LegalSource>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-gray-800">{row.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs uppercase font-medium">
          {row.type}
        </span>
      ),
    },
    {
      key: 'baseUrl',
      header: 'URL',
      render: (row) => (
        <a
          href={row.baseUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:underline truncate max-w-[180px] block"
        >
          {row.baseUrl}
        </a>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'chunkCount',
      header: 'Chunks',
      render: (row) => (
        <span className="text-sm">{(row.chunkCount ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'lastSyncedAt',
      header: 'Last Synced',
      render: (row) => (
        <span className="text-xs text-gray-400">
          {row.lastSyncedAt
            ? new Date(row.lastSyncedAt).toLocaleString()
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => syncMutation.mutate(row.id)}
            disabled={syncingId === row.id}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncingId === row.id ? 'animate-spin' : ''} />
            Sync
          </button>
          <button
            onClick={() =>
              toggleMutation.mutate({
                id: row.id,
                status: row.status === 'active' ? 'inactive' : 'active',
              })
            }
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
              row.status === 'active'
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {row.status === 'active' ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => setDeleteTargetId(row.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Legal Sources</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage knowledge base sources for the AI
            </p>
          </div>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Legal Sources</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage knowledge base sources for the AI
            </p>
          </div>
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Legal Sources</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage knowledge base sources for the AI
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A3A6C] text-white text-sm font-medium rounded-lg hover:bg-[#15305a] transition"
        >
          <Plus size={16} />
          Add Source
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500 text-sm">Manbalar topilmadi</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sources}
          loading={false}
          emptyMessage="No legal sources configured."
          keyExtractor={(row) => row.id}
        />
      )}

      {showModal && (
        <AddSourceModal
          onClose={() => setShowModal(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-2">O&apos;chirishni tasdiqlang</h3>
            <p className="text-sm text-gray-500 mb-4">Bu manba va unga bog&apos;liq barcha ma&apos;lumotlar o&apos;chiriladi.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg"
              >
                Bekor
              </button>
              <button
                onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'O\'chirilmoqda...' : 'O\'chirish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
