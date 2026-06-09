interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "success" | "warning";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-karuma-600 text-white hover:bg-karuma-700 active:bg-karuma-800",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
  outline: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  warning: "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs min-h-[36px]",
  md: "px-4 py-2.5 text-sm min-h-[44px]",
  lg: "px-4 py-4 text-base min-h-[80px]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
