import { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client"; 

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
        <div className="bg-white p-6 rounded-lg shadow-lg skeleton-shimmer h-28">
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
                    <div className="lg:col-span-2 bg-white p-6 shadow-lg rounded-lg h-96 skeleton-shimmer">
                        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
                        <div className="h-72 bg-gray-200 rounded"></div>
                    </div>
                )}
                {/* Activity placeholder */}
                <div className={`${isAdmin ? 'lg:col-span-1' : 'lg:col-span-3'} bg-white p-6 shadow-lg rounded-lg h-96 skeleton-shimmer`}>
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
            <div className="bg-white p-6 shadow-lg rounded-lg mt-6">
                <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><TableRowSkeleton /></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---

function Dashboard() {
  const [stats, setStats] = useState({ productCount: 0, locationCount: 0 });
  const [stocks, setStocks] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE PAGINATION ---
  const [stockCurrentPage, setStockCurrentPage] = useState(1);
  const [stockTotalPages, setStockTotalPages] = useState(0);
  const [stockTotalCount, setStockTotalCount] = useState(0);
  
  // --- STATE UNTUK TOTAL NILAI STOK GUDANG (HPP KESELURUHAN) ---
  const [totalAssetValue, setTotalAssetValue] = useState(0);

  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  // --- Fungsi untuk mengambil data stok dengan pagination ---
  async function fetchStocksData(isMounted, page) {
    try {
        if (isMounted) {
            const stockRes = await axios.get(
                `/api/stocks?page=${page}&limit=${STOCK_LIMIT_PER_PAGE}`
            );
            setStocks(stockRes.data.stocks);
            setStockTotalPages(stockRes.data.totalPages);
            setStockTotalCount(stockRes.data.totalCount);
            setStockCurrentPage(stockRes.data.currentPage);
        }
    } catch (err) {
        if (isMounted) toast.error("Gagal memuat data stok.");
    }
  }


  // --- Fungsi Utama Fetch Data Dashboard ---
  async function fetchDashboardData(isMounted, page = 1) { 
    try {
      if (isMounted) setLoading(true); 
      
      const [productRes, locationRes, lowStockRes, activityRes, financialRes] = 
        await Promise.all([
          axios.get("/api/products?limit=1000"),
          axios.get("/api/locations"),
          axios.get("/api/stocks/low-stock?threshold=10"),
          axios.get("/api/reports/recent-activity"),
          axios.get("/api/reports/financial"), 
        ]);
        
      // Fetch stok secara terpisah dengan pagination
      await fetchStocksData(isMounted, page);

      if (isMounted) { 
        setStats({
          productCount: productRes.data.products.length,
          locationCount: locationRes.data.length,
        });
        setLowStockItems(lowStockRes.data);
        setRecentActivity(activityRes.data);
        setTotalAssetValue(parseFloat(financialRes.data.valuation.total_asset_value || 0));
      }
    } catch (err) {
      if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error("Gagal memuat data dashboard.");
      }
    } finally {
      if (isMounted) setLoading(false); 
    }
  }

  // --- Perbaikan useEffect dengan Cleanup Function ---
  useEffect(() => {
    let isMounted = true; 
    fetchDashboardData(isMounted, stockCurrentPage); 
    
    return () => {
      isMounted = false;
    };
  }, [userRole, stockCurrentPage]); 

  // Realtime update menggunakan Socket.IO (KEEP AS IS - Cleanup socket sudah benar)
  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.on("new_activity", (data) => {
      console.log("Realtime event diterima:", data.message);
      toast.success(data.message, { icon: "⚡" });
      fetchDashboardData(true, stockCurrentPage); 
    });

    return () => {
      socket.disconnect();
    };
  }, [stockCurrentPage]); 

  // Data untuk grafik stok teratas (diambil dari stocks state, yang hanya berisi 1 halaman)
  const top5Stocks = stocks
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

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
  if (stocks.length === 0 && stockTotalCount === 0) {
      return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">🏠 Dashboard</h1>
            <div className="bg-white p-6 rounded-lg shadow-lg">
                 <p className="text-gray-500">Data gudang kosong. Silakan tambahkan produk dan transaksi.</p>
            </div>
        </div>
      );
  }
  
  // Jika loading selesai dan data ada, tampilkan konten dashboard
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

      {/* STATISTIK RINGKAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Total Produk
          </h2>
          <p className="text-4xl font-bold text-blue-600">
            {stats.productCount}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Total Lokasi
          </h2>
          <p className="text-4xl font-bold text-purple-600">
            {stats.locationCount}
          </p>
        </div>

        {/* Total Nilai Stok (HPP) */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            {isAdmin ? "Total Nilai Stok (HPP)" : "Total Unit Gudang"}
          </h2>
          <p className="text-4xl font-bold text-green-600">
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
          <div className="lg:col-span-2 bg-white p-6 shadow-lg rounded-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Visualisasi Stok
            </h2>
            <Bar options={chartOptions} data={topStockData} />
          </div>
        )}

        {/* Aktivitas Terkini */}
        <div
          className={`bg-white p-6 shadow-lg rounded-lg ${
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

      {/* TABEL STOK GUDANG */}
      <div className="bg-white p-6 shadow-lg rounded-lg mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Stok Gudang Saat Ini
        </h2>
        
        {/* Kontrol Pagination (di atas tabel) */}
        {stockTotalPages > 1 && (
            <div className="flex justify-between items-center mb-4">
                <p className='text-sm text-gray-600'>Menampilkan {stocks.length} dari {stockTotalCount} baris stok.</p>
                <span className="text-sm">
                    Halaman <strong>{stockCurrentPage}</strong> dari <strong>{stockTotalPages}</strong>
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
                    Halaman <strong>{stockCurrentPage}</strong> dari <strong>{stockTotalPages}</strong>
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