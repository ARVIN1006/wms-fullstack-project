import React from "react";

const VARIANTS = {
  primary: "bg-blue-100 text-blue-800 border-blue-200",
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  danger: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
};

const Badge = ({
  children,
  variant = "gray",
  className = "",
  size = "md", // sm, md
  icon,
}) => {
  const variantStyles = VARIANTS[variant] || VARIANTS.gray;
  const sizeStyles =
    size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border ${variantStyles} ${sizeStyles} ${className}`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
