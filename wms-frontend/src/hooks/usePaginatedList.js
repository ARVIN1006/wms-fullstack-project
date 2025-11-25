import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

/**
 * Custom Hook untuk mengelola state dan fetching data berpagination dan pencarian.
 * @param {string} baseUrl - URL dasar API (misalnya '/api/suppliers')
 * @param {number} limit - Batas item per halaman
 * @param {object} filterDeps - Objek yang berisi dependency filter tambahan (misal: { type: 'IN', startDate: '...' })
 */
export function usePaginatedList(baseUrl, limit, filterDeps = {}, initialSearchQuery = '') {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State Pagination dan Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [activeSearch, setActiveSearch] = useState(initialSearchQuery);
    
    // State untuk memicu re-fetch (digunakan setelah CRUD)
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // KARENA filterDeps ADALAH OBJECT, KITA GUNAKAN NILAI STRINGNYA UNTUK DEPENDENCY
    const filterDepsString = JSON.stringify(filterDeps); 
    
    const fetchData = useCallback(async (isMounted) => {
        if (!baseUrl) return;
        
        try {
            if (isMounted) setLoading(true);
            
            // 1. Parameter dasar (Pagination & Search)
            const params = {
                page: currentPage,
                limit: limit,
                search: activeSearch || undefined, // Hanya kirim jika ada
            };
            
            // 2. Gabungkan dependency filter tambahan (dari filterDeps)
            // JSON.parse(filterDepsString) memastikan kita menggunakan nilai APPLIED terbaru
            const appliedFilterDeps = JSON.parse(filterDepsString); 
            const allParams = { ...params, ...appliedFilterDeps };

            const response = await axios.get(baseUrl, { params: allParams });
            
            if (isMounted) {
                // Tentukan nama properti array data (supplier, customer, reports, atau data)
                let fetchedData = response.data.reports || response.data.suppliers || response.data.customers || response.data.data || [];
                
                setData(fetchedData);
                setTotalPages(response.data.totalPages);
                setTotalCount(response.data.totalCount);
                setCurrentPage(response.data.currentPage);
            }
        } catch (err) {
            if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
                toast.error('Gagal memuat data list.');
            }
            if (isMounted) setData([]);
        } finally {
            if (isMounted) setLoading(false);
        }
    }, [baseUrl, limit, currentPage, activeSearch, refreshTrigger, filterDepsString]); 

    // Efek utama untuk fetching data saat dependency berubah
    useEffect(() => {
        let isMounted = true;
        fetchData(isMounted);

        return () => { isMounted = false; };
    }, [fetchData]); 
    
    // Handlers untuk interaksi UI
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };
    
    const handleSearchSubmit = (newSearchQuery) => {
        setCurrentPage(1); // Reset ke halaman 1 saat pencarian baru
        setActiveSearch(newSearchQuery);
    };

    // Fungsi untuk memicu refresh (setelah CRUD)
    const refresh = () => {
        setRefreshTrigger(prev => prev + 1); 
        // Logika tambahan untuk kembali ke halaman 1 jika filter berubah
        if (currentPage !== 1) setCurrentPage(1); 
    }
    
    // Fungsi untuk memicu refresh tanpa mengubah halaman/search
    const refreshCurrentPage = () => setRefreshTrigger(prev => prev + 1);

    const resetPagination = () => setCurrentPage(1); // Fungsi baru untuk reset pagination saja


    return {
        // Data & Loading
        data, loading, 
        
        // Pagination State
        currentPage, totalPages, totalCount, activeSearch,
        
        // Handlers
        handlePageChange, handleSearchSubmit, refresh, refreshCurrentPage, resetPagination
    };
}