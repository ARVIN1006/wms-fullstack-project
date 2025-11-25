import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Hook ini menangani fetching data master dasar (tanpa pagination)
export function useMasterData(url, initialData = []) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(true);
    
    const fetchData = useCallback(async (isMounted) => {
      if (!url) return;
      try {
        if (isMounted) setLoading(true);
        // Menggunakan URL yang diberikan (misalnya /api/locations)
        const response = await axios.get(url);
        if (isMounted) setData(response.data);
      } catch (err) {
        if (isMounted) {
            console.error(`Gagal memuat data dari ${url}:`, err.message);
            // Hanya tampilkan toast untuk error yang tidak terkait auth
            if (err.response?.status !== 401 && err.response?.status !== 403) {
                toast.error('Gagal memuat data master.');
            }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }, [url]);

    // Efek untuk menjalankan fetching saat komponen mount
    useEffect(() => {
        let isMounted = true;
        fetchData(isMounted);

        return () => { isMounted = false; };
    }, [fetchData]); 
    
    // Kembalikan data, loading state, dan fungsi untuk me-re-fetch (dipanggil setelah CRUD)
    return { data, loading, refetch: () => fetchData(true) };
}