import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select'; 
// BARU: Import hook usePaginatedList
import { usePaginatedList } from '../hooks/usePaginatedList'; 

const LIMIT_PER_PAGE = 20; // Konstanta untuk limit halaman

// Opsi Tipe Transaksi
const typeOptions = [
    { value: '', label: 'Semua Transaksi' },
    { value: 'IN', label: 'Barang Masuk (Inbound)' },
    { value: 'OUT', label: 'Barang Keluar (Outbound)' },
];

// Helper untuk menghitung durasi proses (dalam menit)
const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const diffMs = new Date(end) - new Date(start);
    return (diffMs / 60000).toFixed(2); // ms ke menit
};

// --- KOMPONEN SKELETON BARU ---
const ReportsSkeleton = () => {
    // 10 Kolom dalam tabel riwayat transaksi
    const columns = 10; 
    
    const TableRowSkeleton = () => (
        <tr className="border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    {/* Variasi ukuran skeleton untuk simulasi data */}
                    <div className={`h-4 bg-gray-300 rounded skeleton-shimmer ${i === 2 ? 'w-3/4' : 'w-full'}`}></div>
                </td>
            ))}
        </tr>
    );

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg animate-pulse"> 
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4 skeleton-shimmer"></div>
            
            {/* Filter Form Skeleton */}
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 bg-gray-300 rounded skeleton-shimmer"></div>
                    ))}
                </div>
            </div>
            
            {/* Total Count & Export Button Skeleton */}
            <div className="flex justify-between items-center mb-6">
                <div className="h-4 bg-gray-300 rounded w-20 skeleton-shimmer"></div>
                <div className="h-10 bg-indigo-300 rounded w-40 skeleton-shimmer"></div>
            </div>
            
            {/* Table Skeleton */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        {/* Header Row Placeholder */}
                        <tr>
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    <div className="h-3 bg-gray-300 rounded w-2/3 skeleton-shimmer"></div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* 10 Rows Placeholder */}
                        {Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} />)}
                    </tbody>
                </table>
            </div>
             {/* Pagination Skeleton */}
            <div className="flex justify-between items-center mt-6">
                <div className="h-8 bg-gray-300 rounded w-32 skeleton-shimmer"></div>
                <div className="h-8 bg-gray-300 rounded w-20 skeleton-shimmer"></div>
                <div className="h-8 bg-gray-300 rounded w-32 skeleton-shimmer"></div>
            </div>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---


