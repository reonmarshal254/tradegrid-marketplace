const { query } = require('../config/db');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary');
const asyncHandler = require('../utils/asyncHandler');

// Subscribers and verified users don't see ads
async function userIsAdFree(userId) {
  const { rows } = await query(
    `SELECT subscription_plan, subscription_expires_at, is_verified FROM users WHERE id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user) return false;
  if (user.is_verified) return true;
  if (user.subscription_plan === 'free') return false;
  if (user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date()) return false;
  return true;
}

// Create new advertisement
exports.create = asyncHandler(async (req, res) => {
  const { title, description, link_url, whatsapp_number, phone_number, email, target_audience = 'all', budget_amount } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  const userPlan = req.user.subscription_plan || 'free';
  
  // Admins can always create ads, bypass subscription check
  if (userRole !== 'admin') {
    // Get subscription settings from database for regular users
    const settingsResult = await query(
      `SELECT can_create_ads, max_ads FROM subscription_settings WHERE plan = $1`,
      [userPlan]
    );
    const settings = settingsResult.rows[0] || { can_create_ads: false, max_ads: 0 };
    
    // Check subscription access
    if (!settings.can_create_ads) {
      return res.status(403).json({ 
        message: 'Advertisement creation requires Recommended or Enterprise subscription plan',
        current_plan: userPlan,
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    // Check if subscription is expired
    if (req.user.subscription_expires_at && new Date(req.user.subscription_expires_at) < new Date()) {
      return res.status(403).json({ 
        message: 'Your subscription has expired. Please renew to create advertisements.',
        expires_at: req.user.subscription_expires_at,
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }
    
    const maxAds = settings.max_ads;
    
    // Check current active ads count (999999 is treated as unlimited)
    if (maxAds < 999999) {
      const countResult = await query(
        `SELECT COUNT(*)::int as count FROM advertisements 
         WHERE user_id = $1 AND status IN ('pending', 'approved')`,
        [userId]
      );
      const currentAds = countResult.rows[0].count;
      
      if (currentAds >= maxAds) {
        return res.status(403).json({ 
          message: `You've reached the maximum of ${maxAds} active advertisements for your ${userPlan} plan. Upgrade to Enterprise for unlimited ads.`,
          current_plan: userPlan,
          current_ads: currentAds,
          max_ads: maxAds,
          code: 'AD_LIMIT_REACHED'
        });
      }
    }
  }
  
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  let bannerUrl = null;
  let bannerPublicId = null;
  let videoUrl = null;
  let videoPublicId = null;

  try {
    // Upload banner image if provided
    if (req.files?.banner) {
      const bannerResult = await uploadToCloudinary(req.files.banner[0].buffer, {
        folder: 'tradegrid/advertisements',
        resource_type: 'image'
      });
      bannerUrl = bannerResult.secure_url;
      bannerPublicId = bannerResult.public_id;
    }

    // Upload video if provided
    if (req.files?.video) {
      const videoResult = await uploadToCloudinary(req.files.video[0].buffer, {
        folder: 'tradegrid/advertisements',
        resource_type: 'video'
      });
      videoUrl = videoResult.secure_url;
      videoPublicId = videoResult.public_id;
    }

    if (!bannerUrl && !videoUrl) {
      return res.status(400).json({ message: 'Banner image or video is required' });
    }

    const result = await query(
      `INSERT INTO advertisements 
       (user_id, title, description, banner_url, banner_public_id, video_url, video_public_id, 
        link_url, whatsapp_number, phone_number, email, target_audience, budget_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
       RETURNING *`,
      [userId, title.trim(), description.trim(), bannerUrl, bannerPublicId, 
       videoUrl, videoPublicId, link_url || null, whatsapp_number || null, 
       phone_number || null, email || null, target_audience, budget_amount || null]
    );

    res.status(201).json({
      advertisement: result.rows[0],
      message: 'Advertisement submitted for review'
    });
  } catch (error) {
    // Clean up uploaded files on error
    if (bannerPublicId) await deleteFromCloudinary(bannerPublicId);
    if (videoPublicId) await deleteFromCloudinary(videoPublicId, 'video');
    throw error;
  }
});

// Get user's advertisements
exports.getUserAds = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT a.*, 
            COUNT(*) OVER() as total_count
     FROM advertisements a
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;

  res.json({
    advertisements: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(totalCount),
      pages: Math.ceil(totalCount / limit)
    }
  });
});

// Get active advertisements for display in items feed (image-only cards)
exports.getActiveAds = asyncHandler(async (req, res) => {
  const { target_audience = 'all', limit = 5 } = req.query;

  // Subscribers and verified users don't see ads
  if (req.user?.id && (await userIsAdFree(req.user.id))) {
    return res.json({ advertisements: [] });
  }
  
  const result = await query(
    `SELECT a.id, a.title, a.description, a.banner_url, a.video_url, a.link_url,
            a.whatsapp_number, a.phone_number, a.email,
            u.name AS advertiser_name, u.avatar_url AS advertiser_avatar
     FROM advertisements a
     JOIN users u ON u.id = a.user_id
     WHERE a.status = 'approved'
       AND a.video_url IS NULL
       AND (a.target_audience = $1 OR a.target_audience = 'all')
       AND (a.starts_at IS NULL OR a.starts_at <= now())
       AND (a.expires_at IS NULL OR a.expires_at > now())
     ORDER BY random()
     LIMIT $2`,
    [target_audience, limit]
  );

  res.json({ advertisements: result.rows });
});

