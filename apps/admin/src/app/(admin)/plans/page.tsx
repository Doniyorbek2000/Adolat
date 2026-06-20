'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, X } from 'lucide-react';
import ErrorCard from '../../../components/error-card';
import { SubscriptionPlan } from '../../../types';
import { fetchPlans, updatePlan } from '../../../services/api.service';

function LimitDisplay({ val }: { val: number }) {
  return <span>{val === -1 ? 'Unlimited' : val.toLocaleString()}</span>;
}

function EditableRow({
  plan,
  onSave,
  onCancel,
}: {
  plan: SubscriptionPlan;
  onSave: (data: Partial<SubscriptionPlan>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: plan.name,
    price: plan.price,
    questionLimit: plan.questionLimit,
    documentAnalysisLimit: plan.documentAnalysisLimit,
    generatedDocumentLimit: plan.generatedDocumentLimit,
    voiceMinutesLimit: plan.voiceMinutesLimit,
    isActive: plan.isActive,
  });

  return (
    <tr className="bg-blue-50">
      <td className="px-4 py-2 text-xs font-mono text-gray-500">{plan.code}</td>
      <td className="px-4 py-2">
        <input
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          step="0.01"
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: +e.target.value }))}
        />
      </td>
      {(['questionLimit', 'documentAnalysisLimit', 'generatedDocumentLimit', 'voiceMinutesLimit'] as const).map((k) => (
        <td key={k} className="px-4 py-2">
          <input
            type="number"
            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
            value={form[k]}
            onChange={(e) => setForm((f) => ({ ...f, [k]: +e.target.value }))}
          />
        </td>
      ))}
      <td className="px-4 py-2">
        <select
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          value={form.isActive ? 'true' : 'false'}
          onChange={(e) =>
            setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))
          }
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => onSave(form)}
            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PlansPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
  });

  const plans = data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SubscriptionPlan> }) =>
      updatePlan(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      setEditingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-800">Subscription Plans</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Loading plans...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-800">Subscription Plans</h1>
        <ErrorCard message="Tariflarni yuklashda xatolik" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Subscription Plans</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage pricing and limits for each plan
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Questions</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Doc Analysis</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gen. Docs</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Voice Min.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) =>
              editingId === plan.id ? (
                <EditableRow
                  key={plan.id}
                  plan={plan}
                  onSave={(payload) =>
                    updateMutation.mutate({ id: plan.id, payload })
                  }
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{plan.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{plan.name}</td>
                  <td className="px-4 py-3">
                    {plan.price === 0 ? (
                      <span className="text-green-600 font-medium">Free</span>
                    ) : (
                      `$${plan.price}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600"><LimitDisplay val={plan.questionLimit} /></td>
                  <td className="px-4 py-3 text-gray-600"><LimitDisplay val={plan.documentAnalysisLimit} /></td>
                  <td className="px-4 py-3 text-gray-600"><LimitDisplay val={plan.generatedDocumentLimit} /></td>
                  <td className="px-4 py-3 text-gray-600"><LimitDisplay val={plan.voiceMinutesLimit} /></td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingId(plan.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
