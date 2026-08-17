'use strict';
const { query } = require('../config/db');
const { ApiError } = require('../middleware/error');
const { destroyImage } = require('../services/cloudinary');
const { notify } = require('../services/push');
const mailer = require('../services/mailer');

const getStats = async (req, res) => {
  const [cards, chart] = await Promise.all([
    query(
      `SELECT
         (SELECT count(*)::int FROM users) AS total_users,
         (SELECT count(*)::int FROM users WHERE is_active) AS active_users,
         (SELECT count(*)::int FROM users WHERE is_verified) AS verified_users,
         (SELECT count(*)::int FROM items WHERE status = 'active') AS active_items,
         (SELECT count(*)::int FROM items WHERE status = 'sold') AS sold_items,
         (SELECT count(*)::int FROM items) AS total_items,
         (SELECT count(*)::int FROM item_reactions) AS total_reactions,
         (SELECT count(*)::int FROM purchases) AS total_purchases,
         (SELECT count(*)::int FROM item_reviews) AS total_reviews,
         (SELECT round(avg(rating)::numeric, 1) FROM item_reviews) AS avg_rating,
         (SELECT count(*)::int FROM user_reports WHERE status = 'open') AS open_reports,
         (SELECT count(*)::int FROM support_tickets WHERE status = 'open') AS open_support,
         (SELECT count(*)::int FROM advertisements WHERE status = 'pending') AS pending_ads`
    ),
    query(
      `SELECT d.day,
              (SELECT count(*)::int FROM users WHERE created_at::date = d.day) AS signups,
              (SELECT count(*)::int FROM items WHERE created_at::date = d.day) AS items_posted
       FROM generate_series(
         current_date - interval '6 days', current_date, interval '1 day'
       ) AS d(day)
       ORDER BY d.day`
    ),
  ]);

  const c = cards.rows[0];
  res.json({
    stats: {
      total_users: Number(c.total_users),
      active_users: Number(c.active_users),
      verified_users: Number(c.verified_users),
      active_items: Number(c.active_items),
      sold_items: Number(c.sold_items),
      total_items: Number(c.total_items),
      total_reactions: Number(c.total_reactions),
      total_purchases: Number(c.total_purchases),
      total_reviews: Number(c.total_reviews),
      avg_rating: c.avg_rating !== null ? Number(c.avg_rating) : null,
      open_reports: Number(c.open_reports),
      open_support: Number(c.open_support),
      pending_ads: Number(c.pending_ads),
    },
    chart: chart.rows.map((r) => ({
      day: new Date(r.day).toISOString().slice(0, 10),
      signups: Number(r.signups),
      items: Number(r.items_posted),
    })),
  });
};

const getActivity = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const { rows } = await query(
    `SELECT * FROM (
       SELECT u.created_at AS at, 'user_registered' AS type, u.name AS text,
              u.id AS user_id, NULL::uuid AS item_id
       FROM users u
       UNION ALL
       SELECT i.created_at, 'item_posted', i.name, i.user_id, i.id
       FROM items i
       UNION ALL
       SELECT p.created_at, 'purchase', COALESCE(i.name, 'an item'), i.user_id, i.id
       FROM purchases p JOIN items i ON i.id = p.item_id
       UNION ALL
       SELECT rv.created_at, 'review', COALESCE(i.name, 'an item'),
              rv.seller_id, rv.item_id
       FROM item_reviews rv JOIN items i ON i.id = rv.item_id
       UNION ALL
       SELECT r.created_at, 'report', r.category, r.reported_user_id, r.item_id
       FROM user_reports r
       UNION ALL
       SELECT st.created_at, 'support', st.subject, st.user_id, NULL::uuid
       FROM support_tickets st
     ) a
     ORDER BY at DESC
     LIMIT $1`,
    [limit]
  );
  res.json({
    activity: rows.map((r) => ({
      at: r.at,
      type: r.type,
      text: r.text,
      user_id: r.user_id,
      item_id: r.item_id,
    })),
  });
};

