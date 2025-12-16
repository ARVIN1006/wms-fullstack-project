import { useState, useCallback } from "react";
import ExportButton from "../../components/ExportButton";
import Select from "react-select";
import { format } from "date-fns";
import { useMasterData } from "../../hooks/useMasterData";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

const STATUS_REPORT_LIMIT = 15;

const StatusInventoryReportSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-64"></div>
      <div className="h-20 bg-white/50 rounded-xl"></div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
    </div>
  );
};

function StatusInventoryReport() {
  const { data: allStockStatuses, loading: statusLoading } = useMasterData(
    "/api/reports/stock-statuses"
  );
  const { data: allLocations, loading: locationLoading } =
    useMasterData("/api/locations");

  const stockStatuses = (allStockStatuses || []).filter(
    (s) => s.name !== "Good"
  );
  const locations = allLocations || [];

  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [selectedStatusInput, setSelectedStatusInput] = useState(null);
  const [selectedLocationInput, setSelectedLocationInput] = useState(null);

  const [appliedFilters, setAppliedFilters] = useState({
    startDate: undefined,
    endDate: undefined,
    statusId: undefined,
    locationId: undefined,
  });

  const createQueryString = (filters) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.statusId) params.append("statusId", filters.statusId);
    if (filters.locationId) params.append("locationId", filters.locationId);
    return params.toString();
  };

  const reportUrl = `/api/reports/inventory-status?${createQueryString(
    appliedFilters
  )}`;

  const { data: reportsData, loading: reportsLoading } = useMasterData(
    reportUrl,
    {}
  );

  const reports = reportsData?.reports || [];

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
    return (reports || []).map((item) => ({
      ...item,
      transaction_date: item.transaction_date
        ? new Date(item.transaction_date).toLocaleString("id-ID")
        : "-",
      expiry_date: item.expiry_date
        ? new Date(item.expiry_date).toLocaleDateString("id-ID")
        : "-",
      batch_number: item.batch_number || "-",
    }));
  }, [reports]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setAppliedFilters({
      startDate: startDateInput || undefined,
      endDate: endDateInput || undefined,
      statusId: selectedStatusInput?.value || undefined,
      locationId: selectedLocationInput?.value || undefined,
    });
  };

  const statusOptions = [
    { value: "", label: "Semua Status (Non-Good)" },
    ...stockStatuses.map((s) => ({ value: s.id, label: s.name })),
  ];

  const locationOptions = [
    { value: "", label: "Semua Lokasi" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  const getStatusBadge = (statusName) => {
    const base = "px-3 py-1 text-xs font-bold rounded-full border";
    if (statusName === "Damaged")
      return `${base} bg-orange-100 text-orange-800 border-orange-200`;
    if (statusName === "Expired")
      return `${base} bg-red-100 text-red-800 border-red-200`;
    return `${base} bg-gray-100 text-gray-800 border-gray-200`;
  };

  const getExpiryBadge = (expDate) => {
    if (expDate) {
      const today = new Date();
      const expiry = new Date(expDate);
      expiry.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (expiry < today) {
        return (
          <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-md bg-red-100 text-red-800">
            KADALUARSA
          </span>
        );
      } else if (
        (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24) <=
        30
      ) {
        return (
          <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-md bg-yellow-100 text-yellow-800">
            HAMPIR EXP
          </span>
        );
      }
    }
    return null;
  };

  const getFormattedExpDate = (expDate) => {
    if (!expDate) return "N/A";
    const expiry = new Date(expDate);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return (
        <span className="font-bold text-red-600">
          {format(new Date(expDate), "dd-MM-yyyy")}
        </span>
      );
    }
    return format(new Date(expDate), "dd-MM-yyyy");
  };

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

  const loading = statusLoading || locationLoading || reportsLoading;

  if (loading) {
    return <StatusInventoryReportSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            📦 Laporan Stok Rusak/Kadaluarsa
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor produk yang tidak layak jual
          </p>
        </div>
      </div>

      <Card className="!p-6 border border-indigo-50 shadow-lg shadow-indigo-100/50">
        <form onSubmit={handleFilterSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Filter Status
              </label>
              <Select
                options={statusOptions}
                value={selectedStatusInput}
                onChange={setSelectedStatusInput}
                placeholder="Semua (Non-Good)"
                isClearable={true}
                classNamePrefix="react-select"
                styles={customSelectStyles}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Filter Lokasi
              </label>
              <Select
                options={locationOptions}
                value={selectedLocationInput}
                onChange={setSelectedLocationInput}
                placeholder="Semua Lokasi"
                isClearable={true}
                classNamePrefix="react-select"
                styles={customSelectStyles}
                className="text-sm"
              />
            </div>
            <div>
              <Button type="submit" variant="primary" className="w-full">
                Tampilkan
              </Button>
            </div>
          </div>
        </form>

        <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
          <ExportButton
            data={getExportData}
            headers={csvHeaders}
            filename={`Laporan_Stok_Rusak_${new Date()
              .toISOString()
              .slice(0, 10)}.csv`}
            className="!bg-emerald-500 hover:!bg-emerald-600 !text-white !font-bold !py-2 !px-4 !rounded-xl"
          >
            Unduh CSV
          </ExportButton>
        </div>

        {(reports || []).length === 0 && !reportsLoading ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl mt-4 border border-dashed border-gray-200">
            Tidak ada data stok rusak/kadaluarsa ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  {[
                    "Tanggal",
                    "Produk (SKU)",
                    "Status",
                    "Jumlah",
                    "Lokasi",
                    "No. Batch",
                    "Tgl. Kadaluarsa",
                    "Operator",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-100">
                {(reports || []).map((item, index) => (
                  <tr
                    key={item.item_id || index}
                    className="hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.transaction_date
                        ? new Date(item.transaction_date).toLocaleString(
                            "id-ID"
                          )
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {item.product_name} <br />
                      <span className="text-xs font-normal text-gray-500">
                        {item.sku}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={getStatusBadge(item.stock_status_name)}>
                        {item.stock_status_name?.toUpperCase() || "-"}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.location_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {item.batch_number || "-"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getFormattedExpDate(item.expiry_date)}
                      <div className="mt-1">
                        {getExpiryBadge(item.expiry_date)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.operator_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default StatusInventoryReport;
