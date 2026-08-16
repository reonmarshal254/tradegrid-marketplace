import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSupportSocket } from '../context/SocketContext';
import { api } from '../api';
import { Spinner, Avatar } from './Ui';
import { HeadsetIcon, CloseIcon, SendIcon, ChatIcon, ShieldIcon, PaperClipIcon } from './Icons';
import { timeAgo } from '../utils/format';

const QUICK_LINKS = [
  { to: '/buying-guide', label: 'Buying guide' },
  { to: '/safety-guidelines', label: 'Safety guidelines' },
  { to: '/help', label: 'Help center' },
  { to: '/contact', label: 'Contact us' },
];

export default function LiveSupportWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'help'
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Real-time support chat updates via WebSocket
  useSupportSocket(chat?.id, (newMessage) => {
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

  // Load chat when opening widget
  useEffect(() => {
    if (open && user && !chat) {
      loadChat();
    }
  }, [open, user]);

  async function loadChat(silent = false) {
    if (!user) return;
    
    if (!silent) setLoading(true);
    setError('');
    
    try {
      const data = await api.supportChat.getMyChat();
      setChat(data.chat);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err?.message || 'Could not load chat');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function toggle() {
    setOpen((o) => !o);
  }

  async function sendChatMessage(e) {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }
    if (!chat) {
      setError('Chat not initialized');
      return;
    }

    setSending(true);
    setError('');
    try {
      const data = await api.supportChat.sendMessage(chat.id, message.trim());
      setMessages((prev) => [...prev, data.message]);
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl shadow-gray-900/20 ring-1 ring-black/5 overflow-hidden animate-slide-in flex flex-col h-[80vh]">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-white shrink-0">
            <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-3">
              <span className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <HeadsetIcon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Live support</p>
                <p className="flex items-center gap-1.5 text-[11px] text-indigo-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online — we usually reply in minutes
                </p>
              </div>
              <button
                onClick={toggle}
                aria-label="Close support"
                className="p-1.5 rounded-full hover:bg-white/20 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-50 border-b border-gray-200 shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ChatIcon className="w-4 h-4 inline mr-2" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'help'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldIcon className="w-4 h-4 inline mr-2" />
              Quick Help
            </button>
          </div>

          {/* Chat Tab Content */}
          {activeTab === 'chat' && (
            <>
              {!user ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <span className="mx-auto h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <ChatIcon className="w-6 h-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-gray-900">
                      How can we help?
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Log in to chat with our support team directly.
                    </p>
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate('/login');
                      }}
                      className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold py-2.5 rounded-full hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                    >
                      Log in to chat
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex-1 flex justify-center items-center">
                  <Spinner />
                </div>
              ) : (
                <>
                  {/* Messages area - now full height */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                    {error && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}
                    
                    {messages.length === 0 ? (
                      <div className="text-center py-6">
                        <span className="mx-auto h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          <ChatIcon className="w-6 h-6" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-gray-900">
                          Start a conversation
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Our support team is here to help. Send a message below.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${msg.sent_by_me ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {!msg.sent_by_me && (
                            <Avatar
                              user={{ name: msg.sender_name, avatar_url: msg.sender_avatar }}
                              size="h-8 w-8 shrink-0"
                            />
                          )}
                          <div className={`flex flex-col ${msg.sent_by_me ? 'items-end' : 'items-start'} max-w-[75%]`}>
                            {!msg.sent_by_me && (
                              <span className="text-[10px] font-semibold text-gray-600 mb-0.5 px-1">
                                {msg.sender_name} {msg.sender_role === 'admin' && '(Support Team)'}
                              </span>
                            )}
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

                  {/* Input area with upload button */}
                  <div className="shrink-0 border-t border-gray-100 p-3">
                    <form onSubmit={sendChatMessage} className="flex gap-2 items-end">
                      <div className="flex-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="shrink-0 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                          title="Attach file"
                        >
                          <PaperClipIcon className="w-4 h-4" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          className="hidden"
                          onChange={(e) => {
                            // TODO: Implement file upload
                            console.log('File selected:', e.target.files[0]);
                          }}
                        />
                        <input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your message..."
                          disabled={sending}
                          className="flex-1 text-sm rounded-full border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sending || !message.trim()}
                        className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 disabled:opacity-50 text-white flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                      >
                        {sending ? <Spinner className="h-4 w-4 text-white" /> : <SendIcon className="w-4 h-4" />}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </>
          )}

          {/* Quick Help Tab Content */}
          {activeTab === 'help' && (
            <div className="flex-1 p-4 space-y-4">
              <div className="text-center">
                <span className="mx-auto h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <ShieldIcon className="w-6 h-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-gray-900">
                  Quick Help Resources
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Find answers to common questions
                </p>
              </div>
              
              <div className="space-y-2">
                {QUICK_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl px-4 py-3 transition-colors duration-200"
                  >
                    <ShieldIcon className="w-4 h-4 shrink-0" />
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={toggle}
        aria-label="Live support"
        className="live-pulse relative h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200"
      >
        {open ? (
          <CloseIcon className="w-6 h-6" />
        ) : (
          <HeadsetIcon className="w-6 h-6" />
        )}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </button>
    </div>
  );
}
