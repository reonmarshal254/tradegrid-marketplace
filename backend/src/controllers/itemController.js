'use strict';
const { query, pool } = require('../config/db');
const { ApiError } = require('../middleware/error');
const { uploadImages, destroyImage } = require('../services/cloudinary');
const { notify } = require('../services/push');
const { findSuggestions, extractKeywords, COMMON_KEYWORDS } = require('../utils/fuzzySearch');
const { getLocationFromIP, calculateDistance, parseLocationString, getClientIP } = require('../utils/geolocation');

const ITEM_IMG_FIELDS = 'id, name, description, price, age, has_receipt, status, created_at, updated_at';

function itemRow(item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    age: item.age,
    has_receipt: item.has_receipt,
    status: item.status,
    category: item.category,
    featured: Boolean(item.featured),
    promo: Boolean(item.promo),
    seller: item.seller_id ? {
      id: item.seller_id,
      name: item.seller_name,
      avatar_url: item.seller_avatar,
      location: item.seller_location,
      whatsapp: item.seller_whatsapp,
      phone: item.seller_phone,
      verified: Boolean(item.seller_verified),
      rating_avg: item.seller_rating_avg !== undefined && item.seller_rating_avg !== null
        ? Number(item.seller_rating_avg)
        : null,
      rating_count: Number(item.seller_rating_count || 0),
    } : null,
    images: item.images || [],
    reactions_count: Number(item.reactions_count || 0),
    reacted: Boolean(item.reacted),
    purchased: Boolean(item.purchased),
    my_review: item.my_review || null,
    viewed_at: item.viewed_at || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

const SELLER_RATING_SUBSELECT = `(
  SELECT round(avg(r.rating)::numeric, 1)
  FROM item_reviews r WHERE r.seller_id = i.user_id
) AS seller_rating_avg,
(
  SELECT count(*)::int FROM item_reviews r WHERE r.seller_id = i.user_id
) AS seller_rating_count`;

async function fetchItem(id, viewerId) {
  const { rows } = await query(
    `SELECT i.*,
            u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar,
            u.location AS seller_location, u.whatsapp AS seller_whatsapp, u.phone AS seller_phone,
            u.is_verified AS seller_verified,
            ${SELLER_RATING_SUBSELECT},
            COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object('id', img.id, 'url', img.url)
                ORDER BY img.position
              ) FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
            ($2::uuid IS NOT NULL AND EXISTS (
              SELECT 1 FROM item_reactions r WHERE r.item_id = i.id AND r.user_id = $2::uuid
            )) AS reacted,
            ($2::uuid IS NOT NULL AND EXISTS (
              SELECT 1 FROM purchases p WHERE p.item_id = i.id AND p.buyer_id = $2::uuid
            )) AS purchased,
            CASE WHEN $2::uuid IS NOT NULL THEN (
              SELECT jsonb_build_object('id', r.id, 'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at)
              FROM item_reviews r WHERE r.item_id = i.id AND r.reviewer_id = $2::uuid
            ) ELSE NULL END AS my_review
     FROM items i
     JOIN users u ON u.id = i.user_id
     WHERE i.id = $1`,
    [id, viewerId || null]
  );
  return rows[0] || null;
}

const createItem = async (req, res) => {
  const { name, description, price, age, has_receipt, category } = req.body;
  if (!name || !String(name).trim()) throw new ApiError(400, 'Item name is required');
  if (!description || !String(description).trim()) throw new ApiError(400, 'Description is required');
  if (!category || !String(category).trim()) throw new ApiError(400, 'Category is required');
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new ApiError(400, 'Valid price is required');
  }

  const client = await pool.connect();
  let images = [];
  try {
    await client.query('BEGIN');
    
    // Get user subscription info
    const userResult = await client.query(
      `SELECT is_verified, subscription_plan, subscription_expires_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = userResult.rows[0];
    const isVerified = user?.is_verified || false;
    
    // Determine effective subscription plan
    let subscriptionPlan = user?.subscription_plan || 'free';
    const expiresAt = user?.subscription_expires_at;
    
    // Check if subscription is expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      subscriptionPlan = 'free'; // Downgrade to free if expired
    }
    
    // Get subscription limits from database
    const settingsResult = await client.query(
      `SELECT max_listings FROM subscription_settings WHERE plan = $1`,
      [subscriptionPlan]
    );
    
    const settings = settingsResult.rows[0] || { max_listings: 3 };
    const maxListings = settings.max_listings;
    
    // Get current listing count for this user
    const countResult = await client.query(
      `SELECT COUNT(*)::int as count FROM items WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );
    const currentListings = countResult.rows[0].count;
    
    // Enforce listing limits (999999 is treated as unlimited)
    if (maxListings < 999999 && currentListings >= maxListings) {
      await client.query('ROLLBACK');
      throw new ApiError(403, 
        `You've reached the maximum of ${maxListings} active listings for your ${subscriptionPlan} plan. ` +
        `Upgrade your plan to list more items.`,
        { 
          code: 'LISTING_LIMIT_REACHED',
          currentPlan: subscriptionPlan,
          currentListings,
          maxListings
        }
      );
    }

    images = [];
    if (req.files && req.files.length) {
      images = await uploadImages(req.files);
    }
    
    const { rows } = await client.query(
      `INSERT INTO items (user_id, name, description, price, age, has_receipt, category, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        req.user.id,
        String(name).trim(),
        String(description).trim(),
        numericPrice,
        age ? String(age).trim() : null,
        has_receipt === true || has_receipt === 'true',
        String(category).trim(),
        isVerified, // Automatically feature items from verified users
      ]
    );
    const itemId = rows[0].id;

    for (let i = 0; i < images.length; i++) {
      await client.query(
        `INSERT INTO item_images (item_id, public_id, url, position)
         VALUES ($1, $2, $3, $4)`,
        [itemId, images[i].publicId, images[i].url, i]
      );
    }
    await client.query('COMMIT');

    const item = await fetchItem(itemId, req.user.id);
    
    // Emit socket event for new item
    const io = req.app.get('io');
    if (io && io.emitNewItem) {
      io.emitNewItem(itemRow(item));
    }
    
    res.status(201).json({ item: itemRow(item) });
  } catch (err) {
    await client.query('ROLLBACK');
    for (const img of images) {
      destroyImage(img.publicId);
    }
    throw err;
  } finally {
    client.release();
  }
};

const listItems = async (req, res) => {
  const {
    search, min_price, max_price, location, seller_id, featured, promo, category,
    page = '1', limit = '12', sort = 'newest', status = 'active',
  } = req.query;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 48);
  const offset = (pageNum - 1) * limitNum;

  const viewerId = req.user ? req.user.id : null;

  const filters = [];
  const filterValues = [];
  const addFilter = (sql, values) => {
    filters.push({ sql, values });
    filterValues.push(...values);
  };

  if (search) {
    addFilter('(i.name ILIKE $1 OR i.description ILIKE $1)', [`%${String(search).trim()}%`]);
  }
  if (min_price !== undefined && min_price !== '') {
    addFilter('i.price >= $1', [Number(min_price)]);
  }
  if (max_price !== undefined && max_price !== '') {
    addFilter('i.price <= $1', [Number(max_price)]);
  }
  if (location) {
    addFilter('u.location ILIKE $1', [`%${String(location).trim()}%`]);
  }
  if (seller_id) {
    addFilter('i.user_id = $1', [seller_id]);
  }
  if (featured === 'true') {
    addFilter('i.featured = true', []);
  }
  if (promo === 'true') {
    addFilter('i.promo = true', []);
  }
  if (category) {
    addFilter('i.category = $1', [String(category).trim()]);
  }

  const composeFilters = (startIndex) => {
    const parts = [];
    const values = [];
    let n = startIndex;
    for (const f of filters) {
      let sql = f.sql;
      for (let k = 0; k < f.values.length; k++) {
        sql = sql.split(`$${k + 1}`).join(`$${n}`);
        n += 1;
      }
      parts.push(sql);
      values.push(...f.values);
    }
    return { sql: parts.join(' AND '), values };
  };

  const sortMap = {
    newest: 'i.created_at DESC',
    oldest: 'i.created_at ASC',
    price_asc: 'i.price ASC',
    price_desc: 'i.price DESC',
    reactions: '(SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) DESC, i.created_at DESC',
  };
  
  // Priority sorting: Verified/Subscribed users' items appear first
  // Then apply user's chosen sort
  const baseSortOrder = sortMap[sort] || sortMap.newest;
  const priorityOrderBy = `
    CASE 
      WHEN u.is_verified = true THEN 1
      WHEN u.subscription_plan IN ('personal', 'recommended', 'enterprise') 
           AND (u.subscription_expires_at IS NULL OR u.subscription_expires_at > NOW()) THEN 2
      ELSE 3
    END ASC,
    ${baseSortOrder}
  `;

  const mainFilters = composeFilters(3);
  const mainSql = filters.length
    ? `WHERE i.status = $1 AND ${mainFilters.sql}`
    : 'WHERE i.status = $1';
  const { rows } = await query(
    `SELECT i.*,
            u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar,
            u.location AS seller_location, u.is_verified AS seller_verified,
            u.subscription_plan AS seller_subscription_plan,
            ${SELLER_RATING_SUBSELECT},
            count(*) OVER()::int AS total_count,
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
              FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
            ($2::uuid IS NOT NULL AND EXISTS (
              SELECT 1 FROM item_reactions r WHERE r.item_id = i.id AND r.user_id = $2::uuid
            )) AS reacted
     FROM items i
     JOIN users u ON u.id = i.user_id
     ${mainSql}
     ORDER BY ${priorityOrderBy}
     LIMIT ${limitNum} OFFSET ${offset}`,
    [status, viewerId, ...mainFilters.values]
  );

  const total = rows.length ? rows[0].total_count : 0;

  res.json({
    items: rows.map(itemRow),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: Math.ceil(total / limitNum),
    },
  });
};

const getItem = async (req, res) => {
  const item = await fetchItem(req.params.id, req.user ? req.user.id : null);
  if (!item || item.status === 'removed') throw new ApiError(404, 'Item not found');
  res.json({ item: itemRow(item) });
};

const myItems = async (req, res) => {
  const { status } = req.query;
  const params = [req.user.id];
  let where = 'i.user_id = $1';
  if (status) {
    params.push(status);
    where += ` AND i.status = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT i.*,
            u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar, u.location AS seller_location,
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
              FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count
     FROM items i
     JOIN users u ON u.id = i.user_id
     WHERE ${where}
     ORDER BY i.created_at DESC`,
    params
  );
  res.json({ items: rows.map(itemRow) });
};

const updateItem = async (req, res) => {
  const item = await fetchItem(req.params.id, req.user.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.seller_id !== req.user.id) throw new ApiError(403, 'You can only edit your own items');

  const { name, description, price, age, has_receipt, status, category, replace_images } = req.body;

  const updates = [];
  const params = [req.params.id];

  const set = (field, value, column) => {
    if (value !== undefined && value !== null) {
      updates.push(`${column} = $${params.length + 1}`);
      params.push(value);
    }
  };

  if (name !== undefined) {
    if (!String(name).trim()) throw new ApiError(400, 'Name cannot be empty');
    set(name, String(name).trim(), 'name');
  }
  if (description !== undefined) {
    if (!String(description).trim()) throw new ApiError(400, 'Description cannot be empty');
    set(description, String(description).trim(), 'description');
  }
  if (price !== undefined) {
    const np = Number(price);
    if (Number.isNaN(np) || np < 0) throw new ApiError(400, 'Valid price is required');
    set(price, np, 'price');
  }
  if (age !== undefined) {
    updates.push(`age = $${params.length + 1}`);
    params.push(String(age).trim() || null);
  }
  if (category !== undefined) {
    updates.push(`category = $${params.length + 1}`);
    params.push(String(category).trim() || null);
  }
  if (has_receipt !== undefined) {
    set(has_receipt, has_receipt === true || has_receipt === 'true', 'has_receipt');
  }
  if (status !== undefined) {
    if (!['active', 'sold', 'removed'].includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }
    set(status, status, 'status');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (updates.length) {
      updates.push('updated_at = now()');
      await client.query(
        `UPDATE items SET ${updates.join(', ')} WHERE id = $1`,
        params
      );
    }

    const replace = replace_images === true || replace_images === 'true';
    const uploaded = req.files && req.files.length ? await uploadImages(req.files) : [];

    if (replace) {
      const old = await client.query(
        'SELECT public_id FROM item_images WHERE item_id = $1',
        [req.params.id]
      );
      await client.query('DELETE FROM item_images WHERE item_id = $1', [req.params.id]);
      for (let i = 0; i < uploaded.length; i++) {
        await client.query(
          `INSERT INTO item_images (item_id, public_id, url, position)
           VALUES ($1, $2, $3, $4)`,
          [req.params.id, uploaded[i].publicId, uploaded[i].url, i]
        );
      }
      for (const oldImg of old.rows) {
        destroyImage(oldImg.public_id);
      }
    } else if (uploaded.length) {
      const { rows: posRows } = await client.query(
        'SELECT COALESCE(MAX(position), -1)::int AS max_pos FROM item_images WHERE item_id = $1',
        [req.params.id]
      );
      let pos = posRows[0].max_pos + 1;
      for (const img of uploaded) {
        await client.query(
          `INSERT INTO item_images (item_id, public_id, url, position)
           VALUES ($1, $2, $3, $4)`,
          [req.params.id, img.publicId, img.url, pos++]
        );
      }
    }

    await client.query('COMMIT');
    const updated = await fetchItem(req.params.id, req.user.id);
    res.json({ item: itemRow(updated) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const deleteItem = async (req, res) => {
  const item = await fetchItem(req.params.id, req.user.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.seller_id !== req.user.id) throw new ApiError(403, 'You can only delete your own items');

  const { rows } = await query('SELECT public_id FROM item_images WHERE item_id = $1', [req.params.id]);
  await query('DELETE FROM items WHERE id = $1', [req.params.id]);
  for (const img of rows) destroyImage(img.public_id);

  // Emit socket event
  const io = req.app.get('io');
  if (io && io.emitItemDeleted) {
    io.emitItemDeleted(req.params.id, req.user.id);
  }

  res.json({ message: 'Item deleted' });
};

const markSold = async (req, res) => {
  const item = await fetchItem(req.params.id, req.user.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.seller_id !== req.user.id) throw new ApiError(403, 'Forbidden');
  await query(
    `UPDATE items SET status = 'sold', updated_at = now() WHERE id = $1`,
    [req.params.id]
  );
  
  // Emit socket event
  const io = req.app.get('io');
  if (io && io.emitItemStatusChange) {
    io.emitItemStatusChange(req.params.id, 'sold', req.user.id);
  }
  
  res.json({ message: 'Item marked as sold' });
};

const react = async (req, res) => {
  const item = await fetchItem(req.params.id, req.user.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.seller_id === req.user.id) {
    throw new ApiError(400, 'You cannot react to your own item');
  }

  const existing = await query(
    'SELECT id FROM item_reactions WHERE user_id = $1 AND item_id = $2',
    [req.user.id, req.params.id]
  );

  if (existing.rows.length) {
    await query('DELETE FROM item_reactions WHERE id = $1', [existing.rows[0].id]);
    const updated = await fetchItem(req.params.id, req.user.id);
    return res.json({ reacted: false, item: itemRow(updated) });
  }

  await query(
    'INSERT INTO item_reactions (user_id, item_id) VALUES ($1, $2)',
    [req.user.id, req.params.id]
  );
  const me = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);

  if (item.seller_id !== req.user.id) {
    notify(item.seller_id, {
      type: 'reaction',
      title: 'New reaction',
      body: `${me.rows[0].name} reacted to your item "${item.name}"`,
      data: { item_id: req.params.id, user_id: req.user.id },
    });
  }

  const updated = await fetchItem(req.params.id, req.user.id);
  res.json({ reacted: true, item: itemRow(updated) });
};

const listCategories = async (req, res) => {
  const { rows } = await query(
    `SELECT category, count(*)::int AS count
     FROM items
     WHERE status = 'active' AND category IS NOT NULL
     GROUP BY category
     ORDER BY count DESC, category ASC`
  );
  res.json({ categories: rows });
};

const listFavorites = async (req, res) => {
  const { rows } = await query(
    `SELECT i.*,
            u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar, u.location AS seller_location,
            ${SELLER_RATING_SUBSELECT},
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
              FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
            true AS reacted,
            (SELECT count(*)::int FROM item_views v WHERE v.user_id = $1 AND v.item_id = i.id) AS view_count
     FROM items i
     JOIN users u ON u.id = i.user_id
     JOIN item_reactions re ON re.item_id = i.id AND re.user_id = $1
     WHERE i.status != 'removed'
     ORDER BY re.created_at DESC`,
    [req.user.id]
  );
  res.json({ items: rows.map(itemRow) });
};

const listRecentlyViewed = async (req, res) => {
  const { rows } = await query(
    `SELECT i.*,
            u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar, u.location AS seller_location,
            ${SELLER_RATING_SUBSELECT},
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
              FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
            ($2::uuid IS NOT NULL AND EXISTS (
              SELECT 1 FROM item_reactions r WHERE r.item_id = i.id AND r.user_id = $2::uuid
            )) AS reacted,
            v.viewed_at AS viewed_at
     FROM items i
     JOIN users u ON u.id = i.user_id
     JOIN item_views v ON v.item_id = i.id AND v.user_id = $1
     WHERE i.status != 'removed'
     ORDER BY v.viewed_at DESC`,
    [req.user.id, req.user.id]
  );
  res.json({ items: rows.map(itemRow) });
};

const recordView = async (req, res) => {
  const { rows } = await query('SELECT id FROM items WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Item not found');
  await query(
    `INSERT INTO item_views (user_id, item_id) VALUES ($1, $2)
     ON CONFLICT (user_id, item_id)
     DO UPDATE SET viewed_at = now()`,
    [req.user.id, req.params.id]
  );
  res.json({ ok: true });
};

const markPurchased = async (req, res) => {
  const item = await fetchItem(req.params.id, req.user.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.seller_id === req.user.id) {
    throw new ApiError(400, 'You cannot purchase your own item');
  }
  await query(
    `INSERT INTO purchases (item_id, buyer_id) VALUES ($1, $2)
     ON CONFLICT (item_id, buyer_id) DO NOTHING`,
    [req.params.id, req.user.id]
  );
  const updated = await fetchItem(req.params.id, req.user.id);
  res.json({ item: itemRow(updated) });
};

const addReview = async (req, res) => {
  const item = await fetchItem(req.params.id, req.user.id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.seller_id === req.user.id) {
    throw new ApiError(400, 'You cannot review your own item');
  }

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }
  const comment = req.body.comment ? String(req.body.comment).trim().slice(0, 1000) : null;

  if (!item.purchased) {
    throw new ApiError(400, 'You can only review an item after marking it as purchased');
  }

  const existing = await query(
    'SELECT id FROM item_reviews WHERE item_id = $1 AND reviewer_id = $2',
    [req.params.id, req.user.id]
  );
  if (existing.rows.length) throw new ApiError(400, 'You have already reviewed this item');

  await query(
    `INSERT INTO item_reviews (item_id, reviewer_id, seller_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.params.id, req.user.id, item.seller_id, rating, comment]
  );

  const me = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);
  notify(item.seller_id, {
    type: 'review',
    title: 'New review',
    body: `${me.rows[0].name} left a ${rating}-star review for your item "${item.name}"`,
    data: { item_id: req.params.id, user_id: req.user.id },
  });

  const updated = await fetchItem(req.params.id, req.user.id);
  res.status(201).json({ item: itemRow(updated) });
};

