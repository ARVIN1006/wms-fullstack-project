import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useMasterData } from "../hooks/useMasterData";
import { useAuth } from "../context/AuthContext";

// Helper untuk format mata uang
const formatCurrency = (amount) => {
  return `Rp ${parseFloat(amount || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper untuk format angka
const formatNumber = (number) => {
  return parseFloat(number || 0).toLocaleString("id-ID");
};

const PRODUCT_SUMMARY_LIMIT = 10;

// --- KOMPONEN SKELETON YANG DITINGKATKAN ---
const FinancialReportSkeleton = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-300 rounded w-64 animate-pulse"></div>
        <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
      </div>

      {/* Filter Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
            <div className="h-12 bg-white rounded-lg border border-gray-200 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 animate-pulse"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-6 bg-gray-400 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="h-6 bg-gray-300 rounded w-48 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-3 border-b border-gray-100"
            >
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-6 bg-gray-400 rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN CARD STATISTIC ---
const StatCard = ({ icon, title, value, subtitle, trend, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  const bgColorClasses = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
    indigo: "bg-indigo-50 border-indigo-100",
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:scale-105`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
          {trend && (
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                trend > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN PAGINATION ---
const Pagination = ({ currentPage, totalPages, onPageChange, loading }) => {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-2xl">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Menampilkan{" "}
            <span className="font-medium">
              {(currentPage - 1) * PRODUCT_SUMMARY_LIMIT + 1}
            </span>{" "}
            -{" "}
            <span className="font-medium">
              {Math.min(
                currentPage * PRODUCT_SUMMARY_LIMIT,
                totalPages * PRODUCT_SUMMARY_LIMIT
              )}
            </span>{" "}
            dari{" "}
            <span className="font-medium">
              {totalPages * PRODUCT_SUMMARY_LIMIT}
            </span>{" "}
            hasil
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Previous</span>←
            </button>
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  currentPage === page
                    ? "bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Next</span>→
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

function FinancialReport() {
  const { isAuthenticated } = useAuth();

  // --- INPUT STATES ---
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  // --- APPLIED DATE FILTERS (Trigger untuk Hook) ---
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: undefined,
    endDate: undefined,
  });

  // --- PRODUCT SUMMARY PAGINATION (Local State) ---
  const [summaryPage, setSummaryPage] = useState(1);

  // 1. Tentukan URL Penuh
  const baseReportUrl = `/api/reports/financial?startDate=${
    appliedFilters.startDate || ""
  }&endDate=${
    appliedFilters.endDate || ""
  }&summaryPage=${summaryPage}&summaryLimit=${PRODUCT_SUMMARY_LIMIT}`;

  // 2. Hentikan request jika belum terautentikasi (Mengatasi error 401)
  const reportUrl = isAuthenticated ? baseReportUrl : null;

  // --- USE HOOK useMasterData ---
  const { data: reportsData, loading } = useMasterData(reportUrl, {});

  // Handler untuk menerapkan filter utama
  const handleFilterSubmit = (e) => {
    e.preventDefault();

    // 1. Update Applied Filters (memicu refetch hook)
    setAppliedFilters({
      startDate: startDateInput || undefined,
      endDate: endDateInput || undefined,
    });

    // 2. Reset Pagination Summary ke halaman 1
    setSummaryPage(1);
  };

  // Handler untuk reset filter
  const handleResetFilters = () => {
    setStartDateInput("");
    setEndDateInput("");
    setAppliedFilters({ startDate: undefined, endDate: undefined });
    setSummaryPage(1);
  };

  // Handler untuk perubahan halaman summary
  const handleSummaryChange = (newPage) => {
    setSummaryPage(newPage);
    // Scroll ke atas tabel
    window.scrollTo({ top: 600, behavior: "smooth" });
  };

  // Data dari API (dengan safety check)
  const reportData = reportsData || {};
  const { valuation, profit, product_summary, productSummaryMetadata } =
    reportData;

  const grossProfit = parseFloat(profit?.gross_profit || 0);
  const isPositiveProfit = grossProfit >= 0;

  // Metadata Pagination
  const summaryTotalPages = productSummaryMetadata?.totalPages || 1;
  const summaryTotalCount = productSummaryMetadata?.totalCount || 0;

  // Jika loading dan belum terautentikasi, biarkan ProtectedRoute yang menangani (atau tampilkan loading)
  if (loading && isAuthenticated) {
    return <FinancialReportSkeleton />;
  }

  // Jika tidak ada data yang dimuat setelah otorisasi (misalnya 401 saat token hilang),
  // kita akan membiarkan ProtectedRoute me-redirect atau AuthContext memicu logout.
  if (!isAuthenticated) {
    return <FinancialReportSkeleton />;
  }

  // Jika data tidak ada (misalnya error fetching awal)
  if (!reportData.valuation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Gagal Memuat Data
          </h3>
          <p className="text-gray-600 mb-4">
            Terjadi kesalahan saat mengambil data laporan keuangan.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Laporan Keuangan
            </h1>
            <p className="text-gray-600 mt-2">
              Analisis lengkap performa keuangan dan valuasi inventory
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Cetak Laporan
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Filter Periode
          </h3>
          <form
            onSubmit={handleFilterSubmit}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex gap-2 md:col-span-2 md:items-end">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Terapkan Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="Total Valuasi Aset"
            value={formatCurrency(valuation?.total_asset_value)}
            subtitle={`${formatNumber(
              valuation?.total_units_in_stock
            )} unit dalam stok`}
            color="purple"
          />

          <StatCard
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
            title="Total Pendapatan"
            value={formatCurrency(profit?.total_sales_revenue)}
            subtitle="Berdasarkan periode terpilih"
            color="blue"
          />

          <StatCard
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
            title="Laba Kotor"
            value={formatCurrency(grossProfit)}
            subtitle={
              isPositiveProfit ? "Performa positif" : "Performa negatif"
            }
            trend={isPositiveProfit ? 12 : -8}
            color={isPositiveProfit ? "green" : "orange"}
          />
        </div>

        {/* Product Summary Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Ringkasan Nilai Stok Produk
                </h2>
                <p className="text-gray-600 mt-1">
                  Detail valuasi inventory per produk
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Total:{" "}
                <span className="font-semibold text-gray-900">
                  {summaryTotalCount} produk
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    HPP Rata-rata
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total Nilai
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(product_summary || []).map((p, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {p.product_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                        {p.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">
                      {formatCurrency(p.average_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatNumber(p.total_quantity_in_stock)} unit
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-purple-600">
                      {formatCurrency(p.total_value_asset)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {summaryTotalPages > 1 && (
            <Pagination
              currentPage={summaryPage}
              totalPages={summaryTotalPages}
              onPageChange={handleSummaryChange}
              loading={loading}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-gray-600 text-sm">
            Laporan terakhir diperbarui:{" "}
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default FinancialReport;