const listReports = async (req, res) => {
  const status = req.query.status === 'resolved' ? 'resolved' : 'open';
  const { rows } = await query(
    `SELECT r.id, r.category, r.reason, r.status, r.created_at, r.resolved_at,
            reporter.id AS reporter_id, reporter.name AS reporter_name, reporter.avatar_url AS reporter_avatar,
            reported.id AS reported_id, reported.name AS reported_name, reported.avatar_url AS reported_avatar,
            reported.is_verified AS reported_verified,
            i.id AS item_id, i.name AS item_name, i.price AS item_price
     FROM user_reports r
     LEFT JOIN users reporter ON reporter.id = r.reporter_id
     JOIN users reported ON reported.id = r.reported_user_id
     LEFT JOIN items i ON i.id = r.item_id
     WHERE r.status = $1
     ORDER BY r.created_at DESC
     LIMIT 100`,
    [status]
  );
  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      category: r.category,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
      reporter: r.reporter_id
        ? { id: r.reporter_id, name: r.reporter_name, avatar_url: r.reporter_avatar }
        : null,
      reported_user: {
        id: r.reported_id,
        name: r.reported_name,
        avatar_url: r.reported_avatar,
        is_verified: Boolean(r.reported_verified),
      },
      item: r.item_id
        ? {
            id: r.item_id,
            name: r.item_name,
            price: r.item_price !== null ? Number(r.item_price) : null,
          }
        : null,
    })),
  });
};

const resolveReport = async (req, res) => {
  const { rows } = await query(
    `UPDATE user_reports
     SET status = 'resolved', resolved_at = now(), handled_by = $2, updated_at = now()
     WHERE id = $1 RETURNING id, status`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Report not found');
  res.json({ message: 'Report resolved', report: rows[0] });
};

const getInsights = async (req, res) => {
  const [anomalies, security, lastLogins, scamReports] = await Promise.all([
    query(
      `SELECT i.id, i.name, i.price, i.user_id,
              u.name AS seller_name,
              cat.avg_price AS category_avg
       FROM items i
       JOIN users u ON u.id = i.user_id
       JOIN (SELECT category, avg(price) AS avg_price FROM items WHERE category IS NOT NULL GROUP BY category) cat
         ON cat.category = i.category
       WHERE i.status = 'active' AND i.price > cat.avg_price * 5
       ORDER BY (i.price / NULLIF(cat.avg_price, 0)) DESC
       LIMIT 20`
    ),
    query(
      `SELECT u.id, u.name, u.email, u.email_verified_at, u.is_active, u.created_at,
              (SELECT count(*)::int FROM user_reports r WHERE r.reported_user_id = u.id AND r.status = 'open') AS open_report_count,
              (SELECT count(*)::int FROM items i WHERE i.user_id = u.id) AS item_count
       FROM users u
       WHERE u.email_verified_at IS NULL OR (SELECT count(*)::int FROM user_reports r WHERE r.reported_user_id = u.id) >= 2
       ORDER BY open_report_count DESC, u.created_at ASC
       LIMIT 50`
    ),
    query(
      `SELECT id, name, email, is_active, last_login_at
       FROM users
       ORDER BY last_login_at DESC NULLS LAST
       LIMIT 10`
    ),
    query(
      `SELECT r.id, r.reason, r.created_at,
              reported.id AS reported_id, reported.name AS reported_name,
              (SELECT count(*)::int FROM user_reports rr WHERE rr.reported_user_id = reported.id) AS total_reports
       FROM user_reports r
       JOIN users reported ON reported.id = r.reported_user_id
       WHERE r.category = 'scam' AND r.status = 'open'
       ORDER BY r.created_at DESC
       LIMIT 50`
    ),
  ]);

  res.json({
    anomalies: anomalies.rows.map((r) => ({
      item_id: r.id,
      name: r.name,
      price: Number(r.price),
      category_avg: Number(r.category_avg),
      seller_name: r.seller_name,
    })),
    security_risks: security.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      email_verified: Boolean(r.email_verified_at),
      is_active: Boolean(r.is_active),
      open_report_count: Number(r.open_report_count),
      item_count: Number(r.item_count),
      created_at: r.created_at,
    })),
    last_logins: lastLogins.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      is_active: Boolean(r.is_active),
      last_login_at: r.last_login_at,
    })),
    scam_reports: scamReports.rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      created_at: r.created_at,
      reported_user: { id: r.reported_id, name: r.reported_name },
      total_reports: Number(r.total_reports),
    })),
  });
};

