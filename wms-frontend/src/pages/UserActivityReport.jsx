import { useState, useEffect, useCallback } from 'react'; 
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ExportButton from '../components/ExportButton';
import Select from 'react-select';
import { useMasterData } from '../hooks/useMasterData';

// Constants
const PERIOD_OPTIONS = [
  { value: 'last7', label: '📅 7 Hari Terakhir', color: 'blue' },
  { value: 'last30', label: '📅 30 Hari Terakhir', color: 'purple' },
  { value: 'all', label: '⏰ Semua Waktu', color: 'gray' },
];

const DEFAULT_PERIOD = PERIOD_OPTIONS.find(o => o.value === 'all'); 

// Custom Styles for React Select
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
    },
    borderRadius: '8px',
    padding: '2px'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    '&:active': {
      backgroundColor: '#2563eb'
    }
  })
};

// Helper Functions
const formatNumber = (number) => {
  return parseFloat(number || 0).toLocaleString('id-ID');
};

const getRoleBadge = (role) => {
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
  if (role === 'admin') return `${base} bg-indigo-100 text-indigo-800 border border-indigo-200`;
  if (role === 'supervisor') return `${base} bg-purple-100 text-purple-800 border border-purple-200`;
  return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
};

// Skeleton Loader Component
const UserActivityReportSkeleton = () => {
  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className={`h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse ${
            i === 0 ? 'w-24' : i === 2 ? 'w-16' : 'w-full'
          }`}></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-64"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-96"></div>
        </div>
        <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-40"></div>
      </div>

      {/* Filter Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
            <div className="h-12 bg-white rounded-lg border border-gray-200"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Operator', 'Role', 'Total Aktivitas', 'Unit Masuk', 'Unit Keluar', 'Perpindahan'].map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Filter Badge Component
const FilterBadge = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
    {label}: {value}
    <button
      onClick={onRemove}
      className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
    >
      ×
    </button>
  </span>
);

// Main Component
function UserActivityReport() {
  // Master data
  const { data: users, loading: usersLoading } = useMasterData('/api/users');

  // Input states
  const [periodInput, setPeriodInput] = useState(DEFAULT_PERIOD); 
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [selectedOperatorInput, setSelectedOperatorInput] = useState(null);
  
  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    period: DEFAULT_PERIOD.value,
    startDate: undefined,
    endDate: undefined,
    operatorId: undefined,
  });

  // Active filters for display
  const [activeFilters, setActiveFilters] = useState([]);

  // Helper untuk membuat Query String
  const createQueryString = (filters) => {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.operatorId) params.append('operatorId', filters.operatorId);
    return params.toString();
  };

  // URL untuk useMasterData
  const reportUrl = `/api/reports/activity?${createQueryString(appliedFilters)}`;
  
  // Fetch reports
  const { data: reportsData, loading: reportsLoading } = useMasterData(reportUrl, {}); 
  const reports = reportsData?.reports || [];

  // CSV headers
  const csvHeaders = [
    { label: "Operator", key: "operator_name" },
    { label: "Role", key: "role" },
    { label: "Total Aktivitas", key: "total_activities" },
    { label: "Unit Masuk", key: "total_units_in" },
    { label: "Unit Keluar", key: "total_units_out" },
    { label: "Perpindahan", key: "total_movements" },
  ];

  // Export data function
  const getExportData = useCallback(async () => {
    return (reports || []).map(r => ({
      ...r,
    }));
  }, [reports]);

  // Operator options
  const operatorOptions = [
    { value: '', label: '👤 Semua Operator' },
    ...(users || []).map(u => ({ 
      value: u.id, 
      label: u.username,
      role: u.role 
    }))
  ];

  // Update active filters
  useEffect(() => {
    const newActiveFilters = [];
    
    if (appliedFilters.period && appliedFilters.period !== 'all') {
      const periodLabel = PERIOD_OPTIONS.find(opt => opt.value === appliedFilters.period)?.label || 'Semua';
      newActiveFilters.push({ key: 'period', label: 'Periode', value: periodLabel });
    }
    
    if (appliedFilters.startDate) {
      newActiveFilters.push({ key: 'startDate', label: 'Dari', value: new Date(appliedFilters.startDate).toLocaleDateString('id-ID') });
    }
    
    if (appliedFilters.endDate) {
      newActiveFilters.push({ key: 'endDate', label: 'Sampai', value: new Date(appliedFilters.endDate).toLocaleDateString('id-ID') });
    }
    
    if (appliedFilters.operatorId) {
      const operator = users?.find(u => u.id === appliedFilters.operatorId);
      if (operator) {
        newActiveFilters.push({ key: 'operator', label: 'Operator', value: operator.username });
      }
    }
    
    setActiveFilters(newActiveFilters);
  }, [appliedFilters, users]);

  // Handle filter submission
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    
    setAppliedFilters({
      period: periodInput.value,
      startDate: startDateInput || undefined,
      endDate: endDateInput || undefined,
      operatorId: selectedOperatorInput?.value || undefined
    });
  };

  // Handle filter removal
  const handleRemoveFilter = (filterKey) => {
    switch (filterKey) {
      case 'period':
        setPeriodInput(DEFAULT_PERIOD);
        setAppliedFilters(prev => ({ ...prev, period: DEFAULT_PERIOD.value }));
        break;
      case 'startDate':
        setStartDateInput('');
        setAppliedFilters(prev => ({ ...prev, startDate: undefined }));
        break;
      case 'endDate':
        setEndDateInput('');
        setAppliedFilters(prev => ({ ...prev, endDate: undefined }));
        break;
      case 'operator':
        setSelectedOperatorInput(null);
        setAppliedFilters(prev => ({ ...prev, operatorId: undefined }));
        break;
      default:
        break;
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setPeriodInput(DEFAULT_PERIOD);
    setStartDateInput('');
    setEndDateInput('');
    setSelectedOperatorInput(null);
    setAppliedFilters({
      period: DEFAULT_PERIOD.value,
      startDate: undefined,
      endDate: undefined,
      operatorId: undefined
    });
  };

  const loading = usersLoading || reportsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <UserActivityReportSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laporan Aktivitas User</h1>
            <p className="text-gray-600 mt-2">
              Analisis performa dan produktivitas operator gudang
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
              <div className="text-sm text-gray-600">Total Operator</div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Laporan</h3>
          
          <form onSubmit={handleFilterSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Periode Waktu</label>
                <Select
                  options={PERIOD_OPTIONS}
                  value={periodInput}
                  onChange={setPeriodInput}
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Operator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter Operator</label>
                <Select
                  options={operatorOptions}
                  value={selectedOperatorInput}
                  onChange={setSelectedOperatorInput}
                  placeholder="👤 Semua Operator"
                  isClearable
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </form>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filter Aktif:</span>
              {activeFilters.map((filter) => (
                <FilterBadge
                  key={filter.key}
                  label={filter.label}
                  value={filter.value}
                  onRemove={() => handleRemoveFilter(filter.key)}
                />
              ))}
              <button
                onClick={handleClearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Hapus Semua
              </button>
            </div>
          )}
        </div>

        {/* Export & Stats Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600">Total Aktivitas</div>
              <div className="text-lg font-bold text-gray-900">
                {formatNumber(reports.reduce((sum, report) => sum + (report.total_activities || 0), 0))}
              </div>
            </div>
          </div>
          
          <ExportButton
            data={getExportData}
            headers={csvHeaders}
            filename={`laporan-aktivitas-user-${new Date().toISOString().slice(0, 10)}.csv`}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            📥 Ekspor CSV
          </ExportButton>
        </div>

        {/* Results Section */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Data Aktivitas</h3>
            <p className="text-gray-600 mb-6">
              Tidak ditemukan data aktivitas user dengan filter yang dipilih.
            </p>
            <button
              onClick={handleClearAllFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Operator</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Aktivitas</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Masuk</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Keluar</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Perpindahan</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {reports.map((report, index) => (
                    <tr key={report.operator_id || index} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {report.operator_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{report.operator_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getRoleBadge(report.role)}>
                          {report.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-gray-900">
                          {formatNumber(report.total_activities)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 text-lg">📥</span>
                          <span className="text-sm font-semibold text-green-700">
                            {formatNumber(report.total_units_in || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 text-lg">📤</span>
                          <span className="text-sm font-semibold text-red-700">
                            {formatNumber(report.total_units_out || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 text-lg">🔄</span>
                          <span className="text-sm font-semibold text-blue-700">
                            {formatNumber(report.total_movements || 0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserActivityReport;