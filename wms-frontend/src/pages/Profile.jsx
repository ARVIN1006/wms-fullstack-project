import { useAuth } from '../context/AuthContext';

function Profile() {
  // Ambil data yang tersimpan dari context
  const { userRole, token } = useAuth();
  
  // Karena user data (id, username, role) ada di dalam token,
  // kita perlu mengambil data username dan id dari token.
  
  // Catatan: Karena kita tidak menyimpan username di state, 
  // kita bisa membuatnya tersedia di context. Untuk sekarang, 
  // kita buat versi sederhana yang menampilkan role.
  
  const getUsernameFromToken = (token) => {
    try {
      if (!token) return 'Pengguna';
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      return decodedPayload.user.username || 'Admin/Staff';
    } catch (e) {
      return 'Pengguna Tidak Dikenal';
    }
  };

  const currentUsername = getUsernameFromToken(token);

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">👤 Profil Pengguna</h1>

      <div className="space-y-4">
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

        {/* Info Keamanan */}
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-300 text-sm text-yellow-800">
          <p className="font-medium">⚠️ Catatan Keamanan</p>
          <p>Saat ini, perubahan password hanya dapat dilakukan di database.</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;