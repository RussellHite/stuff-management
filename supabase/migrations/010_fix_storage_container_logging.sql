-- Fix storage container activity logging to handle RLS properly

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS log_storage_container_insert ON storage_containers;
DROP TRIGGER IF EXISTS log_storage_container_update ON storage_containers;
DROP TRIGGER IF EXISTS log_storage_container_delete ON storage_containers;
DROP FUNCTION IF EXISTS log_storage_container_activity();

-- Create a simpler activity logging function that uses the existing log_family_activity function
-- but handles the case when created_by might be null
CREATE OR REPLACE FUNCTION log_storage_container_activity()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Skip logging if no user is authenticated
    IF current_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Use current user if created_by is null
        PERFORM log_family_activity(
            NEW.organization_id,
            COALESCE(NEW.created_by, current_user_id),
            'created_storage_container',
            'Created storage container: ' || NEW.name,
            NEW.id,
            NULL,
            jsonb_build_object('location_id', NEW.location_id, 'container_name', NEW.name)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_family_activity(
            NEW.organization_id,
            current_user_id,
            'updated_storage_container',
            'Updated storage container: ' || NEW.name,
            NEW.id,
            NULL,
            jsonb_build_object('location_id', NEW.location_id, 'container_name', NEW.name)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_family_activity(
            OLD.organization_id,
            current_user_id,
            'deleted_storage_container',
            'Deleted storage container: ' || OLD.name,
            OLD.id,
            NULL,
            jsonb_build_object('location_id', OLD.location_id, 'container_name', OLD.name)
        );
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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