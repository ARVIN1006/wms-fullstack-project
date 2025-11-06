import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2'; // Impor Grafik Bar

// Helper untuk format tanggal (bisa ditaruh di luar komponen)
const ActivityIcon = ({ type }) => {
  if (type === 'IN') {
    return <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">📦</span>;
  }
  return <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">🚚</span>;
};


function Dashboard() {
  const [stats, setStats] = useState({ productCount: 0, locationCount: 0 });
  const [stocks, setStocks] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mengambil semua data dashboard
  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      const [productRes, locationRes, stockRes, lowStockRes, activityRes] = await Promise.all([
        axios.get('/api/products?limit=1000'),
        axios.get('/api/locations'),
        axios.get('/api/stocks'),
        axios.get('/api/stocks/low-stock?threshold=10'),
        axios.get('/api/reports/history?limit=5')
      ]);

      setStats({
        productCount: productRes.data.products.length,
        locationCount: locationRes.data.length,
      });
      setStocks(stockRes.data);
      setLowStockItems(lowStockRes.data);
      setRecentActivity(activityRes.data);

    } catch (err) {
      console.error("Gagal mengambil data dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- Logika untuk Data Grafik ---
  const topStockData = {
    labels: stocks
      .sort((a, b) => b.quantity - a.quantity) // Urutkan dari stok terbanyak
      .slice(0, 5) // Ambil 5 teratas
      .map(item => item.product_name), // Ambil namanya untuk label
    datasets: [
      {
        label: 'Jumlah Stok',
        data: stocks
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
          .map(item => item.quantity), // Ambil jumlahnya untuk data
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top 5 Produk dengan Stok Terbanyak',
      },
    },
  };
  // --- Selesai Logika Grafik ---

  if (loading) {
    return <div className="p-6">Memuat data dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">🏠 Dashboard</h1>

      {/* --- Kartu Peringatan Stok Tipis --- */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg" role="alert">
          <p className="font-bold text-lg">🚨 Peringatan Stok Tipis!</p>
          <ul className="list-disc list-inside">
            {lowStockItems.map(item => (
              <li key={item.product_id}>
                <strong>{item.product_name}</strong> - Sisa: <span className="font-bold">{item.quantity}</span> unit
                di Lokasi: {item.location_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Kartu Stats Ringkasan --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Produk</h2>
          <p className="text-4xl font-bold text-blue-600">{stats.productCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Lokasi</h2>
          <p className="text-4xl font-bold text-purple-600">{stats.locationCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Item di Gudang</h2>
          <p className="text-4xl font-bold text-green-600">
            {stocks.reduce((acc, item) => acc + item.quantity, 0)}
          </p>
        </div>
      </div>

      {/* --- Tata Letak Grafik & Aktivitas --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Grafik */}
        <div className="lg:col-span-2 bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Visualisasi Stok</h2>
          <Bar options={chartOptions} data={topStockData} />
        </div>

        {/* Aktivitas Terkini */}
        <div className="lg:col-span-1 bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">⏱️ Aktivitas Terkini</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-500">Belum ada transaksi.</p>
            )}
            {recentActivity.map((act, index) => (
              <div key={index} className="flex items-center gap-3">
                <ActivityIcon type={act.transaction_type} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {act.transaction_type === 'IN' ? 'Barang Masuk: ' : 'Barang Keluar: '}
                    <strong>{act.quantity} unit</strong> {act.product_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(act.transaction_date).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      
      {/* --- Tabel Stok Gudang Saat Ini --- */}
      <div className="bg-white p-6 shadow-lg rounded-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Stok Gudang Saat Ini</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Produk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sisa Stok</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stocks.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.location_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-900">{item.quantity}</td>
                </tr>
              ))}
              {stocks.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    Belum ada stok di gudang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;