import React from "react";
import { Link } from "react-router-dom";

const TransactionTypeSelector = ({ transactionType }) => {
  const activeClass = "bg-blue-600 text-white";
  const inactiveClass = "bg-gray-200 text-gray-700 hover:bg-gray-300";

  return (
    <div className="flex justify-start space-x-2 mb-4">
      <Link
        to="/transactions/in"
        className={`font-bold py-2 px-4 rounded transition ${
          transactionType === "IN" ? activeClass : inactiveClass
        }`}
      >
        Barang Masuk (IN)
      </Link>
      <Link
        to="/transactions/out"
        className={`font-bold py-2 px-4 rounded transition ${
          transactionType === "OUT" ? activeClass : inactiveClass
        }`}
      >
        Barang Keluar (OUT)
      </Link>
    </div>
  );
};

export default TransactionTypeSelector;
