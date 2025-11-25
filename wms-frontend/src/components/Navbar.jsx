import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useState } from "react";

function Navbar() {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userRole === "admin";
  
  // BARU: State untuk mengontrol menu mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil!");
    navigate("/login");
  };

  // Komponen Dropdown Sederhana (Menggunakan State untuk Kontrol Stabilitas)
  const DropdownMenu = ({ title, children }) => {
    // Gunakan state lokal agar dropdown tetap fungsional di desktop
    const [isMenuOpen, setIsMenuOpen] = useState(false); 

    return (
      <div
        className="relative py-1 md:py-5 md:-my-2" // Adjust padding for mobile list item
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => setIsMenuOpen(false)}
      >
        <button className="flex items-center hover:text-blue-200 transition focus:outline-none py-2 md:py-0">
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
            className="md:absolute left-0 mt-1 md:mt-3 w-48 bg-white text-gray-800 rounded-md shadow-lg 
                        transition duration-150 ease-in-out z-30 md:block" // Force block display for mobile
          >
            <div className="py-1">{children}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold flex items-center gap-2">
          📦 Simple WMS
        </Link>
        
        {/* Tombol Toggle Menu Mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
          </svg>
        </button>


        {/* KONTEN MENU UTAMA (Desktop: flex, Mobile: hidden/flex-col) */}
        <div 
            className={`${isMobileMenuOpen ? 'flex flex-col' : 'hidden'} 
                       md:flex md:flex-row md:items-center 
                       w-full md:w-auto mt-3 md:mt-0 space-y-2 md:space-y-0`}
        >
            
            {/* Menu Link Kiri (Utama & Dropdown) */}
            <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-6 w-full md:w-auto">
              <Link to="/" className="hover:text-blue-200 transition py-1 md:py-0">
                Dashboard
              </Link>
              <Link to="/transactions" className="hover:text-blue-200 transition py-1 md:py-0">
                Transaksi
              </Link>
              <Link to="/movements" className="hover:text-blue-200 transition py-1 md:py-0">
                Perpindahan
              </Link>
              <Link
                to="/stock-opname"
                className="hover:text-blue-200 transition py-1 md:py-0 text-yellow-300 font-bold"
              >
                Stock Opname
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
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-1 md:space-y-0 md:space-x-4 pt-3 md:pt-0 mt-3 md:mt-0 border-t md:border-t-0 w-full md:w-auto">
              <Link
                to="/profile"
                className="hover:text-blue-200 transition text-sm py-1 md:py-0"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="bg-blue-500 hover:bg-blue-400 text-white font-medium py-2 px-4 rounded transition w-full md:w-auto"
              >
                Logout
              </button>
            </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;