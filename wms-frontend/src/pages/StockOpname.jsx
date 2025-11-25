import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AsyncSelect from 'react-select/async';
import Select from 'react-select';
// --- BARU: Import Hook Form dan Yup ---
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// --- DEFINISI SKEMA VALIDASI YUP ---
const validationSchema = yup.object().shape({
    product: yup.object().nullable().required('Produk wajib dipilih.'),
    location: yup.object().nullable().required('Lokasi wajib dipilih.'),
    physicalCount: yup.number()
        .typeError('Hitungan fisik harus berupa angka.')
        .min(0, 'Hitungan fisik tidak boleh negatif.')
        .required('Hitungan fisik wajib diisi.'),
    notes: yup.string().when('physicalCount', {
        // Notes wajib jika physicalCount tidak sama dengan systemCount (dari context)
        is: (val) => val !== yup.ref('$systemCount'), // Menggunakan referensi context
        then: (schema) => schema.required('Catatan wajib diisi jika ada perbedaan stok.'),
        otherwise: (schema) => schema.nullable(),
    }),
});
// --- END SKEMA ---

function StockOpname() {
    const [locations, setLocations] = useState([]);
    const [loadingMaster, setLoadingMaster] = useState(true);
    const [systemCount, setSystemCount] = useState(null); // System Stock Count
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- RHF Hook ---
    const { 
        register, 
        handleSubmit, 
        setValue, 
        watch, 
        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(validationSchema),
        // Kirim systemCount ke Yup context untuk validasi bersyarat
        context: { systemCount }, 
        defaultValues: {
            product: null,
            location: null,
            physicalCount: 0,
            notes: '',
        }
    });

    // Watch fields
    const selectedProduct = watch('product');
    const selectedLocation = watch('location');
    const physicalCount = watch('physicalCount');

    // --- Ambil Data Master: Lokasi ---
    useEffect(() => {
        let isMounted = true;
        async function fetchLocations() {
            try {
                const response = await axios.get('/api/locations');
                if (isMounted) setLocations(response.data);
            } catch (error) {
                if (isMounted) toast.error("Gagal memuat data lokasi.");
            } finally {
                if (isMounted) setLoadingMaster(false);
            }
        }
        fetchLocations();
        return () => { isMounted = false; };
    }, []);

    // --- Fungsi Fetch System Count ---
    const fetchSystemCount = useCallback(async () => {
        if (!selectedProduct || !selectedLocation) {
            setSystemCount(null);
            return;
        }

        try {
            const res = await axios.get(
                `/api/stocks/specific/${selectedProduct.value}/${selectedLocation.value}`
            );
            // System count adalah total_quantity yang disimpan di database
            const count = res.data.total_quantity || 0;
            setSystemCount(count);
            // Auto-fill physical count dengan system count saat pertama kali dimuat
            setValue('physicalCount', count);
        } catch (err) {
            setSystemCount(null);
            toast.error('Gagal memuat stok sistem untuk lokasi ini.');
        }
    }, [selectedProduct, selectedLocation, setValue]);

    // Efek memuat stok sistem saat Produk atau Lokasi berubah
    useEffect(() => {
        fetchSystemCount();
    }, [fetchSystemCount]);

    // --- Fungsi Pencarian Produk Asynchronous ---
    const loadProductOptions = async (inputValue) => {
        try {
            const response = await axios.get(
                `/api/products?page=1&limit=20&search=${inputValue}`
            );
            return response.data.products.map((p) => ({
                value: p.id,
                label: `${p.sku} - ${p.name}`,
            }));
        } catch (err) {
            return [];
        }
    };
    
    // --- Handler Submit Utama ---
    const onSubmit = async (data) => {
        setIsSubmitting(true);
        
        // Cek kembali di client side: apakah ada perubahan yang valid?
        const isAdjustmentNeeded = parseInt(data.physicalCount) !== parseInt(systemCount);
        
        if (!isAdjustmentNeeded && parseInt(data.physicalCount) === parseInt(systemCount)) {
             toast.error('Hitungan fisik sama dengan stok sistem. Tidak ada penyesuaian yang diperlukan.');
             setIsSubmitting(false);
             return;
        }
        
        // Jika ada penyesuaian, lanjutkan pemrosesan
        try {
            const payload = {
                product_id: data.product.value,
                location_id: data.location.value,
                // Kuantitas penyesuaian adalah Physical - System
                adjustment_quantity: parseInt(data.physicalCount) - parseInt(systemCount), 
                physical_count: parseInt(data.physicalCount),
                system_count: parseInt(systemCount),
                notes: data.notes,
            };

            // Asumsi: Anda sudah membuat endpoint POST /api/stocks/opname
            // Jika belum ada, Anda perlu membuatnya di backend
            await axios.post('/api/stocks/opname', payload); 
            
            toast.success('Stok opname berhasil dicatat dan disesuaikan!');
            reset(); 
            setSystemCount(null); 

        } catch (err) {
            const errorMsg = err.response?.data?.msg || 'Gagal mencatat stok opname. Cek izin dan data.';
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));

    // Helper untuk menampilkan error
    const ErrorMessage = ({ error }) => {
        return error ? <p className="text-red-500 text-xs mt-1">{error.message}</p> : null;
    };

    // Tentukan apakah ada perbedaan stok
    const difference = parseInt(physicalCount || 0) - parseInt(systemCount || 0);
    const isDifference = difference !== 0;


    if (loadingMaster) {
        return <div className="p-6">Memuat data master...</div>;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">📋 Stock Opname (Penyesuaian Stok)</h1>

            <form onSubmit={handleSubmit(onSubmit)}>
                
                {/* --- SELEKSI BARANG & LOKASI --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-yellow-50">
                    
                    {/* 1. Produk */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Produk *</label>
                        <AsyncSelect
                            loadOptions={loadProductOptions}
                            defaultOptions
                            value={selectedProduct}
                            onChange={(option) => {
                                setValue('product', option, { shouldValidate: true });
                                // Reset count saat produk berubah
                                setSystemCount(null);
                                setValue('physicalCount', 0);
                            }}
                            placeholder="Cari Produk (SKU/Nama)..."
                            isClearable={true}
                        />
                        <ErrorMessage error={errors.product} />
                    </div>
                    
                    {/* 2. Lokasi */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi *</label>
                        <Select
                            options={locationOptions}
                            value={selectedLocation}
                            onChange={(option) => {
                                setValue('location', option, { shouldValidate: true });
                                // Reset count saat lokasi berubah
                                setSystemCount(null);
                                setValue('physicalCount', 0);
                            }}
                            placeholder="Pilih Lokasi"
                            isClearable={true}
                        />
                        <ErrorMessage error={errors.location} />
                    </div>
                </div>

                {/* --- HASIL HITUNGAN STOK (Hanya muncul jika Produk & Lokasi dipilih) --- */}
                {(selectedProduct && selectedLocation) && (
                    <div className="border p-4 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-bold mb-4">Hasil Verifikasi Stok</h2>
                        
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {/* Stok Sistem */}
                            <div className="bg-gray-100 p-3 rounded-md">
                                <p className="text-sm text-gray-600">Stok Tercatat (Sistem)</p>
                                <p className="text-3xl font-extrabold text-indigo-700 mt-1">{systemCount !== null ? systemCount : '...'}</p>
                            </div>

                            {/* Hitungan Fisik */}
                            <div className="bg-white p-3 rounded-md border border-gray-300">
                                <label className="text-sm font-bold text-gray-700 block mb-1">Hitungan Fisik *</label>
                                <input
                                    type="number"
                                    min="0"
                                    {...register('physicalCount', { valueAsNumber: true })}
                                    className={`w-full text-center text-2xl font-extrabold text-green-700 border-none focus:ring-0 ${errors.physicalCount ? 'border-red-500' : ''}`}
                                />
                                <ErrorMessage error={errors.physicalCount} />
                            </div>
                            
                            {/* Selisih */}
                            <div className={`p-3 rounded-md border-l-4 ${isDifference ? (difference > 0 ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500') : 'bg-gray-100 border-gray-300'}`}>
                                <p className="text-sm text-gray-600">Selisih (Penyesuaian)</p>
                                <p className={`text-3xl font-extrabold mt-1 ${difference > 0 ? 'text-green-700' : difference < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                                    {difference >= 0 ? `+${difference}` : difference}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Catatan (Conditional Required) */}
                {isDifference && (
                    <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Penyesuaian * (Wajib diisi karena ada selisih)</label>
                        <textarea 
                            {...register('notes')}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.notes ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        <ErrorMessage error={errors.notes} />
                    </div>
                )}
                
                {/* Tombol Submit */}
                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        disabled={isSubmitting || !selectedProduct || !selectedLocation || systemCount === null}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Memproses...' : 'Catat & Sesuaikan Stok'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default StockOpname;