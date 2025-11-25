import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import ExportButton from '../components/ExportButton';

const PERIOD_OPTIONS = [
    { value: 'last30', label: '30 Hari Terakhir' },
    { value: 'last90', label: '90 Hari Terakhir' },
    { value: 'all', label: 'Semua Waktu' },
];

// Helper untuk format mata uang
const formatCurrency = (amount) => {
    return `Rp ${parseFloat(amount || 0).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
};

// --- KOMPONEN SKELETON (Unchanged) ---
const CustomerOrderReportSkeleton = () => {
    // 5 Kolom: Nama Pelanggan, Total Orders, Total Unit, Total Nilai Jual, Gross Profit
    const columns = 5; 
    
    const TableRowSkeleton = () => (
        <tr className="border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    {/* Variasi ukuran skeleton untuk simulasi data */}
                    <div className={`h-4 bg-gray-300 rounded skeleton-shimmer ${i === 0 ? 'w-2/3' : 'w-1/2'}`}></div>
                </td>
            ))}
        </tr>
    );

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg animate-pulse"> 
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6 skeleton-shimmer"></div>
            
            {/* Filter & Export Skeleton */}
            <div className="flex justify-between items-center mb-6">
                <div className="h-10 bg-gray-300 rounded w-48 skeleton-shimmer"></div>
                <div className="h-10 bg-indigo-300 rounded w-40 skeleton-shimmer"></div>
            </div>
            
            {/* Table Skeleton */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    <div className="h-3 bg-gray-300 rounded w-2/3 skeleton-shimmer"></div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---

function CustomerOrderReport() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(PERIOD_OPTIONS[0]);

    async function fetchReports(isMounted) {
        try {
            if (isMounted) setLoading(true);
            const params = { period: period.value };
            // Catatan: Endpoint ini mengembalikan semua data untuk periode tersebut (tidak ada pagination)
            const response = await axios.get('/api/reports/customer-order', { params });

            if (isMounted) {
                setReports(response.data.reports);
            }
        } catch (err) {
            if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
                toast.error('Gagal memuat laporan pesanan pelanggan.');
            }
            if (isMounted) setReports([]);
        } finally {
            if (isMounted) setLoading(false);
        }
    }

    useEffect(() => {
        let isMounted = true;
        fetchReports(isMounted);

        return () => { isMounted = false; };
    }, [period]);

    const csvHeaders = [
        { label: "Nama Pelanggan", key: "customer_name" },
        { label: "Total Pesanan", key: "total_orders" },
        { label: "Total Unit Keluar", key: "total_units_out" },
        { label: "Total Nilai Jual (Rp)", key: "total_sales_revenue" },
        { label: "Total HPP (Rp)", key: "total_cogs" },
        { label: "Gross Profit (Rp)", key: "gross_profit" },
    ];

    // FIX UTAMA: Mengubah fungsi menjadi ASYNC (mengembalikan Promise)
    const getExportData = async () => {
        // Menggunakan (reports || []) untuk pemeriksaan keamanan
        return (reports || []).map(r => ({
            ...r,
            total_sales_revenue: parseFloat(r.total_sales_revenue || 0).toFixed(2),
            total_cogs: parseFloat(r.total_cogs || 0).toFixed(2),
            gross_profit: parseFloat(r.gross_profit || 0).toFixed(2),
        }));
    };

    if (loading) {
        return <CustomerOrderReportSkeleton />;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">📈 Laporan Pesanan Pelanggan</h1>
            
            <div className="flex justify-between items-center mb-6 p-4 border rounded-lg bg-gray-50">
                <div className='w-full max-w-xs'>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter Periode</label>
                    <Select
                        options={PERIOD_OPTIONS}
                        value={period}
                        onChange={setPeriod}
                        classNamePrefix="react-select"
                    />
                </div>
                <ExportButton
                    data={getExportData} // Meneruskan REFERENSI fungsi async
                    headers={csvHeaders}
                    filename={`Laporan_Pesanan_Pelanggan_${period.value}.csv`}
                >
                    Unduh Laporan (CSV)
                </ExportButton>
            </div>

            {/* FIX: Menerapkan check (reports || []).length di JSX */}
            {(reports || []).length === 0 ? (
                <p className="text-gray-500">Tidak ada data pesanan pelanggan pada periode ini.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Pelanggan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Pesanan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Unit Keluar</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Nilai Jual</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report, index) => {
                                const profit = parseFloat(report.gross_profit || 0);
                                const isPositive = profit >= 0;

                                return (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{report.customer_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{report.total_orders}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{report.total_units_out}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700">{formatCurrency(report.total_sales_revenue)}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(profit)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default CustomerOrderReport;