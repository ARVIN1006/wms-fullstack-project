import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useState } from "react";

function Navbar() {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userRole === "admin";
  
  // State untuk mengontrol menu mobile (hamburger)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil!");
    navigate("/login");
  };

  // Komponen Dropdown Sederhana (FIXED: Menggunakan CLICK untuk Toggle & Positioning)
  const DropdownMenu = ({ title, children }) => {
    // State lokal untuk mengontrol menu dropdown (dipertahankan)
    const [isMenuOpen, setIsMenuOpen] = useState(false); 

    const toggleMenu = (e) => {
        // Untuk mobile/desktop, klik tombol akan toggle menu
        e.preventDefault(); 
        setIsMenuOpen(prev => !prev);
    };
    
    const handleLinkClick = () => {
        // Tutup menu saat link diklik (opsional, untuk UX)
        setIsMenuOpen(false);
        setIsMobileMenuOpen(false); // Tutup menu utama juga
    }

    return (
      <div
        className="relative w-full md:w-auto" // w-full di mobile
        onMouseEnter={() => setIsMenuOpen(true)} // Hover tetap berfungsi di desktop
        onMouseLeave={() => setIsMenuOpen(false)} // Hover tetap berfungsi di desktop
      >
        <button 
          onClick={toggleMenu} // Toggle dengan klik (Wajib untuk mobile/accessibility)
          className="flex items-center justify-between w-full transition focus:outline-none py-2 md:py-0 
                     text-left md:text-center text-gray-200 hover:text-indigo-400 border-b-2 border-transparent hover:border-indigo-400"
        >
          {title}
          <svg
            className={`w-4 h-4 ml-1 transform transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {/* Dropdown Content */}
        {isMenuOpen && (
          <div
            className="w-full md:absolute left-0 mt-2 md:mt-3 md:w-56 bg-gray-800 md:bg-white text-gray-200 md:text-gray-800 rounded-lg shadow-2xl py-2 z-30" 
          >
            {/* Map children untuk menambahkan onClick handler */}
            <div className="flex flex-col">
                {/* Clone children dan tambahkan handler */}
                {children.map((child, index) => 
                    <div key={index} onClick={handleLinkClick}>
                        {child}
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper untuk Link Utama
  const MainLink = ({ to, children, className = "" }) => (
      <Link 
          to={to} 
          onClick={() => setIsMobileMenuOpen(false)} // Tutup menu saat navigasi
          className={`link-hover-effect ${className}`}
      >
          {children}
      </Link>
  );

  return (
    <nav className="bg-gray-900 text-gray-200 shadow-xl">
      <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center">
        {/* Logo (Aksen Warna Teal) */}
        <Link to="/" className="text-xl font-bold flex items-center gap-2 text-teal-400">
          📦 Simple WMS
        </Link>
        
        {/* Tombol Toggle Menu Mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 focus:outline-none text-gray-200 hover:text-teal-400 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
          </svg>
        </button>


        {/* KONTEN MENU UTAMA */}
        <div 
            className={`${isMobileMenuOpen ? 'flex flex-col' : 'hidden'} 
                       md:flex md:flex-row md:items-center 
                       w-full md:w-auto mt-3 md:mt-0 space-y-2 md:space-y-0`}
        >
            
            {/* Menu Link Kiri (Utama & Dropdown) */}
            <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-6 w-full md:w-auto">
              
              <MainLink to="/">Dashboard</MainLink>
              <MainLink to="/transactions">Transaksi</MainLink>
              <MainLink to="/movements">Perpindahan</MainLink>
              <MainLink to="/stock-opname" className="text-yellow-400 font-bold">Stock Opname</MainLink>
              
              {/* 1. GRUP MASTER DATA (Hanya Admin) */}
              {isAdmin && (
                <DropdownMenu title="Master Data">
                  <Link to="/products" className="block px-4 py-2 text-sm hover:bg-gray-100 hover:text-indigo-600">Produk</Link>
                  <Link to="/suppliers" className="block px-4 py-2 text-sm hover:bg-gray-100 hover:text-indigo-600">Supplier</Link>
                  <Link to="/customers" className="block px-4 py-2 text-sm hover:bg-gray-100 hover:text-indigo-600">Pelanggan</Link>
                  <Link to="/locations" className="block px-4 py-2 text-sm hover:bg-gray-100 hover:text-indigo-600">Lokasi</Link>
                </DropdownMenu>
              )}

              {/* 2. GRUP ADMINISTRASI (Hanya Admin) */}
              {isAdmin && (
                <DropdownMenu title="Laporan">
                  <Link to="/reports" className="block px-4 py-2 text-sm hover:bg-gray-100">Transaksi (IN/OUT)</Link>
                  <Link to="/reports/movement" className="block px-4 py-2 text-sm hover:bg-gray-100">Perpindahan</Link>
                  <Link to="/reports/performance" className="block px-4 py-2 text-sm hover:bg-gray-100">Kinerja Operator</Link>
                  <Link to="/reports/customer-order" className="block px-4 py-2 text-sm hover:bg-gray-100">Pelanggan & Order</Link>
                  <Link to="/reports/activity" className="block px-4 py-2 text-sm hover:bg-gray-100">Aktivitas User</Link>
                  <Link to="/reports/status-inventory" className="block px-4 py-2 text-sm hover:bg-gray-100 text-yellow-700">Stok Bermasalah</Link>
                  
                  <div className="border-t my-1"></div>
                  <Link to="/reports/financial" className="block px-4 py-2 text-sm hover:bg-gray-100 font-medium text-green-700">Laporan Keuangan</Link>
                </DropdownMenu>
              )}
            </div>
            
            {/* Menu Kanan (Profile & Logout) - DENGAN PEMISAH GARIS */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-1 md:space-y-0 md:space-x-4 pt-3 md:pt-0 mt-3 md:mt-0 
                          border-t md:border-t-0 md:border-l md:border-gray-700 md:pl-6 w-full md:w-auto">
              <MainLink to="/profile" className="text-sm py-1 md:py-0">Profile</MainLink>
              
              <button
                onClick={handleLogout}
                // Styling tombol Logout yang menonjol
                className="bg-teal-500 hover:bg-teal-600 text-gray-900 font-bold py-2 px-4 rounded transition w-full md:w-auto shadow-lg"
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