const myStats = async (req, res) => {
  const { rows } = await query(
    `SELECT
       (SELECT count(*)::int FROM items i WHERE i.user_id = $1) AS total_listings,
       (SELECT count(*)::int FROM items i WHERE i.user_id = $1 AND i.status = 'active') AS active_listings,
       (SELECT count(*)::int FROM items i WHERE i.user_id = $1 AND i.status = 'sold') AS sold_listings,
       (SELECT count(*)::int FROM item_reactions r JOIN items i ON i.id = r.item_id WHERE i.user_id = $1) AS total_reactions,
       (SELECT count(*)::int FROM item_views v JOIN items i ON i.id = v.item_id WHERE i.user_id = $1) AS total_views,
       (SELECT count(*)::int FROM item_reviews r WHERE r.seller_id = $1) AS review_count,
       (SELECT round(avg(rating)::numeric, 1) FROM item_reviews r WHERE r.seller_id = $1) AS rating_avg,
       (SELECT count(*)::int FROM purchases p JOIN items i ON i.id = p.item_id WHERE i.user_id = $1) AS total_purchases`,
    [req.user.id]
  );
  const stats = rows[0];
  res.json({
    stats: {
      total_listings: Number(stats.total_listings),
      active_listings: Number(stats.active_listings),
      sold_listings: Number(stats.sold_listings),
      total_reactions: Number(stats.total_reactions),
      total_views: Number(stats.total_views),
      review_count: Number(stats.review_count),
      rating_avg: stats.rating_avg !== null ? Number(stats.rating_avg) : null,
      total_purchases: Number(stats.total_purchases),
    },
  });
};

