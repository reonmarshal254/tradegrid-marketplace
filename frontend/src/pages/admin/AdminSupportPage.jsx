import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner, EmptyState } from '../../components/Ui';
import { ChatIcon, ClockIcon, CheckCircleIcon } from '../../components/Icons';
import { timeAgo } from '../../utils/format';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // open, closed, all

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        api.admin.stats(),
        api.admin.supportTickets()
      ]);
      setStats(statsRes.stats);
      setTickets(ticketsRes.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClose(id) {
    if (!confirm('Close this support ticket?')) return;
    try {
      await api.admin.closeSupportTicket(id);
      setTickets(tickets.map(t => t.id === id ? { ...t, status: 'closed' } : t));
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage customer support requests
            </p>
          </div>
          {openCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              {openCount} open
            </span>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['open', 'closed', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'open' && openCount > 0 && (
                <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            icon={<ChatIcon className="w-12 h-12" />}
            title="No tickets found"
            message={filter === 'open' ? 'All caught up! No open tickets.' : 'No tickets match your filter.'}
          />
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`bg-white rounded-xl border-2 p-6 transition hover:shadow-md ${
                  ticket.status === 'open'
                    ? 'border-indigo-200 bg-indigo-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <ChatIcon className={`w-5 h-5 ${ticket.status === 'open' ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ticket.status === 'open'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ticket.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                      {ticket.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {ticket.unread_count} new
                        </span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {timeAgo(ticket.last_message_at || ticket.created_at)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-700">User: </span>
                        <span className="text-sm text-gray-900">{ticket.user_name}</span>
                      </div>

                      {ticket.last_message && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 line-clamp-2">{ticket.last_message}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      to={`/admin/support-chat?user=${ticket.user_id}`}
                      className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                    >
                      <ChatIcon className="w-4 h-4" />
                      Open Chat
                    </Link>
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => handleClose(ticket.id)}
                        className="inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
