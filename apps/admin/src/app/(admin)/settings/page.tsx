'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save } from 'lucide-react';
import api from '../../../lib/api';
import ErrorCard from '../../../components/error-card';
import { SystemSetting } from '../../../types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch(`/admin/settings/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setEditKey(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-800">Sozlamalar</h1>
      </div>

      {isError && (
        <ErrorCard message="Sozlamalarni yuklashda xatolik" onRetry={() => refetch()} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Kalit', 'Qiymat', 'Yangilangan', 'Amal'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.settings ?? []).map((s: SystemSetting) => (
                <tr key={s.key} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs text-gray-700">{s.key}</td>
                  <td className="py-3 px-4">
                    {editKey === s.key ? (
                      <input
                        className="w-full border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-600">{JSON.stringify(s.value)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-xs">
                    {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {editKey === s.key ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => mutation.mutate({ key: s.key, value: editValue })}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                        >
                          <Save size={12} /> Saqlash
                        </button>
                        <button
                          onClick={() => setEditKey(null)}
                          className="px-2 py-1 text-gray-500 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          Bekor
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditKey(s.key);
                          setEditValue(JSON.stringify(s.value));
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Tahrirlash
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!data?.settings?.length && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">Sozlamalar yo&apos;q</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
