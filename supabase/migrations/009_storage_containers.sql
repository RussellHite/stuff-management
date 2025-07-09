-- Storage Containers Migration
-- Adds nested storage containers within household locations

-- Create storage containers table
CREATE TABLE storage_containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES household_locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    photo_url TEXT,
    storage_path TEXT,
    capacity_info TEXT, -- e.g., "Large shelf", "4 drawers", "10 cubic feet"
    container_type VARCHAR(50), -- e.g., "shelf", "cabinet", "drawer", "box", "closet"
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add storage container reference to consumables
ALTER TABLE consumables 
ADD COLUMN storage_container_id UUID REFERENCES storage_containers(id) ON DELETE SET NULL;

-- Add storage container reference to non_consumables
ALTER TABLE non_consumables 
ADD COLUMN storage_container_id UUID REFERENCES storage_containers(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_storage_containers_org_id ON storage_containers(organization_id);
CREATE INDEX idx_storage_containers_location_id ON storage_containers(location_id);
CREATE INDEX idx_consumables_container_id ON consumables(storage_container_id);
CREATE INDEX idx_non_consumables_container_id ON non_consumables(storage_container_id);

-- Create updated_at trigger for storage containers
CREATE TRIGGER update_storage_containers_updated_at 
    BEFORE UPDATE ON storage_containers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for storage containers
ALTER TABLE storage_containers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view storage containers in their household
CREATE POLICY "Users can view household storage containers" ON storage_containers
    FOR SELECT
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- Policy: Admin and Manager can create storage containers
CREATE POLICY "Admin and Manager can create storage containers" ON storage_containers
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.role IN ('admin', 'manager')
        )
    );

-- Policy: Admin and Manager can update storage containers
CREATE POLICY "Admin and Manager can update storage containers" ON storage_containers
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.role IN ('admin', 'manager')
        )
    );

-- Policy: Admin and Manager can delete storage containers
CREATE POLICY "Admin and Manager can delete storage containers" ON storage_containers
    FOR DELETE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.role IN ('admin', 'manager')
        )
    );

-- Function to get items count in a storage container
CREATE OR REPLACE FUNCTION get_container_items_count(container_id UUID)
RETURNS TABLE(consumables_count BIGINT, non_consumables_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM consumables WHERE storage_container_id = container_id AND is_active = TRUE) as consumables_count,
        (SELECT COUNT(*) FROM non_consumables WHERE storage_container_id = container_id AND is_active = TRUE) as non_consumables_count;
END;
$$ LANGUAGE plpgsql;

-- Function to log storage container activities
CREATE OR REPLACE FUNCTION log_storage_container_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_family_activity(
            NEW.organization_id,
            NEW.created_by,
            'created_storage_container',
            'Created storage container: ' || NEW.name,
            NEW.id,
            NULL,
            jsonb_build_object('location_id', NEW.location_id, 'container_name', NEW.name)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_family_activity(
            NEW.organization_id,
            auth.uid(),
            'updated_storage_container',
            'Updated storage container: ' || NEW.name,
            NEW.id,
            NULL,
            jsonb_build_object('location_id', NEW.location_id, 'container_name', NEW.name)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_family_activity(
            OLD.organization_id,
            auth.uid(),
            'deleted_storage_container',
            'Deleted storage container: ' || OLD.name,
            OLD.id,
            NULL,
            jsonb_build_object('location_id', OLD.location_id, 'container_name', OLD.name)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER log_storage_container_insert
    AFTER INSERT ON storage_containers
    FOR EACH ROW EXECUTE FUNCTION log_storage_container_activity();

CREATE TRIGGER log_storage_container_update
    AFTER UPDATE ON storage_containers
    FOR EACH ROW EXECUTE FUNCTION log_storage_container_activity();

CREATE TRIGGER log_storage_container_delete
    AFTER DELETE ON storage_containers
    FOR EACH ROW EXECUTE FUNCTION log_storage_container_activity();