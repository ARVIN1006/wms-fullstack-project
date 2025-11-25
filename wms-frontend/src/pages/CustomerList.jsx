import { useState } from 'react'; // Hapus useEffect
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomerForm from '../components/CustomerForm'; 
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import ExportButton from '../components/ExportButton';
// BARU: Import hook usePaginatedList
import { usePaginatedList } from '../hooks/usePaginatedList'; 

const LIMIT_PER_PAGE = 10;

// --- KOMPONEN SKELETON BARU ---
const CustomerListSkeleton = ({ isAdmin }) => {
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
                
                 {/* Tombol Tambah & Ekspor */}
                 <div className="flex gap-2 w-full md:w-auto">
                    <div className="h-10 bg-blue-300 rounded w-full md:w-40 skeleton-shimmer"></div>
                    <div className="h-10 bg-indigo-300 rounded w-full md:w-40 skeleton-shimmer"></div>
                 </div>
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


function CustomerList() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Pagination dan Search state internal untuk input
  const [searchQuery, setSearchQuery] = useState('');

  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  // PERUBAHAN KRITIS: Menggantikan semua state Pagination/Search dengan hook
  const { 
    data: customers, 
    loading, 
    refresh,
    currentPage, 
    totalPages, 
    totalCount,
    activeSearch,
    handlePageChange, 
    handleSearchSubmit: hookHandleSearchSubmit,
    refreshCurrentPage
  } = usePaginatedList('/api/customers', LIMIT_PER_PAGE, '');


  // --- FUNGSI EKSPOR CSV ---
  const getExportData = () => {
      // Data format untuk CSV
      return customers.map(c => ({
          name: c.name,
          contact_person: c.contact_person || '-',
          phone: c.phone || '-',
          address: c.address || '-',
      }));
  };

  const customerHeaders = [
      { label: "Nama Pelanggan", key: "name" },
      { label: "Contact Person", key: "contact_person" },
      { label: "Telepon", key: "phone" },
      { label: "Alamat", key: "address" },
  ];
  
  // --- HANDLERS CRUD (LOGIC LENGKAP) ---

  const handleCloseFormModal = () => { setIsFormModalOpen(false); setEditingCustomer(null); };
  const handleAddClick = () => { setEditingCustomer(null); setIsFormModalOpen(true); };
  
  const handleEditClick = (customer) => { 
    if (!isAdmin) return; 
    setEditingCustomer(customer); setIsFormModalOpen(true); 
  };
  
  const handleSaveCustomer = async (customerData) => { 
    if (!isAdmin) return;
    try {
        if (customerData.id) {
            await axios.put(`/api/customers/${customerData.id}`, customerData);
            toast.success('Pelanggan berhasil diupdate!');
            refreshCurrentPage(); // Refresh di halaman yang sama
        } else {
            await axios.post('/api/customers', customerData);
            toast.success('Pelanggan baru berhasil ditambahkan!');
            refresh(); // Kembali ke halaman 1 atau refresh
        }
        handleCloseFormModal();
    } catch (err) {
        toast.error(err.response?.data?.msg || 'Gagal menyimpan pelanggan.');
    }
  };
  
  const handleDeleteClick = (customer) => { 
    if (!isAdmin) return; 
    setCustomerToDelete(customer); setIsConfirmModalOpen(true); 
  };
  
  const handleCloseConfirmModal = () => { setIsConfirmModalOpen(false); setCustomerToDelete(null); };
  
  const handleConfirmDelete = async () => { 
    if (!customerToDelete) return;
    try {
        await axios.delete(`/api/customers/${customerToDelete.id}`);
        toast.success(`Pelanggan "${customerToDelete.name}" berhasil dihapus.`);
        
        // Logika Pagination saat menghapus
        if (customers.length === 1 && currentPage > 1) {
            handlePageChange(currentPage - 1); // Pindah halaman sebelum refresh
        } else {
            refreshCurrentPage(); // Refresh di halaman yang sama
        }
    } catch (err) {
        toast.error(err.response?.data?.msg || 'Gagal menghapus pelanggan.');
    } finally {
        handleCloseConfirmModal();
    }
  };

  // --- Handler Search UI ---
  const handleSearchSubmit = (e) => { 
      e.preventDefault(); 
      hookHandleSearchSubmit(searchQuery); // Panggil handler search dari hook
  };

  // --- RENDER UTAMA ---
  if (loading) {
    return <CustomerListSkeleton isAdmin={isAdmin} />; // Tampilkan Skeleton saat loading
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative"> 
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Pelanggan (Customer)</h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Pelanggan..."
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
          <button type="submit" className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded">
            Cari
          </button>
        </form>
        
        {/* Tombol Tambah (Hanya untuk Admin) */}
        {isAdmin && (
          <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto">
            + Tambah Pelanggan
          </button>
        )}

        {/* TOMBOL EKSPOR */}
        <ExportButton 
            data={getExportData()} 
            headers={customerHeaders} 
            filename={`Master_Pelanggan_${new Date().toISOString().slice(0, 10)}.csv`}
        >
            Ekspor Daftar Pelanggan
        </ExportButton>
      </div>

      {/* Tabel */}
      {(customers.length === 0 && !loading) ? (
        <p className="text-gray-500">Tidak ada data pelanggan.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Pelanggan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alamat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(customers || []).map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{customer.contact_person || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{customer.address || '-'}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {/* Tombol Aksi (Hanya untuk Admin) */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleEditClick(customer)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(customer)} 
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
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
              Sebelumnya
            </button>
            <span className="text-sm">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded disabled:opacity-50">
              Berikutnya
            </button>
          </div>
        </>
      )}

      {/* Modal Form */}
      {isFormModalOpen && (
        <CustomerForm 
          onClose={handleCloseFormModal}
          onSave={handleSaveCustomer}
          customerToEdit={editingCustomer} 
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {isConfirmModalOpen && (
        <ConfirmModal
          title="Hapus Pelanggan"
          message={`Apakah Anda yakin ingin menghapus pelanggan "${customerToDelete?.name}"?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default CustomerList;