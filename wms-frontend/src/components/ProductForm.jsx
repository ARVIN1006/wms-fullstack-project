import { useState, useEffect } from 'react';

// BARU: Tambahkan prop 'productToEdit'
function ProductForm({ onSave, onClose, productToEdit }) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');

  // BARU: Gunakan 'useEffect' untuk mengisi form jika 'productToEdit' ada
  useEffect(() => {
    if (productToEdit) {
      // Jika kita mengedit, isi state formulir dengan data yang ada
      setSku(productToEdit.sku);
      setName(productToEdit.name);
      setDescription(productToEdit.description || ''); // Handle jika deskripsi null
      setUnit(productToEdit.unit);
    }
  }, [productToEdit]); // Efek ini berjalan setiap kali 'productToEdit' berubah

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sku || !name || !unit) {
      alert('SKU, Nama, dan Satuan wajib diisi!');
      return;
    }
    
    // BARU: Kirim data 'id' juga jika kita sedang mengedit
    onSave({ 
      id: productToEdit?.id, // Kirim ID jika ada (untuk update), null jika tidak (untuk create)
      sku, 
      name, 
      description, 
      unit 
    });
  };

  return (
    // Latar belakang gelap (overlay)
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      
      {/* Kotak Modal */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        {/* BARU: Judul formulir berubah tergantung konteks */}
        <h2 className="text-2xl font-bold mb-4">
          {productToEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Baris 1: SKU */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Kode Unik) *</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Baris 2: Nama Produk */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Baris 3: Deskripsi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Baris 4: Satuan */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan (cth: pcs, unit, kg) *</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition"
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