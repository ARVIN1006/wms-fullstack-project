import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth(); // Ambil status login dari context

  if (!isAuthenticated) {
    // 1. Jika tidak login (token tidak ada)
    // "Tendang" pengguna ke halaman /login
    return <Navigate to="/login" replace />;
  }

  // 2. Jika sudah login
  // Tampilkan halaman yang diminta (misal: Dashboard, Produk, dll.)
  // <Outlet /> adalah placeholder untuk halaman tersebut
  return <Outlet />;
}

export default ProtectedRoute;