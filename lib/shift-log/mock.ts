export type ShiftLogStatus = "待处理" | "处理中" | "已完成";

export type ShiftLog = {
  id: string;
  date: string;
  shift: string;
  responsible: string;
  manager: string;
  staffCount: number;
  issues: string;
  stockShortage: string;
  equipmentIssues: string;
  customerComplaints: string;
  cashVariance: string;
  notes: string;
  status: ShiftLogStatus;
};

export const SHIFT_LOG_STATUS_STYLE: Record<ShiftLogStatus, string> = {
  待处理: "bg-amber-50 text-amber-700 ring-amber-600/20",
  处理中: "bg-blue-50 text-blue-700 ring-blue-600/20",
  已完成: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const SHIFT_LOG_SEED: ShiftLog[] = [
  {
    id: "sl-001",
    date: "2026-06-07",
    shift: "晚班",
    responsible: "Maria",
    manager: "Zhou",
    staffCount: 12,
    issues: "三文鱼库存不足",
    stockShortage: "三文鱼、金枪鱼",
    equipmentIssues: "冷库门偶尔打不开",
    customerComplaints: "22:30 客诉一桌",
    cashVariance: "无",
    notes: "已通知老板采购",
    status: "待处理",
  },
  {
    id: "sl-002",
    date: "2026-06-07",
    shift: "午班",
    responsible: "Wang",
    manager: "Maria",
    staffCount: 10,
    issues: "无重大异常",
    stockShortage: "无",
    equipmentIssues: "",
    customerComplaints: "",
    cashVariance: "无",
    notes: "午市客流正常",
    status: "已完成",
  },
  {
    id: "sl-003",
    date: "2026-06-06",
    shift: "晚班",
    responsible: "Laura",
    manager: "Maria",
    staffCount: 11,
    issues: "服务员人手略紧",
    stockShortage: "毛豆",
    equipmentIssues: "2号烤箱温度偏高",
    customerComplaints: "",
    cashVariance: "-€3.50",
    notes: "已调整排班",
    status: "处理中",
  },
  {
    id: "sl-004",
    date: "2026-06-05",
    shift: "午班",
    responsible: "Ana",
    manager: "Maria",
    staffCount: 9,
    issues: "无",
    stockShortage: "",
    equipmentIssues: "",
    customerComplaints: "",
    cashVariance: "无",
    notes: "一切正常",
    status: "已完成",
  },
  {
    id: "sl-005",
    date: "2026-06-04",
    shift: "晚班",
    responsible: "Pedro",
    manager: "Maria",
    staffCount: 8,
    issues: "洗碗区积水",
    stockShortage: "无",
    equipmentIssues: "洗碗机排水慢",
    customerComplaints: "",
    cashVariance: "无",
    notes: "已报修",
    status: "待处理",
  },
];

export function isSameWeek(dateStr: string, ref: Date): boolean {
  const d = new Date(`${dateStr}T12:00:00`);
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}
