const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// Get all subscription settings (public endpoint for displaying prices)
exports.getPublicSettings = asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT 
      plan, price, max_listings, max_featured_listings, 
      max_ads, can_create_ads
    FROM subscription_settings
    ORDER BY 
      CASE plan
        WHEN 'free' THEN 1
        WHEN 'personal' THEN 2
        WHEN 'recommended' THEN 3
        WHEN 'enterprise' THEN 4
      END
  `);

  res.json({ plans: result.rows });
});

// Get all subscription settings (admin only - includes audit info)
exports.getSettings = asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT 
      id, plan, price, max_listings, max_featured_listings, 
      max_ads, can_create_ads, updated_at
    FROM subscription_settings
    ORDER BY 
      CASE plan
        WHEN 'free' THEN 1
        WHEN 'personal' THEN 2
        WHEN 'recommended' THEN 3
        WHEN 'enterprise' THEN 4
      END
  `);

  res.json({ settings: result.rows });
});

// Update subscription settings for a specific plan
exports.updateSettings = asyncHandler(async (req, res) => {
  const { plan } = req.params;
  const { price, max_listings, max_featured_listings, max_ads, can_create_ads } = req.body;
  const userId = req.user.id;

  // Validate inputs
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({ message: 'Price must be a non-negative number' });
  }

  if (max_listings !== undefined && (!Number.isInteger(max_listings) || max_listings < 0)) {
    return res.status(400).json({ message: 'Max listings must be a non-negative integer' });
  }

  if (max_featured_listings !== undefined && (!Number.isInteger(max_featured_listings) || max_featured_listings < 0)) {
    return res.status(400).json({ message: 'Max featured listings must be a non-negative integer' });
  }

  if (max_ads !== undefined && (!Number.isInteger(max_ads) || max_ads < 0)) {
    return res.status(400).json({ message: 'Max ads must be a non-negative integer' });
  }

  // Build update query dynamically
  const updates = [];
  const values = [];
  let valueIndex = 1;

  if (price !== undefined) {
    updates.push(`price = $${valueIndex++}`);
    values.push(price);
  }
  if (max_listings !== undefined) {
    updates.push(`max_listings = $${valueIndex++}`);
    values.push(max_listings);
  }
  if (max_featured_listings !== undefined) {
    updates.push(`max_featured_listings = $${valueIndex++}`);
    values.push(max_featured_listings);
  }
  if (max_ads !== undefined) {
    updates.push(`max_ads = $${valueIndex++}`);
    values.push(max_ads);
  }
  if (can_create_ads !== undefined) {
    updates.push(`can_create_ads = $${valueIndex++}`);
    values.push(can_create_ads);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  updates.push(`updated_by = $${valueIndex++}`);
  values.push(userId);

  values.push(plan);

  const result = await query(
    `UPDATE subscription_settings 
     SET ${updates.join(', ')}
     WHERE plan = $${valueIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  res.json({ 
    message: 'Settings updated successfully',
    settings: result.rows[0] 
  });
});

// Get settings for a specific plan (used by other controllers)
exports.getPlanSettings = async (planName) => {
  const result = await query(
    `SELECT * FROM subscription_settings WHERE plan = $1`,
    [planName || 'free']
  );
  
  // Return default if not found
  if (result.rows.length === 0) {
    return {
      plan: 'free',
      price: 0,
      max_listings: 3,
      max_featured_listings: 0,
      max_ads: 0,
      can_create_ads: false
    };
  }
  
  return result.rows[0];
};
