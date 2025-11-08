import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Pie, Line } from 'react-chartjs-2'; 
import { useAuth } from '../context/AuthContext';

// Helper untuk format mata uang
const formatCurrency = (amount) => {
    return `Rp ${parseFloat(amount || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FinancialReport() {
  const [reportData, setReportData] = useState({
    valuation: {}, 
    profit: {}, 
    profitByProduct: [], 
    monthlyTrend: []
  });
  const [loading, setLoading] = useState(true);
  
  // --- STATE FILTER ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { userRole } = useAuth();

  // Ambil data laporan dari backend
  async function fetchFinancialReport() {
    try {
      setLoading(true);
      
      const params = {
          startDate: startDate || undefined,
          endDate: endDate || undefined
      };
      
      const response = await axios.get('/api/reports/financial', { params }); 
      setReportData(response.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Gagal memuat laporan keuangan. Akses ditolak.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFinancialReport();
  }, []); 
  
  // Handler Submit Filter
  const handleFilterSubmit = (e) => {
      e.preventDefault();
      fetchFinancialReport();
  }

  // --- LOGIKA GRAFIK ---
  const getPieChartData = () => {
    // Filter hanya yang laba kotornya positif dan ambil 5 teratas
    const topProducts = reportData.profitByProduct
        .filter(item => item.product_gross_profit > 0) 
        .slice(0, 5);
        
    return {
        labels: topProducts.map(item => item.product_name),
        datasets: [{
            label: 'Persentase Laba Kotor',
            data: topProducts.map(item => parseFloat(item.product_gross_profit)),
            backgroundColor: [
                '#3b82f6', // Biru
                '#10b981', // Hijau
                '#f59e0b', // Kuning
                '#ef4444', // Merah
                '#6366f1', // Ungu
            ],
            hoverOffset: 4
        }]
    };
  };
  
  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Top 5 Produk Penghasil Laba Kotor', font: { size: 16 } },
    },
  };

  const getLineChartData = () => {
    // Data trend bulanan
    return {
        labels: reportData.monthlyTrend.map(item => 
            new Date(item.sale_month).toLocaleString('id-ID', { year: 'numeric', month: 'short' })
        ),
        datasets: [{
            label: 'Laba Kotor Bulanan (Rp)',
            data: reportData.monthlyTrend.map(item => parseFloat(item.monthly_profit)),
            fill: true,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            tension: 0.4
        }]
    };
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Tren Laba Kotor Bulanan', font: { size: 16 } },
    },
    scales: { y: { beginAtZero: true } }
  };
  // --- SELESAI LOGIKA GRAFIK ---


  if (loading) {
    return <div className="p-6">Memuat data keuangan...</div>;
  }

  const { valuation, profit, profitByProduct } = reportData;
  const profitColor = profit.gross_profit > 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">💰 Laporan Keuangan</h1>

      {/* FORM FILTER TANGGAL */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">Filter Laporan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    Tampilkan Filter
                </button>
            </div>
        </div>
      </form>

      {/* 1. Valuasi Stok & Laba Kotor Keseluruhan */}
      <h2 className="text-xl font-semibold mb-3">Kinerja Keseluruhan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Total Nilai Stok */}
        <div className="bg-blue-100 p-6 rounded-lg shadow-md border-b-4 border-blue-500">
          <p className="text-sm text-blue-700 font-medium uppercase">Nilai Total Aset Gudang (HPP)</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">
            {formatCurrency(valuation.total_asset_value)}
          </p>
        </div>
        
        {/* Total COGS */}
        <div className="bg-yellow-100 p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <p className="text-sm text-yellow-700 font-medium uppercase">Total COGS (HPP Penjualan)</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">
            {formatCurrency(profit.total_cogs)}
          </p>
        </div>
        
        {/* Laba Kotor Global */}
        <div className={`p-6 rounded-lg shadow-xl border-l-4 ${profit.gross_profit > 0 ? 'bg-green-50 border-green-600' : 'bg-red-50 border-red-600'}`}>
          <p className="text-sm text-gray-600 font-medium uppercase">Laba Kotor Global (Gross Profit)</p>
          <p className={`text-3xl font-extrabold ${profitColor} mt-1`}>
            {formatCurrency(profit.gross_profit)}
          </p>
        </div>
      </div>
      
      {/* --- KINERJA PENJUALAN: GRAFIK GARIS & PROFIT PIE --- */}
      <h2 className="text-xl font-semibold mb-4 border-t pt-4">Visualisasi Kinerja Penjualan</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* KOTAK KIRI: LINE CHART (TREN) */}
        <div className="bg-white p-6 shadow-lg rounded-lg">
            <Line data={getLineChartData()} options={lineOptions} /> 
        </div>

        {/* KOTAK KANAN: PIE CHART (PERSENTASE PROFIT) */}
        <div className="bg-white p-6 shadow-lg rounded-lg flex items-center justify-center">
            {reportData.profitByProduct.length > 0 ? (
                <div className="w-full max-w-md">
                    <Pie data={getPieChartData()} options={pieOptions} />
                </div>
            ) : (
                <p className="text-gray-500">Tidak ada laba kotor tercatat untuk visualisasi.</p>
            )}
        </div>
      </div>
      
      {/* 2. TABEL PROFITABILITAS PER PRODUK */}
      <h2 className="text-xl font-semibold mb-4 border-t pt-4">Rincian Profitabilitas per Produk</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue Kotor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">COGS</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Laba Kotor</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {profitByProduct.length === 0 ? (
                <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        Tidak ada data penjualan tercatat.
                    </td>
                </tr>
            ) : (
                profitByProduct.map((item, index) => (
                    <tr key={item.sku} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.product_name} ({item.sku})</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                            {formatCurrency(item.product_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatCurrency(item.product_cogs)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                            <span className={item.product_gross_profit > 0 ? 'text-green-800' : 'text-red-600'}>
                                {formatCurrency(item.product_gross_profit)}
                            </span>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FinancialReport;