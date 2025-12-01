import { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const STOCK_LIMIT_PER_PAGE = 10;

// Helper untuk format mata uang
const formatCurrency = (amount) => {
  return `Rp ${parseFloat(amount || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper ikon aktivitas
const ActivityIcon = ({ type }) => {
  if (type === "IN") {
    return (
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
        📦
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
      🚚
    </span>
  );
};

// --- KOMPONEN SKELETON BARU ---
const DashboardSkeleton = ({ isAdmin }) => {
  // Skeleton untuk 3 kartu utama
  const CardSkeleton = () => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 skeleton-shimmer h-28">
      <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
      <div className="h-8 bg-gray-400 rounded w-3/4"></div>
    </div>
  );

  // Skeleton untuk baris tabel
  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-200">
      {/* 6 Kolom (untuk admin) atau 4 kolom (untuk staff) */}
      {Array.from({ length: isAdmin ? 6 : 4 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-300 rounded skeleton-shimmer"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 bg-gray-300 rounded w-1/4 mb-6"></div>

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
          <div className="lg:col-span-2 bg-white p-6 shadow-lg rounded-2xl border border-gray-100 h-96 skeleton-shimmer">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-72 bg-gray-200 rounded"></div>
          </div>
        )}
        {/* Activity placeholder */}
        <div
          className={`${
            isAdmin ? "lg:col-span-1" : "lg:col-span-3"
          } bg-white p-6 shadow-lg rounded-2xl border border-gray-100 h-96 skeleton-shimmer`}
        >
          <div className="h-6 bg-gray-300 rounded w-2/3 mb-4"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-300"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white p-6 shadow-lg rounded-2xl border border-gray-100 mt-6">
        <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <TableRowSkeleton />
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
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
// --- END KOMPONEN SKELETON ---

function Dashboard() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const queryClient = useQueryClient();

  // --- STATE PAGINATION ---
  const [stockCurrentPage, setStockCurrentPage] = useState(1);

  // --- QUERIES ---

  // 1. Products Count
  const { data: productsData } = useQuery({
    queryKey: ["productsCount"],
    queryFn: async () => {
      const res = await axios.get("/api/products?limit=1"); // Limit 1 just to get count if API supports it, or fetch all if needed for count
      // Assuming the API returns totalCount in the response even with limit
      // If not, we might need a dedicated count endpoint or fetch all.
      // Based on previous code: axios.get("/api/products?limit=1000")
      // Let's stick to previous logic but maybe optimize later.
      const response = await axios.get("/api/products?limit=1000");
      return response.data;
    },
  });

  // 2. Locations Count
  const { data: locationsData } = useQuery({
    queryKey: ["locationsCount"],
    queryFn: async () => {
      const res = await axios.get("/api/locations");
      return res.data;
    },
  });

  // 3. Low Stock
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["lowStock"],
    queryFn: async () => {
      const res = await axios.get("/api/stocks/low-stock?threshold=10");
      return res.data;
    },
  });

  // 4. Recent Activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["recentActivity"],
    queryFn: async () => {
      const res = await axios.get("/api/reports/recent-activity");
      return res.data;
    },
  });

  // 5. Financial (Total Asset Value)
  const { data: financialData } = useQuery({
    queryKey: ["financialSummary"],
    queryFn: async () => {
      const res = await axios.get("/api/reports/financial");
      return res.data;
    },
  });

  // 6. Stocks with Pagination
  const { data: stocksData, isLoading: stocksLoading } = useQuery({
    queryKey: ["stocks", stockCurrentPage],
    queryFn: async () => {
      const res = await axios.get(
        `/api/stocks?page=${stockCurrentPage}&limit=${STOCK_LIMIT_PER_PAGE}`
      );
      return res.data;
    },
    keepPreviousData: true, // Keep showing previous page data while fetching new page
  });

  const stocks = stocksData?.stocks || [];
  const stockTotalPages = stocksData?.totalPages || 0;
  const stockTotalCount = stocksData?.totalCount || 0;

  // Derived Stats
  const productCount = productsData?.totalCount || 0;
  const locationCount = locationsData?.length || 0;
  const totalAssetValue = parseFloat(
    financialData?.valuation?.total_asset_value || 0
  );

  // Loading State (Combined)
  // We can be more granular, but for now let's use a general loading state if critical data is missing
  const loading = stocksLoading && !stocksData;

  // Realtime update menggunakan Socket.IO
  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.on("new_activity", (data) => {
      console.log("Realtime event diterima:", data.message);
      toast.success(data.message, { icon: "⚡" });
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      queryClient.invalidateQueries({ queryKey: ["productsCount"] });
      queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // Data untuk grafik stok teratas (diambil dari stocks state, yang hanya berisi 1 halaman)
  // Note: Ideally this should be a separate query for "Top Stocks" if pagination limits the view
  const top5Stocks = stocks.sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  const topStockData = {
    labels: top5Stocks.map((item) => item.product_name),
    datasets: [
      {
        label: "Jumlah Stok",
        data: top5Stocks.map((item) => item.quantity),
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Top 5 Produk dengan Stok Terbanyak",
        font: { size: 16 },
      },
    },
    scales: { y: { beginAtZero: true } },
  };

  // --- Handlers Pagination Stok ---
  const handleStockPrevPage = () => {
    if (stockCurrentPage > 1) {
      setStockCurrentPage(stockCurrentPage - 1);
    }
  };
  const handleStockNextPage = () => {
    if (stockCurrentPage < stockTotalPages) {
      setStockCurrentPage(stockCurrentPage + 1);
    }
  };

  if (loading) {
    return <DashboardSkeleton isAdmin={isAdmin} />; // Tampilkan Skeleton saat loading
  }

  // Jika tidak loading dan tidak ada stok sama sekali
  if (stocks.length === 0 && stockTotalCount === 0 && !stocksLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">🏠 Dashboard</h1>
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <p className="text-gray-500">
            Data gudang kosong. Silakan tambahkan produk dan transaksi.
          </p>
        </div>
      </div>
    );
  }

  // Jika loading selesai dan data ada, tampilkan konten dashboard
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">🏠 Dashboard</h1>

      {/* PERINGATAN STOK TIPIS */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl shadow-md">
          <p className="font-bold text-lg">🚨 Peringatan Stok Tipis!</p>
          <ul className="list-disc list-inside">
            {lowStockItems.map((item, index) => (
              <li key={`low-${item.product_id}-${item.location_name || index}`}>
                <strong>{item.product_name}</strong> - Sisa:{" "}
                <span className="font-bold">{item.quantity}</span> unit di
                Lokasi: {item.location_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* STATISTIK RINGKAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-transform hover:scale-105 duration-300">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Total Produk
          </h2>
          <p className="text-4xl font-bold text-blue-600 mt-2">
            {productCount}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-transform hover:scale-105 duration-300">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Total Lokasi
          </h2>
          <p className="text-4xl font-bold text-purple-600 mt-2">
            {locationCount}
          </p>
        </div>

        {/* Total Nilai Stok (HPP) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-transform hover:scale-105 duration-300">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            {isAdmin ? "Total Nilai Stok (HPP)" : "Total Unit Gudang"}
          </h2>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {isAdmin
              ? formatCurrency(totalAssetValue)
              : `${stockTotalCount} unit`}
          </p>
        </div>
      </div>

      {/* GRAFIK + AKTIVITAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik (Admin saja) */}
        {isAdmin && (
          <div className="lg:col-span-2 bg-white p-6 shadow-lg rounded-2xl border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Visualisasi Stok
            </h2>
            <Bar options={chartOptions} data={topStockData} />
          </div>
        )}

        {/* Aktivitas Terkini */}
        <div
          className={`bg-white p-6 shadow-lg rounded-2xl border border-gray-100 ${
            !isAdmin ? "lg:col-span-3" : "lg:col-span-1"
          }`}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            ⏱️ Aktivitas Terkini
          </h2>
          <div className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-500">
                Belum ada aktivitas tercatat.
              </p>
            )}
            {recentActivity.map((act, index) => (
              <div
                key={`act-${act.id || index}`}
                className="flex items-center gap-3"
              >
                <ActivityIcon type={act.transaction_type} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {act.transaction_type === "IN"
                      ? "Barang Masuk: "
                      : "Barang Keluar: "}
                    <strong>{act.quantity} unit</strong> {act.product_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(act.transaction_date).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABEL STOK GUDANG */}
      <div className="bg-white p-6 shadow-lg rounded-2xl border border-gray-100 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Stok Gudang Saat Ini
        </h2>

        {/* Kontrol Pagination (di atas tabel) */}
        {stockTotalPages > 1 && (
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              Menampilkan {stocks.length} dari {stockTotalCount} baris stok.
            </p>
            <span className="text-sm">
              Halaman <strong>{stockCurrentPage}</strong> dari{" "}
              <strong>{stockTotalPages}</strong>
            </span>
          </div>
        )}

        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nama Produk
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Harga Beli (Avg)
                  </th>
                )}
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nilai Stok
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lokasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sisa Stok
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stocks.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? "6" : "4"}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Belum ada stok di gudang.
                  </td>
                </tr>
              )}
              {stocks.map((item, index) => (
                <tr key={`stock-${item.sku}-${item.location_name}` || index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.product_name}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">
                      {formatCurrency(item.purchase_price)}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-900">
                      {formatCurrency(item.stock_value)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.location_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-900">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kontrol Pagination (di bawah tabel) */}
        {stockTotalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={handleStockPrevPage}
              disabled={stockCurrentPage <= 1 || loading}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50"
            >
              &laquo; Sebelumnya
            </button>
            <span className="text-sm">
              Halaman <strong>{stockCurrentPage}</strong> dari{" "}
              <strong>{stockTotalPages}</strong>
            </span>
            <button
              onClick={handleStockNextPage}
              disabled={stockCurrentPage >= stockTotalPages || loading}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50"
            >
              Berikutnya &raquo;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
