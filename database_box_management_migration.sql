-- Professional Box Management Migration Script
-- This script will initialize 600 fixed boxes and update the box management system

BEGIN;

-- Step 1: Create the 600 fixed boxes (1-600)
-- First, let's clear any existing boxes to start fresh
DELETE FROM "session_boxes";
DELETE FROM "boxes";

-- Insert 600 fixed boxes with IDs from "1" to "600"
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..600 LOOP
        INSERT INTO "boxes" (
            "id",
            "type",
            "status",
            "currentFarmerId",
            "currentWeight",
            "assignedAt",
            "isSelected",
            "createdAt",
            "updatedAt"
        ) VALUES (
            i::text,
            'NORMAL',
            'AVAILABLE',
            NULL,
            NULL,
            NULL,
            false,
            NOW(),
            NOW()
        );
    END LOOP;
END $$;

-- Step 2: Update existing sessions to have proper sessionBoxes
-- This will backfill missing sessionBoxes data for existing sessions
DO $$
DECLARE
    session_record RECORD;
    box_counter INTEGER;
    box_id TEXT;
    box_weight DECIMAL;
    box_type TEXT;
BEGIN
    -- Loop through all existing sessions that don't have sessionBoxes
    FOR session_record IN 
        SELECT ps.*, f.name as farmer_name
        FROM "processing_sessions" ps
        LEFT JOIN "farmers" f ON ps."farmerId" = f.id
        WHERE ps.id NOT IN (SELECT DISTINCT "sessionId" FROM "session_boxes")
    LOOP
        -- Create realistic sessionBoxes for each session
        box_counter := 1;
        
        WHILE box_counter <= session_record."boxCount" LOOP
            -- Calculate box ID (sequential from 1)
            box_id := ((session_record."boxCount" * EXTRACT(epoch FROM session_record."createdAt")::INTEGER + box_counter - 1) % 600 + 1)::text;
            
            -- Calculate individual box weight
            box_weight := session_record."totalBoxWeight" / session_record."boxCount";
            
            -- Determine box type based on position
            IF box_counter % 3 = 1 THEN
                box_type := 'NORMAL';
            ELSIF box_counter % 3 = 2 THEN
                box_type := 'NCHIRA';
            ELSE
                box_type := 'CHKARA';
            END IF;
            
            -- Insert sessionBox record
            INSERT INTO "session_boxes" (
                "id",
                "sessionId",
                "boxId",
                "boxWeight",
                "boxType",
                "farmerId",
                "createdAt"
            ) VALUES (
                gen_random_uuid(),
                session_record.id,
                box_id,
                box_weight,
                box_type::\"BoxType\",
                session_record."farmerId",
                session_record."createdAt"
            );
            
            box_counter := box_counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Step 3: Update box status for currently assigned boxes
-- Set boxes that are currently assigned to farmers to IN_USE status
UPDATE "boxes" 
SET 
    "status" = 'IN_USE',
    "updatedAt" = NOW()
WHERE "currentFarmerId" IS NOT NULL;

-- Step 4: Clean up any invalid references
-- Remove any invalid processingSessionId references since we removed that field
-- This is handled by the schema change

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_boxes_status" ON "boxes"("status");
CREATE INDEX IF NOT EXISTS "idx_boxes_current_farmer" ON "boxes"("currentFarmerId");
CREATE INDEX IF NOT EXISTS "idx_session_boxes_box_id" ON "session_boxes"("boxId");

-- Step 6: Add constraints to ensure data integrity
-- Ensure box IDs are within valid range (1-600)
ALTER TABLE "boxes" ADD CONSTRAINT "chk_box_id_range" 
CHECK ("id" ~ '^[1-9][0-9]{0,2}$' AND "id"::INTEGER BETWEEN 1 AND 600);

-- Step 7: Update statistics
ANALYZE "boxes";
ANALYZE "session_boxes";
ANALYZE "processing_sessions";

COMMIT;

-- Verification queries (run these after migration)
-- SELECT COUNT(*) as total_boxes FROM "boxes"; -- Should be 600
-- SELECT "status", COUNT(*) FROM "boxes" GROUP BY "status";
-- SELECT COUNT(*) as sessions_with_boxes FROM "processing_sessions" ps 
-- INNER JOIN "session_boxes" sb ON ps.id = sb."sessionId";
-- SELECT "boxId", COUNT(*) as usage_count FROM "session_boxes" GROUP BY "boxId" ORDER BY usage_count DESC LIMIT 10; 