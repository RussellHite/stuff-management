-- Non-Consumables with Condition Tracking Migration
-- This migration adds support for tools, equipment, and household items with condition tracking

-- Update existing non_consumables table structure
ALTER TABLE non_consumables DROP COLUMN IF EXISTS quantity;
ALTER TABLE non_consumables DROP COLUMN IF EXISTS purchase_date;
ALTER TABLE non_consumables DROP COLUMN IF EXISTS warranty_expiry;
ALTER TABLE non_consumables DROP COLUMN IF EXISTS serial_number;

-- Add new columns for better non-consumable tracking
ALTER TABLE non_consumables 
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS model VARCHAR(100),
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS warranty_expiry DATE,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS current_condition VARCHAR(20) DEFAULT 'good' CHECK (current_condition IN ('excellent', 'good', 'fair', 'poor', 'broken')),
ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS maintenance_notes TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create condition_logs table for tracking item condition over time
CREATE TABLE IF NOT EXISTS condition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    non_consumable_id UUID NOT NULL REFERENCES non_consumables(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    logged_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    condition_rating VARCHAR(20) NOT NULL CHECK (condition_rating IN ('excellent', 'good', 'fair', 'poor', 'broken')),
    condition_notes TEXT,
    maintenance_performed TEXT,
    estimated_repair_cost DECIMAL(10,2),
    photos TEXT[], -- Array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create maintenance_tasks table for family collaboration
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    non_consumable_id UUID NOT NULL REFERENCES non_consumables(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    estimated_duration_hours INTEGER,
    actual_duration_hours INTEGER,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create maintenance_schedules table for recurring maintenance
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    non_consumable_id UUID NOT NULL REFERENCES non_consumables(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    frequency_value INTEGER DEFAULT 1, -- For custom frequencies (e.g., every 2 weeks)
    last_completed_date DATE,
    next_due_date DATE,
    default_assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create condition_log_photos table for better photo management
CREATE TABLE IF NOT EXISTS condition_log_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_log_id UUID NOT NULL REFERENCES condition_logs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(20) DEFAULT 'general' CHECK (photo_type IN ('general', 'before', 'after', 'damage', 'repair')),
    caption TEXT,
    file_size INTEGER,
    mime_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_condition_logs_non_consumable_id ON condition_logs(non_consumable_id);
CREATE INDEX IF NOT EXISTS idx_condition_logs_organization_id ON condition_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_condition_logs_created_at ON condition_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_non_consumable_id ON maintenance_tasks(non_consumable_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_organization_id ON maintenance_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_assigned_to ON maintenance_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_due_date ON maintenance_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_non_consumable_id ON maintenance_schedules(non_consumable_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_organization_id ON maintenance_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due_date ON maintenance_schedules(next_due_date);

CREATE INDEX IF NOT EXISTS idx_condition_log_photos_condition_log_id ON condition_log_photos(condition_log_id);
CREATE INDEX IF NOT EXISTS idx_condition_log_photos_organization_id ON condition_log_photos(organization_id);

-- Add updated_at trigger for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_condition_logs_updated_at BEFORE UPDATE ON condition_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_tasks_updated_at BEFORE UPDATE ON maintenance_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_non_consumables_updated_at BEFORE UPDATE ON non_consumables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE condition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_log_photos ENABLE ROW LEVEL SECURITY;

-- Condition Logs RLS Policies
CREATE POLICY "Users can view condition logs for their organization" ON condition_logs FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create condition logs for their organization" ON condition_logs FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
    AND logged_by = auth.uid()
);

CREATE POLICY "Users can update their own condition logs" ON condition_logs FOR UPDATE USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
    AND logged_by = auth.uid()
);

CREATE POLICY "Admins can delete condition logs" ON condition_logs FOR DELETE USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Maintenance Tasks RLS Policies
CREATE POLICY "Users can view maintenance tasks for their organization" ON maintenance_tasks FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create maintenance tasks for their organization" ON maintenance_tasks FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Users can update maintenance tasks in their organization" ON maintenance_tasks FOR UPDATE USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
);

CREATE POLICY "Admins and creators can delete maintenance tasks" ON maintenance_tasks FOR DELETE USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
    OR created_by = auth.uid()
);

-- Maintenance Schedules RLS Policies
CREATE POLICY "Users can view maintenance schedules for their organization" ON maintenance_schedules FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins and managers can manage maintenance schedules" ON maintenance_schedules FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Condition Log Photos RLS Policies
CREATE POLICY "Users can view condition log photos for their organization" ON condition_log_photos FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can upload condition log photos for their organization" ON condition_log_photos FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
);

