import React from "react";
import { Calendar } from "lucide-react";

const DateRangeFilter = ({ startDate, endDate, onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 text-gray-600">
        <Calendar size={18} className="text-blue-500" />
        <span className="text-sm font-medium">Filter Tanggal:</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange("startDate", e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange("endDate", e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;
