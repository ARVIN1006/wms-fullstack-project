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

const CustomerOrderReportSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-64"></div>
      <div className="h-24 bg-white/50 rounded-xl"></div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
    </div>
  );
};

function CustomerOrderReport() {
  const [periodInput, setPeriodInput] = useState(DEFAULT_PERIOD);
  const [appliedPeriod, setAppliedPeriod] = useState(DEFAULT_PERIOD.value);

  const reportUrl = `/api/reports/customer-order?period=${appliedPeriod}`;
  const { data: reportsData, loading } = useMasterData(reportUrl, {});

  const reports = reportsData?.customerSummary || [];

  const csvHeaders = [
    { label: "Nama Pelanggan", key: "customer_name" },
    { label: "Total Pesanan", key: "total_orders" },
    { label: "Total Unit Keluar", key: "total_units_out" },
    { label: "Total Nilai Jual (Rp)", key: "total_sales_revenue" },
    { label: "Total HPP (Rp)", key: "total_cogs" },
    { label: "Gross Profit (Rp)", key: "gross_profit" },
  ];

  const getExportData = useCallback(async () => {
    return (reports || []).map((r) => ({
      ...r,
      total_sales_revenue: parseFloat(r.total_sales_revenue || 0).toFixed(2),
      total_cogs: parseFloat(r.total_cogs || 0).toFixed(2),
      gross_profit: parseFloat(r.gross_profit || 0).toFixed(2),
    }));
  }, [reports]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setAppliedPeriod(periodInput.value);
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

  if (loading) {
    return <CustomerOrderReportSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            📈 Laporan Pesanan Pelanggan
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Analisis profitabilitas per pelanggan
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
              filename={`Laporan_Pesanan_Pelanggan_${appliedPeriod}.csv`}
              className="!bg-emerald-500 hover:!bg-emerald-600 !text-white !font-bold !py-2 !px-4 !rounded-xl"
            >
              Unduh CSV
            </ExportButton>
          </div>
        </form>

        {(reports || []).length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-gray-100 text-gray-500">
            Tidak ada data pesanan pelanggan pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  {[
                    "Nama Pelanggan",
                    "Total Pesanan",
                    "Total Unit Keluar",
                    "Total Nilai Jual",
                    "Gross Profit",
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
                  const profit = parseFloat(report.gross_profit || 0);
                  const isPositive = profit >= 0;

                  return (
                    <tr
                      key={index}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {report.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="bg-indigo-50 text-indigo-700 py-1 px-3 rounded-full text-xs font-bold">
                          {report.total_orders} Order
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {report.total_units_out}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-mono">
                        {formatCurrency(report.total_sales_revenue)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-bold font-mono ${
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

export default CustomerOrderReport;
