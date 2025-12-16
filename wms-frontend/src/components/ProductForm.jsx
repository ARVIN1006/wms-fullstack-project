import { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "./common/Input";
import Button from "./common/Button";

const validationSchema = yup.object().shape({
  sku: yup.string().required("SKU wajib diisi."),
  name: yup.string().required("Nama Produk wajib diisi."),
  unit: yup.string().required("Satuan wajib diisi."),
  description: yup.string().nullable(),
  purchasePrice: yup
    .number()
    .typeError("Harga Beli harus angka.")
    .min(0, "Harga Beli tidak boleh negatif.")
    .required("Harga Beli wajib diisi."),
  sellingPrice: yup
    .number()
    .typeError("Harga Jual harus angka.")
    .min(0, "Harga Jual tidak boleh negatif.")
    .required("Harga Jual wajib diisi."),
  mainSupplier: yup.object().nullable(),
  category: yup.object().nullable(),
  initialStockQty: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? 0 : value))
    .min(0, "Stok awal tidak boleh negatif.")
    .required(),
  initialLocation: yup.object().when("initialStockQty", {
    is: (qty) => qty > 0,
    then: (schema) =>
      schema.nullable().required("Lokasi wajib diisi jika Stok Awal > 0."),
    otherwise: (schema) => schema.nullable(),
  }),
  minStock: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? 0 : value))
    .min(0, "Min. Stok tidak boleh negatif."),
  barcode: yup.string().nullable(),
});

