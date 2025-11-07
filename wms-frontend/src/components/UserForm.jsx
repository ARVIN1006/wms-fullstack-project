import { useState, useEffect } from 'react';

const roleOptions = [
  { value: 'admin', label: 'Admin (Hak Akses Penuh)' },
  { value: 'staff', label: 'Staff (Hanya Transaksi)' },
];

function UserForm({ onSave, onClose, userToEdit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(roleOptions[1]); // Default: Staff
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setIsEditing(true);
      setUsername(userToEdit.username);
      // Atur role berdasarkan data userToEdit
      const initialRole = roleOptions.find(opt => opt.value === userToEdit.role) || roleOptions[1];
      setRole(initialRole);
    } else {
      setIsEditing(false);
    }
  }, [userToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Jika menambah user baru, password wajib diisi
    if (!isEditing && (!username || !password)) {
      alert('Username dan Password wajib diisi!');
      return;
    }
    
    // Jika mengedit, password boleh kosong (tidak diubah)
    if (isEditing && !username) {
        alert('Username wajib diisi!');
        return;
    }

    onSave({ 
      id: userToEdit?.id, 
      username, 
      password: password || undefined, // Hanya kirim password jika diisi
      role: role.value,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? 'Edit User' : 'Buat User Baru'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          
          {/* Password (Wajib untuk new, opsional untuk edit) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {isEditing ? '(Kosongkan jika tidak diubah)' : '*'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required={!isEditing}
            />
          </div>

          {/* Role */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            {/* Kita pakai select biasa karena datanya sedikit dan statis */}
            <select
              value={role.value}
              onChange={(e) => setRole(roleOptions.find(opt => opt.value === e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            >
                {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
          </div>

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserForm;