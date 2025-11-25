import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select';
// BARU: Import hook useMasterData
import { useMasterData } from '../hooks/useMasterData';

const PERIOD_OPTIONS = [
    { value: 'last30', label: '30 Hari Terakhir' },
    { value: 'last90', label: '90 Hari Terakhir' },
    { value: 'all', label: 'Semua Waktu' },
];

// FIX: Set default period ke 'all' agar data muncul saat load pertama
const DEFAULT_PERIOD = PERIOD_OPTIONS.find(o => o.value === 'all');

// Helper untuk format mata uang
const formatCurrency = (amount) => {
    return `Rp ${parseFloat(amount || 0).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
};

// --- KOMPONEN SKELETON (Unchanged) ---
const PerformanceReportSkeleton = () => {
    // 6 Kolom: Operator, Total Transaksi, Total Unit, Avg. Proses (IN), Avg. Proses (OUT), Total Profit
    const columns = 6; 
    
    const TableRowSkeleton = () => (
        <tr className="border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <div className={`h-4 bg-gray-300 rounded skeleton-shimmer ${i === 0 ? 'w-1/2' : 'w-1/3'}`}></div>
                </td>
            ))}
        </tr>
    );

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg animate-pulse"> 
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6 skeleton-shimmer"></div>
            
            {/* Filter & Export Skeleton */}
            <div className="flex justify-between items-center mb-6 p-4 border rounded-lg bg-gray-50">
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
                        {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---

function PerformanceReport() {
    // --- INPUT STATE ---
    const [periodInput, setPeriodInput] = useState(DEFAULT_PERIOD); 

    // --- APPLIED STATE (Trigger) ---
    const [appliedPeriod, setAppliedPeriod] = useState(DEFAULT_PERIOD.value);

    // --- USE HOOK useMasterData ---
    // reportsData adalah objek: { reports: [...] }
    const reportUrl = `/api/reports/performance?period=${appliedPeriod}`;
    const { data: reportsData, loading } = useMasterData(reportUrl, {}); 
    
    // Extract actual report array
    const reports = reportsData?.reports || [];


    const csvHeaders = [
        { label: "Operator", key: "operator_name" },
        { label: "Total Transaksi", key: "total_transactions" },
        { label: "Total Unit Dikelola", key: "total_units" },
        { label: "Avg. Proses (IN) (Menit)", key: "avg_inbound_time" },
        { label: "Avg. Proses (OUT) (Menit)", key: "avg_outbound_time" },
        { label: "Total Gross Profit (Rp)", key: "total_gross_profit" },
    ];

    // BARU: Handler Submit Filter
    const handleFilterSubmit = (e) => {
        e.preventDefault();
        // Set applied period untuk memicu refetch hook
        setAppliedPeriod(periodInput.value);
    }


    const getExportData = useCallback(async () => {
        // FIX: Menambahkan check (reports || [])
        return (reports || []).map(r => ({
            ...r,
            avg_inbound_time: parseFloat(r.avg_inbound_time || 0).toFixed(2),
            avg_outbound_time: parseFloat(r.avg_outbound_time || 0).toFixed(2),
            total_gross_profit: parseFloat(r.total_gross_profit || 0).toFixed(2),
        }));
    }, [reports]);

    if (loading) {
        return <PerformanceReportSkeleton />;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">⚡ Laporan Kinerja Operator</h1>
            
            <form onSubmit={handleFilterSubmit} className="flex justify-between items-center mb-6 p-4 border rounded-lg bg-gray-50">
                <div className='w-full max-w-xs'>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter Periode</label>
                    <Select
                        options={PERIOD_OPTIONS}
                        value={periodInput}
                        onChange={setPeriodInput}
                        classNamePrefix="react-select"
                    />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    Tampilkan Laporan
                </button>
                <ExportButton
                    data={getExportData} 
                    headers={csvHeaders}
                    filename={`Laporan_Kinerja_Operator_${appliedPeriod}.csv`}
                >
                    Unduh Laporan (CSV)
                </ExportButton>
            </form>

            {(reports || []).length === 0 ? (
                <p className="text-gray-500">Tidak ada data kinerja operator pada periode ini.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Transaksi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Unit Dikelola</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Proses (IN) (Menit)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Proses (OUT) (Menit)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gross Profit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report, index) => {
                                const profit = parseFloat(report.total_gross_profit || 0);
                                const isPositive = profit >= 0;

                                return (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{report.operator_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{report.total_transactions}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{report.total_units}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{parseFloat(report.avg_inbound_time || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{parseFloat(report.avg_outbound_time || 0).toFixed(2)}</td>
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

export default PerformanceReport;