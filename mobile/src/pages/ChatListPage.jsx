import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner, Avatar, EmptyState } from '../components/Ui';
import { ChatIcon } from '../components/Icons';
import { formatPrice, timeAgo } from '../utils/format';

export default function ChatListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.messages
      .conversations()
      .then((data) => {
        setConversations(data.conversations);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const item = searchParams.get('item');
    const seller = searchParams.get('seller');
    if (!item || !seller || !user || starting) return;
    setStarting(true);
    api.messages
      .start(item, seller)
      .then((data) => navigate(`/chat/${data.conversation.id}`, { replace: true }))
      .catch((err) => {
        alert(err.message);
        navigate('/chat', { replace: true });
      });
  }, [searchParams, user, starting, navigate]);

  if (starting) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
      <p className="mt-1 text-sm text-gray-500">Chat with buyers and sellers about items</p>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<ChatIcon className="w-12 h-12" />}
          title="No conversations yet"
          message="Open an item and tap the chat button to start talking with a seller."
          action={
            <Link
              to="/items"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-full transition"
            >
              Browse items
            </Link>
          }
        />
      ) : (
        <ul className="mt-8 bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link to={`/chat/${c.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition">
                <div className="relative shrink-0">
                  <Avatar user={{ name: c.other.name, avatar_url: c.other.avatar_url }} size="h-12 w-12" />
                  {c.unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{c.other.name}</p>
                    {c.last_message && (
                      <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(c.last_message.created_at)}</span>
                    )}
                  </div>
                  {c.item && (
                    <p className="text-xs text-indigo-600 truncate">
                      {c.item.name} · {formatPrice(c.item.price)}
                    </p>
                  )}
                  <p className={`text-sm truncate ${c.unread ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {c.last_message
                      ? `${c.last_message.sent_by_me ? 'You: ' : ''}${c.last_message.body}`
                      : 'No messages yet'}
                  </p>
                </div>
                {c.item?.image_url && (
                  <img src={c.item.image_url} alt={c.item.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
