'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorCard({
  message = "Ma'lumotlarni yuklashda xatolik yuz berdi",
  onRetry,
}: ErrorCardProps) {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-8 flex flex-col items-center gap-3">
      <AlertCircle size={36} className="text-red-400" />
      <p className="text-sm text-gray-600 text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition"
        >
          <RefreshCw size={14} />
          Qayta urinish
        </button>
      )}
    </div>
  );
}
