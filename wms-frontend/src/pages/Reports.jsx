import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import ExportButton from '../components/ExportButton';
import { usePaginatedList } from '../hooks/usePaginatedList';

// Constants
const LIMIT_PER_PAGE = 20;
const DEBOUNCE_DELAY = 500;

// Transaction Type Options
const TYPE_OPTIONS = [
  { value: '', label: '📦 Semua Transaksi', color: 'gray' },
  { value: 'IN', label: '📥 Barang Masuk', color: 'green' },
  { value: 'OUT', label: '📤 Barang Keluar', color: 'red' },
];

// Custom Styles for React Select
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
    },
    borderRadius: '8px',
    padding: '2px'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    '&:active': {
      backgroundColor: '#2563eb'
    }
  })
};

// Helper Functions
const calculateDuration = (start, end) => {
  if (!start || !end) return 0;
  const diffMs = new Date(end) - new Date(start);
  return Math.round(diffMs / 60000); // Convert to minutes
};

const formatCurrency = (amount) => {
  return `Rp ${parseFloat(amount || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Skeleton Loader Component
const ReportsSkeleton = () => {
  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className={`h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse ${
            i === 2 ? 'w-24' : i === 5 ? 'w-32' : 'w-full'
          }`}></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-80"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-96"></div>
        </div>
        <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-40"></div>
      </div>

      {/* Filter Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
            <div className="h-12 bg-white rounded-lg border border-gray-200"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Tanggal', 'Tipe', 'Nilai', 'Operator', 'Pihak', 'Produk', 'Qty', 'Lokasi', 'Status', 'Durasi'].map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Filter Badge Component
const FilterBadge = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
    {label}: {value}
    <button
      onClick={onRemove}
      className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
    >
      ×
    </button>
  </span>
);

// Main Reports Component
function Reports() {
  // State for master data
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Input states
  const [typeInput, setTypeInput] = useState(TYPE_OPTIONS[0]);
  const [supplierInput, setSupplierInput] = useState(null);
  const [customerInput, setCustomerInput] = useState(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  
  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    type: TYPE_OPTIONS[0].value,
    supplierId: undefined,
    customerId: undefined,
    startDate: undefined,
    endDate: undefined
  });

  // Active filters for display
  const [activeFilters, setActiveFilters] = useState([]);

  // Filter dependencies for API call
  const filterDependencies = {
    type: appliedFilters.type || undefined,
    supplierId: appliedFilters.supplierId || undefined,
    customerId: appliedFilters.customerId || undefined,
    startDate: appliedFilters.startDate || undefined,
    endDate: appliedFilters.endDate || undefined
  };

  // Use paginated list hook
  const {
    data: reports,
    loading: reportsLoading,
    currentPage,
    totalPages,
    totalCount,
    handlePageChange,
    resetPagination
  } = usePaginatedList('/api/reports/history', LIMIT_PER_PAGE, filterDependencies);

  // Fetch master data
  const [masterLoading, setMasterLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;

    const fetchMasterData = async () => {
      try {
        const [supplierRes, customerRes] = await Promise.all([
          axios.get('/api/suppliers?page=1&limit=1000'),
          axios.get('/api/customers?page=1&limit=1000')
        ]);
        
        if (isMounted) {
          setSuppliers(supplierRes.data.suppliers || []);
          setCustomers(customerRes.data.customers || []);
          setMasterLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching master data:', err);
          toast.error('Gagal memuat data master untuk filter.');
          setMasterLoading(false);
        }
      }
    };

    fetchMasterData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Update active filters when applied filters change
  useEffect(() => {
    const newActiveFilters = [];
    
    if (appliedFilters.type) {
      const typeLabel = TYPE_OPTIONS.find(opt => opt.value === appliedFilters.type)?.label || 'Semua';
      newActiveFilters.push({ key: 'type', label: 'Tipe', value: typeLabel });
    }
    
    if (appliedFilters.supplierId) {
      const supplier = suppliers.find(s => s.id === appliedFilters.supplierId);
      if (supplier) {
        newActiveFilters.push({ key: 'supplier', label: 'Supplier', value: supplier.name });
      }
    }
    
    if (appliedFilters.customerId) {
      const customer = customers.find(c => c.id === appliedFilters.customerId);
      if (customer) {
        newActiveFilters.push({ key: 'customer', label: 'Customer', value: customer.name });
      }
    }
    
    if (appliedFilters.startDate) {
      newActiveFilters.push({ key: 'startDate', label: 'Dari', value: new Date(appliedFilters.startDate).toLocaleDateString('id-ID') });
    }
    
    if (appliedFilters.endDate) {
      newActiveFilters.push({ key: 'endDate', label: 'Sampai', value: new Date(appliedFilters.endDate).toLocaleDateString('id-ID') });
    }
    
    setActiveFilters(newActiveFilters);
  }, [appliedFilters, suppliers, customers]);

  // Handle filter submission
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    
    setAppliedFilters({
      type: typeInput.value,
      supplierId: typeInput.value === 'IN' ? supplierInput?.value : undefined,
      customerId: typeInput.value === 'OUT' ? customerInput?.value : undefined,
      startDate: startDateInput || undefined,
      endDate: endDateInput || undefined
    });

    resetPagination();
  };

  // Handle filter removal
  const handleRemoveFilter = (filterKey) => {
    switch (filterKey) {
      case 'type':
        setTypeInput(TYPE_OPTIONS[0]);
        setAppliedFilters(prev => ({ ...prev, type: TYPE_OPTIONS[0].value }));
        break;
      case 'supplier':
        setSupplierInput(null);
        setAppliedFilters(prev => ({ ...prev, supplierId: undefined }));
        break;
      case 'customer':
        setCustomerInput(null);
        setAppliedFilters(prev => ({ ...prev, customerId: undefined }));
        break;
      case 'startDate':
        setStartDateInput('');
        setAppliedFilters(prev => ({ ...prev, startDate: undefined }));
        break;
      case 'endDate':
        setEndDateInput('');
        setAppliedFilters(prev => ({ ...prev, endDate: undefined }));
        break;
      default:
        break;
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setTypeInput(TYPE_OPTIONS[0]);
    setSupplierInput(null);
    setCustomerInput(null);
    setStartDateInput('');
    setEndDateInput('');
    setAppliedFilters({
      type: TYPE_OPTIONS[0].value,
      supplierId: undefined,
      customerId: undefined,
      startDate: undefined,
      endDate: undefined
    });
  };

  // Get export data
  const getExportData = async () => {
    try {
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
        'Tanggal Transaksi': formatDate(item.transaction_date),
        'Tipe': item.transaction_type === 'IN' ? 'MASUK' : 'KELUAR',
        'Nilai Transaksi (Rp)': parseFloat(item.transaction_value || 0).toLocaleString('id-ID'),
        'Operator': item.operator_name,
        'Pihak': item.supplier_name || item.customer_name || '-',
        'Produk': item.product_name,
        'SKU': item.sku,
        'Quantity': item.quantity,
        'Lokasi': item.location_name,
        'Status Stok': item.stock_status_name || 'Good',
        'Durasi Proses (Menit)': calculateDuration(item.process_start, item.process_end),
        'Catatan': item.notes || '-'
      }));
    } catch (err) {
      toast.error('Gagal mengambil data untuk ekspor.');
      return [];
    }
  };

  // Dynamic options for supplier/customer dropdown
  const partyOptions = (typeInput.value === 'IN' ? suppliers : customers).map(p => ({
    value: p.id,
    label: p.name
  }));

  const partyPlaceholder = typeInput.value === 'IN' ? 'Pilih Supplier' : 'Pilih Pelanggan';

  const loading = reportsLoading || masterLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ReportsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laporan Riwayat Transaksi</h1>
            <p className="text-gray-600 mt-2">
              Analisis lengkap semua transaksi masuk dan keluar gudang
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
              <div className="text-sm text-gray-600">Total Transaksi</div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Laporan</h3>
          
          <form onSubmit={handleFilterSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Transaksi</label>
                <Select
                  options={TYPE_OPTIONS}
                  value={typeInput}
                  onChange={(selected) => {
                    setTypeInput(selected);
                    setSupplierInput(null);
                    setCustomerInput(null);
                  }}
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                />
              </div>

              {/* Supplier/Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {typeInput.value === 'IN' ? 'Supplier' : 'Pelanggan'}
                </label>
                <Select
                  options={partyOptions}
                  value={typeInput.value === 'IN' ? supplierInput : customerInput}
                  onChange={typeInput.value === 'IN' ? setSupplierInput : setCustomerInput}
                  placeholder={partyPlaceholder}
                  isClearable
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  isDisabled={!typeInput.value}
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </form>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filter Aktif:</span>
              {activeFilters.map((filter) => (
                <FilterBadge
                  key={filter.key}
                  label={filter.label}
                  value={filter.value}
                  onRemove={() => handleRemoveFilter(filter.key)}
                />
              ))}
              <button
                onClick={handleClearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Hapus Semua
              </button>
            </div>
          )}
        </div>

        {/* Export & Stats Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600">Menampilkan</div>
              <div className="text-lg font-bold text-gray-900">
                {reports.length} dari {totalCount} data
              </div>
            </div>
          </div>
          
          <ExportButton
            data={getExportData}
            headers={[
              { label: "Tanggal Transaksi", key: "Tanggal Transaksi" },
              { label: "Tipe", key: "Tipe" },
              { label: "Nilai Transaksi (Rp)", key: "Nilai Transaksi (Rp)" },
              { label: "Operator", key: "Operator" },
              { label: "Pihak", key: "Pihak" },
              { label: "Produk", key: "Produk" },
              { label: "SKU", key: "SKU" },
              { label: "Quantity", key: "Quantity" },
              { label: "Lokasi", key: "Lokasi" },
              { label: "Status Stok", key: "Status Stok" },
              { label: "Durasi Proses (Menit)", key: "Durasi Proses (Menit)" },
              { label: "Catatan", key: "Catatan" },
            ]}
            filename={`laporan-transaksi-${new Date().toISOString().slice(0, 10)}.csv`}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            📥 Ekspor CSV
          </ExportButton>
        </div>

        {/* Results Section */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Data</h3>
            <p className="text-gray-600 mb-6">
              Tidak ditemukan transaksi dengan filter yang dipilih. Coba ubah kriteria filter Anda.
            </p>
            <button
              onClick={handleClearAllFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipe</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nilai</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Operator</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pihak</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produk</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lokasi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Durasi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {reports.map((item) => (
                    <tr key={item.item_id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(item.transaction_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          item.transaction_type === 'IN' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {item.transaction_type === 'IN' ? '📥 MASUK' : '📤 KELUAR'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(item.transaction_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {item.operator_name?.charAt(0)?.toUpperCase()}
                          </div>
                          {item.operator_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.supplier_name || item.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                            {item.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.quantity} unit
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.location_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.stock_status_name === 'Good' 
                            ? 'bg-green-100 text-green-800'
                            : item.stock_status_name === 'Damaged'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.stock_status_name || 'Good'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.process_start ? (
                          <div className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{calculateDuration(item.process_start, item.process_end)}m</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Menampilkan halaman <span className="font-semibold">{currentPage}</span> dari{' '}
                    <span className="font-semibold">{totalPages}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Sebelumnya
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Berikutnya →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;