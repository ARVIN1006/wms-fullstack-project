import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import Button from "../../components/common/Button";

function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("/api/orders/sales");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-xl border border-white/50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales Orders</h1>
          <p className="text-sm text-gray-500">Kelola pesanan pelanggan</p>
        </div>
        <Link to="/orders/sales/new">
          <Button variant="primary" icon="+">
            Buat SO Baru
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600">ID</th>
                <th className="px-6 py-3 font-semibold text-gray-600">
                  Pelanggan
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600">
                  Tanggal
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600">Items</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    Belum ada Sales Order.
                  </td>
                </tr>
              ) : (
                orders.map((so) => (
                  <tr
                    key={so.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-blue-600">
                      #{so.id}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {so.customer_name || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(so.created_at), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(
                          so.status
                        )}`}
                      >
                        {so.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {so.item_count} Items
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/orders/sales/${so.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SalesOrderList;
