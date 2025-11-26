import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useState, useEffect, useRef } from "react";

function Navbar() {
  const { logout, userRole, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = userRole === "admin";
  
  // State untuk mengontrol menu mobile dan dropdown
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navbarRef = useRef(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tutup mobile menu saat route berubah
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil!");
    navigate("/login");
  };

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  // Helper untuk Link Utama
  const MainLink = ({ to, children, className = "", icon, isActive = false }) => {
    const isCurrentActive = isActive || location.pathname === to;
    
    return (
      <Link 
        to={to} 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 
                   ${isCurrentActive 
                     ? 'bg-blue-600 text-white shadow-md' 
                     : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                   } border-b-2 ${isCurrentActive ? 'border-blue-400' : 'border-transparent'} ${className}`}
      >
        {icon && <span className="text-lg">{icon}</span>}
        {children}
      </Link>
    );
  };
  
  // Helper untuk Link Dropdown
  const DropdownLink = ({ to, children, className = "", icon, badge, isActive = false }) => {
    const isCurrentActive = isActive || location.pathname === to;
    
    return (
      <Link 
        to={to} 
        className={`flex items-center justify-between px-4 py-3 text-sm transition-all duration-200 rounded-lg
                   ${isCurrentActive 
                     ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                     : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                   } hover:shadow-md ${className}`}
        onClick={() => {
          setIsMobileMenuOpen(false);
          setActiveDropdown(null);
        }}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-lg">{icon}</span>}
          <span>{children}</span>
        </div>
        {badge && (
          <span className={`px-2 py-1 text-xs rounded-full ${badge.color} font-medium`}>
            {badge.text}
          </span>
        )}
      </Link>
    );
  };

  // Komponen Dropdown yang Lebih Baik
  const DropdownMenu = ({ title, children, menuName, icon }) => {
    const isOpen = activeDropdown === menuName;

    return (
      <div className="relative">
        <button 
          onClick={() => toggleDropdown(menuName)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 
                     ${isOpen ? 'bg-gray-800 text-white border-blue-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                     border-b-2 ${isOpen ? 'border-blue-400' : 'border-transparent'}`}
        >
          {icon && <span className="text-lg">{icon}</span>}
          <span>{title}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-3 z-50 animate-fadeIn">
            <div className="flex flex-col space-y-1">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Cek active state untuk transactions
  const isTransactionsActive = location.pathname.startsWith('/transactions');

  return (
    <nav ref={navbarRef} className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-2xl sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 text-xl font-bold group"
          >
            <div className="bg-gradient-to-r from-teal-400 to-blue-500 p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200">
              <span className="text-white">📦</span>
            </div>
            <div>
              <div className="text-white font-bold">Simple WMS</div>
              <div className="text-xs text-gray-400 font-normal">Warehouse Management</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <MainLink to="/" icon="🏠">Dashboard</MainLink>
            
            {/* Transactions Dropdown */}
            <DropdownMenu title="Transaksi" menuName="transactions" icon="💸">
              <DropdownLink 
                to="/transactions/in" 
                icon="📥"
                isActive={location.pathname === '/transactions/in'}
                badge={{ text: "Masuk", color: "bg-green-100 text-green-800" }}
              >
                Transaksi Masuk (IN)
              </DropdownLink>
              <DropdownLink 
                to="/transactions/out" 
                icon="📤"
                isActive={location.pathname === '/transactions/out'}
                badge={{ text: "Keluar", color: "bg-red-100 text-red-800" }}
              >
                Transaksi Keluar (OUT)
              </DropdownLink>
            </DropdownMenu>

            <MainLink to="/movements" icon="🔄">Perpindahan</MainLink>
            <MainLink to="/stock-opname" icon="📋" className="text-yellow-300 font-semibold">
              Stock Opname
            </MainLink>
            
            {/* Master Data Dropdown */}
            {isAdmin && (
              <DropdownMenu title="Master Data" menuName="master" icon="📊">
                <DropdownLink 
                  to="/products" 
                  icon="📦" 
                  isActive={location.pathname === '/products'}
                  badge={{ text: "Manage", color: "bg-blue-100 text-blue-800" }}
                >
                  Produk
                </DropdownLink>
                <DropdownLink 
                  to="/suppliers" 
                  icon="🏢" 
                  isActive={location.pathname === '/suppliers'}
                  badge={{ text: "Partner", color: "bg-green-100 text-green-800" }}
                >
                  Supplier
                </DropdownLink>
                <DropdownLink 
                  to="/customers" 
                  icon="👥" 
                  isActive={location.pathname === '/customers'}
                  badge={{ text: "Client", color: "bg-purple-100 text-purple-800" }}
                >
                  Pelanggan
                </DropdownLink>
                <DropdownLink 
                  to="/locations" 
                  icon="📍" 
                  isActive={location.pathname === '/locations'}
                  badge={{ text: "Space", color: "bg-orange-100 text-orange-800" }}
                >
                  Lokasi
                </DropdownLink>
              </DropdownMenu>
            )}

            {/* Reports Dropdown */}
            {isAdmin && (
              <DropdownMenu title="Laporan" menuName="reports" icon="📈">
                <div className="px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Laporan Dasar</span>
                </div>
                <DropdownLink 
                  to="/reports" 
                  icon="📊"
                  isActive={location.pathname === '/reports'}
                >
                  Transaksi (IN/OUT)
                </DropdownLink>
                <DropdownLink 
                  to="/reports/movement" 
                  icon="🔄"
                  isActive={location.pathname === '/reports/movement'}
                >
                  Perpindahan
                </DropdownLink>
                
                <div className="px-4 py-2 border-b border-gray-100 mt-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Analisis Lanjutan</span>
                </div>
                <DropdownLink 
                  to="/reports/performance" 
                  icon="👨‍💼"
                  isActive={location.pathname === '/reports/performance'}
                >
                  Kinerja Operator
                </DropdownLink>
                <DropdownLink 
                  to="/reports/customer-order" 
                  icon="🛒"
                  isActive={location.pathname === '/reports/customer-order'}
                >
                  Pelanggan & Order
                </DropdownLink>
                <DropdownLink 
                  to="/reports/activity" 
                  icon="📝"
                  isActive={location.pathname === '/reports/activity'}
                >
                  Aktivitas User
                </DropdownLink>
                
                <div className="px-4 py-2 border-b border-gray-100 mt-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Status Inventory</span>
                </div>
                <DropdownLink 
                  to="/reports/status-inventory" 
                  icon="⚠️"
                  isActive={location.pathname === '/reports/status-inventory'}
                  className="text-yellow-600 font-medium"
                >
                  Stok Bermasalah
                </DropdownLink>
                
                <div className="px-4 py-2 border-b border-gray-100 mt-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Keuangan</span>
                </div>
                <DropdownLink 
                  to="/reports/financial" 
                  icon="💰"
                  isActive={location.pathname === '/reports/financial'}
                  className="text-green-600 font-semibold bg-green-50"
                >
                  Laporan Keuangan
                </DropdownLink>
              </DropdownMenu>
            )}

            {/* Admin Control */}
            {isAdmin && (
              <MainLink to="/admin" icon="⚙️">Admin</MainLink>
            )}
          </div>

          {/* Right Section - User Info & Logout */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{user?.username || 'User'}</div>
              <div className="text-xs text-gray-400 capitalize">{userRole}</div>
            </div>
            
            <div className="w-px h-6 bg-gray-600"></div>
            
            <MainLink to="/profile" icon="👤">
              Profile
            </MainLink>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span className="text-lg">🚪</span>
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            <div className="w-6 h-6 flex flex-col justify-center gap-1">
              <div className={`h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
              <div className={`h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
              <div className={`h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-16 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-2xl animate-slideDown">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {/* User Info Mobile */}
              <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{user?.username || 'User'}</div>
                  <div className="text-xs text-gray-400 capitalize">{userRole}</div>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="space-y-1">
                <MainLink to="/" icon="🏠" className="justify-between">
                  Dashboard
                </MainLink>

                {/* Transactions Mobile */}
                <div className="pt-2 border-t border-gray-700">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Transaksi</div>
                  <MainLink 
                    to="/transactions/in" 
                    icon="📥" 
                    className="pl-8"
                    isActive={location.pathname === '/transactions/in'}
                  >
                    Transaksi Masuk (IN)
                  </MainLink>
                  <MainLink 
                    to="/transactions/out" 
                    icon="📤" 
                    className="pl-8"
                    isActive={location.pathname === '/transactions/out'}
                  >
                    Transaksi Keluar (OUT)
                  </MainLink>
                </div>

                <MainLink to="/movements" icon="🔄" className="justify-between">
                  Perpindahan
                </MainLink>
                <MainLink to="/stock-opname" icon="📋" className="justify-between text-yellow-300 font-semibold">
                  Stock Opname
                </MainLink>

                {/* Master Data Mobile */}
                {isAdmin && (
                  <div className="pt-2 border-t border-gray-700">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Master Data</div>
                    <MainLink to="/products" icon="📦" className="pl-8">Produk</MainLink>
                    <MainLink to="/suppliers" icon="🏢" className="pl-8">Supplier</MainLink>
                    <MainLink to="/customers" icon="👥" className="pl-8">Pelanggan</MainLink>
                    <MainLink to="/locations" icon="📍" className="pl-8">Lokasi</MainLink>
                  </div>
                )}

                {/* Reports Mobile */}
                {isAdmin && (
                  <div className="pt-2 border-t border-gray-700">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Laporan</div>
                    <MainLink to="/reports" icon="📊" className="pl-8">Transaksi</MainLink>
                    <MainLink to="/reports/movement" icon="🔄" className="pl-8">Perpindahan</MainLink>
                    <MainLink to="/reports/performance" icon="👨‍💼" className="pl-8">Kinerja Operator</MainLink>
                    <MainLink to="/reports/customer-order" icon="🛒" className="pl-8">Pelanggan & Order</MainLink>
                    <MainLink to="/reports/activity" icon="📝" className="pl-8">Aktivitas User</MainLink>
                    <MainLink to="/reports/status-inventory" icon="⚠️" className="pl-8 text-yellow-300">
                      Stok Bermasalah
                    </MainLink>
                    <MainLink to="/reports/financial" icon="💰" className="pl-8 text-green-300 font-semibold">
                      Laporan Keuangan
                    </MainLink>
                  </div>
                )}

                {/* Admin Control Mobile */}
                {isAdmin && (
                  <MainLink to="/admin" icon="⚙️" className="justify-between">
                    Admin Control
                  </MainLink>
                )}

                {/* Profile & Logout Mobile */}
                <div className="pt-2 border-t border-gray-700 space-y-1">
                  <MainLink to="/profile" icon="👤" className="justify-between">
                    Profile
                  </MainLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚪</span>
                      Logout
                    </div>
                    <span className="text-sm">Keluar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;