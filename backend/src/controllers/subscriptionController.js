const asyncHandler = require('../utils/asyncHandler');
const { query } = require('../config/db');
const crypto = require('crypto');
const https = require('https');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_secret_key';

// Initialize payment
const initializePayment = asyncHandler(async (req, res) => {
  const { plan, amount } = req.body;
  const user = req.user;

  // Fetch plan details from database
  const planResult = await query(
    'SELECT plan, price FROM subscription_settings WHERE plan = $1',
    [plan]
  );

  if (!planResult.rows.length) {
    return res.status(400).json({ error: 'Invalid subscription plan' });
  }

  const planData = planResult.rows[0];
  const expectedAmount = Number(planData.price) * 100; // Convert to kobo

  if (expectedAmount !== amount) {
    return res.status(400).json({ 
      error: 'Amount mismatch',
      expected: expectedAmount,
      received: amount
    });
  }

  // Generate unique reference
  const reference = `sub_${user.id}_${plan}_${Date.now()}`;

  const paymentData = JSON.stringify({
    email: user.email,
    amount: amount,
    reference: reference,
    currency: 'KES',
    callback_url: `${process.env.FRONTEND_URL}/subscription/callback`,
    metadata: {
      user_id: user.id,
      plan: plan,
      custom_fields: [
        {
          display_name: "Subscription Plan",
          variable_name: "subscription_plan",
          value: plan.charAt(0).toUpperCase() + plan.slice(1)
        }
      ]
    }
  });

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/transaction/initialize',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(paymentData)
    }
  };

  const paystackReq = https.request(options, (paystackRes) => {
    let data = '';
    paystackRes.on('data', (chunk) => {
      data += chunk;
    });
    paystackRes.on('end', async () => {
      try {
        const response = JSON.parse(data);
        
        if (response.status) {
          // Store payment record
          await query(
            `INSERT INTO payment_transactions (
              user_id, reference, amount, plan, status, created_at
            ) VALUES ($1, $2, $3, $4, 'pending', NOW())`,
            [user.id, reference, amount, plan]
          );

          res.json({
            status: true,
            reference: reference,
            authorization_url: response.data.authorization_url,
            access_code: response.data.access_code
          });
        } else {
          res.status(400).json({ error: response.message });
        }
      } catch (error) {
        console.error('Paystack response error:', error);
        res.status(500).json({ error: 'Payment initialization failed' });
      }
    });
  });

  paystackReq.on('error', (error) => {
    console.error('Paystack request error:', error);
    res.status(500).json({ error: 'Payment service unavailable' });
  });

  paystackReq.write(paymentData);
  paystackReq.end();
});

