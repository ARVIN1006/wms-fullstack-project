import { useState, useEffect, useCallback } from 'react'; // Hapus useEffect yang tidak perlu
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select'; 
import { format } from "date-fns";
// BARU: Import hook useMasterData
import { useMasterData } from '../hooks/useMasterData'; 

const STATUS_REPORT_LIMIT = 15;

// --- KOMPONEN SKELETON (Dipertahankan) ---
const StatusInventoryReportSkeleton = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 bg-gray-200 h-8 w-1/3 animate-pulse rounded"></h1>
            <div className="flex gap-4 items-center mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="h-6 w-1/5 bg-gray-300 rounded"></div>
                <div className="h-10 w-1/4 bg-gray-300 rounded"></div>
            </div>
            <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg animate-pulse">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 bg-gray-200 h-6"></th>
                        <th className="px-6 py-3 bg-gray-200 h-6"></th>
                        <th className="px-6 py-3 bg-gray-200 h-6"></th>
                        <th className="px-6 py-3 bg-gray-200 h-6"></th>
                        <th className="px-6 py-3 bg-gray-200 h-6"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {[...Array(5)].map((_, i) => (
                        <tr key={i}>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---

function StatusInventoryReport() {
  // --- MASTER DATA: Ambil Status dan Lokasi (Menggunakan Hook useMasterData) ---
  const { data: allStockStatuses, loading: statusLoading } = useMasterData('/api/reports/stock-statuses');
  const { data: allLocations, loading: locationLoading } = useMasterData('/api/locations');
  
  // Filter 'Good' agar tidak muncul di opsi filter
  const stockStatuses = (allStockStatuses || []).filter(s => s.name !== 'Good');
  const locations = allLocations || []; 

  // --- INPUT STATES (Kontrol Form) ---
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [selectedStatusInput, setSelectedStatusInput] = useState(null); 
  const [selectedLocationInput, setSelectedLocationInput] = useState(null); 
  
  // --- APPLIED FILTERS (Trigger untuk Hook) ---
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: undefined,
    endDate: undefined,
    statusId: undefined,
    locationId: undefined,
  });
  
  // Helper untuk membuat Query String dari appliedFilters
  const createQueryString = (filters) => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.statusId) params.append('statusId', filters.statusId);
      if (filters.locationId) params.append('locationId', filters.locationId);
      return params.toString();
  }
  
  // URL untuk useMasterData (akan berubah saat appliedFilters berubah)
  const reportUrl = `/api/reports/inventory-status?${createQueryString(appliedFilters)}`;
  
  // --- FETCH REPORTS (Menggunakan Hook useMasterData) ---
  const { data: reportsData, loading: reportsLoading } = useMasterData(reportUrl, {}); 
  
  // Extract actual report array
  const reports = reportsData?.reports || [];


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
  
  const getExportData = useCallback(async () => {
      // Menggunakan (reports || []) untuk pemeriksaan keamanan
      return (reports || []).map(item => ({
          ...item,
          transaction_date: item.transaction_date ? new Date(item.transaction_date).toLocaleString('id-ID') : '-',
          expiry_date: item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('id-ID') : '-',
          batch_number: item.batch_number || '-',
      }));
  }, [reports]);

  
  const handleFilterSubmit = (e) => {
      e.preventDefault();
      
      // Update APPLIED filters, yang akan memicu refetch via useMasterData
      setAppliedFilters({
          startDate: startDateInput || undefined,
          endDate: endDateInput || undefined,
          statusId: selectedStatusInput?.value || undefined,
          locationId: selectedLocationInput?.value || undefined,
      });
  }

  const statusOptions = [
      { value: '', label: 'Semua Status (Non-Good)' },
      ...stockStatuses.map(s => ({ value: s.id, label: s.name }))
  ];

  const locationOptions = [
    { value: '', label: 'Semua Lokasi' },
    ...locations.map(l => ({ value: l.id, label: l.name }))
];

  // Helper untuk mendapatkan badge status dari database (stock_status_name)
  const getStatusBadge = (statusName) => {
      const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
      if (statusName === 'Damaged') return `${base} bg-orange-100 text-orange-800`;
      if (statusName === 'Expired') return `${base} bg-red-100 text-red-800`;
      return `${base} bg-gray-100 text-gray-800`; // Status lain (Shouldn't happen with backend filter)
  }
  
  // RENAME: getStatusText -> getExpiryBadge (Hanya untuk penanda visual di kolom Tgl. Kadaluarsa)
  const getExpiryBadge = (expDate) => {
      if (expDate) {
          const today = new Date();
          const expiry = new Date(expDate);
          expiry.setHours(0,0,0,0);
          today.setHours(0,0,0,0);

          if (expiry < today) {
              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">KADALUARSA</span>;
          } else if ((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24) <= 30) {
              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Hampir Kadaluarsa</span>;
          }
      }
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">N/A</span>;
  };
  
  const getFormattedExpDate = (expDate) => {
      if (!expDate) return 'N/A';
      const expiry = new Date(expDate);
      const today = new Date();
      expiry.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      
      if (expiry < today) {
          return <span className='font-bold text-red-600'>{format(new Date(expDate), 'dd-MM-yyyy')}</span>;
      }
      return format(new Date(expDate), 'dd-MM-yyyy');
  };


  const loading = statusLoading || locationLoading || reportsLoading;

  if (loading) {
    return <StatusInventoryReportSkeleton />;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📦 Laporan Stok Rusak/Kadaluarsa</h1>
      
      {/* --- FORM FILTER --- */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                <input type="date" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
                <Select
                    options={statusOptions}
                    value={selectedStatusInput}
                    onChange={setSelectedStatusInput}
                    placeholder="Semua (Non-Good)"
                    isClearable={true}
                    classNamePrefix="react-select"
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Lokasi</label>
                <Select
                    options={locationOptions}
                    value={selectedLocationInput}
                    onChange={setSelectedLocationInput}
                    placeholder="Semua Lokasi"
                    isClearable={true}
                    classNamePrefix="react-select"
                />
            </div>
            <div>
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

      {(reports || []).length === 0 && !reportsLoading ? (
        <p className='text-gray-500 mt-4'>Tidak ada data stok rusak/kadaluarsa ditemukan.</p>
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
              {(reports || []).map((item, index) => (
                <tr key={item.item_id || index}> 
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.transaction_date ? new Date(item.transaction_date).toLocaleString('id-ID') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.product_name} ({item.sku})</td>
                  
                  {/* TAMPILKAN STATUS DARI DB */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getStatusBadge(item.stock_status_name)}>
                        {item.stock_status_name?.toUpperCase() || '-'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.location_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.batch_number || '-'}</td>
                  
                  {/* Tgl. Kadaluarsa */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getFormattedExpDate(item.expiry_date)}
                    {/* Tambahkan badge visual kadaluarsa jika ada */}
                    <div className='mt-1'>{getExpiryBadge(item.expiry_date)}</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.operator_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default StatusInventoryReport;