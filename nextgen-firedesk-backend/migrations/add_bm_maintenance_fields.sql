-- Migration: Add BM Maintenance Fields to Tickets
-- Safe migration with backward compatibility

BEGIN;

-- 1. Add new columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(50) DEFAULT 'STANDARD';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR(20);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS bm_state VARCHAR(50);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS bm_metadata JSONB DEFAULT '{}';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;

-- 2. Backfill existing tickets
UPDATE tickets SET ticket_type = 'STANDARD' WHERE ticket_type IS NULL;
UPDATE tickets SET priority = 'MEDIUM' WHERE priority IS NULL;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type ON tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_tickets_bm_state ON tickets(bm_state) WHERE ticket_type = 'BM_MAINTENANCE';
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadline ON tickets(sla_deadline) WHERE sla_deadline IS NOT NULL;

-- 4. Create asset_spare_consumptions table
CREATE TABLE IF NOT EXISTS asset_spare_consumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  spare_id UUID NOT NULL REFERENCES inventory_spares(id),
  quantity_used DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(12,2),
  total_cost DECIMAL(12,2),
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  used_by UUID REFERENCES users(id),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spare_consumption_asset ON asset_spare_consumptions(asset_id);
CREATE INDEX IF NOT EXISTS idx_spare_consumption_ticket ON asset_spare_consumptions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_spare_consumption_spare ON asset_spare_consumptions(spare_id);

-- 5. Create bm_issue_types master table
CREATE TABLE IF NOT EXISTS bm_issue_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Seed bm_issue_types with default data
INSERT INTO bm_issue_types (name, category, description) VALUES
('Electrical Failure', 'ELECTRICAL', 'Issues related to electrical components'),
('Mechanical Breakdown', 'MECHANICAL', 'Mechanical component failures'),
('Sensor Malfunction', 'ELECTRICAL', 'Sensor reading errors or failures'),
('Hydraulic Leak', 'HYDRAULIC', 'Hydraulic system leaks'),
('Software Error', 'SOFTWARE', 'Software or firmware issues'),
('Calibration Required', 'COMPLIANCE', 'Equipment requires recalibration'),
('Safety Check', 'COMPLIANCE', 'Safety compliance verification'),
('Performance Degradation', 'MECHANICAL', 'Reduced performance or efficiency'),
('Overheating', 'THERMAL', 'Temperature-related issues'),
('Structural Damage', 'STRUCTURAL', 'Physical damage to structure')
ON CONFLICT (name) DO NOTHING;

-- 7. Create bm_state_transitions audit table
CREATE TABLE IF NOT EXISTS bm_state_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_state VARCHAR(50),
  to_state VARCHAR(50) NOT NULL,
  transitioned_by UUID REFERENCES users(id),
  transition_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bm_transitions_ticket ON bm_state_transitions(ticket_id);

COMMIT;

-- Verification queries
SELECT 
  COUNT(*) as total_tickets,
  COUNT(ticket_type) as tickets_with_type,
  COUNT(priority) as tickets_with_priority
FROM tickets;

SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('asset_spare_consumptions', 'bm_issue_types', 'bm_state_transitions');
