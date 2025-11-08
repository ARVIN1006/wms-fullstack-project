import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton'; 

const formatCurrency = (amount) => {
    return `Rp ${parseFloat(amount || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CustomerOrderReport() {
  const [reportData, setReportData] = useState({
    customerSummary: [],
    topSellingProducts: []
  });
  const [loading, setLoading] = useState(true);

  // --- STATE FILTER BARU ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  async function fetchReports() {
    try {
      setLoading(true);
      
      // Kirim filter ke API
      const params = {
          startDate: startDate || undefined,
          endDate: endDate || undefined
      };
      
      const response = await axios.get('/api/reports/customer-order', { params }); 
      setReportData(response.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Gagal memuat laporan Customer & Order.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Panggil fetchReports() setiap kali state filter berubah
  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]); 

  const handleFilterSubmit = (e) => {
      e.preventDefault();
      fetchReports(); // Muat ulang data dengan filter baru
  }

  if (loading) {
    return <div className="p-6">Memuat data...</div>;
  }

  const { customerSummary, topSellingProducts } = reportData;

  // Header CSV untuk Ringkasan Pelanggan
  const customerReportHeaders = [
      { label: "Pelanggan", key: "customer_name" },
      { label: "Total Order", key: "total_orders" },
      { label: "Total Revenue (Rp)", key: "total_revenue" },
  ];

  // Fungsi untuk memformat data sebelum diekspor
  const getExportData = () => {
      return reportData.customerSummary.map(item => ({
          customer_name: item.customer_name,
          total_orders: item.total_orders,
          total_revenue: parseFloat(item.total_revenue).toFixed(2)
      }));
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">⭐ Laporan Pelanggan & Penjualan</h1>

      {/* --- FORM FILTER TANGGAL --- */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">Filter Laporan Penjualan</h2>
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
                    Tampilkan Laporan
                </button>
            </div>
        </div>
      </form>


      {/* Bagian 1: Produk Terlaris Global */}
      <h2 className="text-xl font-semibold mb-3">Produk Terlaris Global (Top 5)</h2>
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Unit Terjual</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {topSellingProducts.map((item) => (
              <tr key={item.sku}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.product_name} ({item.sku})</td>
                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-blue-600">{item.total_units_sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bagian 2: Ringkasan Pelanggan */}
      <h2 className="text-xl font-semibold mb-3 border-t pt-4 flex justify-between items-center">
        Ringkasan Pesanan per Pelanggan
        
        <ExportButton 
            data={getExportData()} 
            headers={customerReportHeaders} 
            filename={`Laporan_Pelanggan_${new Date().toISOString().slice(0, 10)}.csv`}
        >
            Ekspor Ringkasan
        </ExportButton>
        
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customerSummary.map((item) => (
              <tr key={item.customer_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.customer_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{item.total_orders}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">{formatCurrency(item.total_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {customerSummary.length === 0 && !loading && <p className='text-gray-500 mt-4'>Tidak ada data pelanggan atau order tercatat.</p>}
    </div>
  );
}

export default CustomerOrderReport;