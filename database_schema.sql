-- HUILERIE MASMOUDI Database Schema
-- PostgreSQL/MySQL Compatible Schema
-- Version: 1.0.0
-- Created: 2024

-- Enable UUID extension for PostgreSQL (comment out for MySQL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- FARMERS TABLE
-- =============================================
CREATE TABLE farmers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()), -- Use uuid_generate_v4() for PostgreSQL
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    type ENUM('small', 'large') NOT NULL DEFAULT 'small',
    price_per_kg DECIMAL(5,3) NOT NULL DEFAULT 0.150,
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount_due DECIMAL(10,2) DEFAULT 0.00,
    total_amount_paid DECIMAL(10,2) DEFAULT 0.00,
    payment_status ENUM('paid', 'pending') DEFAULT 'pending',
    last_processing_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_farmers_name (name),
    INDEX idx_farmers_type (type),
    INDEX idx_farmers_payment_status (payment_status),
    INDEX idx_farmers_date_added (date_added)
);

-- =============================================
-- BOXES TABLE
-- =============================================
CREATE TABLE boxes (
    id VARCHAR(20) PRIMARY KEY, -- Box ID (1-600 or Chkara1, Chkara2, etc.)
    farmer_id VARCHAR(36) NOT NULL,
    type ENUM('nchira', 'chkara', 'normal') NOT NULL DEFAULT 'normal',
    weight DECIMAL(6,2) NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    is_processed BOOLEAN DEFAULT FALSE,
    processing_session_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_boxes_farmer_id (farmer_id),
    INDEX idx_boxes_type (type),
    INDEX idx_boxes_is_processed (is_processed),
    INDEX idx_boxes_processing_session (processing_session_id),
    
    -- Constraints
    CONSTRAINT chk_box_weight CHECK (weight > 0),
    CONSTRAINT chk_box_id_format CHECK (
        (type IN ('nchira', 'normal') AND id REGEXP '^[1-9][0-9]*$' AND CAST(id AS UNSIGNED) BETWEEN 1 AND 600) OR
        (type = 'chkara' AND id REGEXP '^Chkara[1-9][0-9]*$')
    )
);

-- =============================================
-- PROCESSING SESSIONS TABLE
-- =============================================
CREATE TABLE processing_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()), -- Session ID format: S + timestamp
    farmer_id VARCHAR(36) NOT NULL,
    session_number VARCHAR(20) UNIQUE NOT NULL, -- Human readable: S001, S002, etc.
    processing_date DATE NULL,
    oil_weight DECIMAL(8,2) DEFAULT 0.00,
    total_box_weight DECIMAL(8,2) NOT NULL,
    box_count INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    processing_status ENUM('pending', 'processed') DEFAULT 'pending',
    payment_status ENUM('unpaid', 'paid') DEFAULT 'unpaid',
    payment_date TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_sessions_farmer_id (farmer_id),
    INDEX idx_sessions_processing_status (processing_status),
    INDEX idx_sessions_payment_status (payment_status),
    INDEX idx_sessions_processing_date (processing_date),
    INDEX idx_sessions_created_at (created_at),
    
    -- Constraints
    CONSTRAINT chk_session_weights CHECK (oil_weight >= 0 AND total_box_weight > 0),
    CONSTRAINT chk_session_counts CHECK (box_count > 0),
    CONSTRAINT chk_session_price CHECK (total_price >= 0)
);

