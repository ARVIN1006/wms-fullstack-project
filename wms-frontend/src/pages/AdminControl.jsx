import { useState } from 'react'; // Hapus useEffect
import axios from 'axios';
import { toast } from 'react-hot-toast';
import UserForm from '../components/UserForm';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
// BARU: Import hook useMasterData
import { useMasterData } from '../hooks/useMasterData';

// --- KOMPONEN SKELETON BARU ---
const AdminControlSkeleton = () => {
    // 4 Kolom: Username, Role, Created At, Aksi
    const columns = 4; 
    
    const TableRowSkeleton = () => (
        <tr className="border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <div className={`h-4 bg-gray-300 rounded skeleton-shimmer ${i === 3 ? 'w-1/3' : 'w-1/2'}`}></div>
                </td>
            ))}
        </tr>
    );

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg relative animate-pulse"> 
            
            {/* Header & Button Skeleton */}
            <div className="flex justify-between items-center mb-6">
                <div className="h-8 bg-gray-300 rounded w-1/4 skeleton-shimmer"></div>
                <div className="h-10 bg-blue-300 rounded w-40 skeleton-shimmer"></div>
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
                        {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
// --- END KOMPONEN SKELETON ---

function AdminControl() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const { userRole, userId: currentUserId } = useAuth();
  
  // PERUBAHAN KRITIS: Menggantikan useState dan useEffect dengan hook
  const { data: users, loading, refetch: fetchUsers } = useMasterData(
    userRole === 'admin' ? '/api/users' : null // Hanya fetch jika role adalah admin
  );


  // Handlers Modal & CRUD
  const handleCloseFormModal = () => { setIsFormModalOpen(false); setEditingUser(null); };
  const handleAddClick = () => { setEditingUser(null); setIsFormModalOpen(true); };
  
  const handleEditClick = (user) => { 
    setEditingUser(user);
    setIsFormModalOpen(true); 
  };

  const handleSaveUser = async (userData) => {
    try {
      if (userData.id) {
        // UPDATE
        await axios.put(`/api/users/${userData.id}`, userData);
        toast.success('Hak akses pengguna berhasil diupdate!');
      } else {
        // CREATE / REGISTER
        await axios.post('/api/auth/register', userData);
        toast.success('Pengguna baru berhasil ditambahkan!');
      }
      handleCloseFormModal();
      fetchUsers(); // Panggil fungsi refetch dari hook
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menyimpan data pengguna.');
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

  const handleCloseConfirmModal = () => { setIsConfirmModalOpen(false); setUserToDelete(null); };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      toast.success(`Pengguna ${userToDelete.username} berhasil dihapus.`);
      fetchUsers(); // Panggil fungsi refetch dari hook
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menghapus pengguna.');
    } finally {
      handleCloseConfirmModal();
    }
  };
  
  if (userRole !== 'admin') {
      return <div className="p-6">Anda tidak memiliki akses ke halaman ini.</div>;
  }

  // --- RENDER UTAMA ---
  if (loading) {
    return <AdminControlSkeleton />; // Tampilkan Skeleton saat loading
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative"> 
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Admin Control: Manajemen User</h1>
        <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          + Tambah User Baru
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-gray-500">Tidak ada pengguna lain terdaftar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibuat Pada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(users || []).map((user) => (
                <tr key={user.id} className={user.id === currentUserId ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{user.username} {user.id === currentUserId && '(Anda)'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                      onClick={() => handleEditClick(user)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit Role
                    </button>
                    {user.id !== currentUserId && (
                      <button 
                        onClick={() => handleDeleteClick(user)} 
                        className="text-red-600 hover:text-red-900"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          message={`Apakah Anda yakin ingin menghapus pengguna "${userToDelete?.username}"?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default AdminControl;