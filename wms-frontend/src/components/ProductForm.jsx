import { useState, useEffect } from 'react';

function ProductForm({ onSave, onClose, productToEdit }) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  // BARU: State untuk harga
  const [purchasePrice, setPurchasePrice] = useState(0); 
  const [sellingPrice, setSellingPrice] = useState(0); 

  const [isEditing, setIsEditing] = useState(false);

  // Efek untuk mengisi form saat mode Edit
  useEffect(() => {
    if (productToEdit) {
      setIsEditing(true);
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setDescription(productToEdit.description || '');
      setUnit(productToEdit.unit);
      // BARU: Isi harga dari data yang ada
      setPurchasePrice(productToEdit.purchase_price || 0); 
      setSellingPrice(productToEdit.selling_price || 0);
    } else {
      setIsEditing(false);
    }
  }, [productToEdit]);

  // Fungsi saat tombol Simpan diklik
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sku || !name || !unit) {
      alert('SKU, Nama, dan Satuan wajib diisi!');
      return;
    }
    onSave({ 
      id: productToEdit?.id, 
      sku, 
      name, 
      description, 
      unit,
      purchase_price: purchasePrice, // KIRIM HARGA
      selling_price: sellingPrice // KIRIM HARGA
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Bagian SKU, Nama, Deskripsi, Satuan (tetap sama) */}
          {/* ... */}
          
          {/* Nama Produk */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          
          {/* Satuan */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan (cth: pcs, unit, kg) *</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>

          {/* BARU: Input Harga */}
          <h3 className="text-lg font-semibold mt-6 mb-3 border-t pt-3">Data Finansial</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Harga Beli */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Beli / Unit</label>
              <input
                type="number"
                step="0.01" // Penting untuk mata uang
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            {/* Harga Jual */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual / Unit</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-4 mt-6 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;