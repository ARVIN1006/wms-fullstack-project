const ReportsSkeleton = () => {
  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-100/50 hover:bg-white/30 transition-colors">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`h-4 bg-gray-200/50 rounded animate-pulse ${
              i === 2 ? "w-24" : i === 5 ? "w-32" : "w-full"
            }`}
          ></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6 glass-panel p-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200/50 rounded w-80 animate-pulse"></div>
          <div className="h-4 bg-gray-200/50 rounded w-96 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200/50 rounded w-40 animate-pulse"></div>
      </div>

      {/* Filter Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-6 glass-card border border-white/40">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200/50 rounded w-20 animate-pulse"></div>
            <div className="h-12 bg-white/50 rounded-lg border border-gray-100/50 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100/50 bg-white/30">
          <div className="h-4 bg-gray-200/50 rounded w-32 animate-pulse"></div>
        </div>
        <table className="min-w-full divide-y divide-gray-100/50">
          <thead className="bg-white/40">
            <tr>
              {[
                "Tanggal",
                "Tipe",
                "Nilai",
                "Operator",
                "Pihak",
                "Produk",
                "Qty",
                "Lokasi",
                "Status",
                "Durasi",
              ].map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  <div className="h-3 bg-gray-200/50 rounded w-16 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsSkeleton;
