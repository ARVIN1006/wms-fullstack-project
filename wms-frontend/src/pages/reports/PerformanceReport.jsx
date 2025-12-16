import { useState, useCallback } from "react";
import Select from "react-select";
import ExportButton from "../../components/ExportButton";
import { useMasterData } from "../../hooks/useMasterData";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { formatCurrency } from "../../utils/formatters";

const PERIOD_OPTIONS = [
  { value: "last30", label: "📅 30 Hari Terakhir" },
  { value: "last90", label: "📅 90 Hari Terakhir" },
  { value: "all", label: "⏰ Semua Waktu" },
];

const DEFAULT_PERIOD = PERIOD_OPTIONS.find((o) => o.value === "all");

// --- KOMPONEN SKELETON ---
const PerformanceReportSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
      <div className="flex justify-between items-center mb-6 p-4 border rounded-xl bg-gray-50/50">
        <div className="h-10 bg-gray-300 rounded w-48"></div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-300 rounded w-32"></div>
          <div className="h-10 bg-gray-300 rounded w-40"></div>
        </div>
      </div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
    </div>
  );
};
// --- END KOMPONEN SKELETON ---

function PerformanceReport() {
  const [periodInput, setPeriodInput] = useState(DEFAULT_PERIOD);
  const [appliedPeriod, setAppliedPeriod] = useState(DEFAULT_PERIOD.value);

  const reportUrl = `/api/reports/performance?period=${appliedPeriod}`;
  const { data: reportsData, loading } = useMasterData(reportUrl, {});

  const reports = reportsData?.reports || [];

  const csvHeaders = [
    { label: "Operator", key: "operator_name" },
    { label: "Total Transaksi", key: "total_transactions" },
    { label: "Total Unit Dikelola", key: "total_units" },
    { label: "Avg. Proses (IN) (Menit)", key: "avg_inbound_time" },
    { label: "Avg. Proses (OUT) (Menit)", key: "avg_outbound_time" },
    { label: "Total Gross Profit (Rp)", key: "total_gross_profit" },
  ];

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setAppliedPeriod(periodInput.value);
  };

  const getExportData = useCallback(async () => {
    return (reports || []).map((r) => ({
      ...r,
      avg_inbound_time: parseFloat(r.avg_inbound_time || 0).toFixed(2),
      avg_outbound_time: parseFloat(r.avg_outbound_time || 0).toFixed(2),
      total_gross_profit: parseFloat(r.total_gross_profit || 0).toFixed(2),
    }));
  }, [reports]);

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
    return <PerformanceReportSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            ⚡ Laporan Kinerja Operator
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Analisis efisiensi dan profitabilitas per operator
          </p>
        </div>
      </div>

      <Card className="!p-6 border border-indigo-50 shadow-lg shadow-indigo-100/50">
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6"
        >
          <div className="w-full md:w-64">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Filter Periode
            </label>
            <Select
              options={PERIOD_OPTIONS}
              value={periodInput}
              onChange={setPeriodInput}
              classNamePrefix="react-select"
              styles={customSelectStyles}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button type="submit" variant="primary">
              Tampilkan Laporan
            </Button>
            <ExportButton
              data={getExportData}
              headers={csvHeaders}
              filename={`Laporan_Kinerja_Operator_${appliedPeriod}.csv`}
              className="!bg-emerald-500 hover:!bg-emerald-600 !text-white !font-bold !py-2 !px-4 !rounded-xl"
            >
              Unduh CSV
            </ExportButton>
          </div>
        </form>

        {(reports || []).length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-gray-100 text-gray-500">
            Tidak ada data kinerja operator pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  {[
                    "Operator",
                    "Total Transaksi",
                    "Total Unit",
                    "Avg. Proses (IN)",
                    "Avg. Proses (OUT)",
                    "Total Gross Profit",
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
                {reports.map((report, index) => {
                  const profit = parseFloat(report.total_gross_profit || 0);
                  const isPositive = profit >= 0;

                  return (
                    <tr
                      key={index}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {report.operator_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {report.total_transactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {report.total_units} unit
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {parseFloat(report.avg_inbound_time || 0).toFixed(2)} m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {parseFloat(report.avg_outbound_time || 0).toFixed(2)} m
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default PerformanceReport;
