-- Add rejection_reason column to advertisements table
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for better performance when querying rejected ads
CREATE INDEX IF NOT EXISTS idx_advertisements_rejected ON advertisements(status, created_at DESC) WHERE status = 'rejected';
