import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
// --- BARU: Import Hook Form dan Yup ---
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Helper untuk format mata uang
const formatCurrency = (amount) => {
    return `Rp ${parseFloat(amount || 0).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
};

// --- DEFINISI SKEMA VALIDASI YUP ---
// Skema untuk setiap item baris
const itemSchema = yup.object().shape({
    product: yup.object().nullable().required('Pilih produk.'),
    location: yup.object().nullable().required('Pilih lokasi.'),
    stockStatus: yup.object().nullable().required('Pilih status stok.'),
    quantity: yup.number()
        .typeError('Jumlah harus angka.')
        .min(1, 'Min. 1 unit.')
        .required('Wajib diisi.'),
    purchasePrice: yup.number().typeError('Harga beli harus angka.').min(0, 'Min. Rp 0.')
        .when('transactionType', { // Wajib untuk IN
            is: 'IN',
            then: (schema) => schema.required('Harga beli wajib untuk IN.'),
            otherwise: (schema) => schema.nullable(),
        }),
    sellingPrice: yup.number().typeError('Harga jual harus angka.').min(0, 'Min. Rp 0.')
        .when('transactionType', { // Wajib untuk OUT
            is: 'OUT',
            then: (schema) => schema.required('Harga jual wajib untuk OUT.'),
            otherwise: (schema) => schema.nullable(),
        }),
    batchNumber: yup.string().nullable(),
    expiryDate: yup.string().nullable(),
});

// Skema untuk seluruh formulir
const validationSchema = yup.object().shape({
    transactionType: yup.string().required(), // IN atau OUT
    notes: yup.string().nullable(),
    
    // Header Wajib: Supplier untuk IN, Customer untuk OUT
    supplier: yup.object().when('transactionType', {
        is: 'IN',
        then: (schema) => schema.nullable().required('Supplier wajib dipilih untuk Barang Masuk.'),
        otherwise: (schema) => schema.nullable(),
    }),
    customer: yup.object().when('transactionType', {
        is: 'OUT',
        then: (schema) => schema.nullable().required('Pelanggan wajib dipilih untuk Barang Keluar.'),
        otherwise: (schema) => schema.nullable(),
    }),
    
    // BARU: Filter Kategori (hanya untuk state UI)
    categoryFilter: yup.object().nullable(),
    
    // Array Item
    items: yup.array().of(itemSchema).min(1, 'Minimal harus ada 1 item transaksi.'),
});
// --- END SKEMA ---

function TransactionForm() {
    const navigate = useNavigate();
    const { type: urlType } = useParams(); // 'in' atau 'out'
    const transactionType = urlType?.toUpperCase(); 

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locations, setLocations] = useState([]);
    const [stockStatuses, setStockStatuses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [categories, setCategories] = useState([]); // BARU: State Kategori
    const [loadingMaster, setLoadingMaster] = useState(true);
    const [itemStockInfo, setItemStockInfo] = useState({}); // {itemIndex: {availableStock: X, currentAvgCost: Y}}
    
    // --- RHF Hook ---
    const { 
        register, 
        handleSubmit, 
        control, 
        setValue, 
        watch,
        getValues,
        setError,
        clearErrors,
        formState: { errors } 
    } = useForm({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            transactionType: transactionType,
            notes: '',
            supplier: null,
            customer: null,
            categoryFilter: null, // BARU: Default filter
            items: [],
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items',
    });

    const watchedItems = watch('items'); // Watch items array
    const selectedCategoryFilter = watch('categoryFilter'); // BARU: Watch filter kategori
    
    // --- Data Master & Options ---
    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
    const statusOptions = stockStatuses.map(s => ({ value: s.id, label: s.name }));
    const partyOptions = transactionType === 'IN' 
        ? suppliers.map(s => ({ value: s.id, label: s.name })) 
        : customers.map(c => ({ value: c.id, label: c.name }));
    const categoryOptions = [ // BARU: Opsi Kategori
        { value: '', label: 'Semua Kategori' },
        ...categories.map(c => ({ value: c.id, label: c.name }))
    ];


    // --- Fetch Stock Info (Stok Tersedia & HPP) ---
    const fetchStockInfo = useCallback(async (index, productId, locationId) => {
        if (!productId || !locationId || transactionType === 'IN') return;

        try {
            const res = await axios.get(
                `/api/products/${productId}/main-stock?locationId=${locationId}`
            );
            const info = res.data;
            setItemStockInfo(prev => ({
                ...prev,
                [index]: {
                    availableStock: info.total_quantity || 0,
                    currentAvgCost: info.average_cost || 0,
                    sellingPrice: info.selling_price || 0,
                }
            }));
            // Jika transaksi OUT, auto-fill harga jual dari master
            setValue(`items.${index}.sellingPrice`, info.selling_price || 0);

        } catch (err) {
            setItemStockInfo(prev => ({ ...prev, [index]: { availableStock: 0, currentAvgCost: 0, sellingPrice: 0 } }));
        }
    }, [transactionType, setValue]);

    // --- Efek Cek Stok Kritis (dipicu oleh perubahan item/kuantitas) ---
    useEffect(() => {
        if (transactionType === 'OUT' && !loadingMaster) {
            watchedItems.forEach((item, index) => {
                const stockInfo = itemStockInfo[index];
                const requestedQty = item.quantity;
                const availableQty = stockInfo?.availableStock || 0;
                
                // Cek Stok Kritis
                if (item.product && item.location && requestedQty > availableQty) {
                    setError(`items.${index}.quantity`, {
                        type: 'manual',
                        message: `Stok tidak cukup (${availableQty} unit tersedia).`,
                    });
                } else if (item.product && item.location && errors.items?.[index]?.quantity?.type === 'manual') {
                    // Hapus error manual jika stok kembali cukup
                    clearErrors(`items.${index}.quantity`);
                }
                
                // Cek HPP/Harga Jual wajib diisi (untuk laporan)
                if (!item.sellingPrice && transactionType === 'OUT') {
                     setError(`items.${index}.sellingPrice`, {
                        type: 'manual',
                        message: `Harga Jual wajib diisi.`
                    });
                }
            });
        }
    }, [watchedItems, itemStockInfo, transactionType, clearErrors, setError, loadingMaster]);


    // --- Fetch Master Data Awal ---
    useEffect(() => {
        let isMounted = true;
        async function fetchMasterData() {
            try {
                const [locRes, statusRes, suppRes, custRes, catRes] = await Promise.all([
                    axios.get('/api/locations'),
                    axios.get('/api/reports/stock-statuses'),
                    axios.get('/api/suppliers?page=1&limit=1000'),
                    axios.get('/api/customers?page=1&limit=1000'),
                    axios.get('/api/products/categories'), // BARU: Fetch Kategori
                ]);

                if (isMounted) {
                    setLocations(locRes.data);
                    setStockStatuses(statusRes.data);
                    setSuppliers(suppRes.data.suppliers);
                    setCustomers(custRes.data.customers);
                    setCategories(catRes.data); // BARU: Set Kategori
                }
            } catch (error) {
                if (isMounted) toast.error("Gagal memuat data master.");
            } finally {
                if (isMounted) setLoadingMaster(false);
            }
        }
        fetchMasterData();
        return () => { isMounted = false; };
    }, []);

    // --- Handler Submit Utama ---
    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Mapping data item ke format yang diterima backend
            const finalItems = data.items.map((item, index) => {
                // Ambil HPP Rata-rata dari state untuk transaksi OUT
                const avgCost = transactionType === 'OUT' ? itemStockInfo[index]?.currentAvgCost : null;
                
                return {
                    product_id: item.product.value,
                    location_id: item.location.value,
                    quantity: parseInt(item.quantity),
                    stock_status_id: item.stockStatus.value,
                    batch_number: item.batchNumber || null,
                    expiry_date: item.expiryDate || null,
                    // Harga untuk Backend
                    purchase_price: item.purchasePrice || avgCost, // Harga Beli untuk IN, AvgCost untuk OUT
                    selling_price: item.sellingPrice,
                };
            });

            const payload = {
                notes: data.notes,
                items: finalItems,
                supplier_id: data.supplier?.value || null,
                customer_id: data.customer?.value || null,
            };

            const endpoint = transactionType === 'IN' ? '/api/transactions/in' : '/api/transactions/out';
            await axios.post(endpoint, payload);

            toast.success(`Transaksi ${transactionType === 'IN' ? 'Masuk' : 'Keluar'} berhasil dicatat!`);
            navigate('/transactions');

        } catch (err) {
            const errorMsg = err.response?.data?.msg || `Gagal mencatat transaksi ${transactionType}.`;
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Fungsi pencarian produk untuk AsyncSelect (FILTERED) ---
    const loadProductOptions = async (inputValue) => {
        const categoryId = getValues('categoryFilter')?.value || ''; // BARU: Ambil nilai filter kategori
        try {
            const response = await axios.get(
                `/api/products?page=1&limit=20&search=${inputValue}&categoryId=${categoryId}` // BARU: Kirim categoryId ke API
            );
            return response.data.products.map((p) => ({
                value: p.id,
                label: `${p.sku} - ${p.name}`,
                purchasePrice: parseFloat(p.purchase_price),
                sellingPrice: parseFloat(p.selling_price),
            }));
        } catch (err) {
            return [];
        }
    };

    if (loadingMaster) {
        return <div className="p-6">Memuat data master...</div>;
    }
    
    // Helper untuk menampilkan error RHF
    const ErrorMessage = ({ error }) => {
        return error ? <p className="text-red-500 text-xs mt-1">{error.message}</p> : null;
    };


    return (
        <div className="p-6 bg-white shadow-lg rounded-lg max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
                {transactionType === 'IN' ? '📥 Transaksi Barang Masuk' : '📤 Transaksi Barang Keluar'}
            </h1>

            <form onSubmit={handleSubmit(onSubmit)}>
                
                {/* --- HEADER TRANSAKSI --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
                    
                    {/* Tipe Transaksi & Operator (Hidden Input) */}
                    <input type="hidden" {...register('transactionType')} />
                    
                    {/* Supplier (IN) atau Customer (OUT) */}
                    <div className='col-span-1'>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {transactionType === 'IN' ? 'Pilih Supplier *' : 'Pilih Pelanggan *'}
                        </label>
                        <Select
                            options={partyOptions}
                            value={transactionType === 'IN' ? watch('supplier') : watch('customer')}
                            onChange={(option) => {
                                const field = transactionType === 'IN' ? 'supplier' : 'customer';
                                setValue(field, option, { shouldValidate: true });
                            }}
                            placeholder={`Pilih ${transactionType === 'IN' ? 'Supplier' : 'Pelanggan'}...`}
                            isClearable={true}
                        />
                        {/* Menampilkan error header */}
                        <ErrorMessage error={transactionType === 'IN' ? errors.supplier : errors.customer} />
                    </div>

                    {/* Catatan Transaksi */}
                    <div className='col-span-2'>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                        <textarea 
                            {...register('notes')}
                            className="w-full px-3 py-2 border rounded-md shadow-sm"
                        />
                    </div>
                </div>

                {/* --- FILTER KATEGORI (BARU) --- */}
                <div className='mb-6 p-4 border rounded-lg bg-gray-50'>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter Produk Berdasarkan Kategori</label>
                    <Select
                        options={categoryOptions}
                        value={selectedCategoryFilter}
                        onChange={(option) => setValue('categoryFilter', option)}
                        placeholder="Semua Kategori"
                        isClearable={true}
                    />
                </div>

                {/* --- ITEM BARIS (FIELD ARRAY) --- */}
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Detail Item Transaksi</h2>
                
                {errors.items && <p className="text-red-500 text-sm mb-4">Minimal harus ada 1 item transaksi.</p>}

                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg mb-4 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-semibold text-blue-600">Item #{index + 1}</h3>
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-500 hover:text-red-700 font-bold"
                            >
                                Hapus
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            {/* 1. Produk */}
                            <div className="col-span-4">
                                <label className="block text-xs font-medium text-gray-700">Produk *</label>
                                <AsyncSelect
                                    loadOptions={loadProductOptions}
                                    defaultOptions
                                    value={watchedItems[index]?.product}
                                    onChange={(option) => {
                                        setValue(`items.${index}.product`, option, { shouldValidate: true });
                                        // Auto-fill harga berdasarkan tipe transaksi
                                        if (transactionType === 'IN') {
                                            setValue(`items.${index}.purchasePrice`, option?.purchasePrice || 0);
                                        } else if (transactionType === 'OUT') {
                                             fetchStockInfo(index, option?.value, watchedItems[index]?.location?.value);
                                        }
                                    }}
                                    placeholder="Cari Produk..."
                                    classNamePrefix="react-select"
                                />
                                <ErrorMessage error={errors.items?.[index]?.product} />
                            </div>

                            {/* 2. Lokasi */}
                            <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-700">Lokasi *</label>
                                <Select
                                    options={locationOptions}
                                    value={watchedItems[index]?.location}
                                    onChange={(option) => {
                                        setValue(`items.${index}.location`, option, { shouldValidate: true });
                                        fetchStockInfo(index, watchedItems[index]?.product?.value, option?.value);
                                    }}
                                    placeholder="Pilih Lokasi"
                                    classNamePrefix="react-select"
                                />
                                <ErrorMessage error={errors.items?.[index]?.location} />
                            </div>
                            
                            {/* 3. Status Stok */}
                            <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-700">Status Stok *</label>
                                <Select
                                    options={statusOptions}
                                    value={watchedItems[index]?.stockStatus}
                                    onChange={(option) => setValue(`items.${index}.stockStatus`, option, { shouldValidate: true })}
                                    placeholder="Pilih Status"
                                    classNamePrefix="react-select"
                                />
                                <ErrorMessage error={errors.items?.[index]?.stockStatus} />
                            </div>

                            {/* 4. Kuantitas */}
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700">Jumlah *</label>
                                <input
                                    type="number"
                                    min="1"
                                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.items?.[index]?.quantity ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                <ErrorMessage error={errors.items?.[index]?.quantity} />
                                {/* Tampilkan stok tersedia untuk OUT */}
                                {transactionType === 'OUT' && (
                                     <p className="text-xs text-yellow-700 mt-1">
                                        Stok Asal: {itemStockInfo[index]?.availableStock || 0} unit
                                    </p>
                                )}
                            </div>

                            {/* --- HARGA (Kondisional) --- */}

                            {/* 5A. Harga Beli (Hanya untuk IN) */}
                            {transactionType === 'IN' && (
                                <div className="col-span-4">
                                    <label className="block text-xs font-medium text-gray-700">Harga Beli / Unit *</label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        {...register(`items.${index}.purchasePrice`, { valueAsNumber: true })}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.items?.[index]?.purchasePrice ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    <ErrorMessage error={errors.items?.[index]?.purchasePrice} />
                                </div>
                            )}

                             {/* 5B. Harga Jual (Hanya untuk OUT) */}
                            {transactionType === 'OUT' && (
                                <div className="col-span-4">
                                    <label className="block text-xs font-medium text-gray-700">Harga Jual / Unit *</label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        {...register(`items.${index}.sellingPrice`, { valueAsNumber: true })}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.items?.[index]?.sellingPrice ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    <ErrorMessage error={errors.items?.[index]?.sellingPrice} />
                                     <p className="text-xs text-green-700 mt-1">
                                        HPP Avg: {formatCurrency(itemStockInfo[index]?.currentAvgCost)}
                                    </p>
                                </div>
                            )}
                            
                            {/* 6. Batch Number */}
                            <div className="col-span-4">
                                <label className="block text-xs font-medium text-gray-700">Batch Number</label>
                                <input
                                    type="text"
                                    {...register(`items.${index}.batchNumber`)}
                                    className="w-full px-3 py-2 border rounded-md shadow-sm"
                                />
                            </div>

                            {/* 7. Expiry Date */}
                            <div className="col-span-4">
                                <label className="block text-xs font-medium text-gray-700">Expiry Date</label>
                                <input
                                    type="date"
                                    {...register(`items.${index}.expiryDate`)}
                                    className="w-full px-3 py-2 border rounded-md shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Tombol Tambah Item */}
                <button
                    type="button"
                    onClick={() => append({ 
                        product: null, 
                        location: null, 
                        stockStatus: statusOptions.find(s => s.label === 'Good') || null, 
                        quantity: 1, 
                        purchasePrice: 0, 
                        sellingPrice: 0, 
                        batchNumber: '', 
                        expiryDate: '',
                        transactionType: transactionType // Pass type to item schema
                    })}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition mb-6"
                >
                    + Tambah Item
                </button>

                {/* --- FOOTER / SUBMIT --- */}
                <div className="flex justify-end mt-6 border-t pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting || fields.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Memproses...' : `Catat Transaksi ${transactionType}`}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default TransactionForm;