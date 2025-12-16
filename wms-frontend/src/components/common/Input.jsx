import React, { forwardRef } from "react";

const Input = forwardRef(
  (
    { label, error, className = "", containerClassName = "", ...props },
    ref
  ) => {
    return (
      <div className={`${containerClassName}`}>
        {label && (
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
            {label}
          </label>
        )}
        {props.type === "textarea" ? (
          <textarea
            ref={ref}
            className={`w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-800 resize-none ${
              error ? "border-red-500 focus:ring-red-200" : ""
            } ${className}`}
            {...props}
          />
        ) : (
          <input
            ref={ref}
            className={`w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-800 ${
              error ? "border-red-500 focus:ring-red-200" : ""
            } ${className}`}
            {...props}
          />
        )}
        {error && (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
