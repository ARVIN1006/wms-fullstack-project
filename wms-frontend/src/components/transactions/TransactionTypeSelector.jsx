import React from "react";
import { Link } from "react-router-dom";

const TransactionTypeSelector = ({ transactionType }) => {
  return (
    <div className="flex justify-start mb-6 bg-white/30 backdrop-blur-md p-1.5 rounded-2xl w-fit">
      <Link
        to="/transactions/in"
        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
          transactionType === "IN"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
            : "text-gray-600 hover:text-indigo-600 hover:bg-white/50"
        }`}
      >
        📥 Barang Masuk (IN)
      </Link>
      <Link
        to="/transactions/out"
        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
          transactionType === "OUT"
            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105"
            : "text-gray-600 hover:text-orange-500 hover:bg-white/50"
        }`}
      >
        📤 Barang Keluar (OUT)
      </Link>
    </div>
  );
};

export default TransactionTypeSelector;
