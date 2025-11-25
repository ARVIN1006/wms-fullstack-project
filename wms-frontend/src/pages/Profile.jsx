import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// --- DEFINISI SKEMA VALIDASI YUP BARU ---
const passwordSchema = yup.object().shape({
    oldPassword: yup.string().required('Password lama wajib diisi.'),
    newPassword: yup.string()
        .min(6, 'Password baru minimal 6 karakter.')
        .required('Password baru wajib diisi.'),
    confirmNewPassword: yup.string()
        .oneOf([yup.ref('newPassword'), null], 'Konfirmasi password harus sama dengan password baru.')
        .required('Konfirmasi password wajib diisi.'),
});
// --- END SCHEMA ---

function Profile() {
  // Ambil data yang tersimpan dari context
  const { userRole, token, logout } = useAuth();
  
  // RHF Hook
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUsernameFromToken = (token) => {
    try {
      if (!token) return 'Pengguna';
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      // Perhatikan bahwa username sudah ditambahkan ke payload di authRoutes.js
      return decodedPayload.user.username || 'Admin/Staff'; 
    } catch (e) {
      return 'Pengguna Tidak Dikenal';
    }
  };

  const currentUsername = getUsernameFromToken(token);

  const onSubmitPassword = async (data) => {
    setIsSubmitting(true);
    try {
        // Panggil API PUT /api/auth/password yang baru
        await axios.put('/api/auth/password', {
            oldPassword: data.oldPassword,
            newPassword: data.newPassword,
            newPasswordConfirm: data.confirmNewPassword
        });

        toast.success('Kata sandi berhasil diubah. Silakan login kembali.');
        
        // Logout untuk memaksa token baru
        logout();

    } catch (err) {
        const errorMsg = err.response?.data?.msg || 'Gagal mengubah kata sandi.';
        toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
        reset(); // Clear form
    }
  };
  
  // Helper untuk menampilkan error
  const ErrorMessage = ({ error }) => {
    return error ? <p className="text-red-500 text-xs mt-1">{error.message}</p> : null;
  };


  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">👤 Profil Pengguna</h1>

      <div className="space-y-6 mb-8">
        {/* Username Card */}
        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-sm text-blue-700 font-medium">Username:</p>
          <p className="text-xl font-semibold text-gray-800">{currentUsername}</p>
        </div>

        {/* Role Card */}
        <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
          <p className="text-sm text-green-700 font-medium">Hak Akses (Role):</p>
          <p className="text-xl font-semibold text-gray-800">
            {userRole?.toUpperCase() || 'N/A'}
          </p>
        </div>
      </div>
      
      {/* --- FORM UBAH PASSWORD BARU --- */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4 border-t pt-4">Ganti Kata Sandi</h2>
      
      <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
        
        {/* Password Lama */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
            <input 
                type="password" 
                {...register('oldPassword')} 
                className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.oldPassword ? 'border-red-500' : 'border-gray-300'}`} 
            />
            <ErrorMessage error={errors.oldPassword} />
        </div>
        
        {/* Password Baru */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru (Min. 6 Karakter)</label>
            <input 
                type="password" 
                {...register('newPassword')} 
                className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.newPassword ? 'border-red-500' : 'border-gray-300'}`} 
            />
            <ErrorMessage error={errors.newPassword} />
        </div>
        
        {/* Konfirmasi Password Baru */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <input 
                type="password" 
                {...register('confirmNewPassword')} 
                className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.confirmNewPassword ? 'border-red-500' : 'border-gray-300'}`} 
            />
            <ErrorMessage error={errors.confirmNewPassword} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400"
        >
          {isSubmitting ? 'Mengubah...' : 'Ubah Kata Sandi'}
        </button>
      </form>
      
    </div>
  );
}

export default Profile;