module.exports = {
  createItem,
  listItems,
  getItem,
  myItems,
  updateItem,
  deleteItem,
  markSold,
  react,
  listCategories,
  listFavorites,
  listRecentlyViewed,
  recordView,
  markPurchased,
  addReview,
  myStats,
};


// Get search suggestions for typos and similar products
const getSearchSuggestions = async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.json({ suggestions: [], similarProducts: [] });
  }
  
  const searchTerm = q.trim();
  
  // Build vocabulary from existing items + common keywords
  const { rows: items } = await query(
    `SELECT name, description, category FROM items WHERE status = 'active' LIMIT 500`
  );
  
  const itemKeywords = extractKeywords(items);
  const vocabulary = [...new Set([...itemKeywords, ...COMMON_KEYWORDS])];
  
  // Find typo corrections
  const searchWords = searchTerm.toLowerCase().split(/\s+/);
  const correctedWords = [];
  
  for (const word of searchWords) {
    const suggestions = findSuggestions(word, vocabulary, 0.65);
    if (suggestions.length > 0 && suggestions[0].score < 0.95) {
      // Only suggest if it's not already very similar (likely correct)
      correctedWords.push(suggestions[0].word);
    } else {
      correctedWords.push(word);
    }
  }
  
  const suggestedQuery = correctedWords.join(' ');
  const hasSuggestion = suggestedQuery !== searchTerm.toLowerCase();
  
  // Find similar products using broader search
  const viewerId = req.user ? req.user.id : null;
  const { rows: similarItems } = await query(
    `SELECT i.*,
            u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar,
            u.location AS seller_location, u.is_verified AS seller_verified,
            u.subscription_plan AS seller_subscription_plan,
            ${SELLER_RATING_SUBSELECT},
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
              FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
            ($2::uuid IS NOT NULL AND EXISTS (
              SELECT 1 FROM item_reactions r WHERE r.item_id = i.id AND r.user_id = $2::uuid
            )) AS reacted
     FROM items i
     JOIN users u ON u.id = i.user_id
     WHERE i.status = 'active' 
       AND (i.category ILIKE $1 OR i.name ILIKE $1 OR i.description ILIKE $1)
     ORDER BY 
       CASE 
         WHEN u.is_verified = true THEN 1
         WHEN u.subscription_plan IN ('personal', 'recommended', 'enterprise') 
              AND (u.subscription_expires_at IS NULL OR u.subscription_expires_at > NOW()) THEN 2
         ELSE 3
       END ASC,
       i.featured DESC, 
       i.created_at DESC
     LIMIT 6`,
    [`%${searchWords[0]}%`, viewerId]
  );
  
  res.json({
    originalQuery: searchTerm,
    suggestedQuery: hasSuggestion ? suggestedQuery : null,
    suggestions: hasSuggestion ? [suggestedQuery] : [],
    similarProducts: similarItems.map(itemRow),
  });
};

