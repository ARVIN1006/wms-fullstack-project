import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Download,
} from "lucide-react";
import DataTable from "../components/common/DataTable";
import DateRangeFilter from "../components/common/DateRangeFilter";

function FinancialReport() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    margin: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
  });

  const fetchFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: pagination.page,
        limit: pagination.limit,
      });

      const response = await axios.get(`/api/reports/financial?${queryParams}`);
      const {
        summary,
        transactions: transData,
        pagination: pagingData,
      } = response.data;

      setStats({
        totalRevenue: parseFloat(summary.total_revenue),
        totalCost: parseFloat(summary.total_cogs),
        grossProfit: parseFloat(summary.gross_profit),
        margin: parseFloat(summary.margin_percentage),
      });

      setTransactions(transData);
      setPagination((prev) => ({
        ...prev,
        totalPages: pagingData.totalPages,
        totalCount: pagingData.totalCount,
      }));
    } catch (error) {
      console.error("Error fetching financial report:", error);
      toast.error("Gagal memuat laporan keuangan.");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset ke halaman 1 saat filter berubah
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
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

  // Definisi Kolom untuk DataTable
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
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            row.type === "OUT"
              ? "bg-green-100 text-green-700 border border-green-200"
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
          <div className="font-medium text-gray-900">
            {row.type === "OUT" ? row.customer_name : row.supplier_name || "-"}
          </div>
          <div className="text-xs text-gray-500">{row.notes || "-"}</div>
        </div>
      ),
      sortable: false,
    },
    {
      header: "Pendapatan",
      accessor: (row) => (
        <span className="font-medium text-green-600">
          {row.type === "OUT" ? formatCurrency(row.total_amount) : "-"}
        </span>
      ),
      className: "text-right",
      sortable: false,
    },
    {
      header: "HPP / Biaya",
      accessor: (row) => (
        <span className="font-medium text-red-600">
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
          className={`font-bold ${
            parseFloat(row.profit) >= 0 ? "text-blue-600" : "text-red-600"
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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Laporan Keuangan
          </h1>
          <p className="text-gray-500 mt-1">
            Ringkasan pendapatan, pengeluaran, dan laba bersih.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchFinancialData}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={20} />
          </button>
          <button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-gray-200">
            <Download size={18} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <DateRangeFilter
        startDate={filters.startDate}
        endDate={filters.endDate}
        onChange={handleFilterChange}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="text-white" size={24} />}
          color="bg-gradient-to-br from-green-400 to-green-600"
          subtext="Dari transaksi keluar"
        />
        <StatCard
          title="Total HPP"
          value={formatCurrency(stats.totalCost)}
          icon={<TrendingDown className="text-white" size={24} />}
          color="bg-gradient-to-br from-red-400 to-red-600"
          subtext="Modal barang terjual"
        />
        <StatCard
          title="Laba Kotor"
          value={formatCurrency(stats.grossProfit)}
          icon={<TrendingUp className="text-white" size={24} />}
          color="bg-gradient-to-br from-blue-400 to-blue-600"
          subtext="Pendapatan - HPP"
        />
        <StatCard
          title="Margin Keuntungan"
          value={`${stats.margin.toFixed(2)}%`}
          icon={<TrendingUp className="text-white" size={24} />}
          color="bg-gradient-to-br from-indigo-400 to-indigo-600"
          subtext="Persentase profitabilitas"
        />
      </div>

      {/* Transactions Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Rincian Transaksi</h2>
        <DataTable
          columns={columns}
          data={transactions}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalCount: pagination.totalCount,
            onPageChange: handlePageChange,
          }}
          isLoading={loading}
        />
      </div>
    </div>
  );
}

// Komponen StatCard (Tetap di sini atau bisa dipindah juga ke common)
function StatCard({ title, value, icon, color, subtext }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl shadow-md ${color}`}>{icon}</div>
      </div>
      {subtext && <p className="text-xs text-gray-400 mt-4">{subtext}</p>}
    </div>
  );
}

export default FinancialReport;
