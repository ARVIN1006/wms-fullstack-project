import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ProductForm from '../components/ProductForm';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext'; 

const LIMIT_PER_PAGE = 10;

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Pagination dan Search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Role dari Context
  const { userRole } = useAuth(); 
  const isAdmin = userRole === 'admin'; // Helper isAdmin

  // --- Fungsi Utama Fetch Data ---
  async function fetchProducts(page, search, sortF, sortO) { 
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/products?page=${page}&limit=${LIMIT_PER_PAGE}&search=${search}&sortBy=${sortF}&sortOrder=${sortO}`
      );
      
      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);

    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Gagal memuat data produk.');
      }
    } finally {
      setLoading(false);
    }
  }

  // --- useEffect ---
  useEffect(() => {
    fetchProducts(currentPage, activeSearch, sortBy, sortOrder); 
  }, [currentPage, activeSearch, sortBy, sortOrder]); 

  // --- Handlers CRUD (disederhanakan) ---
  const handleCloseFormModal = () => { setIsFormModalOpen(false); setEditingProduct(null); };
  const handleAddClick = () => { setEditingProduct(null); setIsFormModalOpen(true); };
  const handleEditClick = (product) => { setEditingProduct(product); setIsFormModalOpen(true); };
  const handleSaveProduct = async (productData) => { /* ... (Logika Save/Update) ... */ }; // Asumsi ini sudah diperbaiki di langkah sebelumnya
  const handleDeleteClick = (product) => { setProductToDelete(product); setIsConfirmModalOpen(true); };
  const handleCloseConfirmModal = () => { setIsConfirmModalOpen(false); setProductToDelete(null); };
  const handleConfirmDelete = async () => { /* ... (Logika Delete) ... */ }; // Asumsi ini sudah diperbaiki

  // --- Handlers Sorting, Pagination, Search (disederhanakan) ---
  const handleSortClick = (field) => {
    if (field === sortBy) setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(field); setSortOrder('DESC'); }
  };
  const renderSortIcon = (field) => {
    if (field !== sortBy) return null;
    return sortOrder === 'ASC' ? ' ▲' : ' ▼';
  };
  const handleSearchSubmit = (e) => { e.preventDefault(); setCurrentPage(1); setActiveSearch(searchQuery); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };


  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative"> 
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk</h1>
        
        {/* Search Bar */}
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
        
        {/* Tombol Tambah (Hanya untuk Admin) */}
        {isAdmin && (
          <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto">
            + Tambah Produk Baru
          </button>
        )}
      </div>

      {/* Tabel */}
      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortClick('sku')} 
                  >
                    SKU {renderSortIcon('sku')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortClick('name')} 
                  >
                    Nama Produk {renderSortIcon('name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deskripsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Satuan
                  </th>
                  {/* BARU: Kolom Harga */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Beli
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Jual
                  </th>
                  {/* END BARU */}
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortClick('created_at')} 
                  >
                    Dibuat {renderSortIcon('created_at')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{product.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{product.unit}</td>
                    
                    {/* BARU: Data Harga */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                      Rp {parseFloat(product.purchase_price || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-700">
                      Rp {parseFloat(product.selling_price || 0).toLocaleString('id-ID')}
                    </td>
                    {/* END BARU */}
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(product.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {/* Tombol Aksi (Hanya untuk Admin) */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleEditClick(product)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(product)} 
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        </>
                      )}
                      {!isAdmin && (
                          <span className="text-gray-400 text-xs">Lihat saja</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-6">
            <button onClick={handlePrevPage} disabled={currentPage <= 1} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
              Sebelumnya
            </button>
            <span className="text-sm">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </span>
            <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
              Berikutnya
            </button>
          </div>
        </>
      )}

      {/* Modal Form */}
      {isFormModalOpen && (
        <ProductForm 
          onClose={handleCloseFormModal}
          onSave={handleSaveProduct}
          productToEdit={editingProduct} 
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {isConfirmModalOpen && (
        <ConfirmModal
          title="Hapus Produk"
          message={`Apakah Anda yakin ingin menghapus produk "${productToDelete?.name}"?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default ProductList;