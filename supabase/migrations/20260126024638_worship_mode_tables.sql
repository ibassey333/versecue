-- ============================================
-- VerseCue Worship Mode - Database Migration
-- ============================================
-- Run this in Supabase SQL Editor

-- Songs Table (Local/Cached songs per organization)
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  lyrics TEXT NOT NULL,
  sections JSONB, -- Array of SongSection objects
  source TEXT NOT NULL DEFAULT 'local', -- 'local', 'lrclib', 'ccli', 'custom'
  source_id TEXT, -- ID from external source (for deduplication)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[], -- Array of tags for categorization
  
  -- Prevent duplicate songs from same source within org
  UNIQUE(organization_id, source, source_id)
);

-- Setlists Table
CREATE TABLE IF NOT EXISTS setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  service_date DATE -- Optional: date this setlist is for
);

-- Setlist Items Table (songs in a setlist)
CREATE TABLE IF NOT EXISTS setlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  notes TEXT, -- Optional notes for this song in this setlist
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worship Display State Table (extends display_state pattern)
CREATE TABLE IF NOT EXISTS worship_display_state (
  id TEXT PRIMARY KEY, -- org slug
  mode TEXT DEFAULT 'waiting', -- 'waiting', 'displaying', 'detecting'
  current_song_id UUID REFERENCES songs(id),
  current_song_data JSONB, -- Cached song data for display
  current_section INTEGER DEFAULT 0,
  total_sections INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_display_state ENABLE ROW LEVEL SECURITY;

-- Songs: Users can see/edit songs from their organization
CREATE POLICY "Users can view org songs" ON songs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert org songs" ON songs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update org songs" ON songs
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete org songs" ON songs
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Setlists: Users can see/edit setlists from their organization
CREATE POLICY "Users can view org setlists" ON setlists
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert org setlists" ON setlists
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update org setlists" ON setlists
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete org setlists" ON setlists
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Setlist Items: Based on setlist access
CREATE POLICY "Users can view setlist items" ON setlist_items
  FOR SELECT USING (
    setlist_id IN (
      SELECT id FROM setlists WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert setlist items" ON setlist_items
  FOR INSERT WITH CHECK (
    setlist_id IN (
      SELECT id FROM setlists WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update setlist items" ON setlist_items
  FOR UPDATE USING (
    setlist_id IN (
      SELECT id FROM setlists WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete setlist items" ON setlist_items
  FOR DELETE USING (
    setlist_id IN (
      SELECT id FROM setlists WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Worship Display State: Public read/write (like display_state)
CREATE POLICY "Anyone can view worship display" ON worship_display_state
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update worship display" ON worship_display_state
  FOR ALL USING (true);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_songs_org ON songs(organization_id);
CREATE INDEX IF NOT EXISTS idx_songs_source ON songs(source, source_id);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_setlists_org ON setlists(organization_id);
CREATE INDEX IF NOT EXISTS idx_setlist_items_setlist ON setlist_items(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_items_order ON setlist_items(setlist_id, "order");

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER worship_display_updated_at
  BEFORE UPDATE ON worship_display_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Success Message
-- ============================================
SELECT 'Worship mode tables created successfully!' as status;
