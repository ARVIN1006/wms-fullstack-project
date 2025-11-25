import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select';

const PERIOD_OPTIONS = [
    { value: 'last7', label: '7 Hari Terakhir' },
    { value: 'last30', label: '30 Hari Terakhir' },
    { value: 'all', label: 'Semua Waktu' },
];

const DEFAULT_PERIOD = PERIOD_OPTIONS.find(o => o.value === 'all'); // FIX: Default ke 'all'

// --- KOMPONEN SKELETON (Unchanged) ---
const UserActivityReportSkeleton = () => { /* ... */ };

function UserActivityReport() {
    const [reports, setReports] = useState([]);
    const [users, setUsers] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(DEFAULT_PERIOD); // Menggunakan default 'all'

    // --- STATE FILTER ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedOperator, setSelectedOperator] = useState(null);

    async function fetchReports(isMounted) {
        try {
            if (isMounted) setLoading(true);
            const params = { 
                period: period.value,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                operatorId: selectedOperator?.value || undefined
            };
            
            const response = await axios.get('/api/reports/activity', { params });

            if (isMounted) {
                setReports(response.data);
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

    // Ambil data Laporan dan data User
    useEffect(() => {
        let isMounted = true; 

        async function fetchUsers() {
          try {
            const response = await axios.get('/api/users'); 
            if (isMounted) setUsers(response.data); 
          } catch (err) {
            if (isMounted) toast.error('Gagal memuat data operator.');
          }
        }
        
        fetchUsers();
        fetchReports(isMounted); 
        
        return () => {
            isMounted = false; 
        };
    }, [period, startDate, endDate, selectedOperator]); // Re-fetch saat filter berubah

    const csvHeaders = [
        { label: "Operator", key: "username" },
        { label: "Role", key: "role" },
        { label: "Total Transaksi", key: "total_transactions" },
        { label: "Unit Masuk", key: "total_units_in" },
        { label: "Unit Keluar", key: "total_units_out" },
        // { label: "Terakhir Aktif", key: "last_active_date" }, // Data ini tidak dikirim oleh API
    ];

    // FIX UTAMA: Mengubah getExportData menjadi ASYNC dan menggunakan useCallback
    const getExportData = useCallback(async () => {
        return (reports || []).map(r => ({
            ...r,
            // last_active_date: r.last_active_date ? new Date(r.last_active_date).toLocaleString('id-ID') : '-', // Kolom dihapus dari header
        }));
    }, [reports]); 

    // Helper untuk mendapatkan badge role (Unchanged)
    const getRoleBadge = (role) => {
        const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
        if (role === 'admin') return `${base} bg-indigo-100 text-indigo-800`;
        return `${base} bg-gray-200 text-gray-800`;
    }

    const operatorOptions = [
        { value: '', label: 'Semua Operator' },
        ...users.map(u => ({ value: u.id, label: u.username }))
    ];

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        // State sudah berubah melalui onChange, useEffect akan me-re-fetch
    }
    
    if (loading) {
        return <UserActivityReportSkeleton />;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">👥 Laporan Aktivitas User</h1>
            
            <form onSubmit={handleFilterSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    
                    <div className='col-span-1'>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                        <Select
                            options={PERIOD_OPTIONS}
                            value={period}
                            onChange={setPeriod}
                            classNamePrefix="react-select"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter Operator</label>
                        <Select
                            options={operatorOptions}
                            value={selectedOperator}
                            onChange={setSelectedOperator}
                            placeholder="Semua Operator"
                            isClearable={true}
                            classNamePrefix="react-select"
                        />
                    </div>
                    
                    <div className='col-span-1'>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                            Filter
                        </button>
                    </div>
                </div>
            </form>
            
            <div className="flex justify-end items-center mb-6">
                <ExportButton
                    data={getExportData}
                    headers={csvHeaders}
                    filename={`Laporan_Aktivitas_User_${period.value}.csv`}
                >
                    Unduh Laporan (CSV)
                </ExportButton>
            </div>

            {(reports || []).length === 0 ? (
                <p className="text-gray-500">Tidak ada data aktivitas user pada periode ini.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Aktivitas</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Masuk (IN)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Keluar (OUT)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perpindahan</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report, index) => (
                                <tr key={report.operator_id || index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{report.operator_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className={getRoleBadge(report.role)}>{report.role.toUpperCase()}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{report.total_activities}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{report.total_inbound || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{report.total_outbound || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{report.total_movements || 0}</td>
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