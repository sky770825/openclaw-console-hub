-- Table for tracking individual page views and visitor data
CREATE TABLE IF NOT EXISTS community_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    visitor_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    region TEXT,
    referrer TEXT,
    user_agent TEXT,
    session_id TEXT
);

-- Indices for performance
CREATE INDEX idx_community_stats_created_at ON community_stats (created_at);
CREATE INDEX idx_community_stats_visitor_id ON community_stats (visitor_id);

-- View for Daily Stats
CREATE OR REPLACE VIEW daily_visitor_stats AS
SELECT 
    DATE_TRUNC('day', created_at) AS date,
    COUNT(DISTINCT visitor_id) AS unique_visitors,
    COUNT(*) AS page_views
FROM community_stats
GROUP BY 1
ORDER BY 1 DESC;

-- View for Regional Analysis
CREATE OR REPLACE VIEW regional_stats AS
SELECT 
    region,
    COUNT(*) AS total_visits
FROM community_stats
GROUP BY 1
ORDER BY 2 DESC;
