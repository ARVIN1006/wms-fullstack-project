import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Select from 'react-select'; 
import { useAuth } from '../context/AuthContext';

function StockOpname() {
  const [locations, setLocations] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // State Formulir
  const [skuInput, setSkuInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null); // Data produk
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [physicalCount, setPhysicalCount] = useState(0); // Input hitungan fisik
  const [systemCount, setSystemCount] = useState(0); // Stok dari DB
  const [variance, setVariance] = useState(0); // Selisih
  const [reason, setReason] = useState('Stock Opname');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { userRole } = useAuth();
  const inputRef = useRef(null);

  const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));

  // Ambil data Lokasi
  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await axios.get('/api/locations');
        setLocations(response.data);
      } catch (err) { /* ... */ } 
      finally { setLoadingMaster(false); }
    }
    fetchLocations();
    // Fokus ke input SKU saat halaman dimuat
    inputRef.current?.focus();
  }, []);

  // --- FUNGSI PENCARIAN (BARCODE & LOKASI) ---

  // Panggil API by-sku saat Enter
  const handleSkuScan = async (sku) => {
    if (!sku) return;
    try {
        const response = await axios.get(`/api/products/by-sku/${sku}`);
        setSelectedProduct(response.data);
        toast.success(`Produk ditemukan: ${response.data.name}`);
        // Panggil fetchSystemCount jika lokasi sudah dipilih
        if (selectedLocation) {
            fetchSystemCount(response.data.id, selectedLocation.value);
        }
    } catch (err) {
        toast.error('Produk tidak ditemukan.');
        setSelectedProduct(null);
        setSystemCount(0);
    }
  };
  
  // Panggil API /specific saat Lokasi berubah
  const handleLocationChange = (location) => {
    setSelectedLocation(location);
    if (selectedProduct) {
        fetchSystemCount(selectedProduct.id, location.value);
    }
  };

  // Panggil API /specific
  const fetchSystemCount = async (productId, locationId) => {
      try {
          const res = await axios.get(`/api/stocks/specific/${productId}/${locationId}`);
          const sysCount = res.data.system_count;
          setSystemCount(sysCount);
          // Hitung variance otomatis
          setVariance(physicalCount - sysCount);
      } catch (err) {
          toast.error('Gagal mengambil stok sistem.');
      }
  };
  
  // Hitung ulang variance saat hitungan fisik berubah
  useEffect(() => {
      setVariance(physicalCount - systemCount);
  }, [physicalCount, systemCount]);


  // --- FUNGSI SUBMIT (ADJUSTMENT) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (variance === 0 || isSubmitting) {
        toast.success('Stok sudah sesuai. Tidak ada penyesuaian.');
        return;
    }

    setIsSubmitting(true);
    
    // Tentukan Tipe Transaksi (IN atau OUT)
    const type = variance > 0 ? 'IN' : 'OUT';
    const endpoint = type === 'IN' ? '/api/transactions/in' : '/api/transactions/out';
    const absoluteQty = Math.abs(variance);
    const notes = `Stock Opname (${reason}): ${variance > 0 ? '+' : ''}${variance} unit`;
    
    // Asumsi Status 'Good' (ID 1)
    const payload = {
        notes,
        items: [{
            product_id: selectedProduct.id,
            location_id: selectedLocation.value,
            quantity: absoluteQty,
            stock_status_id: 1, 
            purchase_price: selectedProduct.purchase_price,
            selling_price: selectedProduct.selling_price
        }]
    };

    try {
        await axios.post(endpoint, payload);
        toast.success(`Stok berhasil disesuaikan. Selisih ${variance} unit dicatat.`);
        
        // Reset form
        setSkuInput('');
        setSelectedProduct(null);
        setSelectedLocation(null);
        setPhysicalCount(0);
        setSystemCount(0);
        setVariance(0);
        inputRef.current?.focus();

    } catch (err) {
        const errorMsg = err.response?.data?.msg || 'Gagal menyesuaikan stok.';
        toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loadingMaster) {
    return <div className="p-6">Memuat data lokasi...</div>;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">📦 Stock Opname (Hitung Stok Fisik)</h1>
      
      <form onSubmit={handleSubmit}>
        {/* 1. Input SKU & Lokasi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Scan SKU/Barcode (Enter) *</label>
                <input
                    type="text"
                    ref={inputRef}
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSkuScan(e.target.value);
                        }
                    }}
                    placeholder="Scan barcode..."
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Lokasi *</label>
                <Select
                    options={locationOptions}
                    value={selectedLocation}
                    onChange={handleLocationChange}
                    placeholder="Pilih Lokasi..."
                    className="w-full mt-1"
                />
            </div>
        </div>
        
        {/* 2. Hasil Hitungan */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
                <label className="block text-sm font-medium text-gray-500">Stok Sistem</label>
                <p className="text-2xl font-bold text-gray-800">{systemCount}</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Hitungan Fisik (Aktual) *</label>
                <input
                    type="number"
                    min="0"
                    value={physicalCount}
                    onChange={(e) => setPhysicalCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500">Selisih (Variance)</label>
                <p className={`text-2xl font-bold ${variance === 0 ? 'text-gray-800' : (variance > 0 ? 'text-green-600' : 'text-red-600')}`}>
                    {variance}
                </p>
            </div>
        </div>

        {/* 3. Alasan & Submit */}
        <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Penyesuaian *</label>
            <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                required
            />
            <button
                type="submit"
                disabled={isSubmitting || variance === 0 || !selectedProduct || !selectedLocation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition disabled:bg-gray-400"
            >
                {isSubmitting ? 'Menyesuaikan...' : `Sesuaikan Stok (${variance})`}
            </button>
        </div>
      </form>
    </div>
  );
}

export default StockOpname;