function ProductForm({ onSave, onClose, productToEdit }) {
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      unit: "",
      purchasePrice: 0,
      sellingPrice: 0,
      mainSupplier: null,
      category: null,
      initialStockQty: 0,
      initialLocation: null,
      minStock: 0,
      barcode: "",
    },
  });

  const initialLocation = watch("initialLocation");
  const mainSupplier = watch("mainSupplier");
  const selectedCategory = watch("category");

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.name,
  }));
  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  useEffect(() => {
    let isMounted = true;

    async function fetchMasterData() {
      try {
        const [locationRes, supplierRes, categoryRes] = await Promise.all([
          axios.get("/api/locations"),
          axios.get("/api/suppliers?page=1&limit=1000"),
          axios.get("/api/products/categories"),
        ]);
        if (isMounted) {
          setLocations(locationRes.data);
          setSuppliers(supplierRes.data.suppliers);
          setCategories(categoryRes.data);
          setLoadingMaster(false);
        }
      } catch (error) {
        if (isMounted) {
          toast.error("Gagal memuat data master untuk form.");
          setLoadingMaster(false);
        }
      }
    }
    fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (productToEdit && !loadingMaster) {
      setIsEditing(true);

      setValue("sku", productToEdit.sku);
      setValue("name", productToEdit.name);
      setValue("description", productToEdit.description || "");
      setValue("unit", productToEdit.unit);
      setValue("purchasePrice", parseFloat(productToEdit.purchase_price || 0));
      setValue("sellingPrice", parseFloat(productToEdit.selling_price || 0));

      if (productToEdit.main_supplier_id) {
        const defaultSupplier = supplierOptions.find(
          (s) => s.value === productToEdit.main_supplier_id
        );
        setValue("mainSupplier", defaultSupplier || null);
      } else {
        setValue("mainSupplier", null);
      }

      if (productToEdit.category_id) {
        const defaultCategory = categoryOptions.find(
          (c) => c.value === productToEdit.category_id
        );
        setValue("category", defaultCategory || null);
      } else {
        setValue("category", null);
      }

      setValue("initialStockQty", 0);
      setValue("initialLocation", null);
      setValue("minStock", parseFloat(productToEdit.min_stock || 0));
      setValue("barcode", productToEdit.barcode || "");
    } else if (!productToEdit) {
      setIsEditing(false);
      setValue("sku", "");
      setValue("name", "");
      setValue("description", "");
      setValue("unit", "");
      setValue("purchasePrice", 0);
      setValue("sellingPrice", 0);
      setValue("mainSupplier", null);
      setValue("category", null);
      setValue("initialStockQty", 0);
      setValue("initialLocation", null);
      setValue("minStock", 0);
      setValue("barcode", "");
    }
  }, [
    productToEdit,
    loadingMaster,
    setValue,
    supplierOptions,
    categoryOptions,
  ]);

  const onSubmit = (data) => {
    onSave({
      id: productToEdit?.id,
      sku: data.sku,
      name: data.name,
      description: data.description,
      unit: data.unit,
      purchase_price: parseFloat(data.purchasePrice),
      selling_price: parseFloat(data.sellingPrice),
      main_supplier_id: data.mainSupplier?.value || null,
      category_id: data.category?.value || null,

      initial_stock_qty: isEditing ? 0 : data.initialStockQty,
      initial_location_id: isEditing ? null : data.initialLocation?.value,
      min_stock: data.minStock,
      barcode: data.barcode,
    });
  };

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderColor: state.isFocused ? "#8b5cf6" : "#d1d5db",
      borderRadius: "0.5rem",
      padding: "2px",
      minHeight: "42px",
      "&:hover": { borderColor: "#8b5cf6" },
      boxShadow: state.isFocused ? "0 0 0 1px #8b5cf6" : "none",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.5rem",
      overflow: "hidden",
      zIndex: 50,
    }),
  };

  if (loadingMaster) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat data master...</p>
        </div>
      </div>
    );
  }

  const ErrorMessage = ({ error }) => {
    return error ? (
      <p className="text-rose-500 text-xs mt-1 font-medium">{error.message}</p>
    ) : null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? "✏️ Edit Produk" : "✨ Tambah Produk Baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                Data Dasar
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU (Kode Unik) *"
                  {...register("sku")}
                  error={errors.sku?.message}
                  placeholder="e.g. PRD-001"
                />
                <Input
                  label="Satuan *"
                  {...register("unit")}
                  error={errors.unit?.message}
                  placeholder="e.g. Pcs"
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Nama Produk *"
                  {...register("name")}
                  error={errors.name?.message}
                  placeholder="Masukkan nama produk lengkap"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Input
                  label="Barcode / Kode Batang"
                  {...register("barcode")}
                  error={errors.barcode?.message}
                  placeholder="Scan atau ketik barcode"
                />
                <Input
                  label="Min. Stok (Alert)"
                  type="number"
                  min="0"
                  {...register("minStock")}
                  error={errors.minStock?.message}
                  placeholder="0"
                />
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kategori
                </label>
                <Select
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(option) => setValue("category", option)}
                  classNamePrefix="react-select"
                  placeholder="Pilih Kategori..."
                  isClearable={true}
                  styles={customSelectStyles}
                />
                <ErrorMessage error={errors.category} />
              </div>

              <div className="mt-4">
                <Input
                  label="Deskripsi"
                  type="textarea"
                  {...register("description")}
                  placeholder="Deskripsi singkat produk..."
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 mt-2">
                Finansial & Supplier
              </h3>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Supplier Utama
                </label>
                <Select
                  options={supplierOptions}
                  value={mainSupplier}
                  onChange={(option) => setValue("mainSupplier", option)}
                  classNamePrefix="react-select"
                  placeholder="Pilih Supplier Utama..."
                  isClearable={true}
                  styles={customSelectStyles}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Harga Beli / Unit"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("purchasePrice")}
                  error={errors.purchasePrice?.message}
                  placeholder="0"
                />
                <Input
                  label="Harga Jual / Unit"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("sellingPrice")}
                  error={errors.sellingPrice?.message}
                  placeholder="0"
                />
              </div>
            </div>

            {!isEditing && (
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                  Stok Awal (Opsional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Jumlah Stok Awal"
                    type="number"
                    min="0"
                    {...register("initialStockQty")}
                    error={errors.initialStockQty?.message}
                    placeholder="0"
                    className="!bg-white"
                  />
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Lokasi Penyimpanan
                    </label>
                    <Select
                      options={locationOptions}
                      value={initialLocation}
                      onChange={(option) => setValue("initialLocation", option)}
                      classNamePrefix="react-select"
                      isClearable={true}
                      placeholder="Pilih Lokasi"
                      styles={customSelectStyles}
                    />
                    <ErrorMessage error={errors.initialLocation} />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            Batal
          </Button>
          <Button onClick={handleSubmit(onSubmit)} variant="primary">
            Simpan Produk
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProductForm;
