import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Select from 'react-select'; 
import AsyncSelect from 'react-select/async';

// Opsi Tipe Transaksi
const typeOptions = [
    { value: 'IN', label: 'Barang Masuk' },
    { value: 'OUT', label: 'Barang Keluar' },
];

function TransactionForm() {
  // Catatan: Asumsikan ID Lokasi Default (Rak A1) adalah 1
  const DEFAULT_IN_LOCATION_ID = 1; 

  // State untuk data master
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockStatuses, setStockStatuses] = useState([]); 
  const [loadingMaster, setLoadingMaster] = useState(true);

  // State untuk formulir
  const [transactionType, setTransactionType] = useState('IN');
  const [notes, setNotes] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [items, setItems] = useState([
    { 
      product: null, location: null, quantity: 1, 
      stockStatus: null,
      purchasePrice: 0, 
      sellingPrice: 0 
    } 
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format data
  const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));
  const statusOptions = stockStatuses.map(s => ({ value: s.id, label: s.name }));

  // 1. Ambil data master (Lokasi, Supplier, Status Stok)
  useEffect(() => {
    async function fetchMasterData() {
      try {
        setLoadingMaster(true);
        const [locationRes, supplierRes, statusRes] = await Promise.all([
          axios.get('/api/locations'),
          axios.get('/api/suppliers?page=1&limit=1000&search='),
          axios.get('/api/reports/stock-statuses') 
        ]);
        
        setLocations(locationRes.data);
        setSuppliers(supplierRes.data.suppliers);
        setStockStatuses(statusRes.data);
      } catch (err) {
        if (err.response?.status !== 401) {
          toast.error("Gagal memuat data master.");
        }
      } finally {
        setLoadingMaster(false);
      }
    }
    fetchMasterData();
  }, []);

  // --- 2. FUNGSI PENCARIAN PRODUK ASYNC ---
  const loadProductOptions = async (inputValue) => {
    try {
      // API produk harus mengembalikan purchasePrice dan sellingPrice
      const response = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      return response.data.products.map(p => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
        purchasePrice: parseFloat(p.purchase_price || 0), 
        sellingPrice: parseFloat(p.selling_price || 0) 
      }));
    } catch (err) {
      return []; 
    }
  };

  // --- 3. FUNGSI UTAMA PENGELOLAAN ITEM BARU ---
  const handleItemChange = (index, field, selectedOption) => {
    const newItems = [...items];
    newItems[index][field] = selectedOption;

    const goodStatus = statusOptions.find(s => s.value === 1); // Asumsi status 'Good' ID 1

    // LOGIKA OTOMATIS: Berjalan saat pengguna memilih PRODUK
    if (field === 'product' && selectedOption) {
        // 1. Isi Harga dan Status
        newItems[index].purchasePrice = selectedOption.purchasePrice;
        newItems[index].sellingPrice = selectedOption.sellingPrice;
        newItems[index].stockStatus = goodStatus || null;
        
        // 2. Logika Lokasi Otomatis
        const locationDefault = locationOptions.find(loc => loc.value === DEFAULT_IN_LOCATION_ID);
        newItems[index].location = locationDefault || null; 
    }
    
    setItems(newItems);
  };
  
  const handleQtyChange = (index, value) => {
     const newItems = [...items];
     newItems[index].quantity = parseInt(value) || 1;
     setItems(newItems);
  };
  
  // LOGIKA HARGA YANG DIPERBAIKI (Mencegah bug NaN)
  const handlePriceChange = (index, type, value) => {
     const newItems = [...items];
     // Menggunakan parseFloat untuk mendapatkan nilai numerik yang benar
     const numericValue = value === '' ? 0 : parseFloat(value);
     
     if (!isNaN(numericValue)) { 
         if (type === 'purchase') {
             newItems[index].purchasePrice = numericValue;
         } else {
             newItems[index].sellingPrice = numericValue;
         }
         setItems(newItems);
     }
  };

  const handleAddItem = () => {
    setItems([...items, { product: null, location: null, quantity: 1, stockStatus: null, purchasePrice: 0, sellingPrice: 0 }]);
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
    if (items.some(item => !item.product || !item.location || !item.stockStatus || item.quantity <= 0)) {
      toast.error('Pastikan semua baris item terisi (Produk, Lokasi, Status, Jumlah).');
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
      quantity: item.quantity,
      stock_status_id: item.stockStatus.value, // Kirim Status ID
      purchase_price: item.purchasePrice, // Kirim Harga Beli
      selling_price: item.sellingPrice // Kirim Harga Jual
    }));
    
    const payload = { 
      notes, 
      items: formattedItems,
      supplier_id: transactionType === 'IN' ? selectedSupplier?.value : null 
    };
    
    const endpoint = transactionType === 'IN' ? '/api/transactions/in' : '/api/transactions/out';

    try {
      await axios.post(endpoint, payload);
      toast.success(`Transaksi berhasil dicatat!`);
      
      // Reset formulir
      setNotes('');
      setSelectedSupplier(null);
      setItems([{ product: null, location: null, quantity: 1, stockStatus: null, purchasePrice: 0, sellingPrice: 0 }]);
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Gagal mencatat transaksi.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingMaster) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg">
        <p className="text-gray-500 animate-pulse">Memuat data master...</p>
      </div>
    );
  }

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
        {/* Dropdown Supplier */}
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
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
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
                loadOptions={loadProductOptions} 
                value={item.product}
                onChange={(selectedOption) => handleItemChange(index, 'product', selectedOption)}
                placeholder="Ketik untuk mencari..."
                className="w-full mt-1"
                classNamePrefix="react-select"
                cacheOptions 
                defaultOptions 
              />
            </div>
            
            {/* Dropdown Lokasi */}
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

            {/* Input Harga Transaksi (Override) */}
            <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga {transactionType === 'IN' ? 'Beli' : 'Jual'} Unit
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionType === 'IN' ? item.purchasePrice : item.sellingPrice}
                    onChange={(e) => handlePriceChange(index, transactionType === 'IN' ? 'purchase' : 'selling', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>

            {/* Dropdown Status Stok */}
            <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Stok *</label>
                <Select
                    options={statusOptions}
                    value={item.stockStatus}
                    onChange={(selectedOption) => handleItemChange(index, 'stockStatus', selectedOption)}
                    placeholder="Pilih Status..."
                    classNamePrefix="react-select"
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