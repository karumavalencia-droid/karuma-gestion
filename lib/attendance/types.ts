export type AttendanceEventType = "in" | "out";

export type AttendanceEvent = {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  type: AttendanceEventType;
  occurredAt: string;
  receivedAt: string;
  businessDate: string;
  source: "kiosk" | "mobile" | "admin";
  offline: boolean;
  deviceId: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  distanceFromStore: number | null;
};

export type AttendanceEmployeeStatus = {
  employeeId: string;
  employeeName: string;
  department: string;
  nextAction: AttendanceEventType;
  lastType: AttendanceEventType | null;
  lastTime: string | null;
  pendingCount?: number;
};

export type AttendanceAnomaly =
  | "late"
  | "early"
  | "absent"
  | "missing-out"
  | "duplicate"
  | "offline"
  | "unscheduled";

export type AttendanceDayRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  planned: boolean;
  plannedLabel: string;
  firstIn: string | null;
  lastOut: string | null;
  currentState: "not-started" | "working" | "finished";
  workedMinutes: number;
  anomalies: AttendanceAnomaly[];
  events: AttendanceEvent[];
};

export type AttendanceDayReport = {
  date: string;
  generatedAt: string;
  rows: AttendanceDayRow[];
  summary: {
    scheduled: number;
    present: number;
    working: number;
    finished: number;
    absent: number;
    late: number;
    early: number;
    missingOut: number;
    offline: number;
  };
};

export type PendingPunch = {
  requestId: string;
  employeeId: string;
  pin: string;
  type: AttendanceEventType;
  clientOccurredAt: string;
  queuedAt: string;
};
