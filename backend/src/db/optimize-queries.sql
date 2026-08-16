-- Query optimization indexes for item listings
-- Run this to improve query performance

-- Composite index for item_reviews to speed up seller rating queries
CREATE INDEX IF NOT EXISTS idx_item_reviews_seller_rating ON item_reviews(seller_id, rating);

-- Analyze tables to update query planner statistics
ANALYZE items;
ANALYZE users;
ANALYZE item_reviews;
ANALYZE item_reactions;
ANALYZE item_images;