const listUsers = async (req, res) => {
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
  const params = [];
  let where = '';
  if (search) {
    params.push(search);
    where = `WHERE (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_verified,
            u.email_verified_at, u.last_login_at, u.created_at, u.avatar_url,
            u.subscription_plan, u.subscription_expires_at,
            (SELECT count(*)::int FROM items i WHERE i.user_id = u.id) AS item_count,
            (SELECT round(avg(r.rating)::numeric, 1) FROM item_reviews r WHERE r.seller_id = u.id) AS rating_avg,
            (SELECT count(*)::int FROM item_reviews r WHERE r.seller_id = u.id) AS rating_count,
            (SELECT count(*)::int FROM user_reports r WHERE r.reported_user_id = u.id AND r.status = 'open') AS open_reports
     FROM users u
     ${where}
     ORDER BY u.created_at DESC
     LIMIT 200`,
    params
  );
  res.json({
    users: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      is_active: Boolean(r.is_active),
      is_verified: Boolean(r.is_verified),
      email_verified: Boolean(r.email_verified_at),
      subscription_plan: r.subscription_plan || 'free',
      subscription_expires_at: r.subscription_expires_at,
      last_login_at: r.last_login_at,
      created_at: r.created_at,
      avatar_url: r.avatar_url,
      item_count: Number(r.item_count),
      rating_avg: r.rating_avg !== null ? Number(r.rating_avg) : null,
      rating_count: Number(r.rating_count),
      open_reports: Number(r.open_reports),
    })),
  });
};

const updateUser = async (req, res) => {
  const { is_active, is_verified, role } = req.body;
  if (req.params.id === req.user.id) {
    throw new ApiError(400, 'You cannot modify your own account');
  }
  const sets = [];
  const params = [req.params.id];
  const set = (field, value) => {
    sets.push(`${field} = $${params.length + 1}`);
    params.push(value);
  };
  if (is_active !== undefined) set('is_active', is_active === true || is_active === 'true');
  if (is_verified !== undefined) set('is_verified', is_verified === true || is_verified === 'true');
  if (role !== undefined) {
    if (!['user', 'admin'].includes(role)) throw new ApiError(400, 'Invalid role');
    set('role', role);
  }
  if (!sets.length) throw new ApiError(400, 'Nothing to update');
  sets.push('updated_at = now()');

  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING id, is_active, is_verified, role`,
    params
  );
  if (!rows[0]) throw new ApiError(404, 'User not found');
  res.json({ message: 'User updated', user: rows[0] });
};

const deleteUser = async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'User not found');
  res.json({ message: 'User deleted' });
};

const listItems = async (req, res) => {
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
  const params = [];
  let where = 'WHERE i.status != $' + `${params.length + 1}`;
  params.push('removed');
  if (search) {
    params.push(search);
    where += ` AND (i.name ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
  }
  const { rows } = await query(
    `SELECT i.id, i.name, i.description, i.price, i.category, i.status, i.featured, i.promo,
            i.created_at, i.user_id,
            u.name AS seller_name, u.avatar_url AS seller_avatar, u.is_verified AS seller_verified,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
            (SELECT count(*)::int FROM item_views v WHERE v.item_id = i.id) AS views_count,
            (SELECT round(avg(r.rating)::numeric, 1) FROM item_reviews r WHERE r.item_id = i.id) AS rating_avg,
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
              FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images
     FROM items i
     JOIN users u ON u.id = i.user_id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT 300`,
    params
  );
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: Number(r.price),
      category: r.category,
      status: r.status,
      featured: Boolean(r.featured),
      promo: Boolean(r.promo),
      created_at: r.created_at,
      seller: {
        id: r.user_id,
        name: r.seller_name,
        avatar_url: r.seller_avatar,
        is_verified: Boolean(r.seller_verified),
      },
      reactions_count: Number(r.reactions_count),
      views_count: Number(r.views_count),
      rating_avg: r.rating_avg !== null ? Number(r.rating_avg) : null,
      image_url: r.images[0]?.url || null,
    })),
  });
};

const updateItem = async (req, res) => {
  const { featured, promo, status } = req.body;
  const sets = [];
  const params = [req.params.id];
  const set = (field, value) => {
    sets.push(`${field} = $${params.length + 1}`);
    params.push(value);
  };
  if (featured !== undefined) set('featured', featured === true || featured === 'true');
  if (promo !== undefined) set('promo', promo === true || promo === 'true');
  if (status !== undefined) {
    if (!['active', 'sold', 'removed'].includes(status)) throw new ApiError(400, 'Invalid status');
    set('status', status);
  }
  if (!sets.length) throw new ApiError(400, 'Nothing to update');
  sets.push('updated_at = now()');

  const { rows } = await query(
    `UPDATE items SET ${sets.join(', ')} WHERE id = $1 RETURNING id, featured, promo, status`,
    params
  );
  if (!rows[0]) throw new ApiError(404, 'Item not found');

  if (rows[0].featured && req.body.notify_seller !== false) {
    const seller = await query('SELECT user_id FROM items WHERE id = $1', [req.params.id]);
    notify(seller.rows[0].user_id, {
      type: 'featured',
      title: 'Your item is now featured!',
      body: 'Your item has been added to the featured section.',
      data: { item_id: req.params.id },
    }).catch(() => {});
  }

  res.json({ message: 'Item updated', item: rows[0] });
};