// Verify payment
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body;
  
  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/verify/${reference}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
    }
  };

  const paystackReq = https.request(options, (paystackRes) => {
    let data = '';
    paystackRes.on('data', (chunk) => {
      data += chunk;
    });
    paystackRes.on('end', async () => {
      try {
        const response = JSON.parse(data);
        
        if (response.status && response.data.status === 'success') {
          const { customer, metadata, amount } = response.data;
          
          console.log('✅ Payment verification - Paystack response:', JSON.stringify(response.data, null, 2));
          console.log('📦 Metadata received:', JSON.stringify(metadata, null, 2));
          
          // Extract plan - try metadata.plan first, then custom_fields
          let plan = metadata?.plan;
          if (!plan && metadata?.custom_fields) {
            const planField = metadata.custom_fields.find(f => f.variable_name === 'subscription_plan' || f.variable_name === 'plan');
            if (planField) {
              plan = planField.value;
            }
          }
          
          // Ensure plan is lowercase
          if (plan) {
            plan = plan.toLowerCase();
          }
          
          console.log('🎯 Extracted plan:', plan);
          
          if (!plan) {
            console.error('❌ Payment verification: No plan found in metadata', metadata);
            return res.status(400).json({ error: 'Invalid payment data - plan not found' });
          }
          
          // Validate plan exists in database
          const planCheck = await query(
            'SELECT plan FROM subscription_settings WHERE plan = $1',
            [plan]
          );
          
          if (!planCheck.rows.length) {
            console.error('Payment verification: Plan not found in database', plan);
            return res.status(400).json({ error: 'Invalid plan in payment data' });
          }

          // Get user_id from metadata
          const userId = metadata?.user_id;
          if (!userId) {
            console.error('Payment verification: No user_id in metadata', metadata);
            return res.status(400).json({ error: 'Invalid payment data - user not found' });
          }

          // Update payment record
          await query(
            `UPDATE payment_transactions 
             SET status = 'completed', verified_at = NOW() 
             WHERE reference = $1`,
            [reference]
          );

          // Calculate expiry date (1 month from now)
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          // Update user subscription
          const userUpdateResult = await query(
            `UPDATE users 
             SET subscription_plan = $1, 
                 subscription_expires_at = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING subscription_plan, subscription_expires_at`,
            [plan, expiresAt.toISOString(), userId]
          );

          if (!userUpdateResult.rows.length) {
            console.error('Payment verification: User not found or update failed', userId);
            return res.status(404).json({ error: 'User not found' });
          }

          console.log(`✅ Payment verified - User ${userId} upgraded to ${plan}`);

          // Create subscription record
          await query(
            `INSERT INTO subscriptions (
              user_id, plan, amount, reference, status, expires_at, created_at
            ) VALUES ($1, $2, $3, $4, 'active', $5, NOW())`,
            [userId, plan, amount / 100, reference, expiresAt.toISOString()] // Convert amount from kobo to KES
          );

          res.json({
            status: true,
            message: 'Payment verified successfully',
            plan: plan,
            expires_at: expiresAt.toISOString()
          });
        } else {
          console.error('Payment verification failed:', response);
          res.status(400).json({ 
            error: 'Payment verification failed',
            details: response.data?.gateway_response || 'Unknown error'
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
      }
    });
  });

  paystackReq.on('error', (error) => {
    console.error('Paystack verification error:', error);
    res.status(500).json({ error: 'Payment service unavailable' });
  });

  paystackReq.end();
});

// Cancel subscription (downgrade to free)
const cancelSubscription = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    // Update user to free plan
    await query(
      `UPDATE users 
       SET subscription_plan = 'free', 
           subscription_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // Mark current subscription as cancelled
    await query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    res.json({
      status: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get subscription status
const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const subscriptions = await query(
    `SELECT * FROM subscriptions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT 5`,
    [userId]
  );

  const payments = await query(
    `SELECT * FROM payment_transactions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT 10`,
    [userId]
  );

  res.json({
    subscriptions: subscriptions.rows,
    payments: payments.rows,
    current_plan: req.user.subscription_plan || 'free',
    expires_at: req.user.subscription_expires_at
  });
});

// Webhook handler for Paystack events
const webhookHandler = asyncHandler(async (req, res) => {
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
  
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  switch (event.event) {
    case 'charge.success':
      // Handle successful payment
      const { reference, metadata } = event.data;
      
      if (metadata && metadata.user_id) {
        try {
          await query(
            `UPDATE payment_transactions 
             SET status = 'completed', webhook_verified_at = NOW() 
             WHERE reference = $1`,
            [reference]
          );
          
          console.log(`Payment webhook processed: ${reference}`);
        } catch (error) {
          console.error('Webhook processing error:', error);
        }
      }
      break;

    case 'subscription.create':
    case 'subscription.disable':
      // Handle subscription events
      console.log('Subscription event:', event.event, event.data);
      break;

    default:
      console.log('Unhandled webhook event:', event.event);
  }

  res.status(200).json({ status: 'success' });
});

module.exports = {
  initializePayment,
  verifyPayment,
  cancelSubscription,
  getSubscriptionStatus,
  webhookHandler
};

// Request refund (within 3 days of subscription)
const requestRefund = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { reason } = req.body;

  // Get active subscription
  const subResult = await query(
    `SELECT id, amount, created_at, reference, plan, refund_requested_at 
     FROM subscriptions 
     WHERE user_id = $1 AND status = 'active' 
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (!subResult.rows.length) {
    return res.status(404).json({ error: 'No active subscription found' });
  }

  const subscription = subResult.rows[0];
  const daysSinceSubscription = Math.floor(
    (Date.now() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceSubscription > 3) {
    return res.status(400).json({ 
      error: 'Refund requests are only available within 3 days of subscription',
      days_since: daysSinceSubscription
    });
  }

  // Check if refund already requested
  if (subscription.refund_requested_at) {
    return res.status(400).json({ error: 'Refund already requested for this subscription' });
  }

  // Update subscription with refund request
  await query(
    `UPDATE subscriptions 
     SET refund_requested_at = NOW(),
         refund_status = 'pending',
         refund_amount = amount,
         refund_reason = $1
     WHERE id = $2`,
    [reason || 'User requested refund', subscription.id]
  );

  res.json({ 
    message: 'Refund request submitted successfully. Admin will review it shortly.',
    subscription_id: subscription.id,
    amount: Number(subscription.amount)
  });
});

// Get refund requests (admin only)
const getRefundRequests = asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT 
      s.id,
      s.user_id,
      s.plan,
      s.amount,
      s.reference,
      s.created_at,
      s.refund_requested_at,
      s.refund_status,
      s.refund_amount,
      s.refund_reason,
      u.name as user_name,
      u.email as user_email
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE s.refund_status IN ('pending', 'approved', 'rejected')
    ORDER BY s.refund_requested_at DESC
  `);

  res.json({ refund_requests: result.rows });
});

// Approve/reject refund (admin only)
const processRefund = asyncHandler(async (req, res) => {
  const { subscription_id } = req.params;
  const { action, admin_note } = req.body; // action: 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use approve or reject' });
  }

  const subResult = await query(
    `SELECT * FROM subscriptions WHERE id = $1 AND refund_status = 'pending'`,
    [subscription_id]
  );

  if (!subResult.rows.length) {
    return res.status(404).json({ error: 'Refund request not found or already processed' });
  }

  const subscription = subResult.rows[0];

  if (action === 'approve') {
    // Initiate Paystack refund
    const refundData = JSON.stringify({
      transaction: subscription.reference,
      amount: Math.floor(Number(subscription.amount) * 100) // Convert to kobo
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/refund',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(refundData)
      }
    };

    const paystackReq = https.request(options, (paystackRes) => {
      let data = '';
      paystackRes.on('data', (chunk) => {
        data += chunk;
      });
      paystackRes.on('end', async () => {
        try {
          const response = JSON.parse(data);
          
          if (response.status) {
            // Update subscription
            await query(
              `UPDATE subscriptions 
               SET refund_status = 'approved',
                   refund_approved_at = NOW(),
                   status = 'refunded'
               WHERE id = $1`,
              [subscription_id]
            );

            // Update user subscription
            await query(
              `UPDATE users 
               SET subscription_plan = 'free',
                   subscription_expires_at = NULL
               WHERE id = $1`,
              [subscription.user_id]
            );

            res.json({ 
              message: 'Refund approved and processed successfully',
              refund_data: response.data
            });
          } else {
            res.status(400).json({ 
              error: 'Paystack refund failed',
              details: response.message
            });
          }
        } catch (error) {
          res.status(500).json({ error: 'Failed to process refund response' });
        }
      });
    });

    paystackReq.on('error', (error) => {
      res.status(500).json({ error: 'Failed to connect to Paystack' });
    });

    paystackReq.write(refundData);
    paystackReq.end();
  } else {
    // Reject refund
    await query(
      `UPDATE subscriptions 
       SET refund_status = 'rejected'
       WHERE id = $1`,
      [subscription_id]
    );

    res.json({ message: 'Refund request rejected' });
  }
});

module.exports = {
  initializePayment,
  verifyPayment,
  cancelSubscription,
  getSubscriptionStatus,
  webhookHandler,
  requestRefund,
  getRefundRequests,
  processRefund
};
