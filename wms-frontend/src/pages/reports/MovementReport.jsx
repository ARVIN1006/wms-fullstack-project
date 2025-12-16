import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import ExportButton from "../../components/ExportButton";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { useMasterData } from "../../hooks/useMasterData";
import MovementReportSkeleton from "../../components/skeletons/MovementReportSkeleton";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";

const LIMIT_PER_PAGE = 20;

function MovementReport() {
  const { data: locations, loading: masterLoading } =
    useMasterData("/api/locations");

  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [selectedFromLocationInput, setSelectedFromLocationInput] =
    useState(null);
  const [selectedToLocationInput, setSelectedToLocationInput] = useState(null);
  const [selectedProductInput, setSelectedProductInput] = useState(null);

  const [appliedFilters, setAppliedFilters] = useState({
    startDate: undefined,
    endDate: undefined,
    fromLocationId: undefined,
    toLocationId: undefined,
    productId: undefined,
  });

  const {
    data: reports,
    loading: reportsLoading,
    currentPage,
    totalPages,
    totalCount,
    handlePageChange,
    resetPagination,
  } = usePaginatedList(
    "/api/reports/movements",
    LIMIT_PER_PAGE,
    appliedFilters
  );

  const loading = reportsLoading || masterLoading;

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

  const getExportData = async () => {
    try {
      const params = {
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
        fromLocationId: appliedFilters.fromLocationId || undefined,
        toLocationId: appliedFilters.toLocationId || undefined,
        productId: appliedFilters.productId || undefined,
      };

      const response = await axios.get("/api/reports/movements/export-all", {
        params,
      });
      const allReports = response.data;

      return (allReports || []).map((item) => ({
        ...item,
        date: item.date ? new Date(item.date).toLocaleString("id-ID") : "-",
      }));
    } catch (err) {
      toast.error("Gagal mengambil semua data pergerakan untuk ekspor.");
      return [];
    }
  };

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

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setAppliedFilters({
      startDate: startDateInput || undefined,
      endDate: endDateInput || undefined,
      fromLocationId: selectedFromLocationInput?.value || undefined,
      toLocationId: selectedToLocationInput?.value || undefined,
      productId: selectedProductInput?.value || undefined,
    });
    resetPagination();
  };

  const handlePrevPage = () => {
    handlePageChange(currentPage - 1);
  };
  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  const locationOptions = [
    { value: "", label: "Semua Lokasi" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderColor: "#e5e7eb",
      borderRadius: "0.75rem",
      padding: "2px",
      "&:hover": { borderColor: "#cbd5e1" },
      boxShadow: "none",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      zIndex: 10,
    }),
  };

  if (loading) {
    return <MovementReportSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            📊 Laporan Perpindahan Barang
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Lacak pergerakan inventaris antar lokasi
          </p>
        </div>
      </div>

      <Card className="!p-6 border border-indigo-50 shadow-lg shadow-indigo-100/50">
        <form onSubmit={handleFilterSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            <Input
              label="Dari Tanggal"
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
            />

            <Input
              label="Sampai Tanggal"
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lokasi Asal
              </label>
              <Select
                options={locationOptions}
                value={selectedFromLocationInput}
                onChange={setSelectedFromLocationInput}
                placeholder="Semua Asal"
                isClearable={true}
                styles={customSelectStyles}
                classNamePrefix="react-select"
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lokasi Tujuan
              </label>
              <Select
                options={locationOptions}
                value={selectedToLocationInput}
                onChange={setSelectedToLocationInput}
                placeholder="Semua Tujuan"
                isClearable={true}
                styles={customSelectStyles}
                classNamePrefix="react-select"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Filter Produk (SKU)
              </label>
              <AsyncSelect
                loadOptions={loadProductOptions}
                value={selectedProductInput}
                onChange={setSelectedProductInput}
                placeholder="Ketik untuk mencari Produk..."
                isClearable={true}
                styles={customSelectStyles}
                classNamePrefix="react-select"
                className="text-sm"
              />
            </div>
            <div>
              <Button type="submit" variant="primary" className="w-full">
                Terapkan Filter
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Badge variant="primary" size="lg">
          Total Data:{" "}
          <span className="text-lg ml-1 font-bold">{totalCount}</span>
        </Badge>
        <ExportButton
          data={getExportData}
          headers={csvHeaders}
          filename={`Laporan_Perpindahan_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`}
          className="!bg-emerald-500 hover:!bg-emerald-600 !text-white !font-bold !py-2 !px-4 !rounded-xl"
        >
          Unduh Laporan (CSV)
        </ExportButton>
      </div>

      {(reports || []).length === 0 && !reportsLoading ? (
        <Card className="text-center py-12 flex flex-col items-center border border-gray-100">
          <p className="text-gray-500 text-lg">
            Tidak ada data pergerakan tercatat.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Coba sesuaikan filter pencarian Anda.
          </p>
        </Card>
      ) : (
        <Card noPadding className="border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  {csvHeaders.map((h) => (
                    <th
                      key={h.key}
                      className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-100">
                {reports.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-indigo-50/30 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {item.date
                        ? new Date(item.date).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.operator_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant="danger" size="sm">
                        {item.from_location_name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant="success" size="sm">
                        {item.to_location_name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                      {item.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 p-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Menampilkan <span className="font-medium">{reports.length}</span>{" "}
              dari <span className="font-medium">{totalCount}</span> data
            </p>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || reportsLoading}
                variant="secondary"
                size="sm"
              >
                &laquo; Sebelumnya
              </Button>
              <div className="hidden sm:flex space-x-1">
                <span className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg">
                  {currentPage}
                </span>
                <span className="px-4 py-2 text-sm text-gray-500 flex items-center">
                  / {totalPages}
                </span>
              </div>
              <Button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || reportsLoading}
                variant="secondary"
                size="sm"
              >
                Berikutnya &raquo;
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default MovementReport;
