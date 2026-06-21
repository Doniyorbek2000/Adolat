'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MessageSquare, Send } from 'lucide-react';
import DataTable, { Column } from '../../../components/data-table';
import ErrorCard from '../../../components/error-card';
import { SupportTicket } from '../../../types';
import {
  fetchSupportTickets,
  fetchTicketDetail,
  updateTicketStatus,
  sendSupportTicketReply,
} from '../../../services/api.service';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-700',
};

function TicketDetailModal({
  ticket,
  onClose,
  onStatusChange,
  onReplySent,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onReplySent: () => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      sendSupportTicketReply(ticket.id, body),
    onSuccess: () => {
      setReplyText('');
      onReplySent();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400 font-mono">{ticket.id}</p>
            <h2 className="text-base font-bold text-gray-800 mt-0.5">{ticket.subject}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{ticket.user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={ticket.status}
              onChange={(e) => {
                if (e.target.value !== ticket.status) {
                  setPendingStatus(e.target.value);
                }
              }}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {(ticket.messages ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No messages</p>
          ) : (
            ticket.messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                    msg.isAdmin
                      ? 'bg-[#1A3A6C] text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}
                >
                  <p>{msg.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isAdmin ? 'text-blue-200' : 'text-gray-400'
                    }`}
                  >
                    {msg.isAdmin ? 'Admin' : ticket.user.email} &middot;{' '}
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && replyText.trim()) replyMutation.mutate(replyText.trim());
              }}
              placeholder="Javob yozing..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
            />
            <button
              onClick={() => replyText.trim() && replyMutation.mutate(replyText.trim())}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1A3A6C] text-white text-sm rounded-lg hover:bg-[#15305a] disabled:opacity-50 transition"
            >
              <Send size={14} />
              {replyMutation.isPending ? 'Yuborilmoqda...' : 'Yuborish'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Change Confirmation Modal */}
      {pendingStatus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Tasdiqlash</h2>
            <p className="text-sm text-gray-600 mb-6">
              Tiket holatini o&apos;zgartirish tasdiqlaysizmi?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingStatus(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  onStatusChange(pendingStatus);
                  setPendingStatus(null);
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

export default function SupportPage() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const qc = useQueryClient();

  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['support-tickets', page, statusFilter, priorityFilter],
    queryFn: () =>
      fetchSupportTickets({
        page,
        limit,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['ticket-detail', selectedId],
    queryFn: () => fetchTicketDetail(selectedId!),
    enabled: !!selectedId,
  });

  const tickets = data?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTicketStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-tickets'] }),
    onError: () => qc.invalidateQueries({ queryKey: ['support-tickets'] }),
  });

  function handleOpenTicket(ticket: SupportTicket) {
    setSelectedId(ticket.id);
    setSelectedTicket(detailQuery.data ?? ticket);
  }

  // Sync detail when loaded
  const displayTicket =
    selectedId && detailQuery.data ? detailQuery.data : selectedTicket;

  const columns: Column<SupportTicket>[] = [
    {
      key: 'id',
      header: 'Ticket ID',
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">{row.id}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <button
          onClick={() => handleOpenTicket(row)}
          className="text-sm font-medium text-[#1A3A6C] hover:underline text-left"
        >
          {row.subject}
        </button>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.user.email}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[row.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {row.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[row.priority] ?? 'bg-gray-100 text-gray-500'}`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => (
        <span className="text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={() => handleOpenTicket(row)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md"
        >
          <MessageSquare size={12} />
          View
        </button>
      ),
    },
  ];

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const urgentCount = tickets.filter((t) => t.priority === 'urgent').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Support Tickets</h1>
        <p className="text-gray-500 text-sm mt-1">
          {openCount} open &middot; {urgentCount} urgent
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Barchasi</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          >
            <option value="">Barchasi</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {isError && (
        <ErrorCard message="Tiketlarni yuklashda xatolik" onRetry={() => refetch()} />
      )}

      <DataTable
        columns={columns}
        data={tickets}
        loading={isLoading}
        emptyMessage="No support tickets."
        keyExtractor={(row) => row.id}
      />

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="bg-white rounded-xl border border-gray-200 flex justify-between items-center px-4 py-3">
          <span className="text-xs text-gray-500">Jami: {data.total}</span>
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
              disabled={page * limit >= data.total}
              className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Keyingi
            </button>
          </div>
        </div>
      )}

      {displayTicket && (
        <TicketDetailModal
          ticket={displayTicket}
          onClose={() => {
            setSelectedTicket(null);
            setSelectedId(null);
          }}
          onStatusChange={(status) => {
            statusMutation.mutate({ id: displayTicket.id, status });
            setSelectedTicket((t) => (t ? { ...t, status: status as SupportTicket['status'] } : t));
          }}
          onReplySent={() => {
            qc.invalidateQueries({ queryKey: ['ticket-detail', selectedId] });
          }}
        />
      )}
    </div>
  );
}
