'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import DataTable, { Column } from '../../../components/data-table';
import ErrorCard from '../../../components/error-card';
import { PromoCode } from '../../../types';
import {
  fetchPromoCodes,
  createPromoCode,
  togglePromoCode,
} from '../../../services/api.service';

interface CreateFormData {
  code: string;
  type: 'percent' | 'fixed';
  discountPercent: number;
  maxRedemptions: number;
  validUntil: string;
  isActive: boolean;
}

function CreateModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: CreateFormData) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<CreateFormData>({
    code: '',
    type: 'percent',
    discountPercent: 10,
    maxRedemptions: 100,
    validUntil: '',
    isActive: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Create Promo Code</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
              placeholder="e.g. SAVE20"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as 'percent' | 'fixed',
                  }))
                }
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount {form.type === 'percent' ? '%' : '$'}
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.discountPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPercent: +e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Redemptions
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.maxRedemptions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxRedemptions: +e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.validUntil}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validUntil: e.target.value }))
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
              className="rounded"
            />
            Active immediately
          </label>
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
            disabled={loading || !form.code}
            className="flex-1 py-2 bg-[#1A3A6C] text-white rounded-lg text-sm font-medium hover:bg-[#15305a] disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromoCodesPage() {
  const [showModal, setShowModal] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{
    id: string;
    isActive: boolean;
  } | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: fetchPromoCodes,
  });

  const codes = data ?? [];

  const createMutation = useMutation({
    mutationFn: createPromoCode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      setShowModal(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePromoCode(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-codes'] }),
  });

  const columns: Column<PromoCode>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (row) => (
        <span className="font-mono font-semibold text-gray-800">{row.code}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="capitalize text-gray-600">{row.type}</span>
      ),
    },
    {
      key: 'discountPercent',
      header: 'Discount',
      render: (row) => (
        <span className="font-medium text-blue-700">
          {row.discountPercent}
          {row.type === 'percent' ? '%' : '$'}
        </span>
      ),
    },
    {
      key: 'redemptions',
      header: 'Redemptions',
      render: (row) => (
        <span>
          {row.redemptionsCount} / {row.maxRedemptions}
        </span>
      ),
    },
    {
      key: 'validUntil',
      header: 'Valid Until',
      render: (row) => (
        <span className="text-gray-500 text-xs">
          {row.validUntil
            ? new Date(row.validUntil).toLocaleDateString()
            : '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            row.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() =>
            setConfirmToggle({ id: row.id, isActive: !row.isActive })
          }
          disabled={toggleMutation.isPending}
          className={`px-3 py-1 text-xs font-medium rounded-md transition ${
            row.isActive
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {row.isActive ? 'Disable' : 'Enable'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Promo Codes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage discount codes for users
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A3A6C] text-white text-sm font-medium rounded-lg hover:bg-[#15305a] transition"
        >
          <Plus size={16} />
          Create Code
        </button>
      </div>

      {isError && (
        <ErrorCard message="Promo kodlarni yuklashda xatolik" onRetry={() => refetch()} />
      )}

      <DataTable
        columns={columns}
        data={codes}
        loading={isLoading}
        emptyMessage="No promo codes yet."
        keyExtractor={(row) => row.id}
      />

      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}

      {/* Confirmation Modal */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Tasdiqlash</h2>
            <p className="text-sm text-gray-600 mb-6">
              Promo kod holatini o&apos;zgartirish tasdiqlaysizmi?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  toggleMutation.mutate({
                    id: confirmToggle.id,
                    isActive: confirmToggle.isActive,
                  });
                  setConfirmToggle(null);
                }}
                className="flex-1 py-2 bg-[#1A3A6C] text-white rounded-lg text-sm font-medium hover:bg-[#15305a] transition"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
