# Storage Setup Instructions

To set up photo uploads for the household inventory system, you need to create a storage bucket and set up policies in your Supabase dashboard.

## Step 1: Create Storage Bucket

1. Go to your Supabase dashboard: https://app.supabase.com/project/jujtjswxpeikaecbfvvn
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Use these settings:
   - **Name**: `household-photos`
   - **Public**: ✅ Yes (checked)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`
5. Click **Create bucket**

## Step 2: Set Up Storage Policies

1. After creating the bucket, click on the **household-photos** bucket
2. Go to the **Policies** tab
3. Click **Add policy** and add these 4 policies:

### Policy 1: View Photos
- **Policy name**: `Users can view household photos`
- **Action**: `SELECT`
- **Policy definition**:
```sql
bucket_id = 'household-photos'
```

### Policy 2: Upload Photos
- **Policy name**: `Users can upload household photos`
- **Action**: `INSERT`
- **Policy definition**:
```sql
bucket_id = 'household-photos' AND
auth.uid() IS NOT NULL AND
EXISTS (
  SELECT 1 FROM organization_members om
  JOIN user_profiles up ON om.user_id = up.id
  WHERE up.id = auth.uid()
  AND om.organization_id::text = (storage.foldername(name))[1]
)
```

### Policy 3: Update Photos
- **Policy name**: `Users can update household photos`
- **Action**: `UPDATE`
- **Policy definition**:
```sql
bucket_id = 'household-photos' AND
auth.uid() IS NOT NULL AND
EXISTS (
  SELECT 1 FROM organization_members om
  JOIN user_profiles up ON om.user_id = up.id
  WHERE up.id = auth.uid()
  AND om.organization_id::text = (storage.foldername(name))[1]
)
```

### Policy 4: Delete Photos
- **Policy name**: `Users can delete household photos`
- **Action**: `DELETE`
- **Policy definition**:
```sql
bucket_id = 'household-photos' AND
auth.uid() IS NOT NULL AND
EXISTS (
  SELECT 1 FROM organization_members om
  JOIN user_profiles up ON om.user_id = up.id
  WHERE up.id = auth.uid()
  AND om.organization_id::text = (storage.foldername(name))[1]
)
```

## Step 3: Run Additional SQL

Go to **SQL Editor** in your Supabase dashboard and run this SQL:

```sql
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
```

## Step 4: Test Photo Upload

After completing the setup, the photo upload functionality in the LocationManager component should work. You can test it by:

1. Going to the household dashboard
2. Adding a new location
3. Dragging and dropping an image into the photo upload area

The photos will be stored in the `household-photos` bucket with the following structure:
- `location-photos/{locationId}-{timestamp}.{extension}`