import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import ExportButton from "../components/ExportButton";
import Select from "react-select";
import AsyncSelect from "react-select/async";

function MovementReport() {
  const [reports, setReports] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- STATE FILTER ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFromLocation, setSelectedFromLocation] = useState(null);
  const [selectedToLocation, setSelectedToLocation] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Definisi Header untuk file CSV
  const csvHeaders = [
    { label: "Tanggal", key: "date" },
    { label: "Operator", key: "operator_name" },
    { label: "SKU", key: "sku" },
    { label: "Nama Produk", key: "product_name" },
    { label: "Jumlah", key: "quantity" },
    { label: "Asal", key: "from_location_name" },
    { label: "Tujuan", key: "to_location_name" },
    { label: "Alasan", key: "reason" },
  ];

  // Fungsi untuk memformat data sebelum diekspor
  const getExportData = () => {
    return reports.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleString("id-ID"),
    }));
  };

  // Ambil lokasi & data laporan (dipanggil saat filter berubah)
  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await axios.get("/api/locations");
        setLocations(response.data);
      } catch (err) {
        toast.error("Gagal memuat data lokasi master.");
      }
    }
    fetchLocations();

    // Panggil fetchReports saat komponen dimuat
    fetchReports();
  }, []);

  // Fungsi Pencarian Produk Asynchronous (untuk filter)
  const loadProductOptions = async (inputValue) => {
    try {
      const response = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      return response.data.products.map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
      }));
    } catch (err) {
      console.error("Gagal mencari produk:", err);
      return [];
    }
  };

  // --- FUNGSI FETCH REPORTS (DI-UPGRADE) ---
  async function fetchReports() {
    try {
      setLoading(true);

      // Persiapan filter query
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        fromLocationId: selectedFromLocation?.value || undefined,
        toLocationId: selectedToLocation?.value || undefined,
        productId: selectedProduct?.value || undefined,
      };

      const response = await axios.get("/api/reports/movements", { params });
      setReports(response.data);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error("Gagal memuat data laporan pergerakan.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Handler saat tombol 'Filter' diklik
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReports(); // Muat ulang data dengan filter baru
  };

  const locationOptions = [
    { value: "", label: "Semua Lokasi" }, // Opsi default
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        📊 Laporan Perpindahan Barang
      </h1>

      {/* --- FORM FILTER BARU --- */}
      <form
        onSubmit={handleFilterSubmit}
        className="mb-6 p-4 border rounded-lg bg-gray-50"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lokasi Asal
            </label>
            <Select
              options={locationOptions}
              value={selectedFromLocation}
              onChange={setSelectedFromLocation}
              placeholder="Semua Asal"
              isClearable={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lokasi Tujuan
            </label>
            <Select
              options={locationOptions}
              value={selectedToLocation}
              onChange={setSelectedToLocation}
              placeholder="Semua Tujuan"
              isClearable={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Produk (SKU)
            </label>
            <AsyncSelect
              loadOptions={loadProductOptions}
              value={selectedProduct}
              onChange={setSelectedProduct}
              placeholder="Ketik untuk mencari Produk..."
              isClearable={true}
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
            >
              Tampilkan Laporan
            </button>
          </div>
        </div>
      </form>

      <div className="flex justify-end items-center mb-6">
        <ExportButton
          data={getExportData()}
          headers={csvHeaders}
          filename={`Laporan_Perpindahan_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`}
        >
          Unduh Laporan (CSV)
        </ExportButton>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {csvHeaders.map((h) => (
                  <th
                    key={h.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(item.date).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {item.operator_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                    {item.from_location_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                    {item.to_location_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reports.length === 0 && !loading && (
        <p className="text-gray-500 mt-4">
          Tidak ada data pergerakan tercatat.
        </p>
      )}
    </div>
  );
}

export default MovementReport;
