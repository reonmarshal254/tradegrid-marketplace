const express = require('express');
const {
  initializePayment,
  verifyPayment,
  cancelSubscription,
  getSubscriptionStatus,
  webhookHandler,
  requestRefund,
  getRefundRequests,
  processRefund
} = require('../controllers/subscriptionController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.post('/initialize-payment', requireAuth, initializePayment);
router.post('/verify-payment', requireAuth, verifyPayment);
router.post('/cancel', requireAuth, cancelSubscription);
router.get('/status', requireAuth, getSubscriptionStatus);
router.post('/request-refund', requireAuth, requestRefund);

// Admin routes
router.get('/refund-requests', requireAuth, requireAdmin, getRefundRequests);
router.post('/process-refund/:subscription_id', requireAuth, requireAdmin, processRefund);

// Webhook (no auth needed)
router.post('/webhook', webhookHandler);

module.exports = router;