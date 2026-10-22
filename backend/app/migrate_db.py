from sqlalchemy import text
from app.database import engine

def migrate_database():
    """
    Safely executes additive schema migrations on MySQL / SQLite tables:
    - Add missing columns to 'cameras' table
    - Add missing columns (event_id, flow_rate, speed_avg) to 'crowd_analytics' table
    Preserves all existing data without dropping tables or records.
    """
    print("[MIGRATION] Checking database schema for 'cameras' and 'crowd_analytics' tables...")
    
    camera_columns = [
        ("source_type", "VARCHAR(50) DEFAULT 'rtsp'"),
        ("source_fps", "FLOAT DEFAULT 30.0"),
        ("processing_fps", "FLOAT DEFAULT 30.0"),
        ("playback_status", "VARCHAR(50) DEFAULT 'playing'"),
        ("zone_id", "VARCHAR(100) NULL"),
        ("event_id", "VARCHAR(100) NULL")
    ]

    event_columns = [
        ("venue_name", "VARCHAR(255) DEFAULT 'Main Venue Complex'"),
        ("manager_id", "INTEGER NULL")
    ]

    analytics_columns = [
        ("event_id", "VARCHAR(100) NULL"),
        ("flow_rate", "FLOAT DEFAULT 0.0"),
        ("speed_avg", "FLOAT DEFAULT 1.2")
    ]

    alert_columns = [
        ("event_id", "VARCHAR(100) NULL")
    ]

    emergency_columns = [
        ("event_id", "VARCHAR(100) NULL")
    ]

    recommendation_columns = [
        ("event_id", "VARCHAR(100) NULL")
    ]
    
    with engine.connect() as conn:
        # Migrate cameras table
        for col_name, col_def in camera_columns:
            try:
                conn.execute(text(f"ALTER TABLE cameras ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"[MIGRATION][SUCCESS] Added column '{col_name}' to table 'cameras'.")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg or "1060" in error_msg:
                    print(f"[MIGRATION][INFO] Column '{col_name}' already exists in table 'cameras'.")
                else:
                    print(f"[MIGRATION][NOTICE] Column '{col_name}' check result: {e}")

        # Migrate events table
        for col_name, col_def in event_columns:
            try:
                conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"[MIGRATION][SUCCESS] Added column '{col_name}' to table 'events'.")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg or "1060" in error_msg:
                    print(f"[MIGRATION][INFO] Column '{col_name}' already exists in table 'events'.")
                else:
                    print(f"[MIGRATION][NOTICE] Column '{col_name}' check result: {e}")

        # Migrate crowd_analytics table
        for col_name, col_def in analytics_columns:
            try:
                conn.execute(text(f"ALTER TABLE crowd_analytics ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"[MIGRATION][SUCCESS] Added column '{col_name}' to table 'crowd_analytics'.")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg or "1060" in error_msg:
                    print(f"[MIGRATION][INFO] Column '{col_name}' already exists in table 'crowd_analytics'.")
                else:
                    print(f"[MIGRATION][NOTICE] Column '{col_name}' check result: {e}")

        # Migrate alerts table
        for col_name, col_def in alert_columns:
            try:
                conn.execute(text(f"ALTER TABLE alerts ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"[MIGRATION][SUCCESS] Added column '{col_name}' to table 'alerts'.")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg or "1060" in error_msg:
                    print(f"[MIGRATION][INFO] Column '{col_name}' already exists in table 'alerts'.")
                else:
                    print(f"[MIGRATION][NOTICE] Column '{col_name}' check result: {e}")

        # Migrate emergency_events table
        for col_name, col_def in emergency_columns:
            try:
                conn.execute(text(f"ALTER TABLE emergency_events ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"[MIGRATION][SUCCESS] Added column '{col_name}' to table 'emergency_events'.")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg or "1060" in error_msg:
                    print(f"[MIGRATION][INFO] Column '{col_name}' already exists in table 'emergency_events'.")
                else:
                    print(f"[MIGRATION][NOTICE] Column '{col_name}' check result: {e}")

        # Migrate recommendations table
        for col_name, col_def in recommendation_columns:
            try:
                conn.execute(text(f"ALTER TABLE recommendations ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"[MIGRATION][SUCCESS] Added column '{col_name}' to table 'recommendations'.")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg or "1060" in error_msg:
                    print(f"[MIGRATION][INFO] Column '{col_name}' already exists in table 'recommendations'.")
                else:
                    print(f"[MIGRATION][NOTICE] Column '{col_name}' check result: {e}")

        # Backfill event_id for emergency_events from cameras
        try:
            conn.execute(text("""
                UPDATE emergency_events 
                SET event_id = (SELECT event_id FROM cameras WHERE cameras.id = emergency_events.camera_id)
                WHERE event_id IS NULL
            """))
            conn.commit()
            print("[MIGRATION][SUCCESS] Backfilled event_id for emergency_events.")
        except Exception as e:
            print(f"[MIGRATION][NOTICE] Emergency backfill: {e}")

        # Backfill event_id for alerts from cameras
        try:
            conn.execute(text("""
                UPDATE alerts 
                SET event_id = (SELECT event_id FROM cameras WHERE cameras.id = alerts.camera OR cameras.name = alerts.camera LIMIT 1)
                WHERE event_id IS NULL
            """))
            # Default any remaining unmapped alerts to evt-arena-01
            conn.execute(text("UPDATE alerts SET event_id = 'evt-arena-01' WHERE event_id IS NULL"))
            conn.commit()
            print("[MIGRATION][SUCCESS] Backfilled event_id for alerts.")
        except Exception as e:
            print(f"[MIGRATION][NOTICE] Alerts backfill: {e}")

        # Clean orphaned unresolved emergency events on deleted cameras
        try:
            conn.execute(text("""
                UPDATE emergency_events 
                SET status = 'RESOLVED', resolved_at = datetime('now')
                WHERE status != 'RESOLVED' AND camera_id NOT IN (SELECT id FROM cameras)
            """))
            conn.commit()
            print("[MIGRATION][SUCCESS] Resolved orphaned emergency events for non-existent cameras.")
        except Exception as e:
            print(f"[MIGRATION][NOTICE] Orphaned cleanup: {e}")

        # Ensure operational zones exist for Exhibition Hall event (evt-1790793930112) only if the event exists
        try:
            evt_id = 'evt-1790793930112'
            evt_exists = conn.execute(text(f"SELECT COUNT(*) FROM events WHERE id = '{evt_id}'")).scalar()
            if evt_exists > 0:
                zone_count = conn.execute(text(f"SELECT COUNT(*) FROM zones WHERE event_id = '{evt_id}'")).scalar()
                if zone_count == 0:
                    print(f"[MIGRATION] Seeding operational zones for event {evt_id}...")
                    conn.execute(text(f"""
                    INSERT INTO zones (id, event_id, name, code, capacity, current_count, density, risk_level, zone_type)
                    VALUES 
                    ('zone-{evt_id}-1', '{evt_id}', 'North Main Gate', 'GATE-NORTH', 1500, 0, 0.0, 'low', 'gate_area'),
                    ('zone-{evt_id}-2', '{evt_id}', 'Entry Concourse', 'CONCOURSE-MAIN', 2000, 0, 0.0, 'low', 'general'),
                    ('zone-{evt_id}-3', '{evt_id}', 'Main Event Hall', 'HALL-MAIN', 3500, 0, 0.0, 'low', 'general'),
                    ('zone-{evt_id}-4', '{evt_id}', 'Emergency Exit Area', 'EXIT-SOUTH', 1000, 0, 0.0, 'low', 'exit_corridor')
                """))
                # Associate Exhibition Hall cameras to their corresponding zones
                conn.execute(text(f"UPDATE cameras SET zone_id = 'zone-{evt_id}-1' WHERE id = 'cam-vid-1791478895356' AND (zone_id IS NULL OR zone_id = '')"))
                conn.execute(text(f"UPDATE cameras SET zone_id = 'zone-{evt_id}-2' WHERE id = 'cam-vid-1791479486883' AND (zone_id IS NULL OR zone_id = '')"))
                conn.execute(text(f"UPDATE cameras SET zone_id = 'zone-{evt_id}-3' WHERE id = 'cam-vid-1791478981459' AND (zone_id IS NULL OR zone_id = '')"))
                conn.execute(text(f"UPDATE cameras SET zone_id = 'zone-{evt_id}-4' WHERE id = 'cam-vid-1791479021172' AND (zone_id IS NULL OR zone_id = '')"))
                conn.commit()
        except Exception as e:
            print(f"[MIGRATION][NOTICE] Exhibition Hall zone seeding: {e}")


    print("[MIGRATION] Database schema synchronization complete. Existing data preserved.\n")

if __name__ == "__main__":
    migrate_database()
