'use strict';

/**
 * Item socket event handlers
 * Real-time updates for items (new posts, status changes, deletions)
 */
module.exports = (io) => {

  /**
   * Emit when new item is posted
   * Notifies all users browsing the marketplace
   */
  io.emitNewItem = (item) => {
    io.emit('item:new', item);
    console.log(`[socket] new item broadcast: ${item.id} - ${item.title}`);
  };

  /**
   * Emit when item is updated
   */
  io.emitItemUpdated = (item) => {
    io.emit('item:updated', item);
    console.log(`[socket] item updated broadcast: ${item.id}`);
  };

  /**
   * Emit when item status changes (e.g., marked as sold)
   */
  io.emitItemStatusChange = (itemId, status, sellerId) => {
    io.emit('item:status_change', { itemId, status, updatedAt: new Date() });
    
    // Notify seller specifically
    io.to(`user:${sellerId}`).emit('item:my_item_status_change', {
      itemId,
      status,
      updatedAt: new Date()
    });
    
    console.log(`[socket] item ${itemId} status changed to: ${status}`);
  };

  /**
   * Emit when item is deleted
   */
  io.emitItemDeleted = (itemId, sellerId) => {
    io.emit('item:deleted', { itemId, deletedAt: new Date() });
    
    // Notify seller specifically
    io.to(`user:${sellerId}`).emit('item:my_item_deleted', {
      itemId,
      deletedAt: new Date()
    });
    
    console.log(`[socket] item deleted: ${itemId}`);
  };

  /**
   * Emit when item is featured/promoted
   */
  io.emitItemFeatured = (item) => {
    io.emit('item:featured', item);
    io.to(`user:${item.seller_id}`).emit('item:my_item_featured', item);
    console.log(`[socket] item featured: ${item.id}`);
  };

  /**
   * Emit when someone favorites an item (notify seller)
   */
  io.emitItemFavorited = (itemId, sellerId, favoritedBy) => {
    io.to(`user:${sellerId}`).emit('item:favorited', {
      itemId,
      favoritedBy,
      timestamp: new Date()
    });
  };

  /**
   * Emit when admin approves/rejects an item
   */
  io.emitItemModerated = (itemId, status, sellerId) => {
    io.to(`user:${sellerId}`).emit('item:moderated', {
      itemId,
      status,
      timestamp: new Date()
    });
    console.log(`[socket] item ${itemId} moderated: ${status}`);
  };
};
