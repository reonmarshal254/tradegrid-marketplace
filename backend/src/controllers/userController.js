'use strict';
const { query } = require('../config/db');
const { ApiError } = require('../middleware/error');

const getUserProfile = async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.avatar_url, u.location, u.created_at,
            (SELECT count(*)::int FROM items i WHERE i.user_id = u.id AND i.status = 'active') AS active_items,
            (SELECT count(*)::int FROM items i WHERE i.user_id = u.id AND i.status = 'sold') AS sold_items,
            (SELECT count(*)::int FROM item_reactions r JOIN items i ON i.id = r.item_id WHERE i.user_id = u.id) AS total_reactions,
            (SELECT round(avg(rating)::numeric, 1) FROM item_reviews r WHERE r.seller_id = u.id) AS rating_avg,
            (SELECT count(*)::int FROM item_reviews r WHERE r.seller_id = u.id) AS rating_count
     FROM users u
     WHERE u.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'User not found');
  const u = rows[0];
  res.json({
    user: {
      ...u,
      rating_avg: u.rating_avg !== null ? Number(u.rating_avg) : null,
    },
  });
};

const getUserReviews = async (req, res) => {
  const { rows } = await query(
    `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
            rv.item_id, i.name AS item_name,
            u.id AS reviewer_id, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
     FROM item_reviews rv
     JOIN users u ON u.id = rv.reviewer_id
     JOIN items i ON i.id = rv.item_id
     WHERE rv.seller_id = $1
     ORDER BY rv.created_at DESC`,
    [req.params.id]
  );
  const agg = await query(
    `SELECT count(*)::int AS count,
            COALESCE(round(avg(rating)::numeric, 1), 0) AS avg
     FROM item_reviews WHERE seller_id = $1`,
    [req.params.id]
  );
  res.json({
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      item_id: r.item_id,
      item_name: r.item_name,
      reviewer: {
        id: r.reviewer_id,
        name: r.reviewer_name,
        avatar_url: r.reviewer_avatar,
      },
    })),
    rating: {
      count: Number(agg.rows[0].count),
      avg: Number(agg.rows[0].avg),
    },
  });
};

module.exports = { getUserProfile, getUserReviews };
