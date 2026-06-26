import type { DbStaff, DbStaffInsert } from "@/lib/supabase/types";
import type { RestDayKey } from "./rest-days";
import type { StandardShift } from "./shifts";
import type { StaffDepartment, StaffInput, StaffMember, StaffStatus } from "./types";

function normalizeStaffStatus(status: unknown): StaffStatus {
  return status === "Inactivo" || status === "\u79bb\u804c" ? "Inactivo" : "Activo";
}

export function mapStaffRow(row: DbStaff): StaffMember {
  return {
    id: row.id,
    name: row.name,
    department: (row.department as StaffDepartment) ?? "Sala",
    position: row.position,
    role: row.role_id,
    phone: row.phone ?? "",
    email: row.email ?? "",
    hireDate: row.hire_date ?? "",
    contractType: row.contract_type ?? "",
    weeklyHours: row.weekly_hours,
    hourlyRate: Number(row.hourly_rate),
    status: normalizeStaffStatus(row.status),
    fixedRestDay1: row.fixed_rest_day_1 as RestDayKey | null,
    fixedRestDay2: row.fixed_rest_day_2 as RestDayKey | null,
    fixedShift: row.fixed_shift as StandardShift | null,
  };
}

export function mapStaffInput(input: StaffInput): DbStaffInsert {
  return {
    name: input.name.trim(),
    department: input.department,
    position: input.position.trim(),
    role_id: input.role,
    phone: input.phone.trim() || null,
    email: input.email.trim().toLowerCase() || null,
    hire_date: input.hireDate || null,
    contract_type: input.contractType.trim() || null,
    weekly_hours: input.weeklyHours,
    hourly_rate: input.hourlyRate,
    status: input.status,
    fixed_rest_day_1: input.fixedRestDay1,
    fixed_rest_day_2: input.fixedRestDay2,
    fixed_shift: input.fixedShift,
  };
}
