import { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { io } from "socket.io-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardSkeleton from "../../components/skeletons/DashboardSkeleton";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { formatCurrency } from "../../utils/formatters";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const STOCK_LIMIT_PER_PAGE = 10;

const ActivityIcon = ({ type }) => {
  if (type === "IN") {
    return (
      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-200">
        📦
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm border border-rose-200">
      🚚
    </span>
  );
};

function Dashboard() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const queryClient = useQueryClient();

  const [stockCurrentPage, setStockCurrentPage] = useState(1);

  const { data: productsData } = useQuery({
    queryKey: ["productsCount"],
    queryFn: async () => {
      const response = await axios.get("/api/products?limit=1");
      return response.data;
    },
  });

  const { data: locationsData } = useQuery({
    queryKey: ["locationsCount"],
    queryFn: async () => {
      const res = await axios.get("/api/locations");
      return res.data;
    },
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["lowStock"],
    queryFn: async () => {
      const res = await axios.get("/api/stocks/low-stock?threshold=10");
      return res.data;
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["recentActivity"],
    queryFn: async () => {
      const res = await axios.get("/api/reports/recent-activity");
      return res.data;
    },
  });

  const { data: financialData } = useQuery({
    queryKey: ["financialSummary"],
    queryFn: async () => {
      const res = await axios.get("/api/reports/financial");
      return res.data;
    },
  });

  const { data: stocksData, isLoading: stocksLoading } = useQuery({
    queryKey: ["stocks", stockCurrentPage],
    queryFn: async () => {
      const res = await axios.get(
        `/api/stocks?page=${stockCurrentPage}&limit=${STOCK_LIMIT_PER_PAGE}`
      );
      return res.data;
    },
    keepPreviousData: true,
  });

  const stocks = stocksData?.stocks || [];
  const stockTotalPages = stocksData?.totalPages || 0;
  const stockTotalCount = stocksData?.totalCount || 0;

  const productCount = productsData?.totalCount || 0;
  const locationCount = locationsData?.length || 0;
  const totalAssetValue = parseFloat(
    financialData?.valuation?.total_asset_value || 0
  );

  const loading = stocksLoading && !stocksData;

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"
    );

    socket.on("new_activity", (data) => {
      toast.success(data.message, { icon: "⚡" });
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

  const top5Stocks = stocks
    .slice()
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const topStockData = {
    labels: top5Stocks.map((item) => item.product_name),
    datasets: [
      {
        label: "Jumlah Stok",
        data: top5Stocks.map((item) => item.quantity),
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: "rgba(99, 102, 241, 0.8)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.9)",
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          borderDash: [5, 5],
        },
        ticks: { font: { size: 11 } },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: { font: { size: 11 } },
      },
    },
  };

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
    return <DashboardSkeleton isAdmin={isAdmin} />;
  }

  if (stocks.length === 0 && stockTotalCount === 0 && !stocksLoading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gray-800">🏠 Dashboard</h1>
        <Card className="flex flex-col items-center justify-center text-center p-12 !border-dashed !border-2 !border-gray-200">
          <div className="text-6xl mb-6 bg-indigo-50 p-6 rounded-full">📦</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            Gudang Belum Memiliki Data
          </h2>
          <p className="text-gray-500 max-w-md">
            Silakan tambahkan produk dan transaksi untuk melihat statistik.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ringkasan aktivitas dan status gudang hari ini
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="primary" size="lg" className="shadow-sm">
            📅{" "}
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Badge>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-rose-50/80 backdrop-blur-md border border-rose-200 text-rose-800 p-5 rounded-2xl shadow-sm animate-pulse-slow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <span className="text-6xl">⚠️</span>
          </div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="bg-rose-100 p-2 rounded-lg text-2xl shadow-sm">
              🚨
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">
                Peringatan Stok Menipis
              </h3>
              <p className="text-sm opacity-80 mb-2">
                Beberapa item perlu segera di-restock:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 list-disc list-inside text-sm font-medium">
                {lowStockItems.slice(0, 6).map((item, index) => (
                  <li
                    key={`low-${item.product_id}-${
                      item.location_name || index
                    }`}
                  >
                    <span className="font-bold">{item.product_name}</span>{" "}
                    <span className="text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded text-xs ml-1">
                      {item.quantity} unit
                    </span>
                  </li>
                ))}
                {lowStockItems.length > 6 && (
                  <li className="list-none text-rose-600 italic font-bold">
                    ...dan {lowStockItems.length - 6} item lainnya.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon="📦"
          title="Total Produk"
          value={productCount}
          color="bg-indigo-500"
          gradient="from-indigo-500 to-blue-500"
        />
        <StatCard
          icon="📍"
          title="Total Lokasi"
          value={locationCount}
          color="bg-purple-500"
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          icon="💰"
          title={isAdmin ? "Total Aset (HPP)" : "Total Unit Gudang"}
          value={
            isAdmin
              ? formatCurrency(totalAssetValue)
              : `${stockTotalCount} Unit`
          }
          color="bg-emerald-500"
          gradient="from-emerald-500 to-teal-500"
          isCurrency={isAdmin}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col shadow-lg shadow-indigo-100/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg text-xl">
                    📊
                  </span>{" "}
                  Distribusi Stok Terbanyak
                </h2>
              </div>
              <div className="flex-1 min-h-[320px]">
                <Bar options={chartOptions} data={topStockData} />
              </div>
            </Card>
          </div>
        )}

        <div className={!isAdmin ? "lg:col-span-3" : "lg:col-span-1"}>
          <Card className="h-full flex flex-col shadow-lg shadow-indigo-100/50">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg text-xl">
                ⏱️
              </span>{" "}
              Aktivitas Terkini
            </h2>
            <div className="space-y-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
              {recentActivity.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">💤</p>
                  <p className="text-sm">Belum ada aktivitas baru.</p>
                </div>
              )}
              {recentActivity.map((act, index) => (
                <div
                  key={`act-${act.id || index}`}
                  className="group flex items-start gap-4 p-3 rounded-2xl hover:bg-indigo-50/50 transition-all border border-transparent hover:border-indigo-100 cursor-default"
                >
                  <ActivityIcon type={act.transaction_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {act.transaction_type === "IN"
                          ? "Barang Masuk"
                          : "Barang Keluar"}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                        {new Date(act.transaction_date).toLocaleTimeString(
                          "id-ID",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 truncate font-medium">
                      {act.product_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        size="sm"
                        variant={
                          act.transaction_type === "IN" ? "success" : "danger"
                        }
                        className="!py-0 !px-1.5 !text-[10px]"
                      >
                        {act.quantity} Unit
                      </Badge>
                      <span className="text-[10px] text-gray-400">
                        •{" "}
                        {new Date(act.transaction_date).toLocaleDateString(
                          "id-ID"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card
        noPadding
        className="border border-gray-100 overflow-hidden shadow-lg shadow-indigo-100/50"
      >
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-teal-100 text-teal-600 p-1.5 rounded-lg text-xl">
              📦
            </span>{" "}
            Stok Gudang
          </h2>
          {stockTotalPages > 1 && (
            <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              Halaman {stockCurrentPage} / {stockTotalPages}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Produk
                </th>
                {isAdmin && (
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Harga Beli
                  </th>
                )}
                {isAdmin && (
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Nilai Stok
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Lokasi
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/60 divide-y divide-gray-100">
              {stocks.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? "6" : "4"}
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    Data stok kosong.
                  </td>
                </tr>
              )}
              {stocks.map((item, index) => (
                <tr
                  key={`stock-${item.sku}-${item.location_name}` || index}
                  className="hover:bg-indigo-50/30 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-bold text-gray-800">
                        {item.product_name}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 bg-white border border-gray-200 px-1.5 rounded inline-block mt-1">
                        {item.sku}
                      </div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(item.purchase_price)}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                      {formatCurrency(item.stock_value)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-400 text-lg">•</span>
                      {item.location_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={item.quantity < 10 ? "danger" : "success"}
                      size="sm"
                      className="!py-1"
                    >
                      {item.quantity} Unit
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stockTotalPages > 1 && (
          <div className="flex justify-end items-center p-4 border-t border-gray-100 bg-gray-50/30 gap-2">
            <Button
              onClick={handleStockPrevPage}
              disabled={stockCurrentPage <= 1 || loading}
              variant="secondary"
              size="sm"
            >
              &laquo; Prev
            </Button>
            <Button
              onClick={handleStockNextPage}
              disabled={stockCurrentPage >= stockTotalPages || loading}
              variant="secondary"
              size="sm"
            >
              Next &raquo;
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Sub-component for Stat Cards
function StatCard({ icon, title, value, color, gradient, isCurrency = false }) {
  return (
    <Card className="relative overflow-hidden group !p-0 border-0 shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div
        className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}
      >
        <span className="text-7xl">{icon}</span>
      </div>

      <div className="p-6 relative z-10">
        <div
          className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl shadow-md text-white bg-gradient-to-br ${gradient}`}
        >
          {icon}
        </div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
          {title}
        </h2>
        <p
          className={`font-black text-gray-800 ${
            isCurrency ? "text-2xl" : "text-4xl"
          }`}
        >
          {value}
        </p>
      </div>
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`}></div>
    </Card>
  );
}

export default Dashboard;
