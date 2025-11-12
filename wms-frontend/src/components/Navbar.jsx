import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useState, useEffect } from "react";

function Navbar() {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  // Pastikan perbandingan case-insensitive
  const isAdmin = userRole?.toLowerCase() === "admin";

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);
  const [isAdminReportOpen, setIsAdminReportOpen] = useState(false);

  // Efek samping: Tutup Dropdown Mobile saat Menu Utama Ditutup atau dibuka
  useEffect(() => {
    if (!isMobileMenuOpen) {
      // Menutup semua dropdown anak saat menu utama mobile ditutup
      setIsMasterDataOpen(false);
      setIsAdminReportOpen(false);
    }
  }, [isMobileMenuOpen]);

  // Fungsi untuk menutup menu mobile dan dropdown ketika link diklik
  const closeAllMenus = () => {
    setIsMobileMenuOpen(false);
    setIsMasterDataOpen(false);
    setIsAdminReportOpen(false);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil!");
    navigate("/login");
  };

  // Komponen pembantu untuk Dropdown Desktop
  const DropdownMenu = ({ title, children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
      <div
        className="relative py-5 -my-2"
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => setIsMenuOpen(false)}
      >
        <button
          className="flex items-center text-sm font-medium hover:text-blue-200 transition-all duration-200 focus:outline-none"
          aria-expanded={isMenuOpen}
          aria-controls={`dropdown-${title.replace(/\s/g, "-").toLowerCase()}`}
        >
          {title}
          <svg
            className="w-4 h-4 ml-1 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isMenuOpen && (
          <div
            id={`dropdown-${title.replace(/\s/g, "-").toLowerCase()}`}
            // Peningkatan: Lebar dan bayangan
            className="absolute left-0 mt-3 w-56 bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-100 z-50 animate-fade-slide origin-top-left"
            role="menu"
            aria-orientation="vertical"
          >
            {/* PERBAIKAN UTAMA: Menambah max-h-[80vh] dan overflow-y-auto di sini */}
            <div className="py-1 max-h-[80vh] overflow-y-auto"> 
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Komponen pembantu untuk Link Mobile
  const MobileLink = ({ to, children, isDropdownItem = false }) => (
    <Link
      to={to}
      onClick={closeAllMenus}
      className={`block px-4 py-2 text-sm font-medium transition-all duration-200 ${
        isDropdownItem
          ? // Item Dropdown: Latar belakang sedikit lebih gelap saat hover
            "text-white hover:bg-blue-500/80 rounded mx-1" 
          : // Link Utama Mobile
            "text-white hover:bg-blue-600 rounded"
      }`}
    >
      {children}
    </Link>
  );

  // Komponen pembantu untuk Dropdown Button Mobile
  const MobileDropdownButton = ({ title, isOpen, onToggle }) => (
    <button
      onClick={onToggle}
      className="w-full text-left px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 rounded transition-all duration-200 flex justify-between items-center"
      aria-expanded={isOpen}
    >
      {title}
      <svg 
        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-2xl transition-all duration-300 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo/Title */}
          <Link
            to="/"
            className="text-2xl font-extrabold flex items-center gap-2 tracking-wide hover:scale-[1.02] transition-transform duration-300"
          >
            📦 Simple WMS
          </Link>

          {/* Tombol Toggle Mobile Menu (Icon lebih halus) */}
          <button
            className="md:hidden p-2 rounded-lg text-white hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <svg
              className="w-7 h-7 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d={
                  isMobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="hover:text-blue-200 transition">
              Dashboard
            </Link>
            <Link to="/transactions" className="hover:text-blue-200 transition">
              Transaksi
            </Link>
            <Link to="/movements" className="hover:text-blue-200 transition">
              Perpindahan
            </Link>
            <Link
              to="/stock-opname"
              className="text-yellow-300 hover:text-yellow-200 font-bold transition border-b-2 border-yellow-300 pb-1"
            >
              Stock Opname
            </Link>

            {isAdmin && (
              <DropdownMenu title="Master Data">
                <Link
                  to="/products"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Produk
                </Link>
                <Link
                  to="/suppliers"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Supplier
                </Link>
                <Link
                  to="/customers"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Pelanggan
                </Link>
                <Link
                  to="/locations"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Lokasi
                </Link>
              </DropdownMenu>
            )}

            {isAdmin && (
              <DropdownMenu title="Laporan & Admin">
                <p className="px-4 pt-2 text-xs font-semibold text-gray-500 uppercase">
                  Laporan
                </p>
                <Link
                  to="/reports"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Riwayat Transaksi
                </Link>
                <Link
                  to="/reports/movement"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Perpindahan
                </Link>
                <Link
                  to="/reports/performance"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Kinerja
                </Link>
                <Link
                  to="/reports/customer-order"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Pelanggan & Order
                </Link>
                <Link
                  to="/reports/activity"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 rounded-sm"
                  role="menuitem"
                >
                  Aktivitas User
                </Link>
                <div className="border-t my-1"></div>
                <p className="px-4 pt-2 text-xs font-semibold text-gray-500 uppercase">
                  Administrasi
                </p>
                <Link
                  to="/admin"
                  className="block px-4 py-2 text-sm hover:bg-blue-50/90 font-medium text-red-600 rounded-sm"
                  role="menuitem"
                >
                  Admin Control
                </Link>
              </DropdownMenu>
            )}

            <div className="flex items-center space-x-4">
              <Link to="/profile" className="hover:text-blue-200 transition">
                Profile
              </Link>
              <button
                onClick={handleLogout}
                // Peningkatan: Tombol yang lebih menonjol
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        <div
          id="mobile-menu"
          // Peningkatan: Transisi yang lebih halus dengan padding vertikal
          className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
            isMobileMenuOpen ? "max-h-[800px] opacity-100 mt-3 pb-3" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pt-3 space-y-2 text-white bg-blue-700/90 p-3 rounded-lg shadow-inner">
            <MobileLink to="/">Dashboard</MobileLink>
            <MobileLink to="/transactions">Transaksi</MobileLink>
            <MobileLink to="/movements">Perpindahan</MobileLink>
            <MobileLink to="/stock-opname">Stock Opname</MobileLink>

            {/* Dropdown Master Data Mobile */}
            {isAdmin && (
              <div className="border-t pt-2 border-blue-600">
                <MobileDropdownButton
                  title="Master Data"
                  isOpen={isMasterDataOpen}
                  onToggle={() => {
                    setIsMasterDataOpen(!isMasterDataOpen);
                    setIsAdminReportOpen(false);
                  }}
                />
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isMasterDataOpen ? "max-h-60 mt-1" : "max-h-0"
                  }`}
                >
                  {/* Peningkatan: Inner dropdown menggunakan bg-blue-700/80 untuk sedikit variasi */}
                  <div className="bg-blue-700/80 p-2 rounded-md border-l-4 border-blue-400 shadow-inner space-y-1">
                    <MobileLink to="/products" isDropdownItem>
                      Produk
                    </MobileLink>
                    <MobileLink to="/suppliers" isDropdownItem>
                      Supplier
                    </MobileLink>
                    <MobileLink to="/customers" isDropdownItem>
                      Pelanggan
                    </MobileLink>
                    <MobileLink to="/locations" isDropdownItem>
                      Lokasi
                    </MobileLink>
                  </div>
                </div>
              </div>
            )}

            {/* Dropdown Laporan & Admin Mobile */}
            {isAdmin && (
              <div className="border-t pt-2 border-blue-600">
                <MobileDropdownButton
                  title="Laporan & Admin"
                  isOpen={isAdminReportOpen}
                  onToggle={() => {
                    setIsAdminReportOpen(!isAdminReportOpen);
                    setIsMasterDataOpen(false);
                  }}
                />
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isAdminReportOpen ? "max-h-96 mt-1" : "max-h-0"
                  }`}
                >
                  <div className="bg-blue-700/80 p-2 rounded-md border-l-4 border-blue-400 shadow-inner space-y-1">
                    <p className="px-4 pt-2 text-xs font-semibold text-blue-300 uppercase">
                      Laporan
                    </p>
                    <MobileLink to="/reports" isDropdownItem>
                      Riwayat Transaksi
                    </MobileLink>
                    <MobileLink to="/reports/movement" isDropdownItem>
                      Perpindahan
                    </MobileLink>
                    <MobileLink to="/reports/performance" isDropdownItem>
                      Kinerja
                    </MobileLink>
                    <MobileLink to="/reports/customer-order" isDropdownItem>
                      Pelanggan & Order
                    </MobileLink>
                    <MobileLink to="/reports/activity" isDropdownItem>
                      Aktivitas User
                    </MobileLink>
                    <div className="border-t my-1 border-blue-500"></div>
                    <p className="px-4 pt-2 text-xs font-semibold text-blue-300 uppercase">
                      Administrasi
                    </p>
                    <MobileLink
                      to="/admin"
                      isDropdownItem
                      className="font-bold text-red-300 hover:bg-blue-500/80"
                    >
                      Admin Control
                    </MobileLink>
                  </div>
                </div>
              </div>
            )}

            <MobileLink to="/profile">Profile</MobileLink>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-all duration-200 mt-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-slide {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide {
          animation: fade-slide 0.25s ease-in-out;
        }
      `}</style>
    </nav>
  );
}

export default Navbar;