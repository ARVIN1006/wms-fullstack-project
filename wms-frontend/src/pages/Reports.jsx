import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select'; 

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


function Reports() {
  const [reports, setReports] = useState([]);
  const [suppliers, setSuppliers] = useState([]); 
  const [customers, setCustomers] = useState([]); 
  const [loading, setLoading] = useState(true);

  // --- STATE FILTER ---
  const [type, setType] = useState(typeOptions[0]);
  const [supplier, setSupplier] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Definisi Header untuk file CSV
  const csvHeaders = [
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
  ];
  
  // Fungsi untuk memformat data sebelum diekspor
  const getExportData = () => {
      return reports.map(item => ({
          ...item,
          transaction_date: new Date(item.transaction_date).toLocaleString('id-ID'),
          transaction_type: item.transaction_type === 'IN' ? 'MASUK' : 'KELUAR',
          party_name: item.supplier_name || item.customer_name || '-',
          process_duration_minutes: calculateDuration(item.process_start, item.process_end), 
          transaction_value: parseFloat(item.transaction_value || 0).toFixed(2),
      }));
  }

  // --- Ambil Data Master & Laporan saat Awal ---
  useEffect(() => {
    async function fetchMasterAndReports() {
        setLoading(true);
        try {
            // Fetch Supplier dan Customer untuk dropdown filter
            const [supplierRes, customerRes] = await Promise.all([
                axios.get('/api/suppliers?page=1&limit=1000'),
                axios.get('/api/customers?page=1&limit=1000')
            ]);
            setSuppliers(supplierRes.data.suppliers);
            setCustomers(customerRes.data.customers);
            
            // Muat Laporan Awal
            fetchReports();

        } catch (err) {
            toast.error('Gagal memuat data master untuk filter.');
            setLoading(false);
        }
    }
    fetchMasterAndReports();
  }, []);

  // --- FUNGSI UTAMA FETCH REPORTS (DENGAN FILTER) ---
  async function fetchReports() {
    try {
      setLoading(true);
      
      const params = {
          limit: undefined, 
          type: type.value || undefined,
          supplierId: type.value === 'IN' ? supplier?.value : undefined,
          customerId: type.value === 'OUT' ? customer?.value : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
      };

      const response = await axios.get('/api/reports/history', { params }); 
      setReports(response.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
          toast.error('Gagal memuat data laporan transaksi.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Handler saat tombol 'Tampilkan Laporan' diklik
  const handleFilterSubmit = (e) => {
      e.preventDefault();
      fetchReports();
  }
  
  // Opsi Dropdown Supplier/Customer yang dinamis
  const partyOptions = (type.value === 'IN' ? suppliers : customers).map(p => ({
      value: p.id,
      label: p.name
  }));
  const partyPlaceholder = type.value === 'IN' ? 'Pilih Supplier' : 'Pilih Pelanggan';


  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📊 Laporan Riwayat Transaksi Lengkap</h1>
      
      {/* --- FORM FILTER BARU --- */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
            {/* Filter Tipe Transaksi */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Transaksi</label>
                <Select
                    options={typeOptions}
                    value={type}
                    onChange={(selected) => {
                        setType(selected);
                        setSupplier(null); 
                        setCustomer(null);
                    }}
                    classNamePrefix="react-select"
                />
            </div>

            {/* Filter Supplier/Customer Dinamis */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type.value === 'IN' ? 'Filter Supplier' : 'Filter Pelanggan'}
                </label>
                <Select
                    options={partyOptions}
                    value={type.value === 'IN' ? supplier : customer} 
                    onChange={type.value === 'IN' ? setSupplier : setCustomer} 
                    placeholder={partyPlaceholder}
                    isClearable={true}
                    classNamePrefix="react-select"
                    isDisabled={!type.value || partyOptions.length === 0} 
                />
            </div>
            
            {/* Filter Tanggal Mulai */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>

            {/* Filter Tanggal Akhir */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            
            {/* Tombol Aksi */}
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
            filename={`Laporan_WMS_${new Date().toISOString().slice(0, 10)}.csv`}
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
              {reports.map((item) => (
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
      )}
      {reports.length === 0 && !loading && (
          <p className='text-gray-500 mt-4'>Tidak ada data transaksi tercatat dengan filter ini.</p>
      )}
    </div>
  );
}

export default Reports;