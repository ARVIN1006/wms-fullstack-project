import { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client"; // Realtime update

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

function Dashboard() {
  const [stats, setStats] = useState({ productCount: 0, locationCount: 0 });
  const [stocks, setStocks] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  // Ambil semua data dashboard
  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [productRes, locationRes, stockRes, lowStockRes, activityRes] =
        await Promise.all([
          axios.get("/api/products?limit=1000"),
          axios.get("/api/locations"),
          axios.get("/api/stocks"),
          axios.get("/api/stocks/low-stock?threshold=10"),
          axios.get("/api/reports/recent-activity"),
        ]);

      setStats({
        productCount: productRes.data.products.length,
        locationCount: locationRes.data.length,
      });
      setStocks(stockRes.data);
      setLowStockItems(lowStockRes.data);
      setRecentActivity(activityRes.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error("Gagal memuat data dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, [userRole]);

  // Realtime update menggunakan Socket.IO
  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.on("new_activity", (data) => {
      console.log("Realtime event diterima:", data.message);
      toast.success(data.message, { icon: "⚡" });
      fetchDashboardData(); // muat ulang data
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Data untuk grafik stok teratas
  const top5Stocks = stocks
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Mengubah warna grafik ke warna blue/indigo yang baru (blue-600)
  const topStockData = {
    labels: top5Stocks.map((item) => item.product_name),
    datasets: [
      {
        label: "Jumlah Stok",
        data: top5Stocks.map((item) => item.quantity),
        backgroundColor: "rgba(79, 70, 229, 0.8)", // blue-600 shade
        borderColor: "rgba(79, 70, 229, 1)",      // blue-600
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

  const totalStockValue = stocks.reduce(
    (acc, item) => acc + parseFloat(item.stock_value || 0),
    0
  );

  if (loading) {
    return <div className="p-6">Memuat data dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">🏠 Dashboard</h1>

      {/* PERINGATAN STOK TIPIS */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg">
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

      {/* STATISTIK RINGKAS - Ditambahkan efek hover */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Total Produk */}
        <div className="bg-blue-100 p-6 rounded-xl shadow-lg border-b-4 border-blue-500 transition duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-sm font-medium text-gray-700 uppercase">
            Total Produk
          </h2>
          <p className="text-4xl font-extrabold text-blue-800 mt-1">
            {stats.productCount}
          </p>
        </div>

        {/* Total Lokasi */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500 transition duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Total Lokasi
          </h2>
          <p className="text-4xl font-bold text-purple-600 mt-1">
            {stats.locationCount}
          </p>
        </div>

        {/* Total Nilai Stok */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 transition duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            {isAdmin ? "Total Nilai Stok (HPP)" : "Total Unit Gudang"}
          </h2>
          <p className="text-4xl font-bold text-green-600 mt-1">
            {isAdmin
              ? formatCurrency(totalStockValue)
              : `${stocks.reduce(
                  (acc, item) => acc + parseInt(item.quantity || 0),
                  0
                )} unit`}
          </p>
        </div>
      </div>

      {/* GRAFIK + AKTIVITAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik (Admin saja) - Ditambahkan efek hover */}
        {isAdmin && (
          <div className="lg:col-span-2 bg-white p-6 shadow-xl rounded-xl transition duration-300 hover:shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Visualisasi Stok
            </h2>
            <Bar options={chartOptions} data={topStockData} />
          </div>
        )}

        {/* Aktivitas Terkini - Ditambahkan efek hover */}
        <div
          className={`bg-white p-6 shadow-xl rounded-xl transition duration-300 hover:shadow-2xl ${
            !isAdmin ? "lg:col-span-3" : "lg:col-span-1"
          }`}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">
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

      {/* TABEL STOK GUDANG - Ditambahkan efek hover */}
      <div className="bg-white p-6 shadow-xl rounded-xl mt-6 transition duration-300 hover:shadow-2xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Stok Gudang Saat Ini
        </h2>
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
                    Harga Beli
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
      </div>
    </div>
  );
}

export default Dashboard;