-- Add contact fields to advertisements table
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS email TEXT;
