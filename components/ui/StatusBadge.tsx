export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "purple";

const variants: Record<StatusBadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  neutral: "bg-gray-50 text-gray-600 ring-gray-500/20",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: StatusBadgeVariant;
}

export function StatusBadge({ children, variant = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
