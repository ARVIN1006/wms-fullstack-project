import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ProductForm from '../components/ProductForm';
import ConfirmModal from '../components/ConfirmModal'; // <-- 1. IMPOR MODAL BARU

const LIMIT_PER_PAGE = 10;

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false); // Modal untuk form
  const [editingProduct, setEditingProduct] = useState(null);

  // --- STATE BARU UNTUK KONFIRMASI ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // ... (State Pagination & Search tetap sama) ...
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // ... (Fungsi fetchProducts tetap sama) ...
  async function fetchProducts(page, search) {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/products?page=${page}&limit=${LIMIT_PER_PAGE}&search=${search}`
      );
      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (err) {
      if (err.response?.status !== 401) {
        toast.error('Gagal memuat data produk.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts(currentPage, activeSearch);
  }, [currentPage, activeSearch]);

  // --- MODIFIKASI HANDLER MODAL ---

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingProduct(null);
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };

  // ... (handleSaveProduct tetap sama) ...
  const handleSaveProduct = async (productData) => {
    try {
      if (productData.id) {
        await axios.put(`/api/products/${productData.id}`, productData);
        toast.success('Produk berhasil diupdate!');
      } else {
        await axios.post('/api/products', productData);
        toast.success('Produk baru berhasil ditambahkan!');
      }
      handleCloseFormModal();
      if (currentPage !== 1) setCurrentPage(1);
      else fetchProducts(currentPage, activeSearch);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menyimpan produk.');
    }
  };

  // --- FUNGSI DELETE (DIPERBARUI) ---

  // 1. Saat tombol Hapus diklik, BUKA modal konfirmasi
  const handleDeleteClick = (product) => {
    setProductToDelete(product); // Simpan produk mana yang mau dihapus
    setIsConfirmModalOpen(true); // Buka modalnya
  };

  // 2. Saat klik "Batal" di modal konfirmasi
  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setProductToDelete(null);
  };

  // 3. Saat klik "Lanjutkan" (Confirm) di modal
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(`/api/products/${productToDelete.id}`);
      toast.success(`Produk "${productToDelete.name}" berhasil dihapus.`);
      
      // Logika refresh data (sama seperti sebelumnya)
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchProducts(currentPage, activeSearch);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menghapus produk.');
    } finally {
      handleCloseConfirmModal(); // Tutup modalnya
    }
  };

  // ... (Fungsi Pagination tetap sama) ...
  const handleSearchSubmit = (e) => { e.preventDefault(); setCurrentPage(1); setActiveSearch(searchQuery); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  // --- JSX (RENDER) ---
  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative"> 
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        {/* ... (Form Search dan Tombol Tambah tetap sama) ... */}
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk</h1>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari SKU atau Nama..."
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
          <button type="submit" className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded">
            Cari
          </button>
        </form>
        <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto">
          + Tambah Produk Baru
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {/* ... (Header tabel tetap sama) ... */}
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Produk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Satuan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    {/* ... (Data tabel tetap sama) ... */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{product.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{product.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleEditClick(product)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      {/* UBAH ONCLICK-NYA */}
                      <button 
                        onClick={() => handleDeleteClick(product)} 
                        className="text-red-600 hover:text-red-900"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* ... (Pagination tetap sama) ... */}
          <div className="flex justify-between items-center mt-6">
            <button onClick={handlePrevPage} disabled={currentPage <= 1} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded disabled:opacity-50">
              Sebelumnya
            </button>
            <span className="text-sm text-gray-700">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </span>
            <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded disabled:opacity-50">
              Berikutnya
            </button>
          </div>
        </>
      )}

      {/* Modal Form (untuk Tambah/Edit) */}
      {isFormModalOpen && (
        <ProductForm 
          onClose={handleCloseFormModal}
          onSave={handleSaveProduct}
          productToEdit={editingProduct} 
        />
      )}

      {/* --- MODAL KONFIRMASI (BARU) --- */}
      {isConfirmModalOpen && (
        <ConfirmModal
          title="Hapus Produk"
          message={`Apakah Anda yakin ingin menghapus produk "${productToDelete?.name}"? Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default ProductList;