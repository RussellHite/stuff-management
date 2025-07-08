-- Storage Setup Migration
-- This creates the necessary storage buckets and policies for household photos

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('household-photos', 'household-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Create storage policies for household photos
CREATE POLICY "Users can view household photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'household-photos');

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

-- Update item_photos table to better support the storage setup
-- Add a table to track location photos specifically
CREATE TABLE location_photos (
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

-- Create index for location photos
CREATE INDEX idx_location_photos_location_id ON location_photos(location_id);
CREATE INDEX idx_location_photos_org_id ON location_photos(organization_id);

-- Add RLS policies for location photos
ALTER TABLE location_photos ENABLE ROW LEVEL SECURITY;

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