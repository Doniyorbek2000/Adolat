'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  fetchLegalDocuments,
  createLegalDocument,
  retryLegalDocumentIndexing,
  deleteLegalDocument,
} from '../../../services/api.service';
import type { LegalDocument, LegalDocIndexingStatus, CreateLegalDocumentPayload } from '../../../types';

const SOURCE_TYPES = [
  { value: 'LEGAL', label: 'Huquqiy' },
  { value: 'TAX', label: 'Soliq' },
  { value: 'GOVERNMENT', label: 'Hukumat' },
  { value: 'JUSTICE', label: 'Adliya' },
  { value: 'CENTRAL_BANK', label: 'Markaziy Bank' },
  { value: 'OTHER_OFFICIAL', label: 'Boshqa rasmiy' },
];

function StatusBadge({ status }: { status: LegalDocIndexingStatus }) {
  const config: Record<LegalDocIndexingStatus, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: 'Kutilmoqda', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Clock size={12} /> },
    INDEXING: { label: 'Indekslanyapti', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Loader2 size={12} className="animate-spin" /> },
    INDEXED: { label: 'Tayyor', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={12} /> },
    FAILED: { label: 'Xatolik', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle size={12} /> },
  };
  const c = config[status] ?? config.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

const EMPTY_FORM: CreateLegalDocumentPayload = {
  title: '',
  category: '',
  sourceUrl: '',
  content: '',
  sourceType: 'LEGAL',
};

export default function LegalDocumentsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLegalDocumentPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: documents, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-legal-documents'],
    queryFn: fetchLegalDocuments,
    refetchInterval: (query) => {
      // Auto-refresh while any document is PENDING or INDEXING
      const docs = query.state.data ?? [];
      const hasActive = docs.some((d) => d.indexingStatus === 'PENDING' || d.indexingStatus === 'INDEXING');
      return hasActive ? 3000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: createLegalDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-legal-documents'] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Xatolik yuz berdi');
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryLegalDocumentIndexing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-legal-documents'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLegalDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-legal-documents'] });
      setDeleteTargetId(null);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setFormError("Sarlavha va matn majburiy");
      return;
    }
    setFormError(null);
    createMutation.mutate({
      title: form.title.trim(),
      category: form.category?.trim() || undefined,
      sourceUrl: form.sourceUrl?.trim() || undefined,
      content: form.content.trim(),
      sourceType: form.sourceType || undefined,
    });
  }

  const indexedCount = documents?.filter((d) => d.indexingStatus === 'INDEXED').length ?? 0;
  const failedCount = documents?.filter((d) => d.indexingStatus === 'FAILED').length ?? 0;
  const totalChunks = documents?.reduce((sum, d) => sum + d.chunksCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={22} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Qonun Hujjatlari</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              RAG pipeline uchun qo&apos;lda kiritilgan hujjatlar
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(null); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Hujjat qo&apos;shish
        </button>
      </div>

      {/* Stats */}
      {documents && documents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Jami hujjat", value: documents.length, color: "text-blue-600" },
            { label: "Indekslangan", value: indexedCount, color: "text-green-600" },
            { label: "Jami chunk", value: totalChunks, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">Ma&apos;lumot yuklanmadi</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Qayta urinish
            </button>
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Hujjatlar yo&apos;q</p>
            <p className="text-gray-400 text-sm mt-1">
              &ldquo;Hujjat qo&apos;shish&rdquo; tugmasini bosib birinchi hujjatni kiriting
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Sarlavha', 'Kategoriya', 'Tur', 'Holat', 'Chunklar', 'Sana', 'Amal'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 max-w-xs truncate">{doc.title}</span>
                        {doc.sourceUrl && (
                          <a href={doc.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-600">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      {doc.indexingStatus === 'FAILED' && doc.errorMessage && (
                        <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={doc.errorMessage}>
                          {doc.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{doc.category ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {doc.sourceType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.indexingStatus} />
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                      {doc.chunksCount > 0 ? doc.chunksCount : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString('uz')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {doc.indexingStatus === 'FAILED' && (
                          <button
                            onClick={() => retryMutation.mutate(doc.id)}
                            disabled={retryMutation.isPending}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Qayta indekslash"
                          >
                            <RefreshCw size={15} className={retryMutation.isPending ? 'animate-spin' : ''} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTargetId(doc.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Document Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Qonun hujjati qo&apos;shish</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sarlavha <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mehnat kodeksi, 100-modda — Ish vaqti"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kategoriya</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="mehnat, soliq, mulk..."
                    value={form.category ?? ''}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Manba turi</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.sourceType ?? 'LEGAL'}
                    onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
                  >
                    {SOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Manba URL (ixtiyoriy)</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://lex.uz/uz/docs/..."
                    value={form.sourceUrl ?? ''}
                    onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                    type="url"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Hujjat matni <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Hujjatning to'liq matni... (moddalar, bandlar, qoidalar)"
                    rows={10}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {form.content.length.toLocaleString()} belgi
                    {form.content.length > 0 && ` · ~${Math.ceil(form.content.length / 3600)} chunk`}
                  </p>
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <><Loader2 size={15} className="animate-spin" /> Saqlanmoqda...</>
                  ) : (
                    <><Plus size={15} /> Saqlash va indekslash</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-800">O&apos;chirishni tasdiqlang</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Bu hujjat va unga bog&apos;liq barcha chunklar (embeddings bilan) o&apos;chiriladi.
              Bu amalni qaytarib bo&apos;lmaydi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Bekor
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTargetId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
