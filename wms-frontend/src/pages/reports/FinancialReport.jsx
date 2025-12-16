import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import DataTable from "../../components/common/DataTable";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import ExportButton from "../../components/ExportButton";
import { formatCurrency } from "../../utils/formatters";

function FinancialReport() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  const fetchFinancialData = async ({ queryKey }) => {
    const [_, { startDate, endDate, page, limit }] = queryKey;
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      page,
      limit,
    });
    const response = await axios.get(`/api/reports/financial?${queryParams}`);
    return response.data;
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["financialReport", { ...filters, ...pagination }],
    queryFn: fetchFinancialData,
    placeholderData: keepPreviousData,
  });

  const stats = {
    totalRevenue: parseFloat(data?.summary?.total_revenue || 0),
    totalCost: parseFloat(data?.summary?.total_cogs || 0),
    grossProfit: parseFloat(data?.summary?.gross_profit || 0),
    margin: parseFloat(data?.summary?.margin_percentage || 0),
  };

  const transactionData = data?.transactions || [];
  const pagingData = data?.pagination || { totalPages: 1, totalCount: 0 };

  useEffect(() => {
    if (isError) {
      console.error("Error fetching financial report:", error);
      toast.error("Gagal memuat laporan keuangan.");
    }
  }, [isError, error]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const csvHeaders = [
    { label: "Tanggal", key: "date" },
    { label: "Tipe", key: "type" },
    { label: "Keterangan", key: "description" },
    { label: "Notes", key: "notes" },
    { label: "Pendapatan", key: "revenue" },
    { label: "HPP", key: "cogs" },
    { label: "Laba Kotor", key: "profit" },
  ];

  const getExportData = useCallback(async () => {
    // If we want to export ALL data, we might need a separate API call or careful handling.
    // For now, let's export the currently viewed data or we can try to fetch all if needed.
    // The previous implementation in UserActivityReport fetched all logic inside useMasterData if mapped correctly.
    // Here we have pagination. Let's fetch all for export if possible, or just the current view.
    // Usually reports export all data within the filter.

    // Attempting to fetch all data for export
    try {
      const queryParams = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 10000, // Fetch up to 10000 records for export
      });
      const response = await axios.get(`/api/reports/financial?${queryParams}`);
      return (response.data.transactions || []).map((row) => ({
        date: formatDate(row.created_at),
        type: row.type === "OUT" ? "Penjualan" : "Pembelian",
        description:
          row.type === "OUT" ? row.customer_name : row.supplier_name || "-",
        notes: row.notes || "-",
        revenue: row.type === "OUT" ? row.total_amount : 0,
        cogs: row.type === "OUT" ? row.total_cogs : row.total_amount, // Cost involves PO amount or COGS for Sales
        profit: row.type === "OUT" ? row.profit : 0,
      }));
    } catch (e) {
      toast.error("Gagal menyiapkan data ekspor");
      return [];
    }
  }, [filters]);

  const columns = [
    {
      header: "Tanggal",
      accessor: (row) => formatDate(row.created_at),
      sortable: false,
    },
    {
      header: "Tipe",
      accessor: (row) => (
        <span
          className={`px-3 py-1 rounded-xl text-xs font-bold ${
            row.type === "OUT"
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-blue-100 text-blue-700 border border-blue-200"
          }`}
        >
          {row.type === "OUT" ? "Penjualan" : "Pembelian"}
        </span>
      ),
      sortable: false,
    },
    {
      header: "Keterangan",
      accessor: (row) => (
        <div>
          <div className="font-bold text-gray-800">
            {row.type === "OUT" ? row.customer_name : row.supplier_name || "-"}
          </div>
          <div className="text-xs text-gray-500 italic">{row.notes || "-"}</div>
        </div>
      ),
      sortable: false,
    },
    {
      header: "Pendapatan",
      accessor: (row) => (
        <span className="font-bold text-emerald-600 font-mono">
          {row.type === "OUT" ? formatCurrency(row.total_amount) : "-"}
        </span>
      ),
      className: "text-right",
      sortable: false,
    },
    {
      header: "HPP / Biaya",
      accessor: (row) => (
        <span className="font-bold text-rose-600 font-mono">
          {row.type === "OUT"
            ? formatCurrency(row.total_cogs)
            : formatCurrency(row.total_amount)}
        </span>
      ),
      className: "text-right",
      sortable: false,
    },
    {
      header: "Laba Kotor",
      accessor: (row) => (
        <span
          className={`font-bold font-mono ${
            parseFloat(row.profit) >= 0 ? "text-indigo-600" : "text-rose-600"
          }`}
        >
          {row.type === "OUT" ? formatCurrency(row.profit) : "-"}
        </span>
      ),
      className: "text-right",
      sortable: false,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Laporan Keuangan
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ringkasan pendapatan, pengeluaran, dan laba bersih.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="secondary"
            size="sm"
            className="!p-2"
          >
            <RefreshCw size={18} />
          </Button>

          <ExportButton
            data={getExportData}
            headers={csvHeaders}
            filename={`laporan-keuangan-${new Date()
              .toISOString()
              .slice(0, 10)}.csv`}
            className="!bg-indigo-600 hover:!bg-indigo-700 !text-white !font-bold !py-2 !px-4 !rounded-xl shadow-lg shadow-indigo-500/30"
          >
            Export Data
          </ExportButton>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="!p-4 border border-indigo-50">
        <DateRangeFilter
          startDate={filters.startDate}
          endDate={filters.endDate}
          onChange={handleFilterChange}
        />
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="text-white" size={20} />}
          color="bg-gradient-to-br from-emerald-400 to-emerald-600"
          subtext="Dari transaksi keluar"
        />
        <StatCard
          title="Total HPP"
          value={formatCurrency(stats.totalCost)}
          icon={<TrendingDown className="text-white" size={20} />}
          color="bg-gradient-to-br from-rose-400 to-rose-600"
          subtext="Modal barang terjual"
        />
        <StatCard
          title="Laba Kotor"
          value={formatCurrency(stats.grossProfit)}
          icon={<TrendingUp className="text-white" size={20} />}
          color="bg-gradient-to-br from-blue-400 to-blue-600"
          subtext="Pendapatan - HPP"
        />
        <StatCard
          title="Margin Keuntungan"
          value={`${stats.margin.toFixed(2)}%`}
          icon={<TrendingUp className="text-white" size={20} />}
          color="bg-gradient-to-br from-indigo-400 to-indigo-600"
          subtext="Persentase profitabilitas"
        />
      </div>

      {/* Transactions Table */}
      <Card className="!p-6 border border-indigo-50">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Rincian Transaksi
        </h2>
        <DataTable
          columns={columns}
          data={transactionData}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagingData.totalPages,
            totalCount: pagingData.totalCount,
            onPageChange: handlePageChange,
          }}
          isLoading={isLoading}
        />
      </Card>
    </div>
  );
}

// Komponen StatCard (Updated Style)
function StatCard({ title, value, icon, color, subtext }) {
  return (
    <Card className="!p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
      <div
        className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}
      >
        <div className={`p-4 rounded-full ${color}`}></div>
      </div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-xl font-bold text-gray-800">{value}</h3>
          {subtext && (
            <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
        <div
          className={`p-2.5 rounded-xl shadow-lg shadow-gray-200 ${color} text-white`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default FinancialReport;
