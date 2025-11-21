import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Select from 'react-select'; // Dropdown standar (untuk Lokasi/Reason)
import AsyncSelect from 'react-select/async'; // Dropdown pencarian (untuk Produk)
import { useAuth } from '../context/AuthContext'; // Untuk user ID operator

// Opsi alasan perpindahan
const reasonOptions = [
  { value: 'Reorganisasi', label: 'Reorganisasi Gudang' },
  { value: 'Koreksi', label: 'Koreksi Stok' },
  { value: 'QA', label: 'Pemeriksaan Kualitas (QA)' },
  { value: 'Lainnya', label: 'Lainnya' },
];

function MovementForm() {
  const [locations, setLocations] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // State Formulir
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(reasonOptions[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { userRole } = useAuth(); // Ambil role untuk cek izin
  const isAllowed = userRole === 'admin' || userRole === 'staff'; // Cek izin

  // Format data
  const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));

  // Ambil data master (Lokasi)
  useEffect(() => {
    let isMounted = true; // BARU: Flag untuk cleanup

    async function fetchLocations() {
      try {
        const response = await axios.get('/api/locations');
        if (isMounted) { // Cek sebelum set state
          setLocations(response.data);
        }
      } catch (err) {
        if (isMounted && err.response?.status !== 401) {
          toast.error("Gagal memuat data lokasi.");
        }
      } finally {
        if (isMounted) setLoadingMaster(false); // Cek sebelum set state
      }
    }
    fetchLocations();

    return () => {
      isMounted = false; // Cleanup function
    };
  }, []);

  // Fungsi Pencarian Produk Asynchronous
  const loadProductOptions = async (inputValue) => {
    try {
      const response = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      return response.data.products.map(p => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`
      }));
    } catch (err) {
      console.error("Gagal mencari produk:", err);
      return [];
    }
  };

  // --- HANDLER UTAMA UNTUK PRODUK (Memicu Auto-Fill) ---
  const handleProductSelect = async (selectedOption) => {
    setSelectedProduct(selectedOption);

    // Reset Lokasi Tujuan
    setToLocation(null);

    if (!selectedOption) {
        setFromLocation(null);
        return;
    }

    // 1. Panggil API baru untuk mendapatkan lokasi dengan stok terbanyak
    try {
      const response = await axios.get(`/api/products/${selectedOption.value}/main-stock`);
      const mainStockLocation = response.data;
      
      // 2. Format data dan set Lokasi Asal
      setFromLocation({
        value: mainStockLocation.location_id,
        label: mainStockLocation.location_name
      });
      toast.success(`Lokasi Asal otomatis diisi dari ${mainStockLocation.location_name} (Stok: ${mainStockLocation.quantity})`);

    } catch (err) {
      // Jika stok 0 atau 404
      setFromLocation(null);
      // Di sini kita tidak men-toast error karena user bisa saja ingin memindahkan stok 0
      toast('Lokasi Asal tidak otomatis terisi. Stok tidak ditemukan di lokasi manapun.', { icon: 'ℹ️' });
    }
  };


  // Handler Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isAllowed) {
      toast.error('Akses Ditolak. Anda tidak punya izin.');
      setIsSubmitting(false);
      return;
    }

    if (!selectedProduct || !fromLocation || !toLocation || quantity <= 0) {
      toast.error('Semua field wajib diisi dan Jumlah harus positif.');
      setIsSubmitting(false);
      return;
    }
    if (fromLocation.value === toLocation.value) {
        toast.error('Lokasi Asal dan Lokasi Tujuan tidak boleh sama.');
        setIsSubmitting(false);
        return;
    }

    const payload = {
      product_id: selectedProduct.value,
      from_location_id: fromLocation.value,
      to_location_id: toLocation.value,
      quantity,
      reason: reason.value,
    };
    
    try {
      await axios.post('/api/movements', payload);
      toast.success(`Perpindahan ${quantity} unit ${selectedProduct.label} berhasil dicatat!`);
      
      // Reset formulir
      setSelectedProduct(null);
      setFromLocation(null);
      setToLocation(null);
      setQuantity(1);
      setReason(reasonOptions[0]);
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Gagal mencatat pergerakan.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingMaster) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg">
        <p className="text-gray-500 animate-pulse">Memuat data lokasi...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white shadow-lg rounded-lg max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">🚚 Catat Perpindahan Barang</h1>
      
      {/* 1. Produk */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Produk *</label>
        <AsyncSelect
            loadOptions={loadProductOptions}
            value={selectedProduct}
            onChange={handleProductSelect} // <-- PANGGIL HANDLER AUTO-FILL
            placeholder="Ketik SKU atau Nama Produk untuk mencari..."
            className="w-full mt-1"
            classNamePrefix="react-select"
            defaultOptions
        />
      </div>

      {/* 2. Lokasi Asal & Tujuan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Lokasi (Asal) *</label>
            <Select
                options={locationOptions}
                value={fromLocation}
                onChange={setFromLocation}
                placeholder="Lokasi akan terisi otomatis..."
                classNamePrefix="react-select"
                // Lokasi asal dibuat agar bisa diubah user jika lokasi otomatis salah
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ke Lokasi (Tujuan) *</label>
            <Select
                options={locationOptions}
                value={toLocation}
                onChange={setToLocation}
                placeholder="Pilih lokasi tujuan..."
                classNamePrefix="react-select"
            />
        </div>
      </div>

      {/* 3. Jumlah & Alasan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Unit *</label>
            <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                required
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Perpindahan *</label>
            <Select
                options={reasonOptions}
                value={reason}
                onChange={setReason}
                classNamePrefix="react-select"
            />
        </div>
      </div>

      {/* Tombol Submit */}
      <div className="border-t pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition disabled:bg-gray-400"
        >
          {isSubmitting ? 'Mencatat...' : 'Catat Perpindahan'}
        </button>
      </div>
    </form>
  );
}

export default MovementForm;