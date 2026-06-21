'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import api from '../../../lib/api';
import ErrorCard from '../../../components/error-card';
import { AuditLog } from '../../../types';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs', page, action],
    queryFn: () =>
      api.get('/admin/audit-logs', { params: { page, limit: 20, action: action || undefined } }).then((r) => r.data),
  });

  const actions = ['', 'BLOCK', 'UNBLOCK', 'DELETE', 'UPDATE_ROLE', 'LOGIN', 'LOGOUT'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-800">Audit Loglari</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amal turi</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          >
            {actions.map((a) => (
              <option key={a} value={a}>{a || 'Barchasi'}</option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <ErrorCard message="Audit loglarni yuklashda xatolik" onRetry={() => refetch()} />
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Amal', 'Entity', 'Admin ID', 'Foydalanuvchi ID', 'Sana'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (data?.data ?? []).map((log: AuditLog) => (
                    <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.action === 'BLOCK' ? 'bg-red-50 text-red-700' :
                          log.action === 'UNBLOCK' ? 'bg-green-50 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{log.action}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{log.entityType}</td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">{log.adminId?.slice(0, 8)}...</td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">{log.userId?.slice(0, 8)}...</td>
                      <td className="py-3 px-4 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loglar topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.total ?? 0) > 20 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Jami: {data?.total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Oldingi
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= (data?.total ?? 0)}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
