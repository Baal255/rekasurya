import type Database from "better-sqlite3";
import { z } from "zod";
import { appendAudit } from "../audit";
import type { DeviceRecord } from "../types";

export const DeviceCommandInputZ = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("SET_PWM_DUTY"),
    pwm_duty: z.number().int().min(0).max(100),
  }),
  z.object({
    command: z.literal("SET_MAINTENANCE_MODE"),
    enabled: z.boolean(),
    duration_minutes: z.number().int().min(10).max(240).default(90),
  }),
  z.object({
    command: z.literal("REQUEST_DIAGNOSTIC_PING"),
  }),
]);

export function executeDeviceCommand(
  db: Database.Database,
  deviceId: string,
  rawInput: unknown,
  actor: { role: string; name: string }
): {
  device: DeviceRecord;
  message: string;
  appliedPwmDuty?: number;
  clampedBySafety?: boolean;
} {
  const input = DeviceCommandInputZ.parse(rawInput);
  const device = db
    .prepare(
      `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
       FROM devices d
       JOIN corridors c ON d.corridor_id = c.id
       WHERE d.id = ?`
    )
    .get(deviceId) as DeviceRecord | undefined;

  if (!device) {
    throw new Error(`Perangkat ${deviceId} tidak ditemukan.`);
  }

  const nowIso = new Date().toISOString();

  if (input.command === "SET_PWM_DUTY") {
    const is12V = device.battery_profile.startsWith("12.8V");
    const uvloV = is12V ? 11.0 : 22.0;

    if (device.batt_v < uvloV || device.soc_pct < 12) {
      throw new Error(
        `Simulasi UVLO menolak perintah: baterai ${device.batt_v.toFixed(1)} V (SoC ${device.soc_pct.toFixed(0)}%) di bawah ambang demo (${uvloV.toFixed(1)} V / 12%).`
      );
    }

    let targetDuty = input.pwm_duty;
    let clampedBySafety = false;

    if (device.lux >= 50 && targetDuty > 0) {
      targetDuty = 0;
      clampedBySafety = true;
    } else if (device.temp_driver_c >= 65 && targetDuty > 40) {
      targetDuty = 40;
      clampedBySafety = true;
    } else if (device.soc_pct < 30 && targetDuty > 50) {
      targetDuty = 50;
      clampedBySafety = true;
    }

    const nextLoadI = targetDuty === 0 ? 0.0 : Number(((40 * (targetDuty / 100)) / 24.8).toFixed(2));
    const nextLoadP = Number((device.load_v * nextLoadI).toFixed(2));

    db.prepare(`UPDATE devices SET pwm_duty = ?, load_i = ?, load_p = ?, last_seen_at = ? WHERE id = ?`).run(
      targetDuty,
      nextLoadI,
      nextLoadP,
      nowIso,
      device.id
    );

    appendAudit(db, {
      actorRole: actor.role,
      actorName: actor.name,
      action: "DEVICE_COMMAND_PWM",
      entityType: "device",
      entityId: device.id,
      detail: {
        requestedDuty: input.pwm_duty,
        appliedDuty: targetDuty,
        clampedBySafety,
      },
      createdAt: nowIso,
    });

    const updated = db
      .prepare(
        `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
         FROM devices d JOIN corridors c ON d.corridor_id = c.id WHERE d.id = ?`
      )
      .get(device.id) as DeviceRecord;

    return {
      device: updated,
      appliedPwmDuty: targetDuty,
      clampedBySafety,
      message: clampedBySafety
        ? `Simulasi membatasi PWM ke ${targetDuty}% berdasarkan iluminansi, SoC, atau suhu driver.`
        : `PWM simulasi ${device.id} diatur ke ${targetDuty}%.`,
    };
  }

  if (input.command === "SET_MAINTENANCE_MODE") {
    const maintUntil = input.enabled
      ? new Date(Date.now() + input.duration_minutes * 60 * 1000).toISOString()
      : null;

    db.prepare(`UPDATE devices SET maintenance_until = ?, last_seen_at = ? WHERE id = ?`).run(
      maintUntil,
      nowIso,
      device.id
    );

    appendAudit(db, {
      actorRole: actor.role,
      actorName: actor.name,
      action: input.enabled ? "DEVICE_MAINTENANCE_ENABLED" : "DEVICE_MAINTENANCE_CLEARED",
      entityType: "device",
      entityId: device.id,
      detail: { enabled: input.enabled, maintenanceUntil: maintUntil },
      createdAt: nowIso,
    });

    const updated = db
      .prepare(
        `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
         FROM devices d JOIN corridors c ON d.corridor_id = c.id WHERE d.id = ?`
      )
      .get(device.id) as DeviceRecord;

    return {
      device: updated,
      message: input.enabled
        ? `Mode servis simulasi aktif selama ${input.duration_minutes} menit untuk ${device.id}.`
        : `Mode servis simulasi dinonaktifkan untuk ${device.id}.`,
    };
  }

  db.prepare(`UPDATE devices SET last_seen_at = ? WHERE id = ?`).run(nowIso, device.id);
  appendAudit(db, {
    actorRole: actor.role,
    actorName: actor.name,
    action: "DEVICE_DIAGNOSTIC_PING",
    entityType: "device",
    entityId: device.id,
    detail: { topic: `rekasurya/v1/${device.id}/cmd`, payload: { cmd: "PING_TELEMETRY" } },
    createdAt: nowIso,
  });

  const updated = db
    .prepare(
      `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
       FROM devices d JOIN corridors c ON d.corridor_id = c.id WHERE d.id = ?`
    )
    .get(device.id) as DeviceRecord;

  return {
    device: updated,
    message: `Ping simulasi untuk ${device.id} tercatat di log demo.`,
  };
}
