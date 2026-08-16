'use strict';

/**
 * Message socket event handlers
 * Real-time chat messaging between users
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    
    // Join a conversation room
    socket.on('message:join', (conversationId) => {
      const roomId = `conversation:${conversationId}`;
      socket.join(roomId);
      console.log(`[socket] user ${socket.user.id} joined ${roomId}`);
    });

    // Leave a conversation room
    socket.on('message:leave', (conversationId) => {
      const roomId = `conversation:${conversationId}`;
      socket.leave(roomId);
      console.log(`[socket] user ${socket.user.id} left ${roomId}`);
    });

    // User is typing indicator
    socket.on('message:typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('message:user_typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        isTyping
      });
    });

    // Mark message as read
    socket.on('message:mark_read', ({ messageId }) => {
      // Emit to sender that their message was read
      io.emit('message:read', { messageId, readAt: new Date() });
    });
  });

  /**
   * Emit when new message is sent
   * Called from messageController.js
   */
  io.emitNewMessage = (message, conversationId, recipientId) => {
    // Send to conversation room
    io.to(`conversation:${conversationId}`).emit('message:new', message);
    
    // Send to recipient's personal room (for notification badge)
    io.to(`user:${recipientId}`).emit('message:new_unread', {
      conversationId,
      message
    });
  };

  /**
   * Emit when messages are marked as read
   */
  io.emitMessagesRead = (conversationId, readerId) => {
    io.to(`conversation:${conversationId}`).emit('message:marked_read', {
      conversationId,
      readerId,
      readAt: new Date()
    });
  };
};
