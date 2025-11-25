import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Helper untuk format mata uang
const formatCurrency = (amount) => {
    return `Rp ${parseFloat(amount || 0).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
};

const PRODUCT_SUMMARY_LIMIT = 10; 

// --- KOMPONEN SKELETON BARU ---
const FinancialReportSkeleton = () => {
    return (
        <div className="p-6 bg-white shadow-lg rounded-lg animate-pulse"> 
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6 skeleton-shimmer"></div>
            
            {/* Filter Skeleton */}
            <div className="flex gap-4 items-end mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="h-10 bg-gray-300 rounded w-1/3 skeleton-shimmer"></div>
                <div className="h-10 bg-gray-300 rounded w-1/3 skeleton-shimmer"></div>
                <div className="h-10 bg-blue-300 rounded w-1/3 skeleton-shimmer"></div>
            </div>

            {/* Valuation & Profit Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow-lg skeleton-shimmer h-40">
                        <div className="h-5 bg-gray-300 rounded w-2/3 mb-4"></div>
                        <div className="h-8 bg-gray-400 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                ))}
            </div>

            {/* Summary Table Skeleton */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-t pt-4">
                 <div className="h-6 bg-gray-300 rounded w-1/4 skeleton-shimmer"></div>
            </h2>
            <div className="bg-gray-50 divide-y divide-gray-200 rounded-lg">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 flex justify-between items-center h-16">
                        <div className="h-4 bg-gray-300 rounded w-1/3 skeleton-shimmer"></div>
                        <div className="h-6 bg-gray-400 rounded w-1/4 skeleton-shimmer"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---

function FinancialReport() {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // BARU: State Pagination untuk Product Summary
    const [summaryPage, setSummaryPage] = useState(1);
    const [summaryTotalPages, setSummaryTotalPages] = useState(1);

    // Fungsi utama fetch laporan
    const fetchReport = async (isMounted, start, end, page) => { 
        try {
            if (isMounted) setLoading(true);
            const params = { 
                startDate: start || undefined, 
                endDate: end || undefined,
                summaryPage: page, 
                summaryLimit: PRODUCT_SUMMARY_LIMIT, 
            };
            const response = await axios.get('/api/reports/financial', { params });
            
            if (isMounted) {
                setReportData(response.data);
                setSummaryTotalPages(response.data.productSummaryMetadata.totalPages);
                setSummaryPage(response.data.productSummaryMetadata.currentPage);
            }
        } catch (err) {
            if (isMounted) toast.error('Gagal memuat laporan keuangan.');
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    // Efek untuk fetch awal / filter tanggal
    useEffect(() => {
        let isMounted = true;
        // Fetch halaman 1 saat filter tanggal berubah
        fetchReport(isMounted, startDate, endDate, 1); 
        return () => { isMounted = false; };
    }, [startDate, endDate]); // Dependensi filter tanggal

    // Efek khusus untuk handle perpindahan halaman summary
    useEffect(() => {
        let isMounted = true;
        // Fetch hanya saat summaryPage berubah (filter tanggal stabil)
        fetchReport(isMounted, startDate, endDate, summaryPage);
        return () => { isMounted = false; };
    }, [summaryPage]); // Dependensi hanya pada summaryPage
    
    const handleFilterSubmit = (e) => {
        e.preventDefault();
        setSummaryPage(1); // Reset pagination saat filter utama berubah
        fetchReport(true, startDate, endDate, 1); // Panggil fetch ulang
    };

    // Handlers Pagination
    const handleSummaryPrev = () => { if (summaryPage > 1) setSummaryPage(summaryPage - 1); };
    const handleSummaryNext = () => { if (summaryPage < summaryTotalPages) setSummaryPage(summaryPage + 1); };


    if (loading) {
        return <FinancialReportSkeleton />;
    }

    if (!reportData) {
        return <div className="p-6">Gagal memuat data laporan.</div>;
    }

    // Data dari API
    const { valuation, profit, product_summary } = reportData;
    const grossProfit = parseFloat(profit?.gross_profit || 0); // Safe check
    const isPositiveProfit = grossProfit >= 0;

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">💰 Laporan Keuangan (Snapshot)</h1>
            
            {/* Filter Periode */}
            <form onSubmit={handleFilterSubmit} className="flex gap-4 items-end mb-6 p-4 border rounded-lg bg-gray-50">
                <div className='flex-1'>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
                <div className='flex-1'>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    Filter Data
                </button>
            </form>

            {/* Valuation & Profit Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. Valuasi Stok */}
                <div className="bg-white p-6 rounded-lg shadow-xl border-l-4 border-purple-500">
                    <h2 className="text-sm font-medium text-gray-500 uppercase">Total Valuasi Aset (HPP)</h2>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                        {formatCurrency(valuation?.total_asset_value)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        {valuation?.total_units_in_stock || 0} Unit dalam Stok
                    </p>
                </div>

                {/* 2. Total Penjualan */}
                <div className="bg-white p-6 rounded-lg shadow-xl border-l-4 border-indigo-500">
                    <h2 className="text-sm font-medium text-gray-500 uppercase">Total Pendapatan Penjualan</h2>
                    <p className="text-3xl font-bold text-indigo-600 mt-2">
                        {formatCurrency(profit?.total_sales_revenue)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                         Data berdasarkan filter periode
                    </p>
                </div>

                {/* 3. Gross Profit */}
                <div className={`bg-white p-6 rounded-lg shadow-xl border-l-4 ${isPositiveProfit ? 'border-green-500' : 'border-red-500'}`}>
                    <h2 className="text-sm font-medium text-gray-500 uppercase">Gross Profit (Laba Kotor)</h2>
                    <p className={`text-3xl font-bold ${isPositiveProfit ? 'text-green-600' : 'text-red-600'} mt-2`}>
                        {formatCurrency(grossProfit)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Data berdasarkan filter periode
                    </p>
                </div>
            </div>

            {/* Product Summary */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-t pt-4">Ringkasan Nilai Stok per Produk</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Produk</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. HPP</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Unit</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Nilai Aset</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {(product_summary || []).map((p, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{p.product_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.sku}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">{formatCurrency(p.average_cost)}</td> 
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{p.total_quantity_in_stock}</td> 
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-purple-600">
                                    {formatCurrency(p.total_value_asset)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* BARU: PAGINATION CONTROL */}
            {summaryTotalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <button 
                        onClick={handleSummaryPrev} 
                        disabled={summaryPage <= 1 || loading} 
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50"
                    >
                        &laquo; Sebelumnya
                    </button>
                    <span className="text-sm">
                        Halaman <strong>{summaryPage}</strong> dari <strong>{summaryTotalPages}</strong>
                    </span>
                    <button 
                        onClick={handleSummaryNext} 
                        disabled={summaryPage >= summaryTotalPages || loading} 
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50"
                    >
                        Berikutnya &raquo;
                    </button>
                </div>
            )}
        </div>
    );
}

export default FinancialReport;