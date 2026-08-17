'use strict';
const router = require('express').Router();
const controller = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { uploadApk } = require('../middleware/upload');

router.use(requireAuth, requireAdmin);

router.get('/stats', asyncHandler(controller.getStats));
router.get('/activity', asyncHandler(controller.getActivity));
router.get('/reports', asyncHandler(controller.listReports));
router.patch('/reports/:id', asyncHandler(controller.resolveReport));
router.get('/insights', asyncHandler(controller.getInsights));
router.get('/users', asyncHandler(controller.listUsers));
router.patch('/users/:id', asyncHandler(controller.updateUser));
router.delete('/users/:id', asyncHandler(controller.deleteUser));
router.get('/items', asyncHandler(controller.listItems));
router.patch('/items/:id', asyncHandler(controller.updateItem));
router.delete('/items/:id', asyncHandler(controller.deleteItem));
router.get('/support', asyncHandler(controller.listSupportTickets));
router.post('/support/:id/reply', asyncHandler(controller.replySupport));
router.patch('/support/:id/close', asyncHandler(controller.closeSupportTicket));

// Advertisement management routes
router.get('/advertisements', asyncHandler(controller.listAdvertisements));
router.patch('/advertisements/:id', asyncHandler(controller.updateAdvertisement));
router.delete('/advertisements/:id', asyncHandler(controller.deleteAdvertisement));

// App version management
router.get('/app-versions', asyncHandler(controller.listAppVersions));
router.post('/app-versions', uploadApk, asyncHandler(controller.createAppVersion));
router.delete('/app-versions/:id', asyncHandler(controller.deleteAppVersion));

module.exports = router;
