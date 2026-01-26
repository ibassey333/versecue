-- Add unique constraint for upsert to work
-- Run this in Supabase SQL Editor

ALTER TABLE songs 
ADD CONSTRAINT songs_org_title_artist_unique 
UNIQUE (organization_id, title, artist);
