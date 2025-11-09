import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useState } from "react"; // <-- Wajib diimpor untuk DropdownMenu

function Navbar() {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userRole === "admin";

  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil!");
    navigate("/login");
  };

  // Komponen Dropdown Sederhana (Menggunakan State untuk Kontrol Stabilitas)
  const DropdownMenu = ({ title, children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State untuk mengontrol buka/tutup

    return (
      <div
        className="relative py-5 -my-2"
        onMouseEnter={() => setIsMenuOpen(true)} // Mouse masuk, buka
        onMouseLeave={() => setIsMenuOpen(false)} // Mouse keluar, tutup
      >
        <button className="flex items-center hover:text-blue-200 transition focus:outline-none">
          {title}
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Render hanya jika isMenuOpen true */}
        {isMenuOpen && (
          <div
            className="absolute left-0 mt-3 w-48 bg-white text-gray-800 rounded-md shadow-lg 
                        transition duration-150 ease-in-out z-30"
          >
            <div className="py-1">{children}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold flex items-center gap-2">
          📦 Simple WMS
        </Link>

        {/* Menu Link Kiri (Utama & Dropdown) */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="hover:text-blue-200 transition">
            Dashboard
          </Link>
          <Link to="/transactions" className="hover:text-blue-200 transition">
            Transaksi
          </Link>
          <Link to="/movements" className="hover:text-blue-200 transition px-3">
            Perpindahan
          </Link>
          {/* 1. GRUP MASTER DATA (Hanya Admin) */}
          {isAdmin && (
            <DropdownMenu title="Master Data">
              <Link
                to="/products"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Produk
              </Link>
              <Link
                to="/suppliers"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Supplier
              </Link>
              <Link
                to="/customers"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Pelanggan
              </Link>
              <Link
                to="/locations"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Lokasi
              </Link>
            </DropdownMenu>
          )}

          {/* 2. GRUP ADMINISTRASI (Hanya Admin) */}
          {isAdmin && (
            <DropdownMenu title="Administrasi">
              <Link
                to="/reports"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Laporan Transaksi (IN/OUT)
              </Link>
              <Link
                to="/reports/movement"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Laporan Perpindahan
              </Link>
              <Link
                to="/reports/performance"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Laporan Kinerja
              </Link>
              <Link
                to="/reports/customer-order"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Laporan Pelanggan
              </Link>
              <Link
                to="/reports/activity"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Laporan Aktivitas User
              </Link>
              <Link
                to="/reports/status-inventory"
                className="block px-4 py-2 text-sm hover:bg-gray-100 text-yellow-700"
              >
                Laporan Stok Rusak
              </Link>

              <Link
                to="/reports/financial"
                className="block px-4 py-2 text-sm hover:bg-gray-100 font-medium text-green-700"
              >
                Laporan Keuangan
              </Link>
              <div className="border-t my-1"></div>
              <Link
                to="/admin"
                className="block px-4 py-2 text-sm hover:bg-gray-100 font-medium text-red-600"
              >
                Admin Control
              </Link>
            </DropdownMenu>
          )}
        </div>

        {/* Menu Kanan (Profile & Logout) */}
        <div className="flex items-center space-x-4">
          <Link
            to="/profile"
            className="hover:text-blue-200 transition text-sm"
          >
            Profile
          </Link>
          <button
            onClick={handleLogout}
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
