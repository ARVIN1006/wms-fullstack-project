import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Select from 'react-select'; // Dropdown standar (untuk Lokasi/Supplier)
import AsyncSelect from 'react-select/async'; // Dropdown pencarian (untuk Produk)

function TransactionForm() {
  // State untuk data master (HANYA Lokasi & Supplier)
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // State untuk formulir
  const [transactionType, setTransactionType] = useState('IN');
  const [notes, setNotes] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [items, setItems] = useState([
    { product: null, location: null, quantity: 1 } 
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format data (HANYA Lokasi & Supplier)
  const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));

  // 1. Ambil data master (LEBIH RINGAN: Hapus 'products' dari sini)
  useEffect(() => {
    async function fetchMasterData() {
      try {
        setLoadingMaster(true);
        const [locationRes, supplierRes] = await Promise.all([
          axios.get('/api/locations'),
          axios.get('/api/suppliers?page=1&limit=1000&search=') // Ambil semua supplier
        ]);
        
        setLocations(locationRes.data);
        setSuppliers(supplierRes.data.suppliers);
      } catch (err) {
        if (err.response?.status !== 401) {
          toast.error("Gagal memuat data master. Coba refresh.");
        }
      } finally {
        setLoadingMaster(false);
      }
    }
    fetchMasterData();
  }, []); // Hanya berjalan sekali

  // --- 2. FUNGSI BARU: PENCARIAN PRODUK ASYNC ---
  // Fungsi ini akan dipanggil oleh AsyncSelect saat pengguna mengetik
  const loadProductOptions = async (inputValue) => {
    try {
      // Panggil API produk dengan query pencarian dari ketikan pengguna
      const response = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      
      // Ubah format datanya agar bisa dibaca react-select
      return response.data.products.map(p => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`
      }));
    } catch (err) {
      console.error("Gagal mencari produk:", err);
      return []; // Kembalikan array kosong jika error
    }
  };

  // 3. Fungsi-fungsi item
  const handleItemChange = (index, field, selectedOption) => {
    const newItems = [...items];
    newItems[index][field] = selectedOption;
    setItems(newItems);
  };
  
  const handleQtyChange = (index, value) => {
     const newItems = [...items];
     newItems[index].quantity = parseInt(value) || 1;
     setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { product: null, location: null, quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // 4. Fungsi Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validasi
    if (items.some(item => !item.product || !item.location || item.quantity <= 0)) {
      toast.error('Pastikan semua baris item terisi (Produk, Lokasi, Jumlah).');
      setIsSubmitting(false);
      return;
    }
    if (transactionType === 'IN' && !selectedSupplier) {
      toast.error('Pilih Supplier untuk transaksi Barang Masuk.');
      setIsSubmitting(false);
      return;
    }

    // Format data untuk API
    const formattedItems = items.map(item => ({
      product_id: item.product.value,
      location_id: item.location.value,
      quantity: item.quantity
    }));
    
    const payload = { 
      notes, 
      items: formattedItems,
      supplier_id: transactionType === 'IN' ? selectedSupplier.value : null 
    };
    
    const endpoint = transactionType === 'IN' ? '/api/transactions/in' : '/api/transactions/out';

    try {
      await axios.post(endpoint, payload);
      toast.success(`Transaksi berhasil dicatat!`);
      // Reset formulir
      setNotes('');
      setSelectedSupplier(null);
      setItems([{ product: null, location: null, quantity: 1 }]);
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Terjadi kesalahan saat menyimpan.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tampilan Loading
  if (loadingMaster) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg">
        <p className="text-gray-500 animate-pulse">Memuat data...</p>
      </div>
    );
  }

  // Tampilan Formulir Utama
  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Buat Transaksi Baru</h1>

      {/* Tipe Transaksi */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Transaksi</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setTransactionType('IN')}
            className={`py-2 px-4 rounded font-medium ${
              transactionType === 'IN' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📦 Barang Masuk
          </button>
          <button
            type="button"
            onClick={() => setTransactionType('OUT')}
            className={`py-2 px-4 rounded font-medium ${
              transactionType === 'OUT' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🚚 Barang Keluar
          </button>
        </div>
      </div>

      {/* Form Header (Supplier & Catatan) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Dropdown Supplier (Hanya muncul jika Barang Masuk) */}
        {transactionType === 'IN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier *</label>
            <Select
              options={supplierOptions}
              value={selectedSupplier}
              onChange={(option) => setSelectedSupplier(option)}
              placeholder="Pilih Supplier..."
              className="w-full mt-1"
              classNamePrefix="react-select"
            />
          </div>
        )}
        
        {/* Input Catatan */}
        <div className={transactionType === 'IN' ? '' : 'md:col-span-2'}>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Catatan (Misal: PO-123)
          </label>
          <input 
            type="text" 
            id="notes" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>


      {/* Daftar Item Dinamis */}
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Daftar Barang</h2>
      <div className="space-y-4 mb-4">
        {items.map((item, index) => (
          <div key={index} className="flex flex-wrap items-end gap-4 p-4 border rounded-md bg-gray-50">
            
            {/* Dropdown Produk (Async) */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700">Produk *</label>
              <AsyncSelect
                loadOptions={loadProductOptions} // Panggil fungsi pencari
                value={item.product}
                onChange={(selectedOption) => handleItemChange(index, 'product', selectedOption)}
                placeholder="Ketik untuk mencari..."
                className="w-full mt-1"
                classNamePrefix="react-select"
                cacheOptions // Simpan hasil pencarian
                defaultOptions // Tampilkan opsi default (pencarian kosong) saat pertama diklik
              />
            </div>
            
            {/* Dropdown Lokasi (Standar) */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700">Lokasi *</label>
              <Select
                options={locationOptions}
                value={item.location}
                onChange={(selectedOption) => handleItemChange(index, 'location', selectedOption)}
                placeholder="Pilih Lokasi..."
                className="w-full mt-1"
                classNamePrefix="react-select"
              />
            </div>

            {/* Input Jumlah */}
            <div className="flex-shrink-0 w-24">
              <label className="block text-sm font-medium text-gray-700">Jumlah *</label>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleQtyChange(index, e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                required
              />
            </div>
            
            {/* Tombol Hapus Baris */}
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="h-10 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded"
              >
                X
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tombol Tambah Baris */}
      <button
        type="button"
        onClick={handleAddItem}
        className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition"
      >
        + Tambah Baris Barang
      </button>

      {/* Tombol Submit */}
      <div className="border-t pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition disabled:bg-gray-400"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;