import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import UserForm from "../components/UserForm";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// Helper function untuk decode JWT dan mengambil username
const getUsernameFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    const decodedPayload = JSON.parse(atob(payload)); // atob untuk base64 decode
    return decodedPayload.user.username; // Mengambil username dari token
  } catch (e) {
    return null;
  }
};

function AdminControl() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const { userRole, token } = useAuth(); // FIX: Hanya ambil userRole dan token
  const navigate = useNavigate();

  const currentUsername = getUsernameFromToken(token); // BARU: Dapatkan username saat ini
  const [adminCount, setAdminCount] = useState(0); // State untuk menghitung Admin

  // **********************************************
  // PERBAIKAN 1: Gunakan useRef untuk melacak status mounting
  // **********************************************
  const isMountedRef = useRef(true); 

  // Redirect jika bukan admin (walaupun backend sudah jaga)
  useEffect(() => {
    if (userRole && userRole !== "admin") {
      toast.error("Akses ditolak. Hanya Admin yang bisa melihat halaman ini.");
      navigate("/");
    }
  }, [userRole, navigate]); // Dipanggil saat role user berubah

  // Fetch semua users
  // **********************************************
  // PERBAIKAN 2: Cek isMountedRef.current sebelum set state
  // **********************************************
  async function fetchUsers() {
    if (userRole !== "admin") return;
    try {
      // Hanya set loading jika komponen masih terpasang
      if (isMountedRef.current) setLoading(true);
      
      // Panggil API users
      const response = await axios.get("/api/users");
      const allUsers = response.data;

      if (isMountedRef.current) { // Cek sebelum set state
        // Hitung jumlah admin yang ada
        const currentAdminCount = allUsers.filter(
          (u) => u.role === "admin"
        ).length;
        setAdminCount(currentAdminCount);

        setUsers(allUsers); // <-- Hanya dipanggil jika isMountedRef.current
      }
    } catch (err) {
      if (isMountedRef.current) {
        toast.error(err.response?.data?.msg || "Gagal memuat data users.");
      }
    } finally {
      if (isMountedRef.current) setLoading(false); // <-- Hanya dipanggil jika isMountedRef.current
    }
  }

  // Efek untuk memuat data saat token/role berubah
  useEffect(() => {
    isMountedRef.current = true; // Set ke true saat mount/dependencies berubah
    fetchUsers();
    
    // **********************************************
    // PERBAIKAN 3: Cleanup Function
    // **********************************************
    return () => {
      isMountedRef.current = false; // Set ke false saat unmount
    };
  }, [token, userRole]);

  // Handlers CRUD
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
        // Edit User (Gunakan API PUT)
        await axios.put(`/api/users/${userData.id}`, userData);
        toast.success("Role/User berhasil diupdate!");
      } else {
        // Buat User Baru (Gunakan API register yang sudah dikunci Admin)
        await axios.post("/api/auth/register", userData);
        toast.success("User baru berhasil didaftarkan!");
      }
      handleCloseFormModal();
      fetchUsers(); // Panggil ulang untuk refresh data
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menyimpan user.");
    }
  };

  const handleDeleteClick = (user) => {
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
      toast.success(`User "${userToDelete.username}" berhasil dihapus.`);
      fetchUsers(); // Panggil ulang untuk refresh data
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menghapus user.");
    } finally {
      handleCloseConfirmModal();
    }
  };

  // Fungsi yang digunakan saat render untuk cek status admin
  const isLastAdmin = (user) => {
    // Admin terakhir adalah Admin yang sedang dilihat DAN jumlah admin total <= 1
    return user.role === "admin" && adminCount <= 1;
  };

  const isCurrentUser = (user) => {
    // Periksa apakah user yang sedang dilihat adalah user yang sedang login
    return user.username === currentUsername; // FIXED: Menggunakan username yang sudah didecode dari token
  };

  if (userRole !== "admin") {
    return null; // Akan di-redirect oleh useEffect jika bukan admin
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Admin Control Panel
        </h1>

        <button
          onClick={handleAddClick}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          + Buat Akun Baru
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dibuat Pada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.username}{" "}
                    {isCurrentUser(user) && (
                      <span className="text-xs text-blue-500">(Anda)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditClick(user)}
                      disabled={isLastAdmin(user)} // DISABLE JIKA ADMIN TERAKHIR
                      className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
                    >
                      Edit Role
                    </button>

                    <button
                      onClick={() => handleDeleteClick(user)}
                      disabled={isCurrentUser(user) || isLastAdmin(user)} // DISABLE JIKA ADMIN TERAKHIR ATAU DIRI SENDIRI
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                    >
                      Hapus
                    </button>

                    {isLastAdmin(user) && (
                      <span className="text-xs text-red-500 ml-2">
                        (Admin Terakhir)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form Tambah/Edit */}
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
          title="Hapus User"
          message={`Apakah Anda yakin ingin menghapus user "${userToDelete?.username}"? Aksi ini tidak dapat dibatalkan.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default AdminControl;