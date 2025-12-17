import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import Button from "../../components/common/Button";
import Select from "react-select";

function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for Receiving
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPO();
    fetchLocations();
  }, [id]);

  const fetchPO = async () => {
    try {
      const res = await axios.get(`/api/orders/purchase/${id}`);
      setPo(res.data);
    } catch (err) {
      toast.error("Gagal memuat PO");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await axios.get("/api/locations");
      setLocations(res.data.map((l) => ({ value: l.id, label: l.name })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceive = async () => {
    if (!selectedLocation) {
      toast.error("Pilih lokasi penyimpanan terlebih dahulu!");
      return;
    }

    if (!confirm("Konfirmasi penerimaan barang? Stok akan bertambah.")) return;

    setIsProcessing(true);
    try {
      await axios.put(`/api/orders/purchase/${id}/status`, {
        status: "received",
        target_location_id: selectedLocation.value,
      });
      toast.success("PO Berhasil Diterima & Stok Bertambah!");
      fetchPO(); // Refresh
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal memproses PO");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!po) return <div className="p-8 text-center">PO tidak ditemukan</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Purchase Order #{po.id}
          </h1>
          <p className="text-gray-500 text-sm">
            Created: {format(new Date(po.created_at), "dd MMM yyyy HH:mm")}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="px-3 py-1 rounded-full text-sm font-semibold mb-2 bg-gray-100">
            {po.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">
            Informasi Supplier
          </h3>
          <p className="text-gray-900 font-medium text-lg">
            {po.supplier_name}
          </p>
          <p className="text-gray-500 mt-2 italic">
            "{po.notes || "Tidak ada catatan"}"
          </p>
        </div>

        {po.status !== "received" && po.status !== "cancelled" && (
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <h3 className="font-semibold text-indigo-800 mb-4">
              Proses Penerimaan
            </h3>
            <p className="text-sm text-indigo-600 mb-4">
              Terima barang untuk menambah stok.
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-indigo-700 mb-1 block">
                Simpan ke Lokasi:
              </label>
              <Select
                options={locations}
                onChange={setSelectedLocation}
                placeholder="Pilih Gudang/Lokasi..."
                className="text-sm"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleReceive}
              className="w-full"
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              Konfirmasi Penerimaan (Receive)
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
                Harga Satuan
              </th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {po.items.map((item) => (
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
              <td className="px-6 py-4 text-right text-blue-600">
                Rp{" "}
                {po.items
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

export default PurchaseOrderDetail;
