import React from "react";

const DashboardSkeleton = ({ isAdmin }) => {
  // Skeleton for 3 main cards
  const CardSkeleton = () => (
    <div className="glass-panel p-6 h-32 animate-pulse flex flex-col justify-between">
      <div className="h-4 bg-gray-200 rounded w-1/2 skeleton-shimmer"></div>
      <div className="h-8 bg-indigo-100 rounded w-3/4 skeleton-shimmer"></div>
    </div>
  );

  // Skeleton for table row
  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-100 last:border-0">
      {Array.from({ length: isAdmin ? 6 : 4 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-full skeleton-shimmer"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="p-6 space-y-8 animate-fade-in-up">
      {/* Title Placeholder */}
      <div className="h-10 bg-gray-300 rounded-lg w-1/4 mb-6 skeleton-shimmer"></div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Chart + Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart placeholder */}
        {isAdmin && (
          <div className="lg:col-span-2 glass-panel p-6 h-96 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-6 skeleton-shimmer"></div>
            <div className="h-72 bg-gray-100 rounded-xl skeleton-shimmer"></div>
          </div>
        )}
        {/* Activity placeholder */}
        <div
          className={`${
            isAdmin ? "lg:col-span-1" : "lg:col-span-3"
          } glass-panel p-6 h-96 animate-pulse`}
        >
          <div className="h-6 bg-gray-300 rounded w-1/2 mb-6 skeleton-shimmer"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 skeleton-shimmer"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 skeleton-shimmer"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2 skeleton-shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="glass-panel p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-1/4 mb-6 skeleton-shimmer"></div>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <TableRowSkeleton />
            </thead>
            <tbody className="bg-white/60 divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