// Get approved advertisements (alias for getActiveAds, image-only cards)
exports.getApprovedAds = asyncHandler(async (req, res) => {
  const { target_audience = 'all', limit = 6 } = req.query;

  // Subscribers and verified users don't see ads
  if (req.user?.id && (await userIsAdFree(req.user.id))) {
    return res.json({ advertisements: [] });
  }
  
  const result = await query(
    `SELECT a.id, a.title, a.description, a.banner_url, a.video_url, a.link_url,
            a.whatsapp_number, a.phone_number, a.email,
            u.name AS advertiser_name, u.avatar_url AS advertiser_avatar
     FROM advertisements a
     JOIN users u ON u.id = a.user_id
     WHERE a.status = 'approved'
       AND a.video_url IS NULL
       AND (a.target_audience = $1 OR a.target_audience = 'all')
       AND (a.starts_at IS NULL OR a.starts_at <= now())
       AND (a.expires_at IS NULL OR a.expires_at > now())
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [target_audience, limit]
  );

  res.json({ advertisements: result.rows });
});

// Get the full list of approved video ads for the client-side rotation schedule
exports.getFeaturedVideoAd = asyncHandler(async (req, res) => {
  // Subscribers and verified users don't see video ads
  if (req.user?.id && (await userIsAdFree(req.user.id))) {
    return res.json({ advertisements: [], total: 0 });
  }

  const { target_audience = 'all' } = req.query;

  const result = await query(
    `SELECT a.id, a.title, a.description, a.banner_url, a.video_url, a.link_url,
            a.whatsapp_number, a.phone_number, a.email,
            a.views_count, a.clicks_count,
            u.name AS advertiser_name, u.avatar_url AS advertiser_avatar
     FROM advertisements a
     JOIN users u ON u.id = a.user_id
     WHERE a.status = 'approved'
       AND a.video_url IS NOT NULL
       AND (a.target_audience = $1 OR a.target_audience = 'all')
       AND (a.starts_at IS NULL OR a.starts_at <= now())
       AND (a.expires_at IS NULL OR a.expires_at > now())
     ORDER BY a.id ASC`,
    [target_audience]
  );

  res.json({ advertisements: result.rows, total: result.rows.length });
});

// Record advertisement view
exports.recordView = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Check for existing view today (prevent duplicates in app code)
    if (userId) {
      const existingView = await query(
        `SELECT id FROM advertisement_views 
         WHERE ad_id = $1 AND user_id = $2 AND viewed_at::date = CURRENT_DATE`,
        [id, userId]
      );
      
      if (existingView.rows.length > 0) {
        return res.json({ message: 'View already recorded today' });
      }
    }

    // Insert view record
    await query(
      `INSERT INTO advertisement_views (ad_id, user_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, ipAddress, userAgent]
    );

    // Update views count
    await query(
      `UPDATE advertisements 
       SET views_count = views_count + 1
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'View recorded' });
  } catch (error) {
    // Don't fail the request if view recording fails
    console.error('Failed to record ad view:', error);
    res.json({ message: 'View recording failed' });
  }
});

// Record advertisement click
exports.recordClick = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Insert click record
    await query(
      `INSERT INTO advertisement_clicks (ad_id, user_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, ipAddress, userAgent]
    );

    // Update clicks count
    await query(
      `UPDATE advertisements 
       SET clicks_count = clicks_count + 1
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Click recorded' });
  } catch (error) {
    console.error('Failed to record ad click:', error);
    res.status(500).json({ message: 'Click recording failed' });
  }
});

// Get advertisement analytics
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const adResult = await query(
    'SELECT * FROM advertisements WHERE id = $1 AND user_id = $2',
    [id, userId]
  );

  if (adResult.rows.length === 0) {
    return res.status(404).json({ message: 'Advertisement not found' });
  }

  const advertisement = adResult.rows[0];

  // Get daily views and clicks for the last 30 days
  const analyticsResult = await query(
    `SELECT 
       DATE(viewed_at) as date,
       COUNT(DISTINCT av.id) as views,
       COUNT(DISTINCT ac.id) as clicks
     FROM generate_series(
       CURRENT_DATE - INTERVAL '29 days',
       CURRENT_DATE,
       INTERVAL '1 day'
     ) AS dates(date)
     LEFT JOIN advertisement_views av ON DATE(av.viewed_at) = dates.date AND av.ad_id = $1
     LEFT JOIN advertisement_clicks ac ON DATE(ac.clicked_at) = dates.date AND ac.ad_id = $1
     GROUP BY dates.date
     ORDER BY dates.date`,
    [id]
  );

  res.json({
    advertisement,
    analytics: analyticsResult.rows
  });
});