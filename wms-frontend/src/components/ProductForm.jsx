import { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
// --- BARU: Import Hook Form dan Yup ---
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// --- DEFINISI SKEMA VALIDASI YUP ---
const validationSchema = yup.object().shape({
    sku: yup.string().required('SKU wajib diisi.'),
    name: yup.string().required('Nama Produk wajib diisi.'),
    unit: yup.string().required('Satuan wajib diisi.'),
    description: yup.string().nullable(),
    // Harga harus angka dan tidak boleh negatif
    purchasePrice: yup.number().typeError('Harga Beli harus angka.').min(0, 'Harga Beli tidak boleh negatif.').required('Harga Beli wajib diisi.'),
    sellingPrice: yup.number().typeError('Harga Jual harus angka.').min(0, 'Harga Jual tidak boleh negatif.').required('Harga Jual wajib diisi.'),
    mainSupplier: yup.object().nullable(),
    // Stok Awal: Transform string kosong menjadi 0, wajib >= 0
    initialStockQty: yup.number().transform((value, originalValue) => (originalValue === "" ? 0 : value)).min(0, 'Stok awal tidak boleh negatif.').required(),
    // Lokasi Awal wajib diisi hanya jika initialStockQty > 0
    initialLocation: yup.object().when('initialStockQty', {
        is: (qty) => qty > 0,
        then: (schema) => schema.nullable().required('Lokasi wajib diisi jika Stok Awal > 0.'),
        otherwise: (schema) => schema.nullable(),
    }),
});

function ProductForm({ onSave, onClose, productToEdit }) {
  // State Master Data
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // --- BARU: INISIALISASI REACT HOOK FORM ---
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
        sku: '',
        name: '',
        description: '',
        unit: '',
        purchasePrice: 0,
        sellingPrice: 0,
        mainSupplier: null,
        initialStockQty: 0,
        initialLocation: null,
    }
  });
  
  // Watch fields yang tidak menggunakan register (Select components)
  const initialLocation = watch('initialLocation');
  const mainSupplier = watch('mainSupplier');
  
  // Ambil data untuk opsi Select
  const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));

  // --- Ambil Data Master: Lokasi & Supplier ---
  useEffect(() => {
    let isMounted = true; 

    async function fetchMasterData() {
        try {
            const [locationRes, supplierRes] = await Promise.all([
                axios.get('/api/locations'),
                axios.get('/api/suppliers?page=1&limit=1000') 
            ]);
            if (isMounted) { 
                setLocations(locationRes.data);
                setSuppliers(supplierRes.data.suppliers);
                setLoadingMaster(false);
            }
        } catch (error) {
            if (isMounted) { 
                toast.error("Gagal memuat data master untuk form.");
                setLoadingMaster(false);
            }
        }
    }
    fetchMasterData();
    
    return () => { 
        isMounted = false;
    };
  }, []);

  // --- Efek Mengisi Form Saat Edit (FIXED DEPENDENCY) ---
  useEffect(() => {
    if (productToEdit) {
      setIsEditing(true);
      
      // Set RHF values (safe)
      setValue('sku', productToEdit.sku);
      setValue('name', productToEdit.name);
      setValue('description', productToEdit.description || '');
      setValue('unit', productToEdit.unit);
      setValue('purchasePrice', parseFloat(productToEdit.purchase_price || 0)); 
      setValue('sellingPrice', parseFloat(productToEdit.selling_price || 0));
      
      // Mengisi Dropdown Supplier Utama
      if (productToEdit.main_supplier_id && suppliers.length > 0) {
          // Cari opsi supplier dari array suppliers (yang sudah stabil)
          const defaultSupplier = suppliers.map(s => ({ value: s.id, label: s.name }))
                                         .find(s => s.value === productToEdit.main_supplier_id);
          setValue('mainSupplier', defaultSupplier || null);
      } else {
          setValue('mainSupplier', null);
      }
      
      // Reset initial stock fields
      setValue('initialStockQty', 0);
      setValue('initialLocation', null);
      
    } else {
        setIsEditing(false);
        // Reset RHF ke default values jika tidak editing
        setValue('sku', '');
        setValue('name', '');
        setValue('description', '');
        setValue('unit', '');
        setValue('purchasePrice', 0);
        setValue('sellingPrice', 0);
        setValue('mainSupplier', null);
        setValue('initialStockQty', 0);
        setValue('initialLocation', null);
    }
  // FIX UTAMA: Menghapus 'supplierOptions' dari dependency array.
  // Hanya mempertahankan productToEdit, suppliers (state), dan setValue (stable hook function).
  }, [productToEdit, suppliers, setValue]); 

  // Fungsi saat tombol Simpan diklik (Menggunakan RHF handleSubmit)
  const onSubmit = (data) => {
    
    // Kirim data lengkap
    onSave({ 
      id: productToEdit?.id, 
      sku: data.sku, 
      name: data.name, 
      description: data.description, 
      unit: data.unit,
      purchase_price: parseFloat(data.purchasePrice), 
      selling_price: parseFloat(data.sellingPrice),
      main_supplier_id: data.mainSupplier?.value || null, 
      
      // Kirim Stok Awal hanya jika mode CREATE
      initial_stock_qty: isEditing ? 0 : data.initialStockQty, 
      initial_location_id: isEditing ? null : data.initialLocation?.value, 
    });
  };

  if (loadingMaster) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl"><p className="text-gray-600">Memuat data master...</p></div>
        </div>
      );
  }

  // Helper untuk menampilkan error
  const ErrorMessage = ({ error }) => {
    return error ? <p className="text-red-500 text-xs mt-1">{error.message}</p> : null;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h2>
        
        {/* GUNAKAN handleSubmit dari RHF */}
        <form onSubmit={handleSubmit(onSubmit)}> 
          
          <h3 className="text-lg font-semibold mb-3 border-t pt-3">Data Dasar</h3>
          
          {/* SKU */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Kode Unik) *</label>
            {/* Menggunakan {...register} */}
            <input type="text" {...register('sku')} className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.sku ? 'border-red-500' : 'border-gray-300'}`} />
            <ErrorMessage error={errors.sku} />
          </div>

          {/* Nama Produk */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
            <input type="text" {...register('name')} className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
            <ErrorMessage error={errors.name} />
          </div>

          {/* Satuan */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan (cth: pcs, unit, kg) *</label>
            <input type="text" {...register('unit')} className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.unit ? 'border-red-500' : 'border-gray-300'}`} />
            <ErrorMessage error={errors.unit} />
          </div>
          
          {/* Deskripsi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea {...register('description')} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
          </div>
          
          {/* Input Harga */}
          <h3 className="text-lg font-semibold mt-6 mb-3 border-t pt-3">Data Finansial & Supplier</h3>

          {/* Supplier Utama */}
          <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Utama (Opsional)</label>
              {/* Select menggunakan setValue RHF */}
              <Select
                  options={supplierOptions}
                  value={mainSupplier}
                  onChange={(option) => setValue('mainSupplier', option)} 
                  className="w-full mt-1"
                  classNamePrefix="react-select"
                  placeholder="Pilih Supplier Utama..."
              />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Harga Beli */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Beli / Unit</label>
              <input
                type="number" step="0.01" min="0" {...register('purchasePrice')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.purchasePrice ? 'border-red-500' : 'border-gray-300'}`}
              />
              <ErrorMessage error={errors.purchasePrice} />
            </div>
            {/* Harga Jual */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual / Unit</label>
              <input
                type="number" step="0.01" min="0" {...register('sellingPrice')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.sellingPrice ? 'border-red-500' : 'border-gray-300'}`}
              />
              <ErrorMessage error={errors.sellingPrice} />
            </div>
          </div>
          
          {/* Input Stok Awal (Hanya muncul saat CREATE) */}
          {!isEditing && (
              <>
                  <h3 className="text-lg font-semibold mt-6 mb-3 border-t pt-3 text-blue-600">Stok Awal (Opsional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                      {/* Jumlah Stok */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Stok Awal</label>
                          <input
                              type="number" min="0" {...register('initialStockQty')}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.initialStockQty ? 'border-red-500' : 'border-gray-300'}`}
                          />
                          <ErrorMessage error={errors.initialStockQty} />
                      </div>
                      {/* Lokasi Stok */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Disimpan di Lokasi</label>
                          {/* Select menggunakan setValue RHF */}
                          <Select
                              options={locationOptions}
                              value={initialLocation}
                              onChange={(option) => setValue('initialLocation', option)} 
                              className={`w-full mt-1 ${errors.initialLocation ? 'border-red-500' : ''}`}
                              classNamePrefix="react-select"
                          />
                          <ErrorMessage error={errors.initialLocation} />
                      </div>
                  </div>
              </>
          )}

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-4 mt-6 border-t pt-4">
            <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Batal
            </button>
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;