import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select'; 

function StatusInventoryReport() {
  const [reports, setReports] = useState([]);
  const [stockStatuses, setStockStatuses] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // State Lokasi
  const [locations, setLocations] = useState([]); 

  // --- STATE FILTER ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null); 
  const [selectedLocation, setSelectedLocation] = useState(null); 

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
  
  // FIX: Mengubah getExportData menjadi ASYNC dan menggunakan safe check
  const getExportData = async () => {
      // Menggunakan (reports || []) untuk pemeriksaan keamanan
      return (reports || []).map(item => ({
          ...item,
          transaction_date: item.transaction_date ? new Date(item.transaction_date).toLocaleString('id-ID') : '-',
          expiry_date: item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('id-ID') : '-',
          batch_number: item.batch_number || '-',
      }));
  }

  // Fungsi Fetch Laporan
  async function fetchReports(isMounted) {
    try {
      if (isMounted) setLoading(true);
      
      const params = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          statusId: selectedStatus?.value || undefined,
          locationId: selectedLocation?.value || undefined
      };
      
      const response = await axios.get('/api/reports/status-inventory', { params }); 
      // FIX UTAMA: Pastikan kita mengambil .reports dari response.data
      if (isMounted) setReports(response.data.reports || []); 
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        if (isMounted) toast.error('Gagal memuat data laporan status.');
      }
      if (isMounted) setReports([]); 
    } finally {
      if (isMounted) setLoading(false);
    }
  }
  
  // --- Ambil Data Master & Laporan (Efek Awal) ---
  useEffect(() => {
    let isMounted = true; 

    async function fetchMasterData() {
      try {
        const [statusRes, locationRes] = await Promise.all([
          axios.get('/api/reports/stock-statuses'),
          axios.get('/api/locations')
        ]);
        
        if (isMounted) { 
          // Filter 'Good' agar tidak muncul di opsi filter
          setStockStatuses(statusRes.data.filter(s => s.name !== 'Good'));
          setLocations(locationRes.data); // Set lokasi
        }
      } catch (err) {
        if (isMounted) toast.error('Gagal memuat data master.');
      }
    }
    fetchMasterData();
    
    return () => {
        isMounted = false;
    };
  }, []); 

  // --- Efek yang Memicu Re-fetch saat Filter Berubah ---
  useEffect(() => {
    let isMounted = true;
    fetchReports(isMounted);
    return () => { isMounted = false; };
  }, [startDate, endDate, selectedStatus, selectedLocation]); // Dependensi filter

  
  const handleFilterSubmit = (e) => {
      e.preventDefault();
  }

  const statusOptions = [
      { value: '', label: 'Semua Status (Non-Good)' },
      ...stockStatuses.map(s => ({ value: s.id, label: s.name }))
  ];

  const locationOptions = [
    { value: '', label: 'Semua Lokasi' },
    ...locations.map(l => ({ value: l.id, label: l.name }))
];

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📦 Laporan Stok Rusak/Kadaluarsa</h1>
      
      {/* --- FORM FILTER --- */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Lokasi</label>
                <Select
                    options={locationOptions}
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    placeholder="Semua Lokasi"
                    isClearable={true}
                    classNamePrefix="react-select"
                />
            </div>
            <div>
                {/* Tombol filter disederhanakan karena filter di-trigger oleh useEffect */}
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    Tampilkan
                </button>
            </div>
        </div>
      </form>
      
      {/* Tombol Ekspor */}
      <div className="flex justify-end items-center mb-6">
        <ExportButton 
            data={getExportData} 
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
              {(reports || []).map((item) => (
                <tr key={item.item_id}> 
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.transaction_date ? new Date(item.transaction_date).toLocaleString('id-ID') : '-'}</td>
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
      {(reports || []).length === 0 && !loading && (
          <p className='text-gray-500 mt-4'>Tidak ada data stok rusak/kadaluarsa ditemukan.</p>
      )}
    </div>
  );
}

export default StatusInventoryReport;