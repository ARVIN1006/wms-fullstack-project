import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import CustomerForm from "../../components/CustomerForm";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import ExportButton from "../../components/ExportButton";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

const LIMIT_PER_PAGE = 10;

// --- KOMPONEN SKELETON BARU ---
const CustomerListSkeleton = () => {
  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-300 rounded w-64"></div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-300 rounded w-64"></div>
          <div className="h-10 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
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
  const [searchQuery, setSearchQuery] = useState("");

  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  const {
    data: customers,
    loading,
    refresh,
    currentPage,
    totalPages,
    handlePageChange,
    handleSearchSubmit: hookHandleSearchSubmit,
    refreshCurrentPage,
  } = usePaginatedList("/api/customers", LIMIT_PER_PAGE, "");

  // --- FUNGSI EKSPOR CSV ---
  const getExportData = () => {
    return customers.map((c) => ({
      name: c.name,
      contact_person: c.contact_person || "-",
      phone: c.phone || "-",
      address: c.address || "-",
    }));
  };

  const customerHeaders = [
    { label: "Nama Pelanggan", key: "name" },
    { label: "Contact Person", key: "contact_person" },
    { label: "Telepon", key: "phone" },
    { label: "Alamat", key: "address" },
  ];

  // --- HANDLERS CRUD ---

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingCustomer(null);
  };
  const handleAddClick = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (customer) => {
    if (!isAdmin) return;
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  const handleSaveCustomer = async (customerData) => {
    if (!isAdmin) return;
    try {
      if (customerData.id) {
        await axios.put(`/api/customers/${customerData.id}`, customerData);
        toast.success("Pelanggan berhasil diupdate!");
        refreshCurrentPage();
      } else {
        await axios.post("/api/customers", customerData);
        toast.success("Pelanggan baru berhasil ditambahkan!");
        refresh();
      }
      handleCloseFormModal();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menyimpan pelanggan.");
    }
  };

  const handleDeleteClick = (customer) => {
    if (!isAdmin) return;
    setCustomerToDelete(customer);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setCustomerToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await axios.delete(`/api/customers/${customerToDelete.id}`);
      toast.success(`Pelanggan "${customerToDelete.name}" berhasil dihapus.`);

      if (customers.length === 1 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else {
        refreshCurrentPage();
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menghapus pelanggan.");
    } finally {
      handleCloseConfirmModal();
    }
  };

  // --- Handler Search UI ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    hookHandleSearchSubmit(searchQuery);
  };

  // --- RENDER UTAMA ---
  if (loading) {
    return <CustomerListSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Manajemen Pelanggan
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Data pelanggan dan relasi
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {isAdmin && (
            <Button onClick={handleAddClick} variant="primary" startIcon="+">
              Pelanggan Baru
            </Button>
          )}

          <ExportButton
            data={getExportData}
            headers={customerHeaders}
            filename={`Master_Pelanggan_${new Date()
              .toISOString()
              .slice(0, 10)}.csv`}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-emerald-500/30"
          >
            Ekspor CSV
          </ExportButton>
        </div>
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
              placeholder="Cari Nama Pelanggan..."
              className="w-full md:w-64"
            />
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>
        </div>

        {/* Tabel */}
        {customers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Tidak ada data pelanggan.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80 backdrop-blur-sm">
                  <tr>
                    {[
                      "Nama Pelanggan",
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
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {customer.contact_person || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {customer.phone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {customer.address || "-"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {isAdmin ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEditClick(customer)}
                              className="!px-2 !py-1"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteClick(customer)}
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
