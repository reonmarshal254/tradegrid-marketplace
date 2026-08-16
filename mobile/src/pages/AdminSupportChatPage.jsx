import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSupportSocket } from '../context/SocketContext';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { Spinner, Avatar, EmptyState } from '../components/Ui';
import { ChatIcon, SendIcon, CheckCircleIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';

export default function AdminSupportChatPage() {
  const { chatId } = useParams();
  const [stats, setStats] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('open');
  const messagesEndRef = useRef(null);

  // Real-time support chat updates via WebSocket
  useSupportSocket(selectedChat?.id, (newMessage) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some(m => m.id === newMessage.id)) return prev;
      return [...prev, newMessage];
    });
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadChats();
  }, [status]);

  useEffect(() => {
    if (chatId) {
      loadChat(chatId);
    }
  }, [chatId]);

  async function loadStats() {
    try {
      const statsRes = await api.admin.stats();
      setStats(statsRes.stats);
    } catch {
      // ignore
    }
  }

  async function loadChats() {
    setLoading(true);
    try {
      const data = await api.admin.supportChats(status);
      setChats(data.chats || []);
    } catch (err) {
      setError(err?.message || 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }

  async function loadChat(id, silent = false) {
    if (!silent) setLoading(true);
    setError('');
    
    try {
      const data = await api.admin.getSupportChat(id);
      setSelectedChat(data.chat);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err?.message || 'Failed to load chat');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function sendChatMessage(e) {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    setSending(true);
    setError('');
    
    try {
      const data = await api.supportChat.sendMessage(selectedChat.id, message.trim());
      setMessages((prev) => [...prev, data.message]);
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function handleCloseChat() {
    if (!selectedChat || !confirm('Close this support chat?')) return;

    try {
      await api.supportChat.closeChat(selectedChat.id);
      setSelectedChat(null);
      setMessages([]);
      loadChats();
    } catch (err) {
      setError(err?.message || 'Failed to close chat');
    }
  }

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Live Support Chats</h1>
            <p className="mt-1 text-sm text-gray-500">Manage customer support conversations</p>
          </div>
          <div className="flex gap-2">
            {['open', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  status === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Chat list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-100">
                <h2 className="font-bold text-sm sm:text-base text-gray-900">Conversations</h2>
              </div>
              {loading && !selectedChat ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : chats.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs sm:text-sm text-gray-500">No {status} chats</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                  {chats.map((chat) => (
                    <li key={chat.id}>
                      <button
                        onClick={() => loadChat(chat.id)}
                        className={`w-full text-left p-3 sm:p-4 hover:bg-gray-50 transition ${
                          selectedChat?.id === chat.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Avatar
                            user={{ name: chat.user_name, avatar_url: chat.user_avatar }}
                            size="h-9 w-9 sm:h-10 sm:w-10"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                                {chat.user_name}
                              </p>
                              {chat.unread > 0 && (
                                <span className="ml-2 min-w-5 h-5 px-1.5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                                  {chat.unread}
                                </span>
                              )}
                            </div>
                            {chat.last_message && (
                              <>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {chat.last_message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {timeAgo(chat.last_message_at)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Chat messages */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-[500px] sm:h-[700px]">
              {!selectedChat ? (
                <EmptyState
                  icon={<ChatIcon className="w-10 h-10 sm:w-12 sm:h-12" />}
                  title="Select a conversation"
                  message="Choose a chat from the list to view and respond"
                />
              ) : (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        user={{ name: selectedChat.user_name, avatar_url: selectedChat.user_avatar }}
                        size="h-10 w-10"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{selectedChat.user_name}</p>
                        <p className="text-xs text-gray-500">{selectedChat.user_email}</p>
                      </div>
                    </div>
                    {selectedChat.status === 'open' && (
                      <button
                        onClick={handleCloseChat}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Close chat
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {error && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}

                    {messages.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-sm text-gray-500">No messages yet</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${msg.sent_by_me ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <Avatar
                            user={{ name: msg.sender_name, avatar_url: msg.sender_avatar }}
                            size="h-8 w-8 shrink-0"
                          />
                          <div className={`flex flex-col ${msg.sent_by_me ? 'items-end' : 'items-start'} max-w-[75%]`}>
                            <span className="text-[10px] font-semibold text-gray-600 mb-0.5 px-1">
                              {msg.sender_name} {msg.sender_role === 'admin' && '(You)'}
                            </span>
                            <div
                              className={`rounded-2xl px-3 py-2 ${
                                msg.sent_by_me
                                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-sm'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                              {timeAgo(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {selectedChat.status === 'open' && (
                    <div className="border-t border-gray-100 p-4">
                      <form onSubmit={sendChatMessage} className="flex gap-2">
                        <input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your reply..."
                          disabled={sending}
                          className="flex-1 text-sm rounded-full border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={sending || !message.trim()}
                          className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 disabled:opacity-50 text-white flex items-center justify-center hover:shadow-lg transition"
                        >
                          {sending ? <Spinner className="h-4 w-4 text-white" /> : <SendIcon className="w-4 h-4" />}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