function Reports() {
  const [suppliers, setSuppliers] = useState([]); 
  const [customers, setCustomers] = useState([]); 

  // --- INPUT STATES (Dapat diubah pengguna) ---
  const [typeInput, setTypeInput] = useState(typeOptions[0]);
  const [supplierInput, setSupplierInput] = useState(null);
  const [customerInput, setCustomerInput] = useState(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  
  // --- APPLIED STATES (Digunakan oleh Hook, hanya berubah saat tombol diklik) ---
  const [appliedFilters, setAppliedFilters] = useState({
      type: typeOptions[0].value,
      supplierId: undefined, 
      customerId: undefined, 
      startDate: undefined,
      endDate: undefined
  });


  // 1. Tentukan Dependency Filter untuk Hook (hanya menggunakan appliedFilters)
  const filterDependencies = {
      type: appliedFilters.type || undefined,
      supplierId: appliedFilters.supplierId || undefined, 
      customerId: appliedFilters.customerId || undefined, 
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined
  };

  // 2. Gunakan Hook usePaginatedList
  const {
      data: reports,
      loading: reportsLoading, // Rename loading state
      currentPage,
      totalPages,
      totalCount,
      handlePageChange,
      resetPagination // Gunakan fungsi baru untuk reset
  } = usePaginatedList('/api/reports/history', LIMIT_PER_PAGE, filterDependencies);

  // --- Ambil Data Master saat Awal ---
  const [masterLoading, setMasterLoading] = useState(true);
  useEffect(() => {
    let isMounted = true; 

    async function fetchMasterData() {
        try {
            // Fetch Supplier dan Customer untuk dropdown filter
            const [supplierRes, customerRes] = await Promise.all([
                axios.get('/api/suppliers?page=1&limit=1000'),
                axios.get('/api/customers?page=1&limit=1000')
            ]);
            
            if (isMounted) { 
              setSuppliers(supplierRes.data.suppliers);
              setCustomers(customerRes.data.customers);
              setMasterLoading(false);
            }

        } catch (err) {
            if (isMounted) {
                toast.error('Gagal memuat data master untuk filter.');
                setMasterLoading(false);
            }
        }
    }
    fetchMasterData();
    
    return () => {
        isMounted = false; 
    };
  }, []);

  // Handler saat tombol 'Tampilkan Laporan' diklik
  const handleFilterSubmit = (e) => {
      e.preventDefault();
      
      // Update APPLIED filters dan reset pagination
      setAppliedFilters({
          type: typeInput.value,
          supplierId: typeInput.value === 'IN' ? supplierInput?.value : undefined, 
          customerId: typeInput.value === 'OUT' ? customerInput?.value : undefined, 
          startDate: startDateInput || undefined,
          endDate: endDateInput || undefined
      });

      // Hook akan otomatis fetch ulang karena appliedFilters berubah.
      // Kita perlu memastikan pagination reset ke halaman 1.
      resetPagination(); // Panggil fungsi resetPagination dari hook
  }
  
  // Fungsi untuk memformat data sebelum diekspor
  const getExportData = async () => { 
      try {
          // Gunakan appliedFilters untuk ekspor (konsisten dengan data yang ditampilkan)
          const params = {
              type: appliedFilters.type || undefined,
              supplierId: appliedFilters.supplierId || undefined,
              customerId: appliedFilters.customerId || undefined,
              startDate: appliedFilters.startDate || undefined,
              endDate: appliedFilters.endDate || undefined
          };
          
          const response = await axios.get('/api/reports/history/export-all', { params }); 
          const allReports = response.data;

          return (allReports || []).map(item => ({
              ...item,
              transaction_date: new Date(item.transaction_date).toLocaleString('id-ID'),
              transaction_type: item.transaction_type === 'IN' ? 'MASUK' : 'KELUAR',
              party_name: item.supplier_name || item.customer_name || '-',
              process_duration_minutes: calculateDuration(item.process_start, item.process_end), 
              transaction_value: parseFloat(item.transaction_value || 0).toFixed(2),
          }));
      } catch (err) {
          toast.error('Gagal mengambil semua data untuk ekspor.');
          return [];
      }
  }

  // Opsi Dropdown Supplier/Customer yang dinamis (gunakan state Input)
  const partyOptions = (typeInput.value === 'IN' ? suppliers : customers).map(p => ({
      value: p.id,
      label: p.name
  }));
  const partyPlaceholder = typeInput.value === 'IN' ? 'Pilih Supplier' : 'Pilih Pelanggan';

  const loading = reportsLoading || masterLoading;

  // --- RENDER UTAMA ---
  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📊 Laporan Riwayat Transaksi Lengkap</h1>
      
      {/* --- FORM FILTER --- */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
            {/* Filter Tipe Transaksi */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Transaksi</label>
                <Select
                    options={typeOptions}
                    value={typeInput}
                    onChange={(selected) => {
                        setTypeInput(selected);
                        setSupplierInput(null); 
                        setCustomerInput(null);
                    }}
                    classNamePrefix="react-select"
                />
            </div>

            {/* Filter Supplier/Customer Dinamis */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {typeInput.value === 'IN' ? 'Filter Supplier' : 'Filter Pelanggan'}
                </label>
                <Select
                    options={partyOptions}
                    value={typeInput.value === 'IN' ? supplierInput : customerInput} 
                    onChange={typeInput.value === 'IN' ? setSupplierInput : setCustomerInput} 
                    placeholder={partyPlaceholder}
                    isClearable={true}
                    classNamePrefix="react-select"
                    isDisabled={!typeInput.value || partyOptions.length === 0} 
                />
            </div>
            
            {/* Filter Tanggal Mulai */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>

            {/* Filter Tanggal Akhir */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                <input type="date" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            
            {/* Tombol Aksi */}
            <div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    Tampilkan Laporan
                </button>
            </div>
        </div>
      </form>
      
      {/* Tombol Ekspor & Total Data */}
      <div className="flex justify-between items-center mb-6"> 
        <p className='text-sm font-medium text-gray-600'>Total Data: {totalCount}</p> 
        <ExportButton 
            data={getExportData} // Menggunakan fungsi async
            headers={[
                { label: "Tanggal", key: "transaction_date" },
                { label: "Tipe", key: "transaction_type" },
                { label: "Nilai Transaksi (Rp)", key: "transaction_value" }, 
                { label: "Operator", key: "operator_name" },
                { label: "Supplier/Customer", key: "party_name" }, 
                { label: "Produk (SKU)", key: "product_name" },
                { label: "Jumlah", key: "quantity" },
                { label: "Status Stok", key: "stock_status_name" }, 
                { label: "Lokasi", key: "location_name" },
                { label: "Waktu Proses (Menit)", key: "process_duration_minutes" }, 
                { label: "Catatan", key: "notes" },
            ]} 
            filename={`Laporan_WMS_${new Date().toISOString().slice(0, 10)}.csv`}
        >
            Unduh Semua Data (CSV)
        </ExportButton>
      </div>

      {reports.length === 0 && !reportsLoading ? (
        <p className="text-gray-500 mt-4">Tidak ada data transaksi tercatat dengan filter ini.</p>
      ) : (
        <> 
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai Transaksi</th> 
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier/Cust</th> 
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk (SKU)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jmlh</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu Proses (Menit)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(reports || []).map((item) => (
                    <tr key={item.item_id}> 
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(item.transaction_date).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.transaction_type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.transaction_type === 'IN' ? 'MASUK' : 'KELUAR'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        Rp {parseFloat(item.transaction_value || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{item.operator_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.supplier_name || item.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.product_name} ({item.sku})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{item.location_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{item.stock_status_name || 'Good'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.process_start ? `${calculateDuration(item.process_start, item.process_end)} Menit` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* PAGINATION CONTROLS */}
            <div className="flex justify-between items-center mt-6">
                <p className='text-sm text-gray-600'>Menampilkan {reports.length} dari {totalCount} data.</p>
                <div className='space-x-4'>
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || reportsLoading} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
                        &laquo; Sebelumnya
                    </button>
                    <span className="text-sm">
                        Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                    </span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || reportsLoading} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
                        Berikutnya &raquo;
                    </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
}

export default Reports;