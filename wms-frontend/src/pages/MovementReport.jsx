import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import ExportButton from "../components/ExportButton";
import Select from "react-select";
import AsyncSelect from "react-select/async";
// BARU: Import hook usePaginatedList
import { usePaginatedList } from '../hooks/usePaginatedList'; 
// BARU: Import hook useMasterData
import { useMasterData } from '../hooks/useMasterData'; 

const LIMIT_PER_PAGE = 20; 

// --- KOMPONEN SKELETON (Restored) ---
const MovementReportSkeleton = () => {
    // 8 Kolom dalam tabel pergerakan
    const columns = 8; 
    
    const FilterItemSkeleton = () => (
        <div className="h-10 bg-gray-300 rounded skeleton-shimmer"></div>
    );

    const TableRowSkeleton = () => (
        <tr className="border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <div className="h-4 bg-gray-300 rounded skeleton-shimmer"></div>
                </td>
            ))}
        </tr>
    );

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg animate-pulse"> 
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6 skeleton-shimmer"></div>
            
            {/* Filter Form Skeleton */}
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <FilterItemSkeleton />
                    <FilterItemSkeleton />
                    <FilterItemSkeleton />
                    <FilterItemSkeleton />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-3">
                        <FilterItemSkeleton />
                    </div>
                    <div className="h-10 bg-blue-300 rounded skeleton-shimmer"></div>
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


function MovementReport() {
  // --- MASTER DATA LOCATIONS (Menggunakan Hook useMasterData) ---
  const { data: locations, loading: masterLoading } = useMasterData('/api/locations');

  // --- INPUT STATES (Untuk kontrol form) ---
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [selectedFromLocationInput, setSelectedFromLocationInput] = useState(null);
  const [selectedToLocationInput, setSelectedToLocationInput] = useState(null);
  const [selectedProductInput, setSelectedProductInput] = useState(null);
  
  // --- APPLIED FILTER STATE (Untuk Hook Dependency) ---
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: undefined,
    endDate: undefined,
    fromLocationId: undefined,
    toLocationId: undefined,
    productId: undefined,
  });

  // --- HOOK PAGINATION & FETCHING ---
  const {
    data: reports,
    loading: reportsLoading,
    currentPage,
    totalPages,
    totalCount,
    handlePageChange,
    resetPagination 
  } = usePaginatedList('/api/reports/movements', LIMIT_PER_PAGE, appliedFilters);
  
  const loading = reportsLoading || masterLoading;


  // Definisi Header untuk file CSV (unchanged)
  const csvHeaders = [
    { label: "Tanggal", key: "date" },
    { label: "Operator", key: "operator_name" },
    { label: "SKU", key: "sku" },
    { label: "Nama Produk", key: "product_name" },
    { label: "Jumlah", key: "quantity" },
    { label: "Asal", key: "from_location_name" },
    { label: "Tujuan", key: "to_location_name" },
    { label: "Alasan", key: "reason" },
  ];

  // FIX: Mengubah fungsi menjadi ASYNC untuk ExportButton
  const getExportData = async () => {
    try {
        // Gunakan appliedFilters untuk konsistensi data ekspor
        const params = {
            startDate: appliedFilters.startDate || undefined,
            endDate: appliedFilters.endDate || undefined,
            fromLocationId: appliedFilters.fromLocationId || undefined,
            toLocationId: appliedFilters.toLocationId || undefined,
            productId: appliedFilters.productId || undefined,
        };

        const response = await axios.get('/api/reports/movements/export-all', { params });
        const allReports = response.data;
        
        // Menggunakan safe check (allReports || [])
        return (allReports || []).map((item) => ({
            ...item,
            date: item.date ? new Date(item.date).toLocaleString("id-ID") : '-',
        }));
    } catch (err) {
        toast.error('Gagal mengambil semua data pergerakan untuk ekspor.');
        return [];
    }
  };

  // Fungsi Pencarian Produk Asynchronous (untuk filter) (unchanged)
  const loadProductOptions = async (inputValue) => {
    try {
      const response = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      return response.data.products.map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
      }));
    } catch (err) {
      console.error("Gagal mencari produk:", err);
      return [];
    }
  };

  // Handler saat tombol 'Filter' diklik
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    
    // 1. Terapkan filter dari input state ke applied state
    setAppliedFilters({
        startDate: startDateInput || undefined,
        endDate: endDateInput || undefined,
        fromLocationId: selectedFromLocationInput?.value || undefined,
        toLocationId: selectedToLocationInput?.value || undefined,
        productId: selectedProductInput?.value || undefined,
    });
    
    // 2. Reset pagination ke halaman 1
    resetPagination();
    // Hook akan otomatis memicu fetchData karena appliedFilters berubah
  };

  // --- Handlers Pagination (Menggunakan Hook Handler) ---
  const handlePrevPage = () => {
    handlePageChange(currentPage - 1);
  };
  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };
  // --- END Handlers Pagination ---


  const locationOptions = [
    { value: "", label: "Semua Lokasi" }, 
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  if (loading) {
    return <MovementReportSkeleton />;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        📊 Laporan Perpindahan Barang
      </h1>

      {/* --- FORM FILTER --- */}
      <form
        onSubmit={handleFilterSubmit}
        className="mb-6 p-4 border rounded-lg bg-gray-50"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lokasi Asal
            </label>
            <Select
              options={locationOptions}
              value={selectedFromLocationInput}
              onChange={setSelectedFromLocationInput}
              placeholder="Semua Asal"
              isClearable={true}
              classNamePrefix="react-select"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lokasi Tujuan
            </label>
            <Select
              options={locationOptions}
              value={selectedToLocationInput}
              onChange={setSelectedToLocationInput}
              placeholder="Semua Tujuan"
              isClearable={true}
              classNamePrefix="react-select"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Produk (SKU)
            </label>
            <AsyncSelect
              loadOptions={loadProductOptions}
              value={selectedProductInput}
              onChange={setSelectedProductInput}
              placeholder="Ketik untuk mencari Produk..."
              isClearable={true}
              classNamePrefix="react-select"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
            >
              Tampilkan Laporan
            </button>
          </div>
        </div>
      </form>

      {/* Tombol Ekspor & Total Data */}
      <div className="flex justify-between items-center mb-6">
        <p className='text-sm font-medium text-gray-600'>Total Data: {totalCount}</p> 
        <ExportButton
          data={getExportData} 
          headers={csvHeaders}
          filename={`Laporan_Perpindahan_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`}
        >
          Unduh Laporan (CSV)
        </ExportButton>
      </div>

      {(reports || []).length === 0 && !reportsLoading ? (
        <p className="text-gray-500 mt-4">
          Tidak ada data pergerakan tercatat.
        </p>
      ) : (
        <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {csvHeaders.map((h) => (
                      <th
                        key={h.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.date ? new Date(item.date).toLocaleString("id-ID") : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {item.operator_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                        {item.from_location_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                        {item.to_location_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.reason}
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
                    <button onClick={handlePrevPage} disabled={currentPage <= 1 || reportsLoading} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
                        &laquo; Sebelumnya
                    </button>
                    <span className="text-sm">
                        Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                    </span>
                    <button onClick={handleNextPage} disabled={currentPage >= totalPages || reportsLoading} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
                        Berikutnya &raquo;
                    </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
}

export default MovementReport;