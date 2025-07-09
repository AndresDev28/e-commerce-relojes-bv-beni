import React from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export default function Button({
  children,
  variant = 'primary',
  disabled = false,
  className,
  ...props
}: ButtonProps) {
  const baseStyles = 
    "px-6 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer"
  const variants = {
    primary:
      "bg-blue-500 text-white hover:bg-ble-600 focus:ring-blue-400 disabled:bg-blue-300",
    secondary:
      "bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 focus:ring-blue-400 disabled:border-blue-200 disabled:text-blue-200",
  }

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        disabled && "cursor-not-allowed opacity-60",
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}