const deleteItem = async (req, res) => {
  const { rows } = await query('SELECT public_id FROM item_images WHERE item_id = $1', [req.params.id]);
  const del = await query('DELETE FROM items WHERE id = $1 RETURNING id', [req.params.id]);
  if (!del.rows[0]) throw new ApiError(404, 'Item not found');
  for (const img of rows) destroyImage(img.public_id);
  res.json({ message: 'Item deleted' });
};

const listSupportTickets = async (req, res) => {
  const { rows } = await query(
    `SELECT t.id, t.subject, t.message, t.status, t.admin_reply, t.created_at, t.updated_at,
            u.id AS user_id, u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar
     FROM support_tickets t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY (t.status = 'open') DESC, t.created_at DESC
     LIMIT 100`
  );
  res.json({
    tickets: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      message: r.message,
      status: r.status,
      admin_reply: r.admin_reply,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user: r.user_id
        ? { id: r.user_id, name: r.user_name, email: r.user_email, avatar_url: r.user_avatar }
        : null,
    })),
  });
};

const replySupport = async (req, res) => {
  const reply = String(req.body.reply || '').trim();
  if (!reply) throw new ApiError(400, 'Reply is required');
  if (reply.length > 5000) throw new ApiError(400, 'Reply too long');

  const { rows } = await query(
    `UPDATE support_tickets
     SET admin_reply = $2, status = 'resolved', updated_at = now()
     WHERE id = $1
     RETURNING id, status, user_id, subject`,
    [req.params.id, reply]
  );
  if (!rows[0]) throw new ApiError(404, 'Support ticket not found');

  if (rows[0].user_id) {
    notify(rows[0].user_id, {
      type: 'support_reply',
      title: 'Support response',
      body: `Your support request "${rows[0].subject}" has been answered.`,
      data: { ticket_id: rows[0].id },
    }).catch(() => {});
  }

  res.json({ message: 'Reply sent', ticket: rows[0] });
};

const closeSupportTicket = async (req, res) => {
  const { rows } = await query(
    `UPDATE support_tickets
     SET status = 'closed', updated_at = now()
     WHERE id = $1
     RETURNING id, status`,
    [req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Support ticket not found');

  res.json({ message: 'Ticket closed', ticket: rows[0] });
};

// Advertisement management functions
const listAdvertisements = async (req, res) => {
  const status = req.query.status || 'all';
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  
  let whereClause = '';
  const params = [limit];
  
  if (status !== 'all') {
    whereClause = 'WHERE a.status = $2';
    params.push(status);
  }

  const { rows } = await query(
    `SELECT a.id, a.title, a.description, a.banner_url, a.video_url, a.link_url,
            a.target_audience, a.budget_amount, a.status, a.rejection_reason,
            a.views_count, a.clicks_count, a.created_at, a.updated_at,
            u.id AS user_id, u.name AS user_name, u.email AS user_email, 
            u.avatar_url AS user_avatar, u.is_verified AS user_verified
     FROM advertisements a
     JOIN users u ON u.id = a.user_id
     ${whereClause}
     ORDER BY 
       CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END,
       a.created_at DESC
     LIMIT $1`,
    params
  );

  res.json({
    advertisements: rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      banner_url: r.banner_url,
      video_url: r.video_url,
      link_url: r.link_url,
      target_audience: r.target_audience,
      budget_amount: r.budget_amount,
      status: r.status,
      rejection_reason: r.rejection_reason,
      views_count: Number(r.views_count) || 0,
      clicks_count: Number(r.clicks_count) || 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user_id: r.user_id,
      user_name: r.user_name,
      user_email: r.user_email,
      user_avatar: r.user_avatar,
      user_verified: Boolean(r.user_verified)
    }))
  });
};

