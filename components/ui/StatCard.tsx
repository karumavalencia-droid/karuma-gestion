import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  iconColor = "bg-karuma-50 text-karuma-600",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-gray-500 sm:text-sm">{title}</p>
          <p className="mt-1.5 text-xl font-bold tracking-tight text-gray-900 sm:mt-2 sm:text-2xl">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-gray-500 sm:mt-1 sm:text-sm">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`mt-1.5 text-xs font-medium sm:mt-2 ${trendUp ? "text-emerald-600" : "text-red-600"}`}
            >
              {trend}
            </p>
          )}
        </div>
        <div className={`shrink-0 rounded-lg p-2.5 sm:p-3 ${iconColor}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}
