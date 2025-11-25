import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import SupplierForm from '../components/SupplierForm';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext'; 

const LIMIT_PER_PAGE = 10;

// --- KOMPONEN SKELETON BARU ---
const SupplierListSkeleton = ({ isAdmin }) => {
    // 5 Kolom: Nama, Contact, Phone, Address, Aksi
    const columns = 5; 
    
    const TableRowSkeleton = () => (
        <tr className="border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <div className="h-4 bg-gray-300 rounded skeleton-shimmer"></div>
                </td>
            ))}
        </tr>
    );

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg relative animate-pulse"> 
            
            {/* Header/Search/Button Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="h-8 bg-gray-300 rounded w-1/3 skeleton-shimmer"></div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="h-10 bg-gray-300 rounded w-full md:w-64 skeleton-shimmer"></div>
                    <div className="h-10 bg-gray-300 rounded w-20 skeleton-shimmer"></div>
                </div>
                
                 <div className="h-10 bg-blue-300 rounded w-full md:w-40 skeleton-shimmer"></div>
            </div>
            
            {/* Table Skeleton */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    <div className="h-3 bg-gray-300 rounded w-2/3 skeleton-shimmer"></div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {Array.from({ length: LIMIT_PER_PAGE }).map((_, i) => <TableRowSkeleton key={i} />)}
                    </tbody>
                </table>
            </div>
             {/* Pagination Skeleton */}
            <div className="flex justify-between items-center mt-6">
                <div className="h-8 bg-gray-300 rounded w-32 skeleton-shimmer"></div>
                <div className="h-8 bg-gray-300 rounded w-20 skeleton-shimmer"></div>
                <div className="h-8 bg-gray-300 rounded w-32 skeleton-shimmer"></div>
            </div>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---

function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  // Pagination dan Search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Role dari Context
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  // --- Perbaikan useEffect dengan Cleanup Function ---
  useEffect(() => {
    let isMounted = true; 

    async function fetchSuppliersData() {
      try {
        if (isMounted) setLoading(true); 
        const response = await axios.get(
          `/api/suppliers?page=${currentPage}&limit=${LIMIT_PER_PAGE}&search=${activeSearch}`
        );
        
        if (isMounted) { 
          setSuppliers(response.data.suppliers);
          setTotalPages(response.data.totalPages);
          setCurrentPage(response.data.currentPage);
        }
      } catch (err) {
        if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
          toast.error('Gagal memuat data supplier.');
        }
      } finally {
        if (isMounted) setLoading(false); 
      }
    }

    fetchSuppliersData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, activeSearch]); 

  // --- Handlers Modal & CRUD ---
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingSupplier(null);
  };

  const handleAddClick = () => {
    setEditingSupplier(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (supplier) => {
    if (!isAdmin) return;
    setEditingSupplier(supplier);
    setIsFormModalOpen(true);
  };

  const handleSaveSupplier = async (supplierData) => {
    if (!isAdmin) return;
    try {
      if (supplierData.id) {
        // UPDATE
        await axios.put(`/api/suppliers/${supplierData.id}`, supplierData);
        toast.success('Supplier berhasil diupdate!');
      } else {
        // CREATE
        await axios.post('/api/suppliers', supplierData);
        toast.success('Supplier baru berhasil ditambahkan!');
      }
      handleCloseFormModal();
      // Refresh ke halaman 1 jika ada data baru atau memicu re-fetch
      if (currentPage !== 1) setCurrentPage(1);
      else setCurrentPage(c => c);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menyimpan supplier.');
    }
  };

  const handleDeleteClick = (supplier) => {
    if (!isAdmin) return;
    setSupplierToDelete(supplier);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setSupplierToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await axios.delete(`/api/suppliers/${supplierToDelete.id}`);
      toast.success(`Supplier "${supplierToDelete.name}" berhasil dihapus.`);
      
      // Logika Pagination saat menghapus
      if (suppliers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        setCurrentPage(c => c);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menghapus supplier.');
    } finally {
      handleCloseConfirmModal();
    }
  };

  // --- Handlers Pagination & Search ---
  const handleSearchSubmit = (e) => { e.preventDefault(); setCurrentPage(1); setActiveSearch(searchQuery); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  // --- RENDER UTAMA ---
  if (loading) {
    return <SupplierListSkeleton isAdmin={isAdmin} />; // Tampilkan Skeleton saat loading
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative"> 
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Supplier</h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Supplier..."
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
          <button type="submit" className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded">
            Cari
          </button>
        </form>
        
        {/* Tombol Tambah (Hanya untuk Admin) */}
        {isAdmin && (
          <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto">
            + Tambah Supplier
          </button>
        )}
      </div>

      {/* Tabel */}
      {suppliers.length === 0 && !loading ? (
        <p className="text-gray-500">Tidak ada data supplier.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alamat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{supplier.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{supplier.contact_person || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{supplier.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{supplier.address || '-'}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {/* Tombol Aksi (Hanya untuk Admin) */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleEditClick(supplier)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(supplier)} 
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
        <SupplierForm 
          onClose={handleCloseFormModal}
          onSave={handleSaveSupplier}
          supplierToEdit={editingSupplier} 
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {isConfirmModalOpen && (
        <ConfirmModal
          title="Hapus Supplier"
          message={`Apakah Anda yakin ingin menghapus supplier "${supplierToDelete?.name}"?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default SupplierList;