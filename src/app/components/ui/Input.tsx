import React from "react";
import clsx from "clsx";

type InputVariant = "default" | "search" | "error";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: InputVariant;
  error?: string;
  helperText?: string;
}

export default function Input({
  label,
  variant = 'default',
  error,
  helperText,
  className,
  ...props
}: InputProps) {
  const baseStyles = " w-full px-4 py-2 rounded-md border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    default: "border-gray-300 focus:border-orange-500 focus:ring-orange-400",
    search: "pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-400",
    error: "border-red-500 focus:border-red-500 focus:ring-red-400"
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={clsx(
            baseStyles,
            variants[error ? 'error' : variant],
            className
          )}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <p className={clsx(
          "mt-1 text-sm",
          error ? "text-red-500" : "text-gray-500"
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}