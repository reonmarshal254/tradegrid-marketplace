import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useMessageSocket } from '../context/SocketContext';
import { api } from '../api';
import { Spinner, Avatar } from '../components/Ui';
import { ChevronLeftIcon, ChatIcon, CheckCircleIcon } from '../components/Icons';
import { formatPrice } from '../utils/format';

export default function ChatThreadPage() {
  const { id } = useParams();
  const { user, refreshMsgUnread } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Real-time message updates via WebSocket
  useMessageSocket(id, (message) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message];
    });
    refreshMsgUnread();
  });

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.messages.get(id);
      setConversation(data.conversation);
      setMessages(data.messages);
      refreshMsgUnread();
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // No more polling - real-time updates via socket
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, conversation?.id]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const data = await api.messages.send(id, text);
      setMessages((m) => [...m, data.message]);
      setInput('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading && !conversation) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  const other = conversation?.other;
  const item = conversation?.item;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link
        to="/chat"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-indigo-600 mb-3"
      >
        <ChevronLeftIcon className="w-4 h-4" /> Back to messages
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[70vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Avatar user={{ name: other?.name, avatar_url: other?.avatar_url, is_verified: other?.is_verified }} size="h-10 w-10" />
          <div className="flex-1 min-w-0">
            <Link to={`/user/${other?.id}`} className="font-semibold text-gray-900 hover:text-indigo-600 inline-flex items-center gap-1.5">
              {other?.name}
              {other?.is_verified && (
                <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 drop-shadow-sm" filled={true} />
              )}
            </Link>
            {item && (
              <Link to={`/item/${conversation.item_id}`} className="block text-xs text-indigo-600 truncate">
                {item.name} · {formatPrice(item.price)}
              </Link>
            )}
          </div>
          {item?.image_url && (
            <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-16">
              Say hello to {other?.name} about this item.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sent_by_me ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                    m.sent_by_me
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.sent_by_me ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={2000}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
          >
            <ChatIcon className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