CREATE POLICY "Users can update their own condition log photos" ON condition_log_photos FOR UPDATE USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
);

CREATE POLICY "Admins can delete condition log photos" ON condition_log_photos FOR DELETE USING (
    organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create function to automatically update non_consumable condition when condition log is added
CREATE OR REPLACE FUNCTION update_non_consumable_condition()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE non_consumables 
    SET 
        current_condition = NEW.condition_rating,
        last_maintenance_date = CASE 
            WHEN NEW.maintenance_performed IS NOT NULL THEN CURRENT_DATE
            ELSE last_maintenance_date
        END,
        updated_at = now()
    WHERE id = NEW.non_consumable_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_non_consumable_condition
    AFTER INSERT ON condition_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_non_consumable_condition();

-- Create function to automatically create maintenance tasks from schedules
CREATE OR REPLACE FUNCTION create_scheduled_maintenance_tasks()
RETURNS void AS $$
DECLARE
    schedule_record maintenance_schedules%ROWTYPE;
BEGIN
    FOR schedule_record IN 
        SELECT * FROM maintenance_schedules 
        WHERE is_active = true 
        AND next_due_date <= CURRENT_DATE
    LOOP
        -- Create maintenance task
        INSERT INTO maintenance_tasks (
            non_consumable_id,
            organization_id,
            created_by,
            assigned_to,
            title,
            description,
            priority,
            due_date
        ) VALUES (
            schedule_record.non_consumable_id,
            schedule_record.organization_id,
            schedule_record.created_by,
            schedule_record.default_assigned_to,
            schedule_record.title,
            schedule_record.description,
            'medium',
            schedule_record.next_due_date
        );
        
        -- Update next due date based on frequency
        UPDATE maintenance_schedules 
        SET next_due_date = CASE 
            WHEN frequency_type = 'daily' THEN next_due_date + INTERVAL '1 day' * frequency_value
            WHEN frequency_type = 'weekly' THEN next_due_date + INTERVAL '1 week' * frequency_value
            WHEN frequency_type = 'monthly' THEN next_due_date + INTERVAL '1 month' * frequency_value
            WHEN frequency_type = 'quarterly' THEN next_due_date + INTERVAL '3 months' * frequency_value
            WHEN frequency_type = 'yearly' THEN next_due_date + INTERVAL '1 year' * frequency_value
            ELSE next_due_date + INTERVAL '1 day' * frequency_value
        END
        WHERE id = schedule_record.id;
    END LOOP;
END;
$$ language 'plpgsql';

-- Add some sample data for testing
INSERT INTO non_consumables (
    organization_id, 
    name, 
    description, 
    category, 
    brand, 
    model, 
    current_condition, 
    primary_location_id, 
    created_by
) VALUES 
    (
        (SELECT id FROM organizations LIMIT 1),
        'DeWalt Drill',
        'Cordless drill with battery pack',
        'tools',
        'DeWalt',
        'DCD771C2',
        'good',
        (SELECT id FROM household_locations LIMIT 1),
        (SELECT id FROM user_profiles LIMIT 1)
    ),
    (
        (SELECT id FROM organizations LIMIT 1),
        'Kitchen Mixer',
        'Stand mixer for baking',
        'appliances',
        'KitchenAid',
        'KSM150PS',
        'excellent',
        (SELECT id FROM household_locations LIMIT 1),
        (SELECT id FROM user_profiles LIMIT 1)
    )
ON CONFLICT DO NOTHING;