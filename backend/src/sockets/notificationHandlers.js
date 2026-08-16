'use strict';

/**
 * Notification socket event handlers
 * Real-time notifications for users
 */
module.exports = (io) => {
  
  /**
   * Emit new notification to specific user
   * Called from controllers when creating notifications
   */
  io.emitNotification = (userId, notification) => {
    io.to(`user:${userId}`).emit('notification:new', notification);
    console.log(`[socket] notification sent to user ${userId}:`, notification.type);
  };

  /**
   * Emit notification to multiple users
   */
  io.emitNotificationToUsers = (userIds, notification) => {
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('notification:new', notification);
    });
    console.log(`[socket] notification sent to ${userIds.length} users:`, notification.type);
  };

  /**
   * Emit notification to all users (e.g., admin announcements)
   */
  io.emitNotificationToAll = (notification) => {
    io.emit('notification:new', notification);
    console.log(`[socket] broadcast notification:`, notification.type);
  };

  /**
   * Emit when notification is marked as read
   */
  io.emitNotificationRead = (userId, notificationId) => {
    io.to(`user:${userId}`).emit('notification:read', {
      notificationId,
      readAt: new Date()
    });
  };

  /**
   * Emit when all notifications are marked as read
   */
  io.emitAllNotificationsRead = (userId) => {
    io.to(`user:${userId}`).emit('notification:all_read', {
      readAt: new Date()
    });
  };

  /**
   * Emit unread count update
   */
  io.emitUnreadCount = (userId, count) => {
    io.to(`user:${userId}`).emit('notification:unread_count', count);
  };
};
