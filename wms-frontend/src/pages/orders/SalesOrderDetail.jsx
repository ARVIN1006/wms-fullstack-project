import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import Button from "../../components/common/Button";

function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [so, setSo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSO();
  }, [id]);

  const fetchSO = async () => {
    try {
      const res = await axios.get(`/api/orders/sales/${id}`);
      setSo(res.data);
    } catch (err) {
      toast.error("Gagal memuat SO");
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async () => {
    if (
      !confirm(
        "Konfirmasi pengiriman barang? Stok akan berkurang otomatis (FIFO)."
      )
    )
      return;

    setIsProcessing(true);
    try {
      await axios.put(`/api/orders/sales/${id}/status`, {
        status: "shipped",
      });
      toast.success("SO Berhasil Dikirim (Shipped)!");
      fetchSO(); // Refresh
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal memproses SO");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!so) return <div className="p-8 text-center">SO tidak ditemukan</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Sales Order #{so.id}
          </h1>
          <p className="text-gray-500 text-sm">
            Created: {format(new Date(so.created_at), "dd MMM yyyy HH:mm")}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
              so.status === "shipped"
                ? "bg-purple-100 text-purple-800"
                : "bg-gray-100"
            }`}
          >
            {so.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">
            Informasi Customer
          </h3>
          <p className="text-gray-900 font-medium text-lg">
            {so.customer_name}
          </p>
          <p className="text-gray-500 mt-2 italic">
            "{so.notes || "Tidak ada catatan"}"
          </p>
        </div>

        {so.status !== "shipped" && so.status !== "cancelled" && (
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex flex-col justify-center">
            <h3 className="font-semibold text-purple-800 mb-2">
              Proses Pengiriman
            </h3>
            <p className="text-sm text-purple-600 mb-4">
              Kirim barang ke pelanggan. Sistem akan otomatis mengurangi stok
              menggunakan metode FIFO.
            </p>

            <Button
              variant="primary"
              onClick={handleShip}
              className="w-full !bg-purple-600 hover:!bg-purple-700"
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              Konfirmasi Pengiriman (Ship)
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-gray-600">Produk</th>
              <th className="px-6 py-3 font-semibold text-gray-600">SKU</th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-right">
                Qty
              </th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-right">
                Harga Jual
              </th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {so.items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4">{item.product_name}</td>
                <td className="px-6 py-4 font-mono text-sm">{item.sku}</td>
                <td className="px-6 py-4 text-right font-medium">
                  {item.quantity}
                </td>
                <td className="px-6 py-4 text-right">
                  Rp {parseFloat(item.unit_price).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-semibold">
                  Rp{" "}
                  {(
                    parseFloat(item.quantity) * parseFloat(item.unit_price)
                  ).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td colSpan="4" className="px-6 py-4 text-right">
                Grand Total
              </td>
              <td className="px-6 py-4 text-right text-purple-600">
                Rp{" "}
                {so.items
                  .reduce(
                    (sum, item) =>
                      sum +
                      parseFloat(item.quantity) * parseFloat(item.unit_price),
                    0
                  )
                  .toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default SalesOrderDetail;
