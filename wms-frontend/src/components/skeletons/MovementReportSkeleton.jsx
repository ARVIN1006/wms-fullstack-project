import React from "react";

const MovementReportSkeleton = () => {
  // 8 Columns (Date, Operator, SKU, Product, Qty, From, To, Reason)
  const columns = 8;

  const FilterItemSkeleton = () => (
    <div className="h-10 bg-gray-200 rounded-lg skeleton-shimmer bg-opacity-50"></div>
  );

  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded skeleton-shimmer w-3/4"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="glass-panel p-6 animate-pulse">
      {/* Title Placeholder */}
      <div className="h-8 bg-gray-300 rounded w-1/3 mb-6 skeleton-shimmer"></div>

      {/* Filter Form Skeleton */}
      <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <FilterItemSkeleton />
          <FilterItemSkeleton />
          <FilterItemSkeleton />
          <FilterItemSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <FilterItemSkeleton />
          </div>
          <div className="h-10 bg-indigo-200 rounded-lg skeleton-shimmer"></div>
        </div>
      </div>

      {/* Total Count & Export Button Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-4 bg-gray-300 rounded w-20 skeleton-shimmer"></div>
        <div className="h-10 bg-indigo-300 rounded-lg w-40 skeleton-shimmer"></div>
      </div>

      {/* Table Skeleton */}
      <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th
                  key={i}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  <div className="h-3 bg-gray-300 rounded w-2/3 skeleton-shimmer"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white/60 divide-y divide-gray-100">
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center mt-6">
        <div className="h-8 bg-gray-200 rounded w-32 skeleton-shimmer"></div>
        <div className="h-8 bg-gray-200 rounded w-20 skeleton-shimmer"></div>
        <div className="h-8 bg-gray-200 rounded w-32 skeleton-shimmer"></div>
      </div>
    </div>
  );
};

export default MovementReportSkeleton;
