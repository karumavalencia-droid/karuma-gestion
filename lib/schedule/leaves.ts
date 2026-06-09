import type { LeaveRequest } from "./types";

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "leave-1",
    employeeId: "edu",
    employee: "Edu",
    day: "周日",
    reason: "家庭原因",
    status: "已批准",
  },
];
