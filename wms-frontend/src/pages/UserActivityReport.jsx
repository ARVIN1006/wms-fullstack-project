import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

function UserActivityReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mengambil data dari backend
  async function fetchReports() {
    try {
      setLoading(true);
      // Panggil API aktivitas baru
      const response = await axios.get('/api/reports/activity'); 
      setReports(response.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Gagal memuat laporan aktivitas user.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);
  
  // Helper untuk mendapatkan badge role
  const getRoleBadge = (role) => {
      const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
      if (role === 'admin') return `${base} bg-indigo-100 text-indigo-800`;
      return `${base} bg-gray-200 text-gray-800`;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">📋 Laporan Aktivitas User & Kinerja</h1>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Aktivitas (Semua)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barang Masuk (Inbound)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barang Keluar (Outbound)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perpindahan (Movement)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((item, index) => (
                <tr key={item.operator_id || index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.operator_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={getRoleBadge(item.role)}>{item.role.toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-lg font-bold">{item.total_activities}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-md text-green-700 font-semibold">{item.total_inbound}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-md text-red-600 font-semibold">{item.total_outbound}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-md text-blue-700 font-semibold">{item.total_movements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reports.length === 0 && !loading && (
          <p className='text-gray-500 mt-4'>Tidak ada aktivitas user tercatat.</p>
      )}
    </div>
  );
}

export default UserActivityReport;