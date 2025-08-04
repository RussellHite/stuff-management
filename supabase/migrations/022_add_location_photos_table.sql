-- Add missing location_photos table and related structures
-- Migration 022: Fix missing location_photos functionality

-- Create photo_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE photo_type AS ENUM ('main', 'detail', 'condition', 'receipt');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create location_photos table
CREATE TABLE IF NOT EXISTS location_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES household_locations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    caption VARCHAR(255),
    photo_type photo_type DEFAULT 'main',
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for location photos
CREATE INDEX IF NOT EXISTS idx_location_photos_location_id ON location_photos(location_id);
CREATE INDEX IF NOT EXISTS idx_location_photos_org_id ON location_photos(organization_id);

-- Enable RLS on location_photos table
ALTER TABLE location_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for location_photos
DO $$ BEGIN
    CREATE POLICY "Users can view location photos in their household"
      ON location_photos FOR SELECT
      USING (
        organization_id IN (
          SELECT om.organization_id 
          FROM organization_members om 
          JOIN user_profiles up ON om.user_id = up.id 
          WHERE up.id = auth.uid()
        )
      );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert location photos in their household"
      ON location_photos FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT om.organization_id 
          FROM organization_members om 
          JOIN user_profiles up ON om.user_id = up.id 
          WHERE up.id = auth.uid()
        )
      );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update location photos in their household"
      ON location_photos FOR UPDATE
      USING (
        organization_id IN (
          SELECT om.organization_id 
          FROM organization_members om 
          JOIN user_profiles up ON om.user_id = up.id 
          WHERE up.id = auth.uid()
        )
      );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete location photos in their household"
      ON location_photos FOR DELETE
      USING (
        organization_id IN (
          SELECT om.organization_id 
          FROM organization_members om 
          JOIN user_profiles up ON om.user_id = up.id 
          WHERE up.id = auth.uid()
        )
      );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create storage bucket if it doesn't exist
-- NOTE: This may fail if the bucket already exists, which is expected
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('household-photos', 'household-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for household photos
DO $$ BEGIN
    CREATE POLICY "Users can view household photos" ON storage.objects
      FOR SELECT USING (bucket_id = 'household-photos');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can upload household photos" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'household-photos' AND
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM organization_members om
          JOIN user_profiles up ON om.user_id = up.id
          WHERE up.id = auth.uid()
          AND om.organization_id::text = (storage.foldername(name))[1]
        )
      );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their household photos" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'household-photos' AND
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM organization_members om
          JOIN user_profiles up ON om.user_id = up.id
          WHERE up.id = auth.uid()
          AND om.organization_id::text = (storage.foldername(name))[1]
        )
      );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their household photos" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'household-photos' AND
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM organization_members om
          JOIN user_profiles up ON om.user_id = up.id
          WHERE up.id = auth.uid()
          AND om.organization_id::text = (storage.foldername(name))[1]
        )
      );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add comment describing the migration
COMMENT ON TABLE location_photos IS 'Stores photos for household locations with metadata and storage references';