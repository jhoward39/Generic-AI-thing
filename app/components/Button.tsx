import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
  type = "button",
}: ButtonProps) {
  const baseStyles =
    "px-6 py-3 rounded-lg transition-all duration-300 ease-in-out font-medium";

  const variantStyles = {
    primary:
      "bg-gray-300 border border-gray-300 text-gray-600 hover:bg-green-900 hover:text-white active:bg-green-900",
    secondary: "bg-gray-600 text-black hover:bg-gray-700",
  };

  const disabledStyles =
    "disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-gray-500";

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
    >
      {children}
    </button>
  );
}
