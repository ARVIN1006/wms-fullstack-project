import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import UserForm from "../../components/UserForm";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { useMasterData } from "../../hooks/useMasterData";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";

// --- KOMPONEN SKELETON ---
const AdminControlSkeleton = () => {
  return (
    <Card className="animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded w-40"></div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>
        ))}
      </div>
    </Card>
  );
};

function AdminControl() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const { userRole, userId: currentUserId } = useAuth();

  const {
    data: users,
    loading,
    refetch: fetchUsers,
  } = useMasterData(userRole === "admin" ? "/api/users" : null);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingUser(null);
  };
  const handleAddClick = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      if (userData.id) {
        await axios.put(`/api/users/${userData.id}`, userData);
        toast.success("Hak akses pengguna berhasil diupdate!");
      } else {
        await axios.post("/api/auth/register", userData);
        toast.success("Pengguna baru berhasil ditambahkan!");
      }
      handleCloseFormModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menyimpan data pengguna.");
    }
  };

  const handleDeleteClick = (user) => {
    if (user.id === currentUserId) {
      toast.error("Anda tidak bisa menghapus akun Anda sendiri.");
      return;
    }
    setUserToDelete(user);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setUserToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      toast.success(`Pengguna ${userToDelete.username} berhasil dihapus.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menghapus pengguna.");
    } finally {
      handleCloseConfirmModal();
    }
  };

  if (userRole !== "admin") {
    return (
      <Card className="text-center p-12">
        <h2 className="text-xl font-bold text-gray-800">Akses Ditolak</h2>
        <p className="text-gray-500 mt-2">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
      </Card>
    );
  }

  if (loading) {
    return <AdminControlSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            ⚙️ Admin Control
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manajemen pengguna dan hak akses sistem
          </p>
        </div>
        <Button onClick={handleAddClick} variant="primary" size="lg">
          + Tambah User
        </Button>
      </div>

      <Card
        noPadding
        className="border border-gray-100 overflow-hidden shadow-lg shadow-indigo-100/50"
      >
        {users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Tidak ada pengguna lain terdaftar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Dibuat Pada
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-100">
                {(users || []).map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-indigo-50/30 transition-colors ${
                      user.id === currentUserId ? "bg-amber-50/50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            user.role === "admin"
                              ? "bg-gradient-to-br from-indigo-500 to-purple-500"
                              : "bg-gradient-to-br from-teal-400 to-emerald-500"
                          }`}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        {user.username}
                        {user.id === currentUserId && (
                          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-bold ml-1">
                            (Anda)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        variant={user.role === "admin" ? "primary" : "success"}
                      >
                        {user.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString("id-ID", {
                        dateStyle: "long",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button
                        onClick={() => handleEditClick(user)}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      {user.id !== currentUserId && (
                        <Button
                          onClick={() => handleDeleteClick(user)}
                          variant="danger"
                          size="sm"
                        >
                          Hapus
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Form */}
      {isFormModalOpen && (
        <UserForm
          onClose={handleCloseFormModal}
          onSave={handleSaveUser}
          userToEdit={editingUser}
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {isConfirmModalOpen && (
        <ConfirmModal
          title="Hapus Pengguna"
          message={`Apakah Anda yakin ingin menghapus pengguna "${userToDelete?.username}"? Aksi ini tidak dapat dibatalkan.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
          confirmText="Ya, Hapus Permanen"
          cancelText="Batal"
          variant="danger"
        />
      )}
    </div>
  );
}

export default AdminControl;