const updateAdvertisement = async (req, res) => {
  const { status, rejection_reason } = req.body;
  
  if (!['pending', 'approved', 'rejected', 'paused'].includes(status)) {
    throw new ApiError(400, 'Invalid advertisement status');
  }

  const sets = ['status = $2', 'updated_at = NOW()'];
  const params = [req.params.id, status];

  if (status === 'rejected' && rejection_reason) {
    sets.push('rejection_reason = $3');
    params.push(rejection_reason);
  } else if (status !== 'rejected') {
    sets.push('rejection_reason = NULL');
  }

  // Auto-approve for verified users after first approval (optional enhancement)
  if (status === 'approved') {
    // Check if this is user's first approved ad
    const firstApprovalCheck = await query(
      `SELECT user_id, (SELECT is_verified FROM users WHERE id = user_id) as is_verified
       FROM advertisements WHERE id = $1`,
      [req.params.id]
    );
    
    if (firstApprovalCheck.rows[0]?.is_verified) {
      // Mark user as having auto-approval privilege (if needed in future)
      // For now, just log it
      console.log('[AD] Verified user getting first ad approved:', firstApprovalCheck.rows[0].user_id);
    }
  }

  const { rows } = await query(
    `UPDATE advertisements 
     SET ${sets.join(', ')}
     WHERE id = $1 
     RETURNING id, status, user_id, title`,
    params
  );

  if (!rows[0]) {
    throw new ApiError(404, 'Advertisement not found');
  }

  // Notify user of status change
  const ad = rows[0];
  if (ad.user_id && status !== 'pending') {
    // Get user details for email notification
    const userResult = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [ad.user_id]
    );
    const user = userResult.rows[0];

    // Push notification
    const notification = {
      type: 'advertisement_status',
      title: status === 'approved' ? '✅ Advertisement Approved!' : 
             status === 'rejected' ? '❌ Advertisement Rejected' : 
             `Advertisement ${status}`,
      body: status === 'approved' 
        ? `Your advertisement "${ad.title}" has been approved and is now live!`
        : status === 'rejected'
        ? `Your advertisement "${ad.title}" has been rejected.${rejection_reason ? ` Reason: ${rejection_reason}` : ''}`
        : `Your advertisement "${ad.title}" has been ${status}.`,
      data: { advertisement_id: ad.id }
    };

    notify(ad.user_id, notification).catch(() => {});

    // Email notification
    if (user && user.email) {
      const emailSubject = status === 'approved' 
        ? '✅ Your Advertisement Has Been Approved!' 
        : status === 'rejected'
        ? '❌ Advertisement Review Result'
        : `Advertisement Status: ${status}`;

      let emailBody = `<h2>Hello ${user.name || 'User'},</h2>`;
      
      if (status === 'approved') {
        emailBody += `
          <p>Great news! Your advertisement has been approved and is now live on TRADEGRID Marketplace.</p>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0; color: #15803d;">📢 ${ad.title}</h3>
            <p style="margin: 0; color: #166534;">Status: <strong>Approved ✅</strong></p>
          </div>
          <p>Your ad is now visible to users across the marketplace. You can track its performance in your dashboard.</p>
          <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-ads" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Ad Performance</a></p>
        `;
      } else if (status === 'rejected') {
        emailBody += `
          <p>We've reviewed your advertisement and unfortunately it does not meet our community guidelines.</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0; color: #991b1b;">📢 ${ad.title}</h3>
            <p style="margin: 0 0 8px 0; color: #7f1d1d;">Status: <strong>Rejected ❌</strong></p>
            ${rejection_reason ? `<p style="margin: 0; color: #7f1d1d;"><strong>Reason:</strong> ${rejection_reason}</p>` : ''}
          </div>
          <p>You can create a new advertisement that complies with our guidelines or contact support if you have questions.</p>
          <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/advertisements/create" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Create New Ad</a></p>
        `;
      } else {
        emailBody += `
          <p>Your advertisement status has been updated.</p>
          <div style="background: #f9fafb; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0;">📢 ${ad.title}</h3>
            <p style="margin: 0;">Status: <strong>${status}</strong></p>
          </div>
        `;
      }

      emailBody += `
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 14px;">
          Questions? <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/help" style="color: #4f46e5;">Contact Support</a>
        </p>
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated message from TRADEGRID Marketplace. Please do not reply to this email.
        </p>
      `;

      mailer.send(user.email, emailSubject, emailBody).catch((err) => {
        console.error('[AD] Failed to send email notification:', err.message);
      });
    }
  }

  res.json({ 
    message: `Advertisement ${status} successfully`, 
    advertisement: ad 
  });
};

