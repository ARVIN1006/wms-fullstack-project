import { useState, useRef, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import { Bell, AlertTriangle, Calendar, RefreshCw } from "lucide-react";

function NotificationBell() {
  const { alerts, totalAlerts, fetchAlerts, loading } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {totalAlerts > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full animate-bounce">
            {totalAlerts > 99 ? "99+" : totalAlerts}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-700">Notifikasi</h3>
            <button
              onClick={fetchAlerts}
              className={`p-1 rounded-full hover:bg-gray-200 transition-colors ${
                loading ? "animate-spin" : ""
              }`}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {totalAlerts === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>Tidak ada notifikasi baru.</p>
                <p className="text-xs mt-1">Stok aman terkendali! 👍</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Low Stock Section */}
                {alerts.lowStock?.length > 0 && (
                  <div className="p-3 bg-orange-50/30">
                    <p className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Stok Menipis
                    </p>
                    <ul className="space-y-2">
                      {alerts.lowStock.map((item) => (
                        <li key={`low-${item.id}`} className="text-sm">
                          <span className="font-medium text-gray-800">
                            {item.name}
                          </span>
                          <div className="flex justify-between text-xs mt-0.5">
                            <span className="text-gray-500">
                              Min: {item.min_stock}
                            </span>
                            <span className="font-bold text-red-600">
                              Sisa: {item.current_stock}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Expiry Section */}
                {alerts.expiry?.length > 0 && (
                  <div className="p-3 bg-red-50/30">
                    <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Kedaluwarsa &lt; 30 Hari
                    </p>
                    <ul className="space-y-2">
                      {alerts.expiry.map((item) => (
                        <li
                          key={`exp-${item.product_id}-${item.batch_number}`}
                          className="text-sm"
                        >
                          <span className="font-medium text-gray-800">
                            {item.name}
                          </span>
                          <div className="text-xs text-gray-500">
                            Batch: {item.batch_number} • Loc:{" "}
                            {item.location_name}
                          </div>
                          <div className="font-bold text-red-500 text-xs mt-0.5">
                            Exp:{" "}
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
