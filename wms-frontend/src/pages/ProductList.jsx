import { useState, useEffect, Fragment } from 'react';
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
  
  // State untuk menyimpan detail stok yang baru diambil
  const [productStockDetails, setProductStockDetails] = useState({}); 

  // Role dari Context
  const { userRole } = useAuth(); 
  const isAdmin = userRole === 'admin';

  // --- Fungsi untuk Toggle Detail Stok ---
  const toggleStockDetail = async (productId) => {
      if (productStockDetails[productId]) {
          setProductStockDetails(prev => ({ ...prev, [productId]: null }));
          return;
      }
      
      try {
          // Panggil API backend khusus untuk detail stok per lokasi
          const response = await axios.get(`/api/products/${productId}/stock`); 
          setProductStockDetails(prev => ({ ...prev, [productId]: response.data }));
      } catch (err) {
          toast.error("Gagal memuat detail stok.");
      }
  };


  // --- useEffect: Fetch Data dengan Cleanup Function ---
  useEffect(() => {
    let isMounted = true; // BARU: Flag untuk melacak status mounting

    async function fetchProductsData() {
      try {
        if (isMounted) setLoading(true);
        const response = await axios.get(
          `/api/products?page=${currentPage}&limit=${LIMIT_PER_PAGE}&search=${activeSearch}&sortBy=${sortBy}&sortOrder=${sortOrder}`
        );

        if (isMounted) { // Cek isMounted sebelum set state
          setProducts(response.data.products);
          setTotalPages(response.data.totalPages);
          setCurrentPage(response.data.currentPage);
        }

      } catch (err) {
        if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
          toast.error('Gagal memuat data produk.');
        }
      } finally {
        if (isMounted) { // Cek isMounted sebelum set state
          setLoading(false); 
        }
      }
    }

    fetchProductsData(); // Panggil fungsi internal

    // Cleanup function: set flag ke false saat unmount
    return () => {
      isMounted = false;
    };
  }, [currentPage, activeSearch, sortBy, sortOrder]); 

  // --- Handlers CRUD ---
  const handleCloseFormModal = () => { setIsFormModalOpen(false); setEditingProduct(null); };
  const handleAddClick = () => { setEditingProduct(null); setIsFormModalOpen(true); };
  const handleEditClick = (product) => { setIsFormModalOpen(true); setEditingProduct(product); };
  
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
        // Trigger re-fetch di useEffect
        if (currentPage !== 1) setCurrentPage(1);
        else setCurrentPage(c => c); 
    } catch (err) {
        toast.error(err.response?.data?.msg || 'Gagal menyimpan produk.');
    }
  };
  
  const handleDeleteClick = (product) => { setProductToDelete(product); setIsConfirmModalOpen(true); };
  const handleCloseConfirmModal = () => { setIsConfirmModalOpen(false); setProductToDelete(null); };
  
  const handleConfirmDelete = async () => { 
    if (!productToDelete) return;
    try {
        await axios.delete(`/api/products/${productToDelete.id}`);
        toast.success(`Produk "${productToDelete.name}" berhasil dihapus.`);
        
        // Trigger re-fetch di useEffect
        if (products.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        } else {
            setCurrentPage(c => c); // Memaksa re-render untuk refresh data di halaman yang sama
        }
    } catch (err) {
        toast.error(err.response?.data?.msg || 'Gagal menghapus produk.');
    } finally {
        handleCloseConfirmModal();
    }
  };

  // --- Handlers Sorting, Pagination, Search ---
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
        
        {/* Tombol Ekspor (Asumsi ExportButton diimpor) */}
        {/* ... */}
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
                  <th onClick={() => handleSortClick('sku')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    SKU {renderSortIcon('sku')}
                  </th>
                  <th onClick={() => handleSortClick('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    Nama Produk {renderSortIcon('name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deskripsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Satuan
                  </th>
                  <th onClick={() => handleSortClick('main_supplier_id')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    Supplier Utama {renderSortIcon('main_supplier_id')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Beli
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Jual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok Detail
                  </th>
                  <th onClick={() => handleSortClick('created_at')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    Dibuat {renderSortIcon('created_at')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* SAFETY CHECK: Gunakan products || [] */}
                {(products || []).map((product) => (
                  <Fragment key={product.id}>
                    <tr className={productStockDetails[product.id] ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{product.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{product.unit}</td>
                      
                      {/* Data SUPPLIER UTAMA */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {product.supplier_name || '-'}
                      </td>
                      
                      {/* Data Harga (dengan safety check || 0) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                        Rp {parseFloat(product.purchase_price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-700">
                        Rp {parseFloat(product.selling_price || 0).toLocaleString('id-ID')}
                      </td>
                      
                      {/* Tombol Detail Stok */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                              onClick={() => toggleStockDetail(product.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                          >
                              {productStockDetails[product.id] ? 'Tutup Detail' : 'Lihat Stok'}
                          </button>
                      </td>

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
                    </tr >

                    {/* BARIS DETAIL STOK (Hanya muncul jika diklik) */}
                    {productStockDetails[product.id] && (
                      <tr className="bg-blue-50">
                        {/* Colspan 10 untuk menutupi lebar tabel */}
                        <td colSpan="10" className="px-6 py-2"> 
                          <p className="font-semibold text-sm mb-1 text-gray-700">Stok Aktif per Lokasi:</p>
                          {productStockDetails[product.id].length === 0 ? (
                              <p className="text-xs text-red-500">Stok barang ini 0.</p>
                          ) : (
                              <ul className="list-disc list-inside text-xs">
                                  {productStockDetails[product.id].map((stock, index) => (
                                      <li key={index}>
                                          Lokasi **{stock.location_name}**: <span className='font-bold'>{stock.quantity}</span> unit
                                      </li>
                                  ))}
                              </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
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