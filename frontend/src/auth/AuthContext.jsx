import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setToken } from '../api';
import { syncAppBadge } from '../push/push';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.auth.me();
      setUser(user);
      return user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!localStorage.getItem('sh_token')) {
      setUnreadCount(0);
      return;
    }
    try {
      const { unread_count } = await api.notifications.unreadCount();
      setUnreadCount(unread_count);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshMsgUnread = useCallback(async () => {
    if (!localStorage.getItem('sh_token')) {
      setMsgUnread(0);
      return;
    }
    try {
      const { unread_count } = await api.messages.unreadCount();
      setMsgUnread(unread_count);
    } catch {
      /* ignore */
    }
  }, []);

  // Removed polling interval - now using real-time socket updates
  useEffect(() => {
    if (user) {
      refreshMsgUnread();
    } else {
      setMsgUnread(0);
    }
  }, [user, refreshMsgUnread]);

  useEffect(() => {
    (async () => {
      if (localStorage.getItem('sh_token')) {
        await refreshUser();
      }
      setLoading(false);
    })();
  }, [refreshUser]);

  useEffect(() => {
    if (user) refreshUnread();
    else setUnreadCount(0);
  }, [user, refreshUnread]);

  // Keep the installed-app icon badge (dot/count) in sync with unread notifications.
  useEffect(() => {
    syncAppBadge(unreadCount);
  }, [unreadCount]);

  const login = useCallback(async (fn) => {
    const data = await fn();
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUnreadCount(0);
    setMsgUnread(0);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      unreadCount,
      msgUnread,
      refreshUnread,
      refreshMsgUnread,
      login,
      logout,
      refreshUser,
    }),
    [user, loading, unreadCount, msgUnread, refreshUnread, refreshMsgUnread, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
