"use client";

type ShiftType = "午班" | "晚班" | "全天" | "休息" | "请假";

const SHIFT_HOURS: Record<ShiftType, string> = {
  午班: "12:00-16:30",
  晚班: "20:00-00:00",
  全天: "12:00-16:30\n20:00-00:00",
  休息: "",
  请假: "",
};

const SHIFT_COLORS: Record<ShiftType, string> = {
  午班: "bg-blue-50 text-blue-700 ring-blue-600/20",
  晚班: "bg-amber-50 text-amber-700 ring-amber-600/20",
  全天: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  休息: "bg-gray-50 text-gray-600 ring-gray-500/20",
  请假: "bg-red-50 text-red-700 ring-red-600/20",
};

const MY_SHIFTS: { id: string; date: string; shift: ShiftType }[] = [
  { id: "1", date: "2026-06-07", shift: "晚班" },
  { id: "2", date: "2026-06-08", shift: "休息" },
  { id: "3", date: "2026-06-09", shift: "晚班" },
  { id: "4", date: "2026-06-10", shift: "午班" },
];

export default function MySchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-900">Pedro · 洗碗</p>
        <p className="text-sm text-gray-500">我的排班（本地 mock 数据）</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">班次</th>
                <th className="px-4 py-3">时段</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MY_SHIFTS.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{row.date}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SHIFT_COLORS[row.shift]}`}
                    >
                      {row.shift}
                    </span>
                  </td>
                  <td className="whitespace-pre-line px-4 py-3.5 text-gray-600">
                    {SHIFT_HOURS[row.shift]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
