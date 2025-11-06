import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // <-- 1. IMPOR useAuth
import { toast } from "react-hot-toast"; // Impor toast untuk notifikasi

function Navbar() {
  const { logout } = useAuth(); // <-- 2. AMBIL FUNGSI LOGOUT
  const navigate = useNavigate();

  // <-- 3. BUAT FUNGSI HANDLE LOGOUT
  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil!");
    navigate("/login"); // Arahkan kembali ke halaman login
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo / Nama Aplikasi */}
        <Link to="/" className="text-xl font-bold flex items-center gap-2">
          📦 Simple WMS
        </Link>

        {/* Menu Link Kiri */}
        <div className="space-x-4">
          <Link to="/" className="hover:text-blue-200 transition">
            Dashboard
          </Link>
          <Link to="/suppliers" className="hover:text-blue-200 transition">
            Supplier
          </Link>
          <Link to="/products" className="hover:text-blue-200 transition">
            Produk
          </Link>
          <Link to="/transactions" className="hover:text-blue-200 transition">
            Transaksi
          </Link>
          <Link to="/reports" className="hover:text-blue-200 transition">
            Laporan
          </Link>
        </div>

        {/* Tombol Logout Kanan */}
        <div>
          <button
            onClick={handleLogout} // <-- 4. PASANG FUNGSI DI TOMBOL
            className="bg-blue-500 hover:bg-blue-400 text-white font-medium py-2 px-4 rounded transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
