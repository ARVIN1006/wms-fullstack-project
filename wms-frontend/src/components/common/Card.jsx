import React from "react";

const Card = ({ children, className = "", noPadding = false }) => {
  return (
    <div
      className={`glass-panel overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        noPadding ? "" : "p-6"
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
