import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Select from 'react-select'; // Untuk dropdown Operator

function UserActivityReport() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]); // <-- STATE BARU (Daftar User)
  const [loading, setLoading] = useState(true);

  // --- STATE FILTER BARU ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOperator, setSelectedOperator] = useState(null);

  // Ambil data Laporan dan data User
  useEffect(() => {
    // Fungsi untuk ambil data master user
    async function fetchUsers() {
      try {
        const response = await axios.get('/api/users'); // Panggil API users
        setUsers(response.data);
      } catch (err) {
        toast.error('Gagal memuat data operator.');
      }
    }
    fetchUsers();
    fetchReports(); // Muat laporan awal
  }, []); // Hanya dipanggil sekali saat load

  // --- FUNGSI UTAMA FETCH REPORTS (DENGAN FILTER) ---
  async function fetchReports() {
    try {
      setLoading(true);
      
      const params = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          operatorId: selectedOperator?.value || undefined
      };
      
      // Panggil API aktivitas baru dengan filter
      const response = await axios.get('/api/reports/activity', { params }); // API ini sudah kita upgrade di backend
      setReports(response.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Gagal memuat laporan aktivitas user.');
      }
    } finally {
      setLoading(false);
    }
  }
  
  // Handler saat tombol 'Filter' diklik
  const handleFilterSubmit = (e) => {
      e.preventDefault();
      fetchReports(); // Panggil ulang dengan state filter saat ini
  }
  
  // Opsi dropdown Operator
  const operatorOptions = [
      { value: '', label: 'Semua Operator' },
      ...users.map(u => ({ value: u.id, label: u.username }))
  ];

  // Helper untuk mendapatkan badge role
  const getRoleBadge = (role) => {
      const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
      if (role === 'admin') return `${base} bg-indigo-100 text-indigo-800`;
      return `${base} bg-gray-200 text-gray-800`;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">📋 Laporan Aktivitas User & Kinerja</h1>

      {/* --- FORM FILTER BARU --- */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Operator</label>
                <Select
                    options={operatorOptions}
                    value={selectedOperator}
                    onChange={setSelectedOperator}
                    placeholder="Semua Operator"
                    isClearable={true}
                    classNamePrefix="react-select"
                />
            </div>
            
            <div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    Tampilkan Laporan
                </button>
            </div>
        </div>
      </form>


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