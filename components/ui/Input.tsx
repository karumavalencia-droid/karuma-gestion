import { forwardRef } from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20 disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
