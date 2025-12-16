import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Select from "react-select";
import ExportButton from "../../components/ExportButton";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import ReportsSkeleton from "../../components/skeletons/ReportsSkeleton";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";
import { formatCurrency } from "../../utils/formatters";

const LIMIT_PER_PAGE = 20;

const TYPE_OPTIONS = [
  { value: "", label: "📦 Semua Transaksi" },
  { value: "IN", label: "📥 Barang Masuk" },
  { value: "OUT", label: "📤 Barang Keluar" },
  { value: "OPNAME", label: "🔍 Stock Opname" },
];

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(8px)",
    borderColor: state.isFocused ? "#8b5cf6" : "#e5e7eb",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(139, 92, 246, 0.2)" : "none",
    "&:hover": {
      borderColor: "#8b5cf6",
    },
    borderRadius: "0.75rem",
    padding: "2px",
    minHeight: "42px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#8b5cf6"
      : state.isFocused
      ? "#ede9fe"
      : "white",
    color: state.isSelected ? "white" : "#1f2937",
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.75rem",
    overflow: "hidden",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    zIndex: 20,
  }),
};

const calculateDuration = (start, end) => {
  if (!start || !end) return 0;
  const diffMs = new Date(end) - new Date(start);
  return Math.round(diffMs / 60000);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Reports() {
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [typeInput, setTypeInput] = useState(TYPE_OPTIONS[0]);
  const [supplierInput, setSupplierInput] = useState(null);
  const [customerInput, setCustomerInput] = useState(null);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    type: TYPE_OPTIONS[0].value,
    supplierId: undefined,
    customerId: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  const [activeFilters, setActiveFilters] = useState([]);

  const filterDependencies = {
    type: appliedFilters.type || undefined,
    supplierId: appliedFilters.supplierId || undefined,
    customerId: appliedFilters.customerId || undefined,
    startDate: appliedFilters.startDate || undefined,
    endDate: appliedFilters.endDate || undefined,
  };

  const {
    data: reports,
    loading: reportsLoading,
    currentPage,
    totalPages,
    totalCount,
    handlePageChange,
    resetPagination,
  } = usePaginatedList(
    "/api/reports/history",
    LIMIT_PER_PAGE,
    filterDependencies
  );

  const [masterLoading, setMasterLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMasterData = async () => {
      try {
        const [supplierRes, customerRes] = await Promise.all([
          axios.get("/api/suppliers?page=1&limit=1000"),
          axios.get("/api/customers?page=1&limit=1000"),
        ]);

        if (isMounted) {
          setSuppliers(supplierRes.data.suppliers || []);
          setCustomers(customerRes.data.customers || []);
          setMasterLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching master data:", err);
          toast.error("Gagal memuat data master untuk filter.");
          setMasterLoading(false);
        }
      }
    };

    fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const newActiveFilters = [];

    if (appliedFilters.type) {
      const typeLabel =
        TYPE_OPTIONS.find((opt) => opt.value === appliedFilters.type)?.label ||
        "Semua";
      newActiveFilters.push({ key: "type", label: "Tipe", value: typeLabel });
    }

    if (appliedFilters.supplierId) {
      const supplier = suppliers.find(
        (s) => s.id === appliedFilters.supplierId
      );
      if (supplier) {
        newActiveFilters.push({
          key: "supplier",
          label: "Supplier",
          value: supplier.name,
        });
      }
    }

    if (appliedFilters.customerId) {
      const customer = customers.find(
        (c) => c.id === appliedFilters.customerId
      );
      if (customer) {
        newActiveFilters.push({
          key: "customer",
          label: "Customer",
          value: customer.name,
        });
      }
    }

    if (appliedFilters.startDate) {
      newActiveFilters.push({
        key: "startDate",
        label: "Dari",
        value: new Date(appliedFilters.startDate).toLocaleDateString("id-ID"),
      });
    }

    if (appliedFilters.endDate) {
      newActiveFilters.push({
        key: "endDate",
        label: "Sampai",
        value: new Date(appliedFilters.endDate).toLocaleDateString("id-ID"),
      });
    }

    setActiveFilters(newActiveFilters);
  }, [appliedFilters, suppliers, customers]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();

    setAppliedFilters({
      type: typeInput.value,
      supplierId: typeInput.value === "IN" ? supplierInput?.value : undefined,
      customerId: typeInput.value === "OUT" ? customerInput?.value : undefined,
      startDate: startDateInput || undefined,
      endDate: endDateInput || undefined,
    });

    resetPagination();
  };

  const handleRemoveFilter = (filterKey) => {
    switch (filterKey) {
      case "type":
        setTypeInput(TYPE_OPTIONS[0]);
        setAppliedFilters((prev) => ({ ...prev, type: TYPE_OPTIONS[0].value }));
        break;
      case "supplier":
        setSupplierInput(null);
        setAppliedFilters((prev) => ({ ...prev, supplierId: undefined }));
        break;
      case "customer":
        setCustomerInput(null);
        setAppliedFilters((prev) => ({ ...prev, customerId: undefined }));
        break;
      case "startDate":
        setStartDateInput("");
        setAppliedFilters((prev) => ({ ...prev, startDate: undefined }));
        break;
      case "endDate":
        setEndDateInput("");
        setAppliedFilters((prev) => ({ ...prev, endDate: undefined }));
        break;
      default:
        break;
    }
  };

  const handleClearAllFilters = () => {
    setTypeInput(TYPE_OPTIONS[0]);
    setSupplierInput(null);
    setCustomerInput(null);
    setStartDateInput("");
    setEndDateInput("");
    setAppliedFilters({
      type: TYPE_OPTIONS[0].value,
      supplierId: undefined,
      customerId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const getExportData = async () => {
    try {
      const params = {
        type: appliedFilters.type || undefined,
        supplierId: appliedFilters.supplierId || undefined,
        customerId: appliedFilters.customerId || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
      };

      const response = await axios.get("/api/reports/history/export-all", {
        params,
      });
      const allReports = response.data;

      return (allReports || []).map((item) => ({
        "Tanggal Transaksi": formatDate(item.transaction_date),
        Tipe: item.transaction_type === "IN" ? "MASUK" : "KELUAR",
        "Nilai Transaksi (Rp)": parseFloat(
          item.transaction_value || 0
        ).toLocaleString("id-ID"),
        Operator: item.operator_name,
        Pihak: item.supplier_name || item.customer_name || "-",
        Produk: item.product_name,
        SKU: item.sku,
        Quantity: item.quantity,
        Lokasi: item.location_name,
        "Status Stok": item.stock_status_name || "Good",
        "Durasi Proses (Menit)": calculateDuration(
          item.process_start,
          item.process_end
        ),
        Catatan: item.notes || "-",
      }));
    } catch (err) {
      toast.error("Gagal mengambil data untuk ekspor.");
      return [];
    }
  };

  const partyOptions = (typeInput.value === "IN" ? suppliers : customers).map(
    (p) => ({
      value: p.id,
      label: p.name,
    })
  );

  const partyPlaceholder =
    typeInput.value === "IN" ? "Pilih Supplier" : "Pilih Pelanggan";

  const loading = reportsLoading || masterLoading;

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Laporan Riwayat Transaksi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Analisis lengkap semua transaksi masuk dan keluar gudang
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="!py-2 !px-4 !bg-indigo-600 !text-white !border-0 shadow-lg shadow-indigo-500/30">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className="text-[10px] font-medium opacity-80 uppercase tracking-wider">
                Total Transaksi
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="!p-6 border border-indigo-50 shadow-lg shadow-indigo-100/50">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6 border-b border-gray-100 pb-2">
          Filter Laporan
        </h3>

        <form onSubmit={handleFilterSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                Tipe Transaksi
              </label>
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
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                {typeInput.value === "IN" ? "Supplier" : "Pelanggan"}
              </label>
              <Select
                options={partyOptions}
                value={typeInput.value === "IN" ? supplierInput : customerInput}
                onChange={
                  typeInput.value === "IN" ? setSupplierInput : setCustomerInput
                }
                placeholder={partyPlaceholder}
                isClearable
                styles={customSelectStyles}
                classNamePrefix="react-select"
                isDisabled={!typeInput.value || typeInput.value === "OPNAME"}
                className="text-sm"
              />
            </div>

            <Input
              type="date"
              label="Dari Tanggal"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
            />

            <Input
              type="date"
              label="Sampai Tanggal"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
            />

            <div>
              <Button type="submit" variant="primary" className="w-full">
                Terapkan
              </Button>
            </div>
          </div>
        </form>

        {activeFilters.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap pt-4 border-t border-gray-100/50">
            <span className="text-xs font-bold text-gray-500 uppercase">
              Aktif:
            </span>
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="primary"
                className="flex items-center gap-2 !py-1 !px-2"
              >
                {filter.label}: {filter.value}
                <button
                  onClick={() => handleRemoveFilter(filter.key)}
                  className="hover:text-red-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors ml-1 font-bold"
                >
                  ×
                </button>
              </Badge>
            ))}
            <button
              onClick={handleClearAllFilters}
              className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline ml-2"
            >
              Hapus Semua
            </button>
          </div>
        )}
      </Card>

      <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
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
          filename={`laporan-transaksi-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`}
          className="!bg-emerald-500 hover:!bg-emerald-600 !text-white !font-bold !py-2 !px-4 !rounded-xl"
        >
          📥 Ekspor Data
        </ExportButton>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-gray-100 text-gray-500 mt-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            📊
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Tidak Ada Data
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Tidak ditemukan transaksi dengan filter yang dipilih.
          </p>
          <Button variant="secondary" onClick={handleClearAllFilters}>
            Reset Filter
          </Button>
        </div>
      ) : (
        <Card noPadding className="border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  {[
                    "Tanggal",
                    "Tipe",
                    "Nilai",
                    "Operator",
                    "Pihak",
                    "Produk",
                    "Qty",
                    "Lokasi",
                    "Status",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-100">
                {reports.map((item) => (
                  <tr
                    key={item.item_id}
                    className="hover:bg-indigo-50/30 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {formatDate(item.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          item.transaction_type === "IN"
                            ? "success"
                            : item.transaction_type === "OUT"
                            ? "danger"
                            : "primary"
                        }
                        size="sm"
                      >
                        {item.transaction_type === "IN"
                          ? "📥 MASUK"
                          : item.transaction_type === "OUT"
                          ? "📤 KELUAR"
                          : "OPNAME"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 font-mono">
                      {formatCurrency(item.transaction_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                          {item.operator_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-xs">
                          {item.operator_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.supplier_name || item.customer_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-bold text-gray-800">
                          {item.product_name}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 border border-gray-200 px-1 rounded inline-block bg-white">
                          {item.sku}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.location_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          item.stock_status_name === "Good"
                            ? "success"
                            : item.stock_status_name === "Damaged"
                            ? "danger"
                            : "warning"
                        }
                        size="sm"
                      >
                        {item.stock_status_name || "Good"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 p-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 font-medium mb-2 sm:mb-0">
              Halaman{" "}
              <span className="text-indigo-600 font-bold">{currentPage}</span>{" "}
              dari <span className="text-gray-700">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                &laquo; Prev
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next &raquo;
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default Reports;
