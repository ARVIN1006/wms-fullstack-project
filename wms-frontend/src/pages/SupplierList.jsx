import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import SupplierForm from '../components/SupplierForm'; // Impor form supplier
import ConfirmModal from '../components/ConfirmModal'; // Impor modal konfirmasi

const LIMIT_PER_PAGE = 10;

function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Fungsi Fetch
  async function fetchSuppliers(page, search) {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/suppliers?page=${page}&limit=${LIMIT_PER_PAGE}&search=${search}`
      );
      setSuppliers(response.data.suppliers);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (err) {
      if (err.response?.status !== 401) {
        toast.error('Gagal memuat data supplier.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuppliers(currentPage, activeSearch);
  }, [currentPage, activeSearch]);

  // --- Handlers ---
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingSupplier(null);
  };

  const handleAddClick = () => {
    setEditingSupplier(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (supplier) => {
    setEditingSupplier(supplier);
    setIsFormModalOpen(true);
  };

  const handleSaveSupplier = async (supplierData) => {
    try {
      if (supplierData.id) {
        await axios.put(`/api/suppliers/${supplierData.id}`, supplierData);
        toast.success('Supplier berhasil diupdate!');
      } else {
        await axios.post('/api/suppliers', supplierData);
        toast.success('Supplier baru berhasil ditambahkan!');
      }
      handleCloseFormModal();
      if (currentPage !== 1) setCurrentPage(1);
      else fetchSuppliers(currentPage, activeSearch);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menyimpan supplier.');
    }
  };

  const handleDeleteClick = (supplier) => {
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
      if (suppliers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchSuppliers(currentPage, activeSearch);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menghapus supplier.');
    } finally {
      handleCloseConfirmModal();
    }
  };

  const handleSearchSubmit = (e) => { e.preventDefault(); setCurrentPage(1); setActiveSearch(searchQuery); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative"> 
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Supplier</h1>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Supplier..."
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button type="submit" className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded">
            Cari
          </button>
        </form>
        <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto">
          + Tambah Supplier
        </button>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
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