import React from "react";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";

/**
 * Generic DataTable Component
 *
 * @param {Array} columns - Array of column definitions: { header: string, accessor: string | function, className: string, sortable: boolean }
 * @param {Array} data - Array of data objects
 * @param {Object} pagination - Pagination info: { currentPage, totalPages, totalCount, onPageChange }
 * @param {Object} sorting - Sorting info: { column, direction, onSort }
 * @param {boolean} isLoading - Loading state
 */
const DataTable = ({ columns, data, pagination, sorting, isLoading }) => {
  const handleSort = (columnKey) => {
    if (sorting && sorting.onSort) {
      sorting.onSort(columnKey);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer hover:bg-gray-100" : ""
                  } ${col.className || ""}`}
                  onClick={() => col.sortable && handleSort(col.accessor)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {sorting &&
                      sorting.column === col.accessor &&
                      (sorting.direction === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Memuat data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Tidak ada data ditemukan.
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-blue-50/30 transition-colors duration-150"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${
                        col.className || ""
                      }`}
                    >
                      {typeof col.accessor === "function"
                        ? col.accessor(row)
                        : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-medium text-gray-900">
              {pagination.totalCount}
            </span>{" "}
            data
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage === 1}
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Halaman {pagination.currentPage} dari {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
