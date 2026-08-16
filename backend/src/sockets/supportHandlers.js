'use strict';

/**
 * Support chat socket event handlers
 * Real-time support chat between users and admins
 */
module.exports = (io) => {
  
  io.on('connection', (socket) => {
    
    // Join a support chat room
    socket.on('support:join', (chatId) => {
      const roomId = `support:${chatId}`;
      socket.join(roomId);
      console.log(`[socket] ${socket.user.role} ${socket.user.id} joined ${roomId}`);
      
      // Notify other party that someone joined
      socket.to(roomId).emit('support:user_joined', {
        userId: socket.user.id,
        userName: socket.user.name,
        userRole: socket.user.role
      });
    });

    // Leave a support chat room
    socket.on('support:leave', (chatId) => {
      const roomId = `support:${chatId}`;
      socket.leave(roomId);
      console.log(`[socket] ${socket.user.role} ${socket.user.id} left ${roomId}`);
    });

    // Admin/User is typing indicator
    socket.on('support:typing', ({ chatId, isTyping }) => {
      socket.to(`support:${chatId}`).emit('support:user_typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        role: socket.user.role,
        isTyping
      });
    });

    // Mark support messages as read
    socket.on('support:mark_read', ({ chatId }) => {
      socket.to(`support:${chatId}`).emit('support:marked_read', {
        chatId,
        readBy: socket.user.id,
        readAt: new Date()
      });
    });
  });

  /**
   * Emit when new support message is sent
   * Called from supportChatController.js
   */
  io.emitSupportMessage = (message, chatId, recipientId = null) => {
    // Send to support chat room
    io.to(`support:${chatId}`).emit('support:new_message', message);
    
    // If recipient is specified, send notification to their personal room
    if (recipientId) {
      io.to(`user:${recipientId}`).emit('support:new_unread', {
        chatId,
        message
      });
    }
    
    // Notify all admins about new support message from users
    if (message.sender_role !== 'admin') {
      io.to('admin').emit('support:new_user_message', {
        chatId,
        message
      });
    }
    
    console.log(`[socket] support message in chat ${chatId} from ${message.sender_role}`);
  };

  /**
   * Emit when new support chat is created (notify admins)
   */
  io.emitNewSupportChat = (chat) => {
    io.to('admin').emit('support:new_chat', chat);
    console.log(`[socket] new support chat created: ${chat.id} by user ${chat.user_id}`);
  };

  /**
   * Emit when support chat status changes (open/closed)
   */
  io.emitSupportChatStatusChange = (chatId, status, userId) => {
    io.to(`support:${chatId}`).emit('support:status_change', {
      chatId,
      status,
      updatedAt: new Date()
    });
    
    // Notify user
    io.to(`user:${userId}`).emit('support:my_chat_status_change', {
      chatId,
      status,
      updatedAt: new Date()
    });
    
    // Notify admins
    io.to('admin').emit('support:chat_status_change', {
      chatId,
      status,
      userId,
      updatedAt: new Date()
    });
    
    console.log(`[socket] support chat ${chatId} status: ${status}`);
  };

  /**
   * Emit unread support message count to admins
   */
  io.emitAdminSupportUnreadCount = (count) => {
    io.to('admin').emit('support:unread_count', count);
  };
};
