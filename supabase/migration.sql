-- LeadLens Database Schema
-- Run this in Supabase SQL Editor

-- Leads cache table for storing scraped data with 24hr TTL
CREATE TABLE IF NOT EXISTS leads_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  scraped_data JSONB NOT NULL DEFAULT '{}',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast domain lookups
CREATE INDEX IF NOT EXISTS idx_leads_cache_domain ON leads_cache(domain);

-- Index for TTL-based cache invalidation queries
CREATE INDEX IF NOT EXISTS idx_leads_cache_scraped_at ON leads_cache(scraped_at);

-- Enable Row Level Security
ALTER TABLE leads_cache ENABLE ROW LEVEL SECURITY;

-- No public policies: only the server (SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS)
-- can read or write the cache. The browser never talks to Supabase directly.