const deleteAdvertisement = async (req, res) => {
  // Get advertisement info before deletion
  const adResult = await query(
    'SELECT user_id, title, banner_url FROM advertisements WHERE id = $1',
    [req.params.id]
  );

  if (!adResult.rows[0]) {
    throw new ApiError(404, 'Advertisement not found');
  }

  const ad = adResult.rows[0];

  // Delete the advertisement
  const { rows } = await query(
    'DELETE FROM advertisements WHERE id = $1 RETURNING id',
    [req.params.id]
  );

  // Clean up media files if they exist
  if (ad.banner_url) {
    // Extract public_id from Cloudinary URL if using Cloudinary
    try {
      const publicId = ad.banner_url.split('/').pop().split('.')[0];
      destroyImage(publicId);
    } catch (error) {
      console.error('Failed to delete advertisement media:', error);
    }
  }

  // Notify user
  if (ad.user_id) {
    notify(ad.user_id, {
      type: 'advertisement_deleted',
      title: 'Advertisement deleted',
      body: `Your advertisement "${ad.title}" has been removed by an administrator.`,
      data: { advertisement_id: req.params.id }
    }).catch(() => {});
  }

  res.json({ message: 'Advertisement deleted successfully' });
};

const listAppVersions = async (req, res) => {
  const { rows } = await query('SELECT * FROM app_versions ORDER BY version_code DESC');
  res.json({ versions: rows });
};

const createAppVersion = async (req, res) => {
  const { version_code, version_name, release_notes } = req.body;
  if (!version_code || !version_name) {
    throw new ApiError(400, 'version_code and version_name are required');
  }
  if (!req.file) {
    throw new ApiError(400, 'APK file is required');
  }

  const { uploadApkToB2 } = require('../services/b2');
  const fs = require('fs');
  const apkBuffer = fs.readFileSync(req.file.path);
  const fileName = `tradegrid-v${version_name}-${Date.now()}.apk`;

  const result = await uploadApkToB2(apkBuffer, fileName);
  fs.unlink(req.file.path, () => {});

  const { rows } = await query(
    `INSERT INTO app_versions (version_code, version_name, release_notes, apk_url, apk_public_id, file_size)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [parseInt(version_code), version_name, release_notes || '', result.url, result.key, req.file.size]
  );
  res.json({ version: rows[0] });
};

const deleteAppVersion = async (req, res) => {
  const { id } = req.params;
  const { rows } = await query('SELECT apk_public_id FROM app_versions WHERE id = $1', [id]);
  if (rows[0]?.apk_public_id) {
    try {
      const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const env = require('../config/env');
      const s3 = new S3Client({
        endpoint: `https://${env.b2.endpoint}`,
        region: 'us-east-005',
        credentials: { accessKeyId: env.b2.keyId, secretAccessKey: env.b2.appKey },
        forcePathStyle: true,
      });
      await s3.send(new DeleteObjectCommand({ Bucket: env.b2.bucketId, Key: rows[0].apk_public_id }));
    } catch { /* ignore */ }
  }
  await query('DELETE FROM app_versions WHERE id = $1', [id]);
  res.json({ message: 'Version deleted' });
};

const getLatestAppVersion = async (req, res) => {
  const { rows } = await query(
    'SELECT version_code, version_name, release_notes, apk_url, apk_public_id, file_size, created_at FROM app_versions WHERE is_active = true ORDER BY version_code DESC LIMIT 1'
  );
  if (rows.length === 0) {
    return res.json({ version: null });
  }
  const version = rows[0];
  // Generate a 1-hour pre-signed download URL from B2
  if (version.apk_public_id) {
    try {
      const { getApkDownloadUrl } = require('../services/b2');
      version.download_url = await getApkDownloadUrl(version.apk_public_id, 3600);
    } catch (err) {
      console.error('[app-version] Failed to generate download URL:', err.message);
    }
  }
  res.json({ version });
};

module.exports = {
  getStats,
  getActivity,
  listUsers,
  updateUser,
  deleteUser,
  listReports,
  resolveReport,
  getInsights,
  listItems,
  updateItem,
  deleteItem,
  listSupportTickets,
  replySupport,
  closeSupportTicket,
  listAdvertisements,
  updateAdvertisement,
  deleteAdvertisement,
  listAppVersions,
  createAppVersion,
  deleteAppVersion,
  getLatestAppVersion,
};
