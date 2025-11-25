import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
// --- BARU: Import Hook Form dan Yup ---
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Opsi Role
const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'staff', label: 'Staff' },
];

// --- DEFINISI SKEMA VALIDASI YUP ---
const validationSchema = yup.object().shape({
    username: yup.string().required('Username wajib diisi.'),
    // Password hanya wajib diisi saat mode CREATE
    password: yup.string().when((value, schema) => {
        if (!schema.options.context?.isEditing) {
            return yup.string().min(6, 'Password minimal 6 karakter.').required('Password wajib diisi untuk user baru.');
        }
        return yup.string().min(6, 'Password minimal 6 karakter jika diubah.').nullable(); // Opsional saat edit
    }),
    role: yup.object().required('Role wajib dipilih.'),
});


function UserForm({ onSave, onClose, userToEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // --- BARU: INISIALISASI REACT HOOK FORM ---
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch,
    formState: { errors } 
  } = useForm({
    resolver: yupResolver(validationSchema),
    // Kirim context 'isEditing' ke Yup untuk validasi bersyarat
    context: { isEditing: !!userToEdit }, 
    defaultValues: {
        username: '',
        password: '',
        role: roleOptions[1], // Default Staff
    }
  });

  const selectedRole = watch('role');

  // Efek untuk mengisi form saat mode Edit
  useEffect(() => {
    if (userToEdit) {
      setIsEditing(true);
      // Mengisi nilai dengan setValue dari RHF
      setValue('username', userToEdit.username);
      // Mencari opsi role yang sesuai
      const defaultRole = roleOptions.find(r => r.value === userToEdit.role);
      setValue('role', defaultRole || roleOptions[1]);
      // Reset password field
      setValue('password', '');
    } else {
      setIsEditing(false);
      // Reset form ke default values saat mode Add
      setValue('username', '');
      setValue('password', '');
      setValue('role', roleOptions[1]); 
    }
  }, [userToEdit, setValue]);

  // Fungsi saat tombol Simpan diklik (MENGGUNAKAN RHF handleSubmit)
  const onSubmit = (data) => {
    // Data yang dikirim ke AdminControl
    const payload = {
        id: userToEdit?.id,
        username: data.username,
        role: data.role.value,
    };

    // Hanya tambahkan password jika mode CREATE atau jika password diisi saat EDIT
    if (!isEditing || data.password) {
        payload.password = data.password;
    }

    onSave(payload);
  };

  // Helper untuk menampilkan error
  const ErrorMessage = ({ error }) => {
    return error ? <p className="text-red-500 text-xs mt-1">{error.message}</p> : null;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? 'Edit Hak Akses User' : 'Tambah User Baru'}
        </h2>
        
        {/* MENGGUNAKAN handleSubmit DARI RHF */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Username (Disabled saat edit) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              {...register('username')} // Integrasi RHF
              disabled={isEditing}
              className={`w-full px-3 py-2 border rounded-md shadow-sm bg-gray-50 ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
            />
            <ErrorMessage error={errors.username} />
          </div>
          
          {/* Password (Wajib untuk CREATE, Opsional untuk EDIT) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {isEditing ? '(Isi jika ingin diubah)' : '*'}
            </label>
            <input
              type="password"
              {...register('password')} // Integrasi RHF
              className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
            />
            <ErrorMessage error={errors.password} />
          </div>

          {/* Role */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hak Akses (Role) *</label>
            <Select
                options={roleOptions}
                value={selectedRole}
                onChange={(option) => setValue('role', option)} // Update RHF value
                classNamePrefix="react-select"
                placeholder="Pilih Role..."
            />
            <ErrorMessage error={errors.role} />
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
              {isEditing ? 'Update User' : 'Tambah User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserForm;