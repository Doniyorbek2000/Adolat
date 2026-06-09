'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MessageSquare } from 'lucide-react';
import DataTable, { Column } from '../../../components/data-table';
import { SupportTicket } from '../../../types';
import {
  fetchSupportTickets,
  fetchTicketDetail,
  updateTicketStatus,
} from '../../../services/api.service';

const mockTickets: SupportTicket[] = [
  {
    id: 'TKT-001', subject: 'Cannot access my subscription features',
    status: 'open', priority: 'high',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    user: { email: 'alice@example.com' },
    messages: [
      { id: 'm1', body: 'I paid for the pro plan but I cannot use document analysis.', isAdmin: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
  },
  {
    id: 'TKT-002', subject: 'AI response is in wrong language',
    status: 'in_progress', priority: 'medium',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    user: { email: 'bob@example.com' },
    messages: [
      { id: 'm2', body: 'The AI keeps responding in Russian even when I ask in Uzbek.', isAdmin: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'm3', body: "We're looking into this issue. Please try setting your language preference in the app settings.", isAdmin: true, createdAt: new Date(Date.now() - 82800000).toISOString() },
    ],
  },
  {
    id: 'TKT-003', subject: 'Billing issue — charged twice',
    status: 'resolved', priority: 'urgent',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    user: { email: 'carol@example.com' },
  },
];

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
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
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
              onChange={(e) => onStatusChange(e.target.value)}
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
          <p className="text-xs text-gray-400 text-center">
            Reply feature coming soon
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => fetchSupportTickets({ limit: 50 }),
  });

  const detailQuery = useQuery({
    queryKey: ['ticket-detail', selectedId],
    queryFn: () => fetchTicketDetail(selectedId!),
    enabled: !!selectedId,
  });

  const tickets = isError ? mockTickets : data?.data ?? mockTickets;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTicketStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-tickets'] }),
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

      <DataTable
        columns={columns as Column<Record<string, unknown>>[]}
        data={tickets as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage="No support tickets."
        keyExtractor={(row) => row.id as string}
      />

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
        />
      )}
    </div>
  );
}
