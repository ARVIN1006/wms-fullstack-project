import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select'; 

function StatusInventoryReport() {
  const [reports, setReports] = useState([]);
  const [stockStatuses, setStockStatuses] = useState([]); // Daftar status untuk filter
  const [loading, setLoading] = useState(true);

  // --- STATE FILTER ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null); 

  // Definisi Header untuk file CSV
  const csvHeaders = [
    { label: "Tanggal", key: "transaction_date" },
    { label: "SKU", key: "sku" },
    { label: "Nama Produk", key: "product_name" },
    { label: "Jumlah", key: "quantity" },
    { label: "Status", key: "stock_status_name" },
    { label: "Lokasi", key: "location_name" },
    { label: "No. Batch", key: "batch_number" },
    { label: "Tgl. Kadaluarsa", key: "expiry_date" },
    { label: "Operator", key: "operator_name" },
  ];
  
  const getExportData = () => {
      return reports.map(item => ({
          ...item,
          transaction_date: new Date(item.transaction_date).toLocaleString('id-ID'),
          expiry_date: item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('id-ID') : '-',
          batch_number: item.batch_number || '-',
      }));
  }

  useEffect(() => {
    let isMounted = true; // BARU: Flag untuk cleanup

    async function fetchMasterData() {
      try {
        const statusRes = await axios.get('/api/reports/stock-statuses'); 
        if (isMounted) { // Cek sebelum set state
          // Filter 'Good' agar tidak muncul di opsi filter
          setStockStatuses(statusRes.data.filter(s => s.name !== 'Good'));
        }
      } catch (err) {
        if (isMounted) toast.error('Gagal memuat data master status.');
      }
    }
    fetchMasterData();
    fetchReports(); // Muat laporan awal (tetap panggil fetchReports yang di bawah)
    
    // BARU: Cleanup function
    return () => {
        isMounted = false;
    };
  }, []); // Hanya dipanggil sekali saat load

  // Fungsi Fetch Laporan
  // PERBAIKAN: Tambahkan isMounted check di sini untuk pemanggilan filter
  async function fetchReports() {
    let isMounted = true; // BARU: Tambahkan flag lokal
    try {
      if (isMounted) setLoading(true);
      
      const params = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          statusId: selectedStatus?.value || undefined
      };
      
      const response = await axios.get('/api/reports/status-inventory', { params }); 
      if (isMounted) setReports(response.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        if (isMounted) toast.error('Gagal memuat data laporan status.');
      }
    } finally {
      if (isMounted) setLoading(false);
    }
    // Tambahkan pengembalian cleanup jika fungsi ini dipanggil di luar useEffect
    return () => { isMounted = false; };
  }
  
  // Handler Submit Filter
  const handleFilterSubmit = (e) => {
      e.preventDefault();
      const cleanup = fetchReports(); // Panggil ulang dengan state filter saat ini
      // Di sini kita tidak bisa menggunakan cleanup return, 
      // tapi penambahan flag di fetchReports sudah membantu.
  }

  const statusOptions = [
      { value: '', label: 'Semua Status (Non-Good)' },
      ...stockStatuses.map(s => ({ value: s.id, label: s.name }))
  ];

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📦 Laporan Stok Rusak/Kadaluarsa</h1>
      
      {/* --- FORM FILTER --- */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
                <Select
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    placeholder="Semua (Non-Good)"
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
      
      {/* Tombol Ekspor */}
      <div className="flex justify-end items-center mb-6">
        <ExportButton 
            data={getExportData()} 
            headers={csvHeaders} 
            filename={`Laporan_Stok_Rusak_${new Date().toISOString().slice(0, 10)}.csv`}
        >
            Unduh Laporan (CSV)
        </ExportButton>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk (SKU)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tgl. Kadaluarsa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((item) => (
                <tr key={item.item_id}> 
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(item.transaction_date).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.product_name} ({item.sku})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        {item.stock_status_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.location_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.batch_number || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.operator_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reports.length === 0 && !loading && (
          <p className='text-gray-500 mt-4'>Tidak ada data stok rusak/kadaluarsa ditemukan.</p>
      )}
    </div>
  );
}

export default StatusInventoryReport;