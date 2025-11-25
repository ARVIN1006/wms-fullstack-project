import { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select'; // Wajib untuk dropdown lokasi dan supplier
import { toast } from 'react-hot-toast';

function ProductForm({ onSave, onClose, productToEdit }) {
  // State Master Data
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // State Form Utama
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(0); 
  const [sellingPrice, setSellingPrice] = useState(0); 
  const [mainSupplier, setMainSupplier] = useState(null); // <-- BARU: Supplier Utama

  // State Stok Awal (Hanya untuk CREATE)
  const [initialStockQty, setInitialStockQty] = useState(0); 
  const [initialLocation, setInitialLocation] = useState(null); 
  const [isEditing, setIsEditing] = useState(false);

  // Format data untuk react-select
  const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));

  // --- Ambil Data Master: Lokasi & Supplier ---
  useEffect(() => {
    let isMounted = true; // BARU: Flag untuk cleanup

    async function fetchMasterData() {
        try {
            const [locationRes, supplierRes] = await Promise.all([
                axios.get('/api/locations'),
                axios.get('/api/suppliers?page=1&limit=1000') 
            ]);
            if (isMounted) { // Cek sebelum set state
                setLocations(locationRes.data);
                setSuppliers(supplierRes.data.suppliers);
                setLoadingMaster(false);
            }
        } catch (error) {
            if (isMounted) { // Cek sebelum set state
                toast.error("Gagal memuat data master untuk form.");
                setLoadingMaster(false);
            }
        }
    }
    fetchMasterData();
    
    return () => { // Fungsi Cleanup
        isMounted = false;
    };
  }, []);

  // --- Efek Mengisi Form Saat Edit ---
  useEffect(() => {
    if (productToEdit) {
      setIsEditing(true);
      setSku(productToEdit.sku);
      setName(productToEdit.name);
      setDescription(productToEdit.description || '');
      setUnit(productToEdit.unit);
      setPurchasePrice(productToEdit.purchase_price || 0); 
      setSellingPrice(productToEdit.selling_price || 0);
      
      // Mengisi Dropdown Supplier Utama
      if (productToEdit.main_supplier_id) {
          // Harus menggunakan suppliers state yang sudah terisi
          const defaultSupplier = suppliers.find(s => s.value === productToEdit.main_supplier_id);
          setMainSupplier(defaultSupplier || null);
      } else {
          setMainSupplier(null);
      }
      
    } else {
        setIsEditing(false);
        // Reset state stok/lokasi saat CREATE baru
        setInitialStockQty(0);
        setInitialLocation(null);
        setMainSupplier(null);
    }
  }, [productToEdit, suppliers]); // Dependency 'suppliers' agar dropdown terisi saat data supplier datang
  
  // Fungsi saat tombol Simpan diklik
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sku || !name || !unit) {
      alert('SKU, Nama, dan Satuan wajib diisi!');
      return;
    }
    
    // Validasi Stok Awal: Hanya jika CREATE
    if (!isEditing && (initialStockQty > 0 && !initialLocation)) {
        alert('Jika mengisi Stok Awal, Lokasi juga wajib diisi.');
        return;
    }
    
    // Kirim data lengkap
    onSave({ 
      id: productToEdit?.id, 
      sku, 
      name, 
      description, 
      unit,
      purchase_price: parseFloat(purchasePrice), // Pastikan format number
      selling_price: parseFloat(sellingPrice),  // Pastikan format number
      main_supplier_id: mainSupplier?.value || null, // KIRIM ID SUPPLIER
      
      // Kirim Stok Awal hanya jika mode CREATE
      initial_stock_qty: isEditing ? 0 : initialStockQty, 
      initial_location_id: isEditing ? null : initialLocation?.value, 
    });
  };

  if (loadingMaster) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl"><p className="text-gray-600">Memuat data master...</p></div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          
          <h3 className="text-lg font-semibold mb-3 border-t pt-3">Data Dasar</h3>
          
          {/* SKU */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Kode Unik) *</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
          </div>

          {/* Nama Produk */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
          </div>

          {/* Satuan */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan (cth: pcs, unit, kg) *</label>
            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
          </div>
          
          {/* Deskripsi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
          </div>
          
          {/* Input Harga */}
          <h3 className="text-lg font-semibold mt-6 mb-3 border-t pt-3">Data Finansial & Supplier</h3>

          {/* Supplier Utama */}
          <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Utama (Opsional)</label>
              <Select
                  options={supplierOptions}
                  value={mainSupplier}
                  onChange={setMainSupplier}
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
                type="number" step="0.01" min="0" value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            {/* Harga Jual */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual / Unit</label>
              <input
                type="number" step="0.01" min="0" value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
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
                              type="number" min="0" value={initialStockQty}
                              onChange={(e) => setInitialStockQty(parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                          />
                      </div>
                      {/* Lokasi Stok */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Disimpan di Lokasi</label>
                          <Select
                              options={locationOptions}
                              value={initialLocation}
                              onChange={setInitialLocation}
                              className="w-full mt-1"
                              classNamePrefix="react-select"
                          />
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