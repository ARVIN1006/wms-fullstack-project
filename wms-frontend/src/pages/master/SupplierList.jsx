import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import SupplierForm from "../../components/SupplierForm";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

const LIMIT_PER_PAGE = 10;

// --- KOMPONEN SKELETON BARU ---
const SupplierListSkeleton = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-300 rounded w-48"></div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-300 rounded w-64"></div>
          <div className="h-10 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
    </div>
  );
};
// --- END KOMPONEN SKELETON ---

function SupplierList() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  // Pagination dan Search state internal untuk input
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: suppliers,
    loading,
    refresh,
    currentPage,
    totalPages,
    handlePageChange,
    handleSearchSubmit: hookHandleSearchSubmit,
    refreshCurrentPage,
  } = usePaginatedList("/api/suppliers", LIMIT_PER_PAGE, "");

  // Role dari Context
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

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
        toast.success("Supplier berhasil diupdate!");
        refreshCurrentPage(); // Update di halaman yang sama
      } else {
        // CREATE
        await axios.post("/api/suppliers", supplierData);
        toast.success("Supplier baru berhasil ditambahkan!");
        refresh(); // Kembali ke halaman 1 atau refresh
      }
      handleCloseFormModal();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menyimpan supplier.");
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
        handlePageChange(currentPage - 1); // Pindah halaman sebelum refresh
      } else {
        refreshCurrentPage(); // Refresh di halaman yang sama
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menghapus supplier.");
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
    return <SupplierListSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Manajemen Supplier
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Daftar pemasok barang dan kontak mereka
          </p>
        </div>

        {isAdmin && (
          <Button onClick={handleAddClick} variant="primary" startIcon="+">
            Tambah Supplier
          </Button>
        )}
      </div>

      <Card>
        {/* Search Bar */}
        <div className="mb-6 flex justify-end">
          <form
            onSubmit={handleSearchSubmit}
            className="flex gap-2 w-full md:w-auto"
          >
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama Supplier..."
              className="w-full md:w-64"
            />
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>
        </div>

        {/* Tabel */}
        {suppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Tidak ada data supplier.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80 backdrop-blur-sm">
                  <tr>
                    {[
                      "Nama Supplier",
                      "Contact Person",
                      "Telepon",
                      "Alamat",
                      "Aksi",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white/60 divide-y divide-gray-100">
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {supplier.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {supplier.contact_person || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {supplier.phone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 truncate max-w-xs">
                        {supplier.address || "-"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {isAdmin ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEditClick(supplier)}
                              className="!px-2 !py-1"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteClick(supplier)}
                              className="!px-2 !py-1"
                            >
                              🗑️
                            </Button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">🔒</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4">
                <div className="text-sm text-gray-500">
                  Halaman{" "}
                  <span className="font-bold text-indigo-600">
                    {currentPage}
                  </span>{" "}
                  dari <span className="font-bold">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    size="sm"
                    variant="secondary"
                  >
                    &laquo; Prev
                  </Button>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    size="sm"
                    variant="secondary"
                  >
                    Next &raquo;
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

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
