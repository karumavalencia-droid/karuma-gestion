import type { StaffMember } from "./types";

type StaffSeed = Omit<
  StaffMember,
  "phone" | "email" | "hireDate" | "contractType" | "hourlyRate" | "fixedShift"
> &
  Partial<Pick<StaffMember, "phone" | "email" | "hireDate" | "contractType" | "hourlyRate" | "fixedShift">>;

function staff(row: StaffSeed): StaffMember {
  const slug = row.id.replace(/-/g, "");
  return {
    phone: "",
    email: `${slug}@karuma.es`,
    hireDate: "",
    contractType: "全职",
    hourlyRate: 0,
    ...row,
    fixedShift: row.fixedShift ?? null,
  };
}

/** 第一批真实员工数据 */
export const STAFF_MEMBERS: StaffMember[] = [
  // Sala
  staff({
    id: "jhoan",
    name: "Jhoan",
    department: "Sala",
    position: "服务员",
    role: "waiter",
    weeklyHours: null,
    status: "在职",
    fixedRestDay1: "Thursday",
    fixedRestDay2: null,
  }),
  staff({
    id: "isabel",
    name: "Isabel",
    department: "Sala",
    position: "服务员",
    role: "waiter",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Sunday",
    fixedRestDay2: null,
  }),
  staff({
    id: "celeste",
    name: "Celeste",
    department: "Sala",
    position: "服务员",
    role: "waiter",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Tuesday",
    fixedRestDay2: null,
  }),
  staff({
    id: "edu",
    name: "Edu",
    department: "Sala",
    position: "服务员",
    role: "waiter",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Wednesday",
    fixedRestDay2: null,
  }),
  // Sushi
  staff({
    id: "jeferson",
    name: "Jeferson",
    department: "Sushi",
    position: "寿司师傅",
    role: "sushi",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Sunday",
    fixedRestDay2: "Monday",
  }),
  staff({
    id: "newton",
    name: "Newton",
    department: "Sushi",
    position: "寿司师傅",
    role: "sushi",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Friday",
    fixedRestDay2: "Saturday",
  }),
  staff({
    id: "sebastian-rodriguez",
    name: "Sebastian Rodriguez",
    department: "Sushi",
    position: "寿司师傅",
    role: "sushi",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Tuesday",
    fixedRestDay2: "Wednesday",
  }),
  staff({
    id: "sebastian-gomez",
    name: "Sebastian Gomez",
    department: "Sushi",
    position: "寿司师傅",
    role: "sushi",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Saturday",
    fixedRestDay2: "Sunday",
  }),
  staff({
    id: "hoscar",
    name: "Hoscar",
    department: "Sushi",
    position: "寿司师傅",
    role: "sushi",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Wednesday",
    fixedRestDay2: null,
  }),
  staff({
    id: "junfeng",
    name: "Junfeng",
    department: "Sushi",
    position: "寿司师傅",
    role: "sushi",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: null,
    fixedRestDay2: null,
  }),
  // Hot Kitchen
  staff({
    id: "mauricio",
    name: "Mauricio",
    department: "Hot Kitchen",
    position: "厨房",
    role: "kitchen",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Thursday",
    fixedRestDay2: "Friday",
  }),
  staff({
    id: "alex",
    name: "Alex",
    department: "Hot Kitchen",
    position: "厨房",
    role: "kitchen",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Thursday",
    fixedRestDay2: null,
  }),
  // Dishwasher
  staff({
    id: "karina",
    name: "Karina",
    department: "Dishwasher",
    position: "洗碗",
    role: "dishwasher",
    weeklyHours: 40,
    status: "在职",
    fixedRestDay1: "Monday",
    fixedRestDay2: null,
  }),
];

export function findStaffMember(id: string): StaffMember | undefined {
  return STAFF_MEMBERS.find((s) => s.id === id);
}
