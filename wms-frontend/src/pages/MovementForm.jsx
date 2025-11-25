import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
// --- BARU: Import Hook Form dan Yup ---
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// --- DEFINISI SKEMA VALIDASI YUP ---
const validationSchema = yup.object().shape({
    product: yup.object().nullable().required('Produk wajib dipilih.'),
    fromLocation: yup.object().nullable().required('Lokasi Asal wajib dipilih.')
        .test(
            'not-same-as-to',
            'Lokasi Asal tidak boleh sama dengan Lokasi Tujuan.',
            function(value) {
                return value?.value !== this.parent.toLocation?.value;
            }
        ),
    toLocation: yup.object().nullable().required('Lokasi Tujuan wajib dipilih.')
        .test(
            'not-same-as-from',
            'Lokasi Tujuan tidak boleh sama dengan Lokasi Asal.',
            function(value) {
                return value?.value !== this.parent.fromLocation?.value;
            }
        ),
    quantity: yup.number()
        .typeError('Jumlah harus berupa angka.')
        .min(1, 'Jumlah minimal harus 1.')
        .required('Jumlah wajib diisi.')
        .test(
            'check-available-stock',
            'Jumlah melebihi stok yang tersedia di Lokasi Asal.',
            function(value) {
                // Gunakan availableStock dari state lokal yang telah diperbarui
                const { availableStock } = this.options.context;
                if (!availableStock && value > 0) return false;
                return value <= availableStock;
            }
        ),
    reason: yup.string().required('Alasan perpindahan wajib diisi.'),
});
// --- END SKEMA ---

function MovementForm() {
    const navigate = useNavigate();
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableStock, setAvailableStock] = useState(0); // State untuk stok yang tersedia

    // --- BARU: INISIALISASI REACT HOOK FORM dengan context ---
    const { 
        register, 
        handleSubmit, 
        setValue, 
        watch, 
        formState: { errors },
        setError, // Untuk error kustom
        clearErrors, // Untuk menghapus error
    } = useForm({
        resolver: yupResolver(validationSchema),
        context: { availableStock }, // Kirim availableStock ke Yup
        defaultValues: {
            product: null,
            fromLocation: null,
            toLocation: null,
            quantity: 1,
            reason: '',
        }
    });

    // Watch values dari RHF
    const selectedProduct = watch('product');
    const selectedFromLocation = watch('fromLocation');
    const quantity = watch('quantity');
    
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
                if (isMounted) setLoading(false);
            }
        }
        fetchLocations();
        return () => { isMounted = false; };
    }, []);

    // --- Efek untuk mengecek stok yang tersedia (REAL-TIME) ---
    const checkStock = useCallback(async () => {
        if (selectedProduct && selectedFromLocation) {
            try {
                const res = await axios.get(
                    `/api/products/${selectedProduct.value}/main-stock?locationId=${selectedFromLocation.value}`
                );
                const currentStock = res.data.total_quantity || 0;
                setAvailableStock(currentStock); 

                // Periksa validasi kustom (stok cukup)
                if (quantity > currentStock) {
                    setError('quantity', {
                        type: 'manual',
                        message: `Stok tersedia: ${currentStock} unit. Jumlah perpindahan melebihi stok.`,
                    });
                } else {
                    // Hapus error jika stok kembali cukup
                    clearErrors('quantity');
                }
            } catch (err) {
                setAvailableStock(0);
                setError('quantity', {
                    type: 'manual',
                    message: 'Gagal mendapatkan stok lokasi asal.',
                });
            }
        } else {
            setAvailableStock(0);
            clearErrors('quantity');
        }
    }, [selectedProduct, selectedFromLocation, quantity, setError, clearErrors]);

    // Panggil checkStock saat Product, Location, atau Quantity berubah
    useEffect(() => {
        checkStock();
    }, [checkStock]);


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
    
    // --- Fungsi Submit Utama ---
    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                product_id: data.product.value,
                from_location_id: data.fromLocation.value,
                to_location_id: data.toLocation.value,
                quantity: parseInt(data.quantity),
                reason: data.reason,
            };

            await axios.post('/api/movements', payload);
            toast.success('Perpindahan stok berhasil dicatat!');
            navigate('/movements'); 

        } catch (err) {
            const errorMsg = err.response?.data?.msg || 'Gagal mencatat perpindahan stok.';
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


    if (loading) {
        return <div className="p-6">Memuat data master...</div>;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">🔄 Form Perpindahan Stok</h1>

            <form onSubmit={handleSubmit(onSubmit)}>
                
                {/* Produk */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Produk *</label>
                    <AsyncSelect
                        loadOptions={loadProductOptions}
                        defaultOptions
                        value={selectedProduct}
                        onChange={(option) => setValue('product', option, { shouldValidate: true })}
                        placeholder="Ketik untuk mencari produk..."
                        isClearable={true}
                    />
                    <ErrorMessage error={errors.product} />
                </div>
                
                {/* Lokasi Asal */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dari Lokasi *</label>
                        <Select
                            options={locationOptions}
                            value={selectedFromLocation}
                            onChange={(option) => setValue('fromLocation', option, { shouldValidate: true })}
                            placeholder="Pilih Lokasi Asal"
                            isClearable={true}
                        />
                        <ErrorMessage error={errors.fromLocation} />
                    </div>
                    
                    {/* Lokasi Tujuan */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ke Lokasi *</label>
                        <Select
                            options={locationOptions}
                            value={watch('toLocation')}
                            onChange={(option) => setValue('toLocation', option, { shouldValidate: true })}
                            placeholder="Pilih Lokasi Tujuan"
                            isClearable={true}
                        />
                        <ErrorMessage error={errors.toLocation} />
                    </div>
                </div>

                {/* Stok Tersedia dan Jumlah Pindah */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                        <p className="text-sm font-medium text-yellow-700">Stok Tersedia di Asal:</p>
                        <p className="text-xl font-bold text-yellow-800">{availableStock} Unit</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pindah *</label>
                        <input 
                            type="number" 
                            min="1" 
                            {...register('quantity', { valueAsNumber: true })} 
                            className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.quantity ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        <ErrorMessage error={errors.quantity} />
                    </div>
                </div>
                
                {/* Alasan */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Perpindahan *</label>
                    <textarea 
                        {...register('reason')}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.reason ? 'border-red-500' : 'border-gray-300'}`} 
                    />
                    <ErrorMessage error={errors.reason} />
                </div>
                
                {/* Tombol Submit */}
                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Memproses...' : 'Catat Perpindahan'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default MovementForm;