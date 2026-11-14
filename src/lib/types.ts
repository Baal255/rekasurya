export type OperationalRole = "OPERATOR_DISHUB" | "TEKNISI_SKYLIFT" | "AUDITOR_PJU";

export type DeviceVariant = "KIT_KONVERSI" | "RETROFIT_PJUTS";

export type BatteryProfile = "25.6V_40Ah" | "25.6V_50Ah" | "12.8V_40Ah" | "12.8V_12Ah_BENCH";

export type DeviceStatus = "NORMAL" | "WARNING_EWMA" | "FAULT" | "TAMPER_CRITICAL" | "OFFLINE";

export type FaultFamily = "NONE" | "F1" | "F2" | "F3" | "F4" | "F5" | "F6";

export type WorkOrderStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "VERIFIED" | "CLOSED";

export type CitizenReportStatus = "Open" | "Responded" | "Process" | "Resolved";

export interface SparePartRecommendation {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedIdr: number;
  notes: string;
}

export interface CorridorRecord {
  id: string;
  name: string;
  kabupaten: string;
  road_class: "Arteri" | "Kolektor" | "Lokal";
  target_lux: number;
  managing_agency: string;
  center_lat: number;
  center_lng: number;
  pole_count: number;
}

export interface DeviceRecord {
  id: string;
  corridor_id: string;
  corridor_name?: string;
  kabupaten?: string;
  road_class?: string;
  managing_agency?: string;
  pole_label: string;
  variant: DeviceVariant;
  battery_profile: BatteryProfile;
  legacy_lamp: string;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  status: DeviceStatus;
  fault_family: FaultFamily;
  fault_sub_code: string;
  soc_pct: number;
  soh_pct: number;
  pv_v: number;
  pv_i: number;
  pv_p: number;
  batt_v: number;
  batt_i: number;
  batt_p: number;
  load_v: number;
  load_i: number;
  load_p: number;
  temp_panel_c: number;
  temp_batt_c: number;
  temp_scc_c: number;
  temp_driver_c: number;
  temp_board_c: number;
  lux: number;
  pir_active: number;
  pwm_duty: number;
  door_open: number;
  accel_g: number;
  backup_cell_v: number;
  on_backup_cell: number;
  expected_p_chg: number;
  residual_w: number;
  ewma_z: number;
  ewma_ucl: number;
  ewma_lcl: number;
  neighbor_z_median: number;
  spatial_verdict: "NORMAL" | "CUACA_SERUAS" | "ANOMALI_LOKAL";
  uptime_30d_pct: number;
  commissioned_at: string;
  last_inspection_at: string;
  maintenance_until: string | null;
  active_scenario: string;
  data_source: "SIMULATED" | "LIVE_MQTT";
  last_seen_at: string;
}

export interface TelemetryHistoryRecord {
  id: number;
  device_id: string;
  recorded_at: string;
  pv_v: number;
  pv_i: number;
  pv_p: number;
  batt_v: number;
  batt_i: number;
  load_v: number;
  load_i: number;
  load_p: number;
  soc_pct: number;
  temp_panel_c: number;
  temp_batt_c: number;
  lux: number;
  pwm_duty: number;
  expected_p_chg: number;
  residual_w: number;
  ewma_z: number;
  data_source: "SIMULATED" | "LIVE_MQTT";
}

export interface FaultEventRecord {
  id: string;
  device_id: string;
  fault_family: FaultFamily;
  sub_code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  root_cause: string;
  recommended_parts_json: string;
  detection_latency_sec: number;
  confidence: number;
  ewma_z: number;
  spatial_verdict: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  detected_at: string;
  resolved_at: string | null;
}

export interface WorkOrderRecord {
  id: string;
  device_id: string;
  fault_event_id: string | null;
  citizen_report_id: string | null;
  priority: "DARURAT" | "TINGGI" | "SEDANG" | "RENDAH";
  status: WorkOrderStatus;
  title: string;
  diagnosis_summary: string;
  assigned_team: string;
  truck_unit: string;
  parts_checklist_json: string;
  technician_notes: string;
  checkin_at: string | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  verification_passed: number;
  sla_deadline: string;
  created_at: string;
  updated_at: string;
}

export interface CitizenTimelineEntry {
  timestamp: string;
  status: CitizenReportStatus;
  actor: string;
  note: string;
}

export interface CitizenReportRecord {
  id: string;
  channel: "Web ULAS" | "Lapor Mas Wali (WA)" | "Solo Destination" | "SP4N LAPOR!";
  reporter_alias: string;
  phone_last4: string;
  category: string;
  corridor_name: string;
  description: string;
  lat: number;
  lng: number;
  matched_device_id: string | null;
  linked_work_order_id: string | null;
  status: CitizenReportStatus;
  follow_up_of: string | null;
  timeline_json: string;
  created_at: string;
}

export interface AiInvocationRecord {
  id: string;
  device_id: string;
  schema_version: string;
  adapter_mode: "MOCK_EWMA_DETERMINISTIC" | "EXTERNAL_POC_ASTRA" | "FALLBACK_LOCAL";
  model_version: string;
  input_hash: string;
  predicted_p_chg: number;
  residual_w: number;
  ewma_z: number;
  spatial_score: number;
  fault_family: FaultFamily;
  sub_code: string;
  confidence: number;
  uncertainty: number;
  latency_ms: number;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  seq: number;
  actor_role: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail_json: string;
  prev_hash: string;
  entry_hash: string;
  created_at: string;
}
