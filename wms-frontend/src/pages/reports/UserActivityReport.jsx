import { useState, useEffect, useCallback } from "react";
import ExportButton from "../../components/ExportButton";
import Select from "react-select";
import { useMasterData } from "../../hooks/useMasterData";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { formatNumber } from "../../utils/formatters";

// Constants
const PERIOD_OPTIONS = [
  { value: "last7", label: "📅 7 Hari Terakhir" },
  { value: "last30", label: "📅 30 Hari Terakhir" },
  { value: "all", label: "⏰ Semua Waktu" },
];

const DEFAULT_PERIOD = PERIOD_OPTIONS.find((o) => o.value === "all");

// Custom Styles for React Select
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

const getRoleBadge = (role) => {
  if (role === "admin") return <Badge variant="primary">ADMIN</Badge>;
  if (role === "supervisor") return <Badge variant="warning">SUPERVISOR</Badge>;
  return <Badge variant="secondary">STAFF</Badge>;
};

// Skeleton Loader Component
const UserActivityReportSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-300 rounded w-64"></div>
        <div className="h-10 bg-gray-300 rounded w-32"></div>
      </div>
      <div className="h-32 bg-white/50 rounded-xl"></div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
    </div>
  );
};

// Filter Badge Component
const FilterBadge = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
    {label}: <span className="font-bold">{value}</span>
    <button
      onClick={onRemove}
      className="ml-1 hover:text-red-600 rounded-full w-4 h-4 flex items-center justify-center font-bold"
    >
      ×
    </button>
  </span>
);

