/**
 * employee_key usado por las cuentas de gestión (sin employeeId) en
 * announcements y announcement_reads. Es texto libre en la BD, pero debe
 * mantenerse estable: cambiarla haría perder el estado leído/no leído del admin.
 */
export const ADMIN_ANNOUNCEMENT_KEY = "admin";

export const ANNOUNCEMENT_DEPARTMENTS = ["Sala", "Cocina"] as const;
export type AnnouncementDepartment = (typeof ANNOUNCEMENT_DEPARTMENTS)[number];