-- =============================================
-- SESSION BOXES (Junction Table)
-- =============================================
CREATE TABLE session_boxes (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    session_id VARCHAR(36) NOT NULL,
    box_id VARCHAR(20) NOT NULL,
    box_weight DECIMAL(6,2) NOT NULL,
    box_type ENUM('nchira', 'chkara', 'normal') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (session_id) REFERENCES processing_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (box_id) REFERENCES boxes(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_session_boxes_session (session_id),
    INDEX idx_session_boxes_box (box_id),
    
    -- Unique constraint to prevent duplicate box in same session
    UNIQUE KEY unique_session_box (session_id, box_id)
);

-- =============================================
-- DASHBOARD METRICS (Optional - for caching)
-- =============================================
CREATE TABLE dashboard_metrics (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    metric_date DATE NOT NULL,
    total_farmers INT DEFAULT 0,
    total_boxes INT DEFAULT 0,
    active_boxes INT DEFAULT 0,
    pending_extractions INT DEFAULT 0,
    today_revenue DECIMAL(10,2) DEFAULT 0.00,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    average_oil_extraction DECIMAL(6,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraint for one record per date
    UNIQUE KEY unique_metric_date (metric_date),
    
    -- Index
    INDEX idx_metrics_date (metric_date)
);

-- =============================================
-- SYSTEM LOGS (Optional - for audit trail)
-- =============================================
CREATE TABLE system_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NULL, -- For future user management
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- farmer, box, session
    entity_id VARCHAR(36) NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_logs_action (action),
    INDEX idx_logs_entity (entity_type, entity_id),
    INDEX idx_logs_created_at (created_at)
);

-- =============================================
-- TRIGGERS FOR AUTO-UPDATES
-- =============================================

-- Trigger to update farmer totals when session changes
DELIMITER //
CREATE TRIGGER update_farmer_totals_after_session_insert
    AFTER INSERT ON processing_sessions
    FOR EACH ROW
BEGIN
    UPDATE farmers 
    SET 
        total_amount_due = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM processing_sessions 
            WHERE farmer_id = NEW.farmer_id
        ),
        total_amount_paid = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM processing_sessions 
            WHERE farmer_id = NEW.farmer_id AND payment_status = 'paid'
        ),
        payment_status = CASE 
            WHEN (SELECT COUNT(*) FROM processing_sessions WHERE farmer_id = NEW.farmer_id AND payment_status = 'unpaid') = 0 
            THEN 'paid' 
            ELSE 'pending' 
        END,
        last_processing_date = COALESCE(NEW.processing_date, last_processing_date),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.farmer_id;
END//

CREATE TRIGGER update_farmer_totals_after_session_update
    AFTER UPDATE ON processing_sessions
    FOR EACH ROW
BEGIN
    UPDATE farmers 
    SET 
        total_amount_due = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM processing_sessions 
            WHERE farmer_id = NEW.farmer_id
        ),
        total_amount_paid = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM processing_sessions 
            WHERE farmer_id = NEW.farmer_id AND payment_status = 'paid'
        ),
        payment_status = CASE 
            WHEN (SELECT COUNT(*) FROM processing_sessions WHERE farmer_id = NEW.farmer_id AND payment_status = 'unpaid') = 0 
            THEN 'paid' 
            ELSE 'pending' 
        END,
        last_processing_date = COALESCE(NEW.processing_date, last_processing_date),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.farmer_id;
END//

CREATE TRIGGER update_farmer_totals_after_session_delete
    AFTER DELETE ON processing_sessions
    FOR EACH ROW
BEGIN
    UPDATE farmers 
    SET 
        total_amount_due = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM processing_sessions 
            WHERE farmer_id = OLD.farmer_id
        ),
        total_amount_paid = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM processing_sessions 
            WHERE farmer_id = OLD.farmer_id AND payment_status = 'paid'
        ),
        payment_status = CASE 
            WHEN (SELECT COUNT(*) FROM processing_sessions WHERE farmer_id = OLD.farmer_id AND payment_status = 'unpaid') = 0 
            THEN 'paid' 
            ELSE 'pending' 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.farmer_id;
END//

-- Trigger to mark boxes as processed when added to session
CREATE TRIGGER mark_boxes_processed_after_session_box_insert
    AFTER INSERT ON session_boxes
    FOR EACH ROW
BEGIN
    UPDATE boxes 
    SET 
        is_processed = TRUE,
        processing_session_id = NEW.session_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.box_id;
END//

DELIMITER ;

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Insert sample farmers
INSERT INTO farmers (id, name, phone, type, price_per_kg, date_added) VALUES
('farmer-001', 'Ahmed Ben Salem', '+216 98 123 456', 'large', 0.200, '2024-01-15'),
('farmer-002', 'Fatma Trabelsi', '+216 97 234 567', 'small', 0.150, '2024-01-15'),
('farmer-003', 'Mohamed Karray', NULL, 'large', 0.200, '2024-01-14');

