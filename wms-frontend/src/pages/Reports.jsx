import { useState, useEffect } from 'react';
import axios from 'axios';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mengambil data dari backend
  async function fetchReports() {
    try {
      setLoading(true);
      // Panggil API laporan yang sudah kita buat di backend
      const response = await axios.get('/api/reports/history');
      setReports(response.data);
    } catch (err) {
      console.error("Gagal mengambil data laporan:", err);
    } finally {
      setLoading(false);
    }
  }

  // Jalankan fetchReports() saat komponen pertama kali dimuat
  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📈 Laporan Riwayat Transaksi</h1>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        // Kita bungkus dengan div agar bisa scroll horizontal jika tabelnya lebar
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((item, index) => (
                // Kita pakai index sebagai key karena ini daftar read-only
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {/* Format tanggal sederhana bawaan Indonesia */}
                    {new Date(item.transaction_date).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {/* Memberi warna berbeda untuk Tipe IN dan OUT */}
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${item.transaction_type === 'IN' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'}`
                    }>
                      {item.transaction_type === 'IN' ? 'MASUK' : 'KELUAR'}
                    </span>
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