'use strict';
const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const {
  listActive,
  listAll,
  getOne,
  create,
  update,
  deleteAnnouncement,
  toggleEnabled
} = require('../controllers/announcementController');

const router = express.Router();

// Public route - get active announcements
router.get('/active', asyncHandler(listActive));

// Admin routes
router.get('/', requireAuth, requireAdmin, asyncHandler(listAll));
router.get('/:id', requireAuth, requireAdmin, asyncHandler(getOne));
router.post('/', requireAuth, requireAdmin, asyncHandler(create));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(update));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteAnnouncement));
router.patch('/:id/toggle', requireAuth, requireAdmin, asyncHandler(toggleEnabled));

module.exports = router;
