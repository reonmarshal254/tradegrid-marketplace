import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';

const SocketContext = createContext(null);

// Use relative path to go through Vite proxy (which proxies /socket.io to backend)
// In production, this will be the actual domain
const SOCKET_URL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : '';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);

  // Connect to socket when user logs in
  useEffect(() => {
    if (!user) {
      // Disconnect socket when user logs out
      if (socketRef.current) {
        console.log('[socket] disconnecting - user logged out');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('sh_token');
    if (!token) return;

    // Don't create a new connection if already connected
    if (socketRef.current?.connected) {
      console.log('[socket] already connected');
      return;
    }

    console.log('[socket] connecting to', SOCKET_URL || 'same origin (via proxy)');

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      extraHeaders:
        SOCKET_URL.includes('ngrok-free.app') ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
    });

    newSocket.on('connect', () => {
      console.log('[socket] connected:', newSocket.id);
      setConnected(true);
      setReconnecting(false);
      reconnectAttempts.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Server forced disconnect, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[socket] connection error:', error.message);
      setConnected(false);
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current > 3) {
        setReconnecting(true);
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[socket] reconnected after', attemptNumber, 'attempts');
      setReconnecting(false);
      reconnectAttempts.current = 0;
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[socket] reconnect attempt', attemptNumber);
      setReconnecting(true);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[socket] reconnection failed');
      setReconnecting(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('[socket] cleaning up');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Subscribe to a socket event
  const on = useCallback((event, handler) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, handler);
  }, []);

  // Unsubscribe from a socket event
  const off = useCallback((event, handler) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, handler);
  }, []);

  // Emit a socket event
  const emit = useCallback((event, data) => {
    if (!socketRef.current) {
      console.warn('[socket] cannot emit - not connected:', event);
      return;
    }
    socketRef.current.emit(event, data);
  }, []);

  // Join a room
  const joinRoom = useCallback((room) => {
    if (!socketRef.current) return;
    console.log('[socket] joining room:', room);
    socketRef.current.emit('join', room);
  }, []);

  // Leave a room
  const leaveRoom = useCallback((room) => {
    if (!socketRef.current) return;
    console.log('[socket] leaving room:', room);
    socketRef.current.emit('leave', room);
  }, []);

  const value = {
    socket,
    connected,
    reconnecting,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

// Custom hooks for specific socket events

/**
 * Hook to listen for new notifications
 */
export function useNotificationSocket(handler) {
  const { on, off, connected } = useSocket();

  useEffect(() => {
    if (!connected || !handler) return;

    const wrappedHandler = (notification) => {
      console.log('[socket] notification received:', notification);
      handler(notification);
    };

    on('notification:new', wrappedHandler);
    return () => off('notification:new', wrappedHandler);
  }, [on, off, connected, handler]);
}

/**
 * Hook to listen for new messages
 */
export function useMessageSocket(conversationId, handler) {
  const { on, off, emit, connected } = useSocket();

  useEffect(() => {
    if (!connected || !conversationId) return;

    // Join conversation room
    emit('message:join', conversationId);

    const messageHandler = (message) => {
      console.log('[socket] message received:', message);
      if (handler) handler(message);
    };

    on('message:new', messageHandler);

    return () => {
      off('message:new', messageHandler);
      emit('message:leave', conversationId);
    };
  }, [on, off, emit, connected, conversationId, handler]);
}

/**
 * Hook to listen for support chat messages
 */
export function useSupportSocket(chatId, handler) {
  const { on, off, emit, connected } = useSocket();

  useEffect(() => {
    if (!connected || !chatId) return;

    // Join support chat room
    emit('support:join', chatId);

    const messageHandler = (message) => {
      console.log('[socket] support message received:', message);
      if (handler) handler(message);
    };

    on('support:new_message', messageHandler);

    return () => {
      off('support:new_message', messageHandler);
      emit('support:leave', chatId);
    };
  }, [on, off, emit, connected, chatId, handler]);
}

/**
 * Hook to listen for item updates
 */
export function useItemSocket(handlers) {
  const { on, off, connected } = useSocket();

  useEffect(() => {
    if (!connected || !handlers) return;

    const { onNew, onUpdated, onStatusChange, onDeleted } = handlers;

    if (onNew) {
      const newHandler = (item) => {
        console.log('[socket] new item:', item);
        onNew(item);
      };
      on('item:new', newHandler);
    }

    if (onUpdated) {
      const updatedHandler = (item) => {
        console.log('[socket] item updated:', item);
        onUpdated(item);
      };
      on('item:updated', updatedHandler);
    }

    if (onStatusChange) {
      const statusHandler = (data) => {
        console.log('[socket] item status change:', data);
        onStatusChange(data);
      };
      on('item:status_change', statusHandler);
    }

    if (onDeleted) {
      const deletedHandler = (data) => {
        console.log('[socket] item deleted:', data);
        onDeleted(data);
      };
      on('item:deleted', deletedHandler);
    }

    return () => {
      if (onNew) off('item:new', onNew);
      if (onUpdated) off('item:updated', onUpdated);
      if (onStatusChange) off('item:status_change', onStatusChange);
      if (onDeleted) off('item:deleted', onDeleted);
    };
  }, [on, off, connected, handlers]);
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(roomId, roomType = 'message') {
  const { emit, connected } = useSocket();

  const sendTyping = useCallback((isTyping) => {
    if (!connected || !roomId) return;
    
    const event = roomType === 'support' ? 'support:typing' : 'message:typing';
    const data = roomType === 'support' 
      ? { chatId: roomId, isTyping }
      : { conversationId: roomId, isTyping };
    
    emit(event, data);
  }, [emit, connected, roomId, roomType]);

  return sendTyping;
}
