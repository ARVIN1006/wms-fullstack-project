import { useState, useEffect, useCallback } from 'react'; // <-- Import useCallback
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select';

const PERIOD_OPTIONS = [
    { value: 'last7', label: '7 Hari Terakhir' },
    { value: 'last30', label: '30 Hari Terakhir' },
    { value: 'all', label: 'Semua Waktu' },
];

// --- KOMPONEN SKELETON (Unchanged) ---
const UserActivityReportSkeleton = () => {
    // 5 Kolom: Operator, Total Transaksi, Total Unit IN, Total Unit OUT, Terakhir Aktif
    const columns = 5; 
    
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

function UserActivityReport() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(PERIOD_OPTIONS[0]);

    async function fetchReports(isMounted) {
        try {
            if (isMounted) setLoading(true);
            const params = { period: period.value };
            const response = await axios.get('/api/reports/activity', { params });

            if (isMounted) {
                setReports(response.data.reports);
            }
        } catch (err) {
            if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
                toast.error('Gagal memuat laporan aktivitas user.');
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
        { label: "Operator", key: "username" },
        { label: "Role", key: "role" },
        { label: "Total Transaksi", key: "total_transactions" },
        { label: "Unit Masuk", key: "total_units_in" },
        { label: "Unit Keluar", key: "total_units_out" },
        { label: "Terakhir Aktif", key: "last_active_date" },
    ];

    // FIX UTAMA: Mengubah getExportData menjadi ASYNC dan menggunakan useCallback
    const getExportData = useCallback(async () => {
        // Menggunakan (reports || []) untuk pemeriksaan keamanan
        return (reports || []).map(r => ({
            ...r,
            last_active_date: r.last_active_date ? new Date(r.last_active_date).toLocaleString('id-ID') : '-',
        }));
    }, [reports]); // Depend on reports state
    
    if (loading) {
        return <UserActivityReportSkeleton />;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">👥 Laporan Aktivitas User</h1>
            
            <div className="flex justify-between items-center mb-6 p-4 border rounded-lg bg-gray-50">
                <div className='w-full max-w-xs'>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter Periode Aktivitas</label>
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
                    filename={`Laporan_Aktivitas_User_${period.value}.csv`}
                >
                    Unduh Laporan (CSV)
                </ExportButton>
            </div>

            {/* FIX: Menerapkan check (reports || []).length di JSX */}
            {(reports || []).length === 0 ? (
                <p className="text-gray-500">Tidak ada data aktivitas user pada periode ini.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Transaksi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Unit IN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Unit OUT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terakhir Aktif</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{report.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{report.role.toUpperCase()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{report.total_transactions}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{report.total_units_in || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{report.total_units_out || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{report.last_active_date ? new Date(report.last_active_date).toLocaleString('id-ID') : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default UserActivityReport;