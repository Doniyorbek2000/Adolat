'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, Send } from 'lucide-react';
import { api } from '../../../lib/api';

export default function NotificationsPage() {
  const [form, setForm] = useState({ title: '', body: '', type: 'INFO' });
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/admin/notifications').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api.post('/admin/notifications/bulk', { ...payload, userIds: [] }),
    onSuccess: () => {
      setForm({ title: '', body: '', type: 'INFO' });
      setSending(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Bildirishnomalar</h1>
      </div>

      {/* Bulk send form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Send size={16} /> Ommaviy xabar yuborish
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tur</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {['INFO', 'PROMO', 'SECURITY', 'SYSTEM'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sarlavha</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bildirishnoma sarlavhasi"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Matn</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bildirishnoma matni"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => { setSending(true); mutation.mutate(form); }}
            disabled={!form.title || !form.body || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={14} />
            {mutation.isPending ? 'Yuborilmoqda...' : 'Yuborish'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">So&apos;nggi bildirishnomalar</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Tur', 'Sarlavha', 'Matn', 'Sana'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.notifications ?? []).map((n: Record<string, string>) => (
                  <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{n.type}</span>
                    </td>
                    <td className="py-2 px-3 font-medium">{n.title}</td>
                    <td className="py-2 px-3 text-gray-500 max-w-xs truncate">{n.body}</td>
                    <td className="py-2 px-3 text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!data?.notifications?.length && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">Bildirishnomalar yo&apos;q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
