import { useState, useEffect } from 'react';
import axios from 'axios';
import ExportButton from '../components/ExportButton'; // <-- IMPOR BARU

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Definisi Header untuk file CSV
  const csvHeaders = [
    { label: "Tanggal Transaksi", key: "transaction_date" },
    { label: "Tipe", key: "transaction_type" },
    { label: "SKU", key: "sku" },
    { label: "Nama Produk", key: "product_name" },
    { label: "Lokasi", key: "location_name" },
    { label: "Jumlah", key: "quantity" },
    { label: "Catatan", key: "notes" },
  ];
  
  // Fungsi untuk membersihkan data sebelum diekspor
  const getExportData = () => {
      return reports.map(item => ({
          ...item,
          // Format tanggal agar mudah dibaca di Excel
          transaction_date: new Date(item.transaction_date).toLocaleString('id-ID'),
          // Format tipe transaksi
          transaction_type: item.transaction_type === 'IN' ? 'MASUK' : 'KELUAR',
      }));
  }

  // Fungsi untuk mengambil data dari backend
  async function fetchReports() {
    try {
      setLoading(true);
      // Kita ambil semua data laporan (tanpa limit)
      const response = await axios.get('/api/reports/history'); 
      setReports(response.data);
    } catch (err) {
      console.error("Gagal mengambil data laporan:", err);
      // Asumsi toast diimpor di App.jsx
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📈 Laporan Riwayat Transaksi</h1>
        
        {/* TOMBOL EKSPOR BARU */}
        <ExportButton 
            data={getExportData()} 
            headers={csvHeaders} 
            filename={`Laporan_WMS_${new Date().toISOString().slice(0, 10)}.csv`}
        >
            Unduh Laporan (CSV)
        </ExportButton>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        // ... (Tabel Laporan tetap sama, tapi kita bisa pakai field date yang belum diformat)
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {/* ... (Header Tabel) ... */}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {/* Format untuk tampilan web */}
                    {new Date(item.transaction_date).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {/* ... (Tipe Transaksi) ... */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Reports;