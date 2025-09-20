-- Migration 032: Enhance Lead Intelligence and Add Customer Management
-- This migration adds customer table, updates demo scheduling, and enhances lead intelligence

-- Step 1: Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    customer_reference_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active' NOT NULL CHECK (status IN ('Active', 'Inactive', 'Churned', 'On Hold')),
    conversion_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    original_lead_source VARCHAR(100),
    assigned_sales_rep VARCHAR(255),
    last_interaction_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Step 2: Add is_customer flag to contacts table
ALTER TABLE contacts 
ADD COLUMN is_customer BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 3: Replace demo_scheduled boolean with demo_scheduled_at timestamp in lead_analytics
-- First, add the new column
ALTER TABLE lead_analytics 
ADD COLUMN demo_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing demo data (if cta_demo_clicked is true, set a placeholder date)
UPDATE lead_analytics 
SET demo_scheduled_at = created_at + INTERVAL '1 day'
WHERE cta_demo_clicked = TRUE;

-- Drop the old boolean column (we'll use the existing cta_demo_clicked for CTA tracking)
-- Keep cta_demo_clicked for tracking if demo CTA was clicked
-- Use demo_scheduled_at for actual scheduled demo date/time

-- Step 4: Add follow_up_status_id to follow_ups table for tracking completion status
-- This will link to the follow_up entry for status tracking
ALTER TABLE follow_ups
ADD COLUMN follow_up_status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (follow_up_status IN ('pending', 'completed', 'cancelled'));

-- Update existing completed follow-ups
UPDATE follow_ups 
SET follow_up_status = 'completed' 
WHERE is_completed = TRUE;

-- Step 5: Create indexes for performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_contact_id ON customers(contact_id);
CREATE INDEX idx_customers_reference_number ON customers(customer_reference_number);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_conversion_date ON customers(conversion_date);
CREATE INDEX idx_customers_assigned_sales_rep ON customers(assigned_sales_rep);

CREATE INDEX idx_contacts_is_customer ON contacts(user_id, is_customer);
CREATE INDEX idx_lead_analytics_demo_scheduled ON lead_analytics(demo_scheduled_at) WHERE demo_scheduled_at IS NOT NULL;
CREATE INDEX idx_follow_ups_status ON follow_ups(follow_up_status);

-- Step 6: Create trigger for customer reference number generation
CREATE OR REPLACE FUNCTION generate_customer_reference()
RETURNS TRIGGER AS $$
DECLARE
    ref_number VARCHAR(50);
    counter INTEGER := 1;
BEGIN
    -- Generate customer reference number: CUST-YYYY-NNNN
    LOOP
        ref_number := 'CUST-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if this reference number already exists
        IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_reference_number = ref_number) THEN
            NEW.customer_reference_number := ref_number;
            EXIT;
        END IF;
        
        counter := counter + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_customer_reference
    BEFORE INSERT ON customers
    FOR EACH ROW
    WHEN (NEW.customer_reference_number IS NULL OR NEW.customer_reference_number = '')
    EXECUTE FUNCTION generate_customer_reference();

-- Step 7: Add trigger to update updated_at timestamp for customers
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create view for customer analytics
CREATE OR REPLACE VIEW customer_analytics AS
SELECT 
    c.id,
    c.user_id,
    c.customer_reference_number,
    c.name,
    c.email,
    c.phone,
    c.company,
    c.status,
    c.conversion_date,
    c.original_lead_source,
    c.assigned_sales_rep,
    c.last_interaction_date,
    c.created_at,
    c.updated_at,
    -- Count of interactions since becoming customer
    COALESCE(call_stats.total_calls, 0) as total_calls_as_customer,
    COALESCE(call_stats.total_duration, 0) as total_call_duration_minutes,
    -- Latest interaction date
    GREATEST(c.last_interaction_date, call_stats.latest_call) as latest_interaction
FROM customers c
LEFT JOIN (
    SELECT 
        co.id as contact_id,
        COUNT(ca.id) as total_calls,
        SUM(ca.duration_minutes) as total_duration,
        MAX(ca.created_at) as latest_call
    FROM contacts co
    JOIN calls ca ON co.user_id = ca.user_id 
        AND (co.phone_number = ca.phone_number OR co.email = ca.metadata->>'email')
    WHERE co.is_customer = TRUE
    GROUP BY co.id
) call_stats ON c.contact_id = call_stats.contact_id;

-- Step 9: Add comments for documentation
COMMENT ON TABLE customers IS 'Converted customers with their details and status';
COMMENT ON COLUMN customers.customer_reference_number IS 'Unique customer reference number (CUST-YYYY-NNNN)';
COMMENT ON COLUMN customers.status IS 'Customer status: Active, Inactive, Churned, On Hold';
COMMENT ON COLUMN customers.conversion_date IS 'Date when lead was converted to customer';
COMMENT ON COLUMN customers.original_lead_source IS 'Original source where the lead came from';
COMMENT ON COLUMN customers.assigned_sales_rep IS 'Sales representative assigned to this customer';

COMMENT ON COLUMN contacts.is_customer IS 'Flag indicating if this contact has been converted to a customer';
COMMENT ON COLUMN lead_analytics.demo_scheduled_at IS 'Actual scheduled date and time for demo (replaces boolean demo_scheduled)';
COMMENT ON COLUMN follow_ups.follow_up_status IS 'Status of follow-up: pending, completed, cancelled';

-- Step 10: Log the migration completion
INSERT INTO system_config (config_key, config_value, description, updated_by)
VALUES (
  'migration_032_completed_at',
  CURRENT_TIMESTAMP::TEXT,
  'Timestamp when migration 032 (enhance lead intelligence and customers) was completed',
  NULL
) ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = CURRENT_TIMESTAMP;

-- Verify migration completion
DO $$
DECLARE
    customers_table_count INTEGER;
    customers_indexes_count INTEGER;
    contacts_column_count INTEGER;
    lead_analytics_column_count INTEGER;
BEGIN
    -- Check if customers table was created
    SELECT COUNT(*) INTO customers_table_count
    FROM information_schema.tables 
    WHERE table_name = 'customers' AND table_schema = 'public';
    
    -- Check if indexes were created
    SELECT COUNT(*) INTO customers_indexes_count
    FROM pg_indexes 
    WHERE tablename = 'customers' AND schemaname = 'public';
    
    -- Check if is_customer column was added to contacts
    SELECT COUNT(*) INTO contacts_column_count
    FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'is_customer' AND table_schema = 'public';
    
    -- Check if demo_scheduled_at column was added to lead_analytics
    SELECT COUNT(*) INTO lead_analytics_column_count
    FROM information_schema.columns 
    WHERE table_name = 'lead_analytics' AND column_name = 'demo_scheduled_at' AND table_schema = 'public';
    
    IF customers_table_count = 1 AND customers_indexes_count >= 6 AND contacts_column_count = 1 AND lead_analytics_column_count = 1 THEN
        RAISE NOTICE 'Migration 032 completed successfully: customers table, % indexes, and enhanced columns created', customers_indexes_count;
    ELSE
        RAISE EXCEPTION 'Migration 032 failed: Expected customers table, indexes, and columns were not created properly';
    END IF;
END $$;
