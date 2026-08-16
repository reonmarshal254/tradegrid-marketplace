const asyncHandler = require('../utils/asyncHandler');
const { query } = require('../config/db');

// Get user overview analytics
const getOverview = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30' } = req.query; // days

  const periodClause = period === 'all' ? '' : `AND created_at >= NOW() - INTERVAL '${period} days'`;

  try {
    const [
      itemStats,
      adStats,
      engagementStats,
      revenueStats
    ] = await Promise.all([
      // Item statistics
      query(
        `SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE status = 'active') as active_items,
          COUNT(*) FILTER (WHERE is_featured = true) as featured_items,
          SUM(views_count) as total_views,
          AVG(views_count) as avg_views_per_item
         FROM items 
         WHERE user_id = $1 ${periodClause}`,
        [userId]
      ),

      // Advertisement statistics
      query(
        `SELECT 
          COUNT(*) as total_ads,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_ads,
          SUM(views_count) as total_ad_views,
          SUM(clicks_count) as total_ad_clicks
         FROM advertisements 
         WHERE user_id = $1 ${periodClause}`,
        [userId]
      ),

      // Engagement statistics
      query(
        `SELECT 
          COUNT(DISTINCT r.id) as total_reactions,
          COUNT(DISTINCT m.id) as total_messages_received
         FROM items i
         LEFT JOIN item_reactions r ON i.id = r.item_id ${periodClause.replace('created_at', 'r.created_at')}
         LEFT JOIN messages m ON i.id = m.item_id AND m.receiver_id = i.user_id ${periodClause.replace('created_at', 'm.created_at')}
         WHERE i.user_id = $1`,
        [userId]
      ),

      // Revenue statistics (if applicable)
      query(
        `SELECT 
          COUNT(*) as total_transactions,
          SUM(amount) as total_spent
         FROM payment_transactions 
         WHERE user_id = $1 AND status = 'completed' ${periodClause}`,
        [userId]
      )
    ]);

    const overview = {
      items: itemStats.rows[0],
      advertisements: adStats.rows[0],
      engagement: engagementStats.rows[0],
      revenue: revenueStats.rows[0],
      period: period
    };

    // Convert string numbers to integers
    Object.keys(overview).forEach(key => {
      if (typeof overview[key] === 'object' && overview[key] !== null) {
        Object.keys(overview[key]).forEach(subKey => {
          if (overview[key][subKey] !== null && !isNaN(overview[key][subKey])) {
            overview[key][subKey] = parseInt(overview[key][subKey]) || 0;
          }
        });
      }
    });

    res.json({ overview });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to load analytics overview' });
  }
});

// Get detailed item performance
const getItemPerformance = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30', limit = '10' } = req.query;

  const periodClause = period === 'all' ? '' : `AND i.created_at >= NOW() - INTERVAL '${period} days'`;

  try {
    const itemsResult = await query(
      `SELECT 
        i.*,
        COALESCE(reactions.count, 0) as reactions_count,
        COALESCE(messages.count, 0) as messages_count,
        CASE 
          WHEN i.views_count > 0 THEN (COALESCE(reactions.count, 0)::float / i.views_count * 100)
          ELSE 0 
        END as engagement_rate
       FROM items i
       LEFT JOIN (
         SELECT item_id, COUNT(*) as count 
         FROM item_reactions 
         GROUP BY item_id
       ) reactions ON i.id = reactions.item_id
       LEFT JOIN (
         SELECT item_id, COUNT(*) as count 
         FROM messages 
         WHERE receiver_id = $1
         GROUP BY item_id
       ) messages ON i.id = messages.item_id
       WHERE i.user_id = $1 ${periodClause}
       ORDER BY i.views_count DESC, i.created_at DESC
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    res.json({ 
      items: itemsResult.rows,
      total: itemsResult.rows.length 
    });
  } catch (error) {
    console.error('Item performance error:', error);
    res.status(500).json({ error: 'Failed to load item performance data' });
  }
});

// Get advertisement analytics
const getAdvertisementAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30' } = req.query;

  const periodClause = period === 'all' ? '' : `AND created_at >= NOW() - INTERVAL '${period} days'`;

  try {
    const adsResult = await query(
      `SELECT 
        *,
        CASE 
          WHEN views_count > 0 THEN (clicks_count::float / views_count * 100)
          ELSE 0 
        END as click_through_rate
       FROM advertisements 
       WHERE user_id = $1 ${periodClause}
       ORDER BY views_count DESC, created_at DESC`,
      [userId]
    );

    const totalStats = await query(
      `SELECT 
        COUNT(*) as total_ads,
        SUM(views_count) as total_views,
        SUM(clicks_count) as total_clicks,
        AVG(
          CASE 
            WHEN views_count > 0 THEN (clicks_count::float / views_count * 100)
            ELSE 0 
          END
        ) as avg_ctr
       FROM advertisements 
       WHERE user_id = $1 ${periodClause}`,
      [userId]
    );

    res.json({ 
      advertisements: adsResult.rows,
      stats: totalStats.rows[0]
    });
  } catch (error) {
    console.error('Advertisement analytics error:', error);
    res.status(500).json({ error: 'Failed to load advertisement analytics' });
  }
});

// Get engagement trends
const getEngagementTrends = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30' } = req.query;

  try {
    const trendsResult = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as items_posted,
        SUM(views_count) as total_views,
        AVG(views_count) as avg_views
       FROM items 
       WHERE user_id = $1 
         AND created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId]
    );

    const reactionsResult = await query(
      `SELECT 
        DATE(r.created_at) as date,
        COUNT(*) as reactions
       FROM item_reactions r
       JOIN items i ON r.item_id = i.id
       WHERE i.user_id = $1 
         AND r.created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY DATE(r.created_at)
       ORDER BY date DESC`,
      [userId]
    );

    res.json({ 
      trends: trendsResult.rows,
      reactions: reactionsResult.rows
    });
  } catch (error) {
    console.error('Engagement trends error:', error);
    res.status(500).json({ error: 'Failed to load engagement trends' });
  }
});

module.exports = {
  getOverview,
  getItemPerformance,
  getAdvertisementAnalytics,
  getEngagementTrends
};