-- Insert sample boxes
INSERT INTO boxes (id, farmer_id, type, weight) VALUES
('1', 'farmer-001', 'nchira', 25.0),
('15', 'farmer-001', 'chkara', 15.0),
('30', 'farmer-001', 'normal', 10.0),
('45', 'farmer-002', 'normal', 8.0),
('Chkara1', 'farmer-002', 'chkara', 12.0),
('100', 'farmer-003', 'nchira', 30.0),
('150', 'farmer-003', 'normal', 18.0);

-- Insert sample processing sessions
INSERT INTO processing_sessions (id, farmer_id, session_number, processing_date, oil_weight, total_box_weight, box_count, total_price, processing_status, payment_status) VALUES
('session-001', 'farmer-001', 'S001', '2024-01-15', 12.5, 50.0, 3, 10.00, 'processed', 'paid'),
('session-002', 'farmer-002', 'S002', '2024-01-14', 6.0, 20.0, 2, 3.00, 'processed', 'unpaid');

-- Insert session boxes relationships
INSERT INTO session_boxes (session_id, box_id, box_weight, box_type) VALUES
('session-001', '1', 25.0, 'nchira'),
('session-001', '15', 15.0, 'chkara'),
('session-001', '30', 10.0, 'normal'),
('session-002', '45', 8.0, 'normal'),
('session-002', 'Chkara1', 12.0, 'chkara');

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for farmer summary with session counts
CREATE VIEW farmer_summary AS
SELECT 
    f.*,
    COUNT(ps.id) as total_sessions,
    COUNT(CASE WHEN ps.processing_status = 'processed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN ps.payment_status = 'paid' THEN 1 END) as paid_sessions,
    COALESCE(SUM(ps.oil_weight), 0) as total_oil_extracted,
    COALESCE(SUM(ps.total_box_weight), 0) as total_box_weight_processed,
    COUNT(b.id) as total_boxes,
    COUNT(CASE WHEN b.is_processed = FALSE THEN 1 END) as available_boxes
FROM farmers f
LEFT JOIN processing_sessions ps ON f.id = ps.farmer_id
LEFT JOIN boxes b ON f.id = b.farmer_id
GROUP BY f.id;

-- View for session details with box information
CREATE VIEW session_details AS
SELECT 
    ps.*,
    f.name as farmer_name,
    f.phone as farmer_phone,
    f.type as farmer_type,
    GROUP_CONCAT(sb.box_id ORDER BY sb.box_id) as box_ids,
    GROUP_CONCAT(CONCAT(sb.box_id, ':', sb.box_weight, 'kg') ORDER BY sb.box_id) as box_details
FROM processing_sessions ps
JOIN farmers f ON ps.farmer_id = f.id
LEFT JOIN session_boxes sb ON ps.id = sb.session_id
GROUP BY ps.id;

-- View for dashboard metrics calculation
CREATE VIEW current_dashboard_metrics AS
SELECT 
    COUNT(DISTINCT f.id) as total_farmers,
    COUNT(DISTINCT b.id) as total_boxes,
    COUNT(DISTINCT CASE WHEN b.is_processed = FALSE THEN b.id END) as active_boxes,
    COUNT(DISTINCT CASE WHEN ps.processing_status = 'pending' THEN ps.id END) as pending_extractions,
    COALESCE(SUM(CASE WHEN DATE(ps.created_at) = CURDATE() THEN ps.total_price ELSE 0 END), 0) as today_revenue,
    COALESCE(SUM(ps.total_price), 0) as total_revenue,
    COALESCE(AVG(CASE WHEN ps.oil_weight > 0 THEN ps.oil_weight END), 0) as average_oil_extraction
FROM farmers f
LEFT JOIN boxes b ON f.id = b.farmer_id
LEFT JOIN processing_sessions ps ON f.id = ps.farmer_id;

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Procedure to create a new processing session
DELIMITER //
CREATE PROCEDURE CreateProcessingSession(
    IN p_farmer_id VARCHAR(36),
    IN p_box_ids JSON,
    OUT p_session_id VARCHAR(36)
)
BEGIN
    DECLARE v_session_number VARCHAR(20);
    DECLARE v_total_weight DECIMAL(8,2) DEFAULT 0;
    DECLARE v_box_count INT DEFAULT 0;
    DECLARE v_total_price DECIMAL(10,2) DEFAULT 0;
    DECLARE v_price_per_kg DECIMAL(5,3);
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_box_id VARCHAR(20);
    DECLARE v_box_weight DECIMAL(6,2);
    DECLARE v_box_type VARCHAR(10);
    
    -- Generate session ID and number
    SET p_session_id = UUID();
    SELECT CONCAT('S', LPAD(COALESCE(MAX(CAST(SUBSTRING(session_number, 2) AS UNSIGNED)), 0) + 1, 3, '0'))
    INTO v_session_number
    FROM processing_sessions;
    
    -- Get farmer's price per kg
    SELECT price_per_kg INTO v_price_per_kg FROM farmers WHERE id = p_farmer_id;
    
    -- Calculate totals from selected boxes
    SELECT 
        SUM(weight),
        COUNT(*),
        SUM(weight) * v_price_per_kg
    INTO v_total_weight, v_box_count, v_total_price
    FROM boxes 
    WHERE farmer_id = p_farmer_id 
    AND JSON_CONTAINS(p_box_ids, JSON_QUOTE(id));
    
    -- Create the session
    INSERT INTO processing_sessions (
        id, farmer_id, session_number, total_box_weight, 
        box_count, total_price, processing_status, payment_status
    ) VALUES (
        p_session_id, p_farmer_id, v_session_number, v_total_weight,
        v_box_count, v_total_price, 'pending', 'unpaid'
    );
    
    -- Add boxes to session
    INSERT INTO session_boxes (session_id, box_id, box_weight, box_type)
    SELECT p_session_id, id, weight, type
    FROM boxes 
    WHERE farmer_id = p_farmer_id 
    AND JSON_CONTAINS(p_box_ids, JSON_QUOTE(id));
    
    -- Remove processed boxes from farmer
    DELETE FROM boxes 
    WHERE farmer_id = p_farmer_id 
    AND JSON_CONTAINS(p_box_ids, JSON_QUOTE(id));
    
END//
DELIMITER ;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_farmers_type_payment ON farmers(type, payment_status);
CREATE INDEX idx_boxes_farmer_type ON boxes(farmer_id, type);
CREATE INDEX idx_sessions_farmer_status ON processing_sessions(farmer_id, processing_status, payment_status);
CREATE INDEX idx_sessions_date_status ON processing_sessions(processing_date, processing_status);

-- Full-text search indexes (MySQL only)
-- ALTER TABLE farmers ADD FULLTEXT(name);

-- =============================================
-- CONSTRAINTS AND BUSINESS RULES
-- =============================================

-- Ensure box IDs are unique across all farmers
ALTER TABLE boxes ADD CONSTRAINT unique_box_id UNIQUE (id);

-- Ensure session numbers are unique
ALTER TABLE processing_sessions ADD CONSTRAINT unique_session_number UNIQUE (session_number);

-- Ensure positive values
ALTER TABLE farmers ADD CONSTRAINT chk_farmer_amounts CHECK (total_amount_due >= 0 AND total_amount_paid >= 0);

-- =============================================
-- BACKUP AND MAINTENANCE
-- =============================================

-- Create backup table structure (run periodically)
-- CREATE TABLE farmers_backup LIKE farmers;
-- CREATE TABLE boxes_backup LIKE boxes;
-- CREATE TABLE processing_sessions_backup LIKE processing_sessions;

-- Archive old data (example for sessions older than 1 year)
-- INSERT INTO processing_sessions_backup SELECT * FROM processing_sessions WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
-- DELETE FROM processing_sessions WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- =============================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================

-- Monitor table sizes
-- SELECT 
--     table_name,
--     table_rows,
--     ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
-- FROM information_schema.tables 
-- WHERE table_schema = 'huilerie_masmoudi'
-- ORDER BY (data_length + index_length) DESC;

-- Monitor slow queries and missing indexes
-- SELECT * FROM sys.statements_with_runtimes_in_95th_percentile;

-- =============================================
-- END OF SCHEMA
-- =============================================

-- Schema Version
INSERT INTO system_logs (action, entity_type, entity_id, new_values) 
VALUES ('SCHEMA_CREATED', 'system', 'database', JSON_OBJECT('version', '1.0.0', 'created_at', NOW()));