// Main Component
function UserActivityReport() {
  // Master data
  const { data: users, loading: usersLoading } = useMasterData("/api/users");

  // Input states
  const [periodInput, setPeriodInput] = useState(DEFAULT_PERIOD);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [selectedOperatorInput, setSelectedOperatorInput] = useState(null);

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    period: DEFAULT_PERIOD.value,
    startDate: undefined,
    endDate: undefined,
    operatorId: undefined,
  });

  // Active filters for display
  const [activeFilters, setActiveFilters] = useState([]);

  // Helper untuk membuat Query String
  const createQueryString = (filters) => {
    const params = new URLSearchParams();
    if (filters.period) params.append("period", filters.period);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.operatorId) params.append("operatorId", filters.operatorId);
    return params.toString();
  };

  const reportUrl = `/api/reports/activity?${createQueryString(
    appliedFilters
  )}`;

  // Fetch reports
  const { data: reportsData, loading: reportsLoading } = useMasterData(
    reportUrl,
    {}
  );
  const reports = reportsData?.reports || [];

  const csvHeaders = [
    { label: "Operator", key: "operator_name" },
    { label: "Role", key: "role" },
    { label: "Total Aktivitas", key: "total_activities" },
    { label: "Unit Masuk", key: "total_units_in" },
    { label: "Unit Keluar", key: "total_units_out" },
    { label: "Perpindahan", key: "total_movements" },
  ];

  const getExportData = useCallback(async () => {
    return (reports || []).map((r) => ({
      ...r,
    }));
  }, [reports]);

  const operatorOptions = [
    { value: "", label: "👤 Semua Operator" },
    ...(users || []).map((u) => ({
      value: u.id,
      label: u.username,
      role: u.role,
    })),
  ];

  useEffect(() => {
    const newActiveFilters = [];

    if (appliedFilters.period && appliedFilters.period !== "all") {
      const periodLabel =
        PERIOD_OPTIONS.find((opt) => opt.value === appliedFilters.period)
          ?.label || "Semua";
      newActiveFilters.push({
        key: "period",
        label: "Periode",
        value: periodLabel,
      });
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

    if (appliedFilters.operatorId) {
      const operator = users?.find((u) => u.id === appliedFilters.operatorId);
      if (operator) {
        newActiveFilters.push({
          key: "operator",
          label: "Operator",
          value: operator.username,
        });
      }
    }

    setActiveFilters(newActiveFilters);
  }, [appliedFilters, users]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();

    setAppliedFilters({
      period: periodInput.value,
      startDate: startDateInput || undefined,
      endDate: endDateInput || undefined,
      operatorId: selectedOperatorInput?.value || undefined,
    });
  };

  const handleRemoveFilter = (filterKey) => {
    switch (filterKey) {
      case "period":
        setPeriodInput(DEFAULT_PERIOD);
        setAppliedFilters((prev) => ({
          ...prev,
          period: DEFAULT_PERIOD.value,
        }));
        break;
      case "startDate":
        setStartDateInput("");
        setAppliedFilters((prev) => ({ ...prev, startDate: undefined }));
        break;
      case "endDate":
        setEndDateInput("");
        setAppliedFilters((prev) => ({ ...prev, endDate: undefined }));
        break;
      case "operator":
        setSelectedOperatorInput(null);
        setAppliedFilters((prev) => ({ ...prev, operatorId: undefined }));
        break;
      default:
        break;
    }
  };

  const handleClearAllFilters = () => {
    setPeriodInput(DEFAULT_PERIOD);
    setStartDateInput("");
    setEndDateInput("");
    setSelectedOperatorInput(null);
    setAppliedFilters({
      period: DEFAULT_PERIOD.value,
      startDate: undefined,
      endDate: undefined,
      operatorId: undefined,
    });
  };

  const loading = usersLoading || reportsLoading;

  if (loading) {
    return <UserActivityReportSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Laporan Aktivitas User
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Pantau produktivitas dan kinerja tim operational
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="!py-2 !px-4 !bg-indigo-600 !text-white !border-0 shadow-lg shadow-indigo-500/30">
            <div className="text-center">
              <div className="text-2xl font-bold">{reports.length}</div>
              <div className="text-[10px] font-medium opacity-80 uppercase tracking-wider">
                Total Operator
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="!p-6 border border-indigo-50">
        <form onSubmit={handleFilterSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
            {/* Period */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Periode Waktu
              </label>
              <Select
                options={PERIOD_OPTIONS}
                value={periodInput}
                onChange={setPeriodInput}
                styles={customSelectStyles}
                classNamePrefix="react-select"
                className="text-sm"
              />
            </div>

            {/* Start Date */}
            <div className="lg:col-span-1">
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

            {/* End Date */}
            <div className="lg:col-span-1">
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

            {/* Operator */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Operator
              </label>
              <Select
                options={operatorOptions}
                value={selectedOperatorInput}
                onChange={setSelectedOperatorInput}
                placeholder="Semua Operator"
                isClearable
                styles={customSelectStyles}
                classNamePrefix="react-select"
                className="text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="lg:col-span-1">
              <Button type="submit" variant="primary" className="w-full">
                Filter
              </Button>
            </div>
          </div>
        </form>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap pt-4 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Filter Aktif:
            </span>
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
              className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline ml-2"
            >
              RESET
            </button>
          </div>
        )}
      </Card>

      {/* Export & Stats Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Additional stats could go here */}
          <Card className="!py-3 !px-5 flex items-center gap-3 !bg-white">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              ⚡
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold uppercase">
                Total Aktivitas
              </div>
              <div className="text-lg font-bold text-gray-800">
                {formatNumber(
                  reports.reduce(
                    (sum, report) => sum + (report.total_activities || 0),
                    0
                  )
                )}
              </div>
            </div>
          </Card>
        </div>

        <ExportButton
          data={getExportData}
          headers={csvHeaders}
          filename={`laporan-aktivitas-user-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`}
          className="!bg-emerald-500 hover:!bg-emerald-600 !text-white !font-bold !py-2 !px-4 !rounded-xl shadow-lg shadow-emerald-500/30"
        >
          📥 Ekspor CSV
        </ExportButton>
      </div>

      {/* Results Section */}
      {reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            👥
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Tidak Ada Data Aktivitas
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Tidak ditemukan data aktivitas user dengan filter yang dipilih. Coba
            sesuaikan filter periode atau tanggal.
          </p>
          <Button onClick={handleClearAllFilters} variant="secondary">
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
                    "Operator",
                    "Role",
                    "Total Aktivitas",
                    "Unit Masuk",
                    "Unit Keluar",
                    "Perpindahan",
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
                {reports.map((report, index) => (
                  <tr
                    key={report.operator_id || index}
                    className="hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                          {report.operator_name?.charAt(0)?.toUpperCase() ||
                            "U"}
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {report.operator_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(report.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {formatNumber(report.total_activities)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                      📥 {formatNumber(report.total_units_in || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-rose-600">
                      📤 {formatNumber(report.total_units_out || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      🔄 {formatNumber(report.total_movements || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default UserActivityReport;
