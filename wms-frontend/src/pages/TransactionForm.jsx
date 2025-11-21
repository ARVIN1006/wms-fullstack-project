import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Select from "react-select";

function TransactionForm() {
  const DEFAULT_IN_LOCATION_ID = 1;

  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockStatuses, setStockStatuses] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [transactionType, setTransactionType] = useState("IN");
  const [notes, setNotes] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState([
    {
      skuInput: "",
      productName: "...",
      product: null,
      location: null,
      quantity: 1,
      stockStatus: null,
      purchasePrice: 0,
      sellingPrice: 0,
      batchNumber: "",
      expiryDate: "",
      volume_m3: 0,
    },
  ]);

  const lastInputRef = useRef(null);

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.name,
  }));
  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const statusOptions = stockStatuses.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  useEffect(() => {
    async function fetchMasterData() {
      try {
        setLoadingMaster(true);
        const [locationRes, supplierRes, statusRes] = await Promise.all([
          axios.get("/api/locations"),
          axios.get("/api/suppliers?page=1&limit=1000&search="),
          axios.get("/api/reports/stock-statuses"),
        ]);

        setLocations(locationRes.data);
        setSuppliers(supplierRes.data.suppliers);
        setStockStatuses(statusRes.data);
      } catch (err) {
        if (err.response?.status !== 401) {
          toast.error("Gagal memuat data master.");
        }
      } finally {
        setLoadingMaster(false);
      }
    }
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (lastInputRef.current) lastInputRef.current.focus();
  }, [items.length]);

  const handleSkuScan = async (index, sku) => {
    if (!sku) return;
    try {
      const response = await axios.get(`/api/products/by-sku/${sku}`);
      const productData = response.data;

      const selectedOption = {
        value: productData.id,
        label: `${productData.sku} - ${productData.name}`,
        purchasePrice: parseFloat(productData.purchase_price || 0),
        sellingPrice: parseFloat(productData.selling_price || 0),
        volume_m3: parseFloat(productData.volume_m3 || 0),
      };

      handleItemSelectChange(index, "product", selectedOption);
      toast.success(`Produk ditemukan: ${productData.name}`);
    } catch (err) {
      toast.error("Produk tidak ditemukan.");
      const newItems = [...items];
      newItems[index].product = null;
      newItems[index].productName = "...";
      newItems[index].volume_m3 = 0;
      setItems(newItems);
    }
  };

  const handleItemSkuChange = (index, value) => {
    const newItems = [...items];
    newItems[index].skuInput = value;
    setItems(newItems);
  };

  const handleItemSelectChange = (index, fieldName, selectedOption) => {
    const newItems = [...items];
    newItems[index][fieldName] = selectedOption;

    const goodStatus = statusOptions.find((s) => s.value === 1);

    if (fieldName === "product" && selectedOption) {
      newItems[index].productName = selectedOption.label;
      newItems[index].purchasePrice = selectedOption.purchasePrice;
      newItems[index].sellingPrice = selectedOption.sellingPrice;
      newItems[index].stockStatus = goodStatus || null;
      newItems[index].volume_m3 = selectedOption.volume_m3;

      const locationDefault = locationOptions.find(
        (loc) => loc.value === DEFAULT_IN_LOCATION_ID
      );
      newItems[index].location = locationDefault || null;
    }

    setItems(newItems);
  };

  const handleItemInputChange = (index, fieldName, value) => {
    const newItems = [...items];
    newItems[index][fieldName] = value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        skuInput: "",
        productName: "...",
        product: null,
        location: null,
        quantity: 1,
        stockStatus: null,
        purchasePrice: 0,
        sellingPrice: 0,
        batchNumber: "",
        expiryDate: "",
        volume_m3: 0,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (transactionType === "IN") {
      for (const item of items) {
        if (!item.product || !item.location) continue;

        const productVolume = item.volume_m3;
        const totalVolumeToMove = item.quantity * productVolume;

        const loc = locations.find((l) => l.id === item.location.value);

        if (loc) {
          const currentVolumeUsed = parseFloat(loc.current_volume_used || 0);
          const maxCapacity = parseFloat(loc.max_capacity_m3 || 0);
          const availableSpace = maxCapacity - currentVolumeUsed;

          if (totalVolumeToMove > availableSpace) {
            toast.error(
              `Kapasitas lokasi "${
                loc.name
              }" tidak cukup! Sisa kapasitas: ${availableSpace.toFixed(2)} m³.`
            );
            setIsSubmitting(false);
            return;
          }
        }
      }
    }

    if (
      items.some(
        (item) =>
          !item.product ||
          !item.location ||
          !item.stockStatus ||
          item.quantity <= 0
      )
    ) {
      toast.error("Pastikan semua baris item terisi dengan benar.");
      setIsSubmitting(false);
      return;
    }

    if (transactionType === "IN" && !selectedSupplier) {
      toast.error("Pilih Supplier untuk transaksi Barang Masuk.");
      setIsSubmitting(false);
      return;
    }

    const formattedItems = items.map((item) => ({
      product_id: item.product.value,
      location_id: item.location.value,
      quantity: item.quantity,
      stock_status_id: item.stockStatus.value,
      purchase_price: item.purchasePrice,
      selling_price: item.sellingPrice,
      batch_number: item.batchNumber || null,
      expiry_date: item.expiryDate || null,
    }));

    const payload = {
      notes,
      items: formattedItems,
      supplier_id: transactionType === "IN" ? selectedSupplier?.value : null,
    };

    const endpoint =
      transactionType === "IN"
        ? "/api/transactions/in"
        : "/api/transactions/out";

    try {
      await axios.post(endpoint, payload);
      toast.success("Transaksi berhasil dicatat!");

      setNotes("");
      setSelectedSupplier(null);
      setItems([
        {
          skuInput: "",
          productName: "...",
          product: null,
          location: null,
          quantity: 1,
          stockStatus: null,
          purchasePrice: 0,
          sellingPrice: 0,
          batchNumber: "",
          expiryDate: "",
          volume_m3: 0,
        },
      ]);

      const locationRes = await axios.get("/api/locations");
      setLocations(locationRes.data);
    } catch (err) {
      const errorMsg = err.response?.data?.msg || "Gagal mencatat transaksi.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingMaster) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg">
        <p className="text-gray-500 animate-pulse">Memuat data master...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Buat Transaksi Baru
      </h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipe Transaksi
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setTransactionType("IN")}
            className={`py-2 px-4 rounded ${
              transactionType === "IN"
                ? "bg-green-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Barang Masuk
          </button>
          <button
            type="button"
            onClick={() => setTransactionType("OUT")}
            className={`py-2 px-4 rounded ${
              transactionType === "OUT"
                ? "bg-red-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Barang Keluar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {transactionType === "IN" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <Select
              options={supplierOptions}
              value={selectedSupplier}
              onChange={(option) => setSelectedSupplier(option)}
              placeholder="Pilih Supplier..."
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catatan
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tulis catatan..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-700 mb-3">
        Daftar Barang
      </h2>
      <div className="space-y-4 mb-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="relative p-4 border rounded-md bg-gray-50"
          >
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="absolute top-2 right-2 h-7 w-7 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full flex items-center justify-center"
              >
                &times;
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Scan SKU/Barcode *
                </label>
                <input
                  type="text"
                  value={item.skuInput}
                  onChange={(e) => handleItemSkuChange(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSkuScan(index, item.skuInput);
                    }
                  }}
                  ref={index === items.length - 1 ? lastInputRef : null}
                  placeholder="Scan barcode..."
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                <p className="text-xs text-gray-600 mt-1 h-4">
                  {item.productName !== "..."
                    ? item.productName
                    : "Menunggu SKU..."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lokasi *
                </label>
                <Select
                  options={locationOptions}
                  value={item.location}
                  onChange={(selectedOption) =>
                    handleItemSelectChange(index, "location", selectedOption)
                  }
                  placeholder="Pilih Lokasi..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Jumlah *
                </label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemInputChange(index, "quantity", e.target.value)
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga {transactionType === "IN" ? "Beli" : "Jual"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    transactionType === "IN"
                      ? item.purchasePrice
                      : item.sellingPrice
                  }
                  onChange={(e) =>
                    handleItemInputChange(
                      index,
                      transactionType === "IN"
                        ? "purchasePrice"
                        : "sellingPrice",
                      e.target.value
                    )
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Stok *
                </label>
                <Select
                  options={statusOptions}
                  value={item.stockStatus}
                  onChange={(selectedOption) =>
                    handleItemSelectChange(index, "stockStatus", selectedOption)
                  }
                  placeholder="Pilih Status..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Batch
                </label>
                <input
                  type="text"
                  value={item.batchNumber}
                  onChange={(e) =>
                    handleItemInputChange(index, "batchNumber", e.target.value)
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tgl. Kadaluarsa
                </label>
                <input
                  type="date"
                  value={item.expiryDate}
                  onChange={(e) =>
                    handleItemInputChange(index, "expiryDate", e.target.value)
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddItem}
        className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition"
      >
        + Tambah Baris Barang
      </button>

      <div className="border-t pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition disabled:bg-gray-400"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;
