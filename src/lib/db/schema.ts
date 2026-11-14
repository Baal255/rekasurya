export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: "001_rekasurya_core",
    sql: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS corridors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kabupaten TEXT NOT NULL,
        road_class TEXT NOT NULL CHECK (road_class IN ('Arteri', 'Kolektor', 'Lokal')),
        target_lux REAL NOT NULL,
        managing_agency TEXT NOT NULL,
        center_lat REAL NOT NULL,
        center_lng REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        corridor_id TEXT NOT NULL REFERENCES corridors(id),
        pole_label TEXT NOT NULL,
        variant TEXT NOT NULL CHECK (variant IN ('KIT_KONVERSI', 'RETROFIT_PJUTS')),
        battery_profile TEXT NOT NULL,
        legacy_lamp TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        geofence_radius_m REAL NOT NULL DEFAULT 15.0,
        status TEXT NOT NULL CHECK (status IN ('NORMAL', 'WARNING_EWMA', 'FAULT', 'TAMPER_CRITICAL', 'OFFLINE')),
        fault_family TEXT NOT NULL DEFAULT 'NONE',
        fault_sub_code TEXT NOT NULL DEFAULT 'OK',
        soc_pct REAL NOT NULL,
        soh_pct REAL NOT NULL,
        pv_v REAL NOT NULL,
        pv_i REAL NOT NULL,
        pv_p REAL NOT NULL,
        batt_v REAL NOT NULL,
        batt_i REAL NOT NULL,
        batt_p REAL NOT NULL,
        load_v REAL NOT NULL,
        load_i REAL NOT NULL,
        load_p REAL NOT NULL,
        temp_panel_c REAL NOT NULL,
        temp_batt_c REAL NOT NULL,
        temp_scc_c REAL NOT NULL,
        temp_driver_c REAL NOT NULL,
        temp_board_c REAL NOT NULL,
        lux REAL NOT NULL,
        pir_active INTEGER NOT NULL DEFAULT 0,
        pwm_duty INTEGER NOT NULL DEFAULT 0,
        door_open INTEGER NOT NULL DEFAULT 0,
        accel_g REAL NOT NULL DEFAULT 1.0,
        backup_cell_v REAL NOT NULL DEFAULT 4.05,
        on_backup_cell INTEGER NOT NULL DEFAULT 0,
        expected_p_chg REAL NOT NULL DEFAULT 0,
        residual_w REAL NOT NULL DEFAULT 0,
        ewma_z REAL NOT NULL DEFAULT 0,
        ewma_ucl REAL NOT NULL DEFAULT 16.5,
        ewma_lcl REAL NOT NULL DEFAULT -16.5,
        neighbor_z_median REAL NOT NULL DEFAULT 0,
        spatial_verdict TEXT NOT NULL DEFAULT 'NORMAL',
        uptime_30d_pct REAL NOT NULL DEFAULT 99.2,
        commissioned_at TEXT NOT NULL,
        last_inspection_at TEXT NOT NULL,
        maintenance_until TEXT,
        active_scenario TEXT NOT NULL DEFAULT 'NORMAL_CLEAR_DAY',
        data_source TEXT NOT NULL DEFAULT 'SIMULATED',
        last_seen_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS telemetry_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL REFERENCES devices(id),
        recorded_at TEXT NOT NULL,
        pv_v REAL NOT NULL,
        pv_i REAL NOT NULL,
        pv_p REAL NOT NULL,
        batt_v REAL NOT NULL,
        batt_i REAL NOT NULL,
        load_v REAL NOT NULL,
        load_i REAL NOT NULL,
        load_p REAL NOT NULL,
        soc_pct REAL NOT NULL,
        temp_panel_c REAL NOT NULL,
        temp_batt_c REAL NOT NULL,
        lux REAL NOT NULL,
        pwm_duty INTEGER NOT NULL,
        expected_p_chg REAL NOT NULL,
        residual_w REAL NOT NULL,
        ewma_z REAL NOT NULL,
        data_source TEXT NOT NULL DEFAULT 'SIMULATED'
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry_history(device_id, recorded_at);

      CREATE TABLE IF NOT EXISTS fault_events (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id),
        fault_family TEXT NOT NULL,
        sub_code TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        title TEXT NOT NULL,
        root_cause TEXT NOT NULL,
        recommended_parts_json TEXT NOT NULL,
        detection_latency_sec REAL NOT NULL,
        confidence REAL NOT NULL,
        ewma_z REAL NOT NULL,
        spatial_verdict TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
        detected_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS work_orders (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id),
        fault_event_id TEXT REFERENCES fault_events(id),
        citizen_report_id TEXT,
        priority TEXT NOT NULL CHECK (priority IN ('DARURAT', 'TINGGI', 'SEDANG', 'RENDAH')),
        status TEXT NOT NULL CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'VERIFIED', 'CLOSED')),
        title TEXT NOT NULL,
        diagnosis_summary TEXT NOT NULL,
        assigned_team TEXT NOT NULL,
        truck_unit TEXT NOT NULL,
        parts_checklist_json TEXT NOT NULL,
        technician_notes TEXT NOT NULL DEFAULT '',
        checkin_at TEXT,
        checkin_lat REAL,
        checkin_lng REAL,
        verification_passed INTEGER NOT NULL DEFAULT 0,
        sla_deadline TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS citizen_reports (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        reporter_alias TEXT NOT NULL,
        phone_last4 TEXT NOT NULL,
        category TEXT NOT NULL,
        corridor_name TEXT NOT NULL,
        description TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        matched_device_id TEXT REFERENCES devices(id),
        linked_work_order_id TEXT REFERENCES work_orders(id),
        status TEXT NOT NULL CHECK (status IN ('Open', 'Responded', 'Process', 'Resolved')),
        follow_up_of TEXT,
        timeline_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_invocations (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id),
        schema_version TEXT NOT NULL,
        adapter_mode TEXT NOT NULL,
        model_version TEXT NOT NULL,
        input_hash TEXT NOT NULL,
        predicted_p_chg REAL NOT NULL,
        residual_w REAL NOT NULL,
        ewma_z REAL NOT NULL,
        spatial_score REAL NOT NULL,
        fault_family TEXT NOT NULL,
        sub_code TEXT NOT NULL,
        confidence REAL NOT NULL,
        uncertainty REAL NOT NULL,
        latency_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        seq INTEGER NOT NULL UNIQUE,
        actor_role TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        entry_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
];