module.exports.getSearchSuggestions = getSearchSuggestions;


// Get items near user's location
const getNearbyItems = async (req, res) => {
  const { limit = '12', radius = '50' } = req.query; // radius in km
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 48);
  const radiusKm = Math.max(parseInt(radius, 10) || 50, 1);
  const viewerId = req.user ? req.user.id : null;

  let userLocation = null;

  // 1. Try to get location from IP
  const clientIP = getClientIP(req);
  console.log('[nearby] Client IP:', clientIP);
  
  if (clientIP) {
    try {
      const ipLocation = await getLocationFromIP(clientIP);
      if (ipLocation) {
        userLocation = { lat: ipLocation.lat, lon: ipLocation.lon, source: 'ip' };
        console.log('[nearby] Location from IP:', ipLocation.city, userLocation);
      }
    } catch (err) {
      console.error('[nearby] IP geolocation failed:', err.message);
    }
  }

  // 2. Fallback to user's profile location if logged in
  if (!userLocation && req.user) {
    try {
      const { rows } = await query(
        'SELECT location FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (rows.length && rows[0].location) {
        const coords = parseLocationString(rows[0].location);
        if (coords) {
          userLocation = { lat: coords.lat, lon: coords.lon, source: 'profile' };
          console.log('[nearby] Location from profile:', rows[0].location, userLocation);
        }
      }
    } catch (err) {
      console.error('[nearby] Profile location failed:', err.message);
    }
  }

  // 3. If no location available, return error or default items
  if (!userLocation) {
    console.log('[nearby] No location available, returning recent items');
    // Return recent items as fallback
    const { rows } = await query(
      `SELECT i.*,
              u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar,
              u.location AS seller_location, u.is_verified AS seller_verified,
              ${SELLER_RATING_SUBSELECT},
              COALESCE((
                SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
                FROM item_images img WHERE img.item_id = i.id
              ), '[]'::jsonb) AS images,
              (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
              ($1::uuid IS NOT NULL AND EXISTS (
                SELECT 1 FROM item_reactions r WHERE r.item_id = i.id AND r.user_id = $1::uuid
              )) AS reacted
       FROM items i
       JOIN users u ON u.id = i.user_id
       WHERE i.status = 'active'
       ORDER BY i.created_at DESC
       LIMIT $2`,
      [viewerId, limitNum]
    );

    return res.json({
      items: rows.map(itemRow),
      userLocation: null,
      message: 'Unable to determine your location. Showing recent items.',
    });
  }

  // 4. Get all active items with seller locations
  const { rows: allItems } = await query(
    `SELECT i.*,
            u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar,
            u.location AS seller_location, u.is_verified AS seller_verified,
            u.subscription_plan AS seller_subscription_plan,
            u.subscription_expires_at AS seller_subscription_expires_at,
            ${SELLER_RATING_SUBSELECT},
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url) ORDER BY img.position)
              FROM item_images img WHERE img.item_id = i.id
            ), '[]'::jsonb) AS images,
            (SELECT count(*)::int FROM item_reactions r WHERE r.item_id = i.id) AS reactions_count,
            ($1::uuid IS NOT NULL AND EXISTS (
              SELECT 1 FROM item_reactions r WHERE r.item_id = i.id AND r.user_id = $1::uuid
            )) AS reacted
     FROM items i
     JOIN users u ON u.id = i.user_id
     WHERE i.status = 'active' AND u.location IS NOT NULL
     ORDER BY i.created_at DESC`,
    [viewerId]
  );

  // 5. Calculate distances and filter by radius
  const itemsWithDistance = [];
  
  for (const item of allItems) {
    const sellerCoords = parseLocationString(item.seller_location);
    
    if (sellerCoords) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lon,
        sellerCoords.lat,
        sellerCoords.lon
      );
      
      if (distance <= radiusKm) {
        // Add priority score for verified/subscribed users
        let priorityScore = 3;
        if (item.seller_verified) {
          priorityScore = 1;
        } else if (
          item.seller_subscription_plan && 
          ['personal', 'recommended', 'enterprise'].includes(item.seller_subscription_plan) &&
          (!item.seller_subscription_expires_at || new Date(item.seller_subscription_expires_at) > new Date())
        ) {
          priorityScore = 2;
        }
        
        itemsWithDistance.push({
          ...itemRow(item),
          distance: distance,
          distanceText: distance < 1 ? '< 1 km' : `${distance} km`,
          priorityScore: priorityScore
        });
      }
    }
  }

  // 6. Sort by priority first, then distance, then limit
  itemsWithDistance.sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) {
      return a.priorityScore - b.priorityScore; // Lower score = higher priority
    }
    return a.distance - b.distance; // Then by distance
  });
  
  const nearbyItems = itemsWithDistance.slice(0, limitNum);

  console.log(`[nearby] Found ${nearbyItems.length} items within ${radiusKm}km`);

  res.json({
    items: nearbyItems,
    userLocation: {
      lat: userLocation.lat,
      lon: userLocation.lon,
      source: userLocation.source
    },
    radius: radiusKm,
    total: nearbyItems.length,
  });
};

module.exports.getNearbyItems = getNearbyItems;
