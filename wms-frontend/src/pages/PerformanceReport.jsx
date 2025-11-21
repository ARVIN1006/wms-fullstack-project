import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

function PerformanceReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mengambil data dari backend
  async function fetchReports(isMounted) { // BARU: Terima flag isMounted
    try {
      if (isMounted) setLoading(true); // Cek sebelum set loading
      // Panggil API kinerja baru
      const response = await axios.get('/api/reports/performance'); 
      if (isMounted) setReports(response.data); // Cek sebelum set state
    } catch (err) {
      if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Gagal memuat laporan kinerja.');
      }
    } finally {
      if (isMounted) setLoading(false); // Cek sebelum set loading
    }
  }

  useEffect(() => {
    let isMounted = true; // BARU: Flag untuk cleanup
    fetchReports(isMounted); // Kirim flag ke fungsi fetch
    
    return () => {
        isMounted = false; // Cleanup function
    };
  }, []);
  
  // Helper untuk mendapatkan label yang bagus
  const getLabel = (type) => {
      return type === 'IN' ? 'Barang Masuk (Inbound)' : 'Barang Keluar (Outbound)';
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">⏱️ Laporan Kinerja Gudang (Waktu Proses)</h1>
      <p className="text-sm text-gray-600 mb-6">Waktu proses ini dihitung dari durasi rata-rata antara *process start* dan *process end* pada setiap transaksi.</p>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <div className="space-y-6">
            {reports.map((item, index) => (
                <div key={index} className={`p-4 rounded-lg shadow-md border ${item.type === 'IN' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
                    <h2 className={`text-xl font-semibold mb-2 ${item.type === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
                        {getLabel(item.type)}
                    </h2>
                    <div className="mt-3">
                        <p className="text-3xl font-extrabold text-gray-900">
                            {item.avg_duration_minutes} Menit
                        </p>
                        <p className="text-sm text-gray-500">Waktu Proses Rata-rata</p>
                    </div>
                </div>
            ))}
        </div>
      )}
      {reports.length === 0 && !loading && (
          <p className='text-gray-500 mt-4'>Tidak ada data proses yang tercatat untuk dianalisis.</p>
      )}
    </div>
  );
}

export default PerformanceReport;