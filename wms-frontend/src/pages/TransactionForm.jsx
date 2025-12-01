import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

// Import Components
import TransactionTypeSelector from "../components/transactions/TransactionTypeSelector";
import TransactionHeader from "../components/transactions/TransactionHeader";
import TransactionItemsTable from "../components/transactions/TransactionItemsTable";

// --- DEFINISI SKEMA VALIDASI YUP ---
const itemSchema = yup.object().shape({
  product: yup.object().nullable().required("Pilih produk."),
  location: yup.object().nullable().required("Pilih lokasi."),
  stockStatus: yup.object().nullable().required("Pilih status stok."),
  quantity: yup
    .number()
    .typeError("Jumlah harus angka.")
    .min(1, "Min. 1 unit.")
    .required("Wajib diisi."),
  purchasePrice: yup
    .number()
    .typeError("Harga beli harus angka.")
    .min(0, "Min. Rp 0.")
    .when("transactionType", {
      // Wajib untuk IN
      is: "IN",
      then: (schema) => schema.required("Harga beli wajib untuk IN."),
      otherwise: (schema) => schema.nullable(),
    }),
  sellingPrice: yup
    .number()
    .typeError("Harga jual harus angka.")
    .min(0, "Min. Rp 0.")
    .when("transactionType", {
      // Wajib untuk OUT
      is: "OUT",
      then: (schema) => schema.required("Harga jual wajib untuk OUT."),
      otherwise: (schema) => schema.nullable(),
    }),
  batchNumber: yup.string().nullable(),
  expiryDate: yup.string().nullable(),
});

const validationSchema = yup.object().shape({
  notes: yup.string().nullable(),
  supplier: yup.object().when("transactionType", {
    is: "IN",
    then: (schema) =>
      schema.nullable().required("Supplier wajib dipilih untuk Barang Masuk."),
    otherwise: (schema) => schema.nullable(),
  }),
  customer: yup.object().when("transactionType", {
    is: "OUT",
    then: (schema) =>
      schema
        .nullable()
        .required("Pelanggan wajib dipilih untuk Barang Keluar."),
    otherwise: (schema) => schema.nullable(),
  }),
  categoryFilter: yup.object().nullable(),
  items: yup
    .array()
    .of(itemSchema)
    .min(1, "Minimal harus ada 1 item transaksi."),
});

function TransactionForm() {
  const navigate = useNavigate();
  const { type: urlType } = useParams(); // 'in' atau 'out'
  const transactionType = urlType?.toUpperCase();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [stockStatuses, setStockStatuses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [itemStockInfo, setItemStockInfo] = useState({});

  // --- RHF Hook ---
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(validationSchema),
    context: { transactionType: transactionType },
    defaultValues: {
      notes: "",
      supplier: null,
      customer: null,
      categoryFilter: null,
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const selectedCategoryFilter = watch("categoryFilter");

  // --- Efek Reset Form Saat Tipe Transaksi Berubah ---
  useEffect(() => {
    reset({
      notes: "",
      supplier: null,
      customer: null,
      categoryFilter: null,
      items: [],
    });
    setItemStockInfo({});
  }, [urlType, reset]);

  // --- Fetch Stock Info (Stok Tersedia & HPP) ---
  const fetchStockInfo = useCallback(
    async (index, productId, locationId) => {
      if (!productId || !locationId || transactionType === "IN") return;

      try {
        const res = await axios.get(
          `/api/products/${productId}/main-stock?locationId=${locationId}`
        );
        const info = res.data;
        setItemStockInfo((prev) => ({
          ...prev,
          [index]: {
            availableStock: info.quantity || 0,
            currentAvgCost: info.average_cost || 0,
            sellingPrice: info.selling_price || 0,
          },
        }));
        setValue(`items.${index}.sellingPrice`, info.selling_price || 0);
      } catch (err) {
        setItemStockInfo((prev) => ({
          ...prev,
          [index]: { availableStock: 0, currentAvgCost: 0, sellingPrice: 0 },
        }));
      }
    },
    [transactionType, setValue]
  );

  // --- Efek Cek Stok Kritis ---
  useEffect(() => {
    if (transactionType === "OUT" && !loadingMaster) {
      watchedItems.forEach((item, index) => {
        const stockInfo = itemStockInfo[index];
        const requestedQty = item.quantity;
        const availableQty = stockInfo?.availableStock || 0;

        if (item.product && item.location && requestedQty > availableQty) {
          setError(`items.${index}.quantity`, {
            type: "manual",
            message: `Stok tidak cukup (${availableQty} unit tersedia).`,
          });
        } else if (
          item.product &&
          item.location &&
          errors.items?.[index]?.quantity?.type === "manual"
        ) {
          clearErrors(`items.${index}.quantity`);
        }

        if (!item.sellingPrice && transactionType === "OUT") {
          setError(`items.${index}.sellingPrice`, {
            type: "manual",
            message: `Harga Jual wajib diisi.`,
          });
        }
      });
    }
  }, [
    watchedItems,
    itemStockInfo,
    transactionType,
    clearErrors,
    setError,
    loadingMaster,
  ]);

  // --- Fetch Master Data Awal ---
  useEffect(() => {
    let isMounted = true;
    async function fetchMasterData() {
      try {
        const [locRes, statusRes, suppRes, custRes, catRes] = await Promise.all(
          [
            axios.get("/api/locations"),
            axios.get("/api/reports/stock-statuses"),
            axios.get("/api/suppliers?page=1&limit=1000"),
            axios.get("/api/customers?page=1&limit=1000"),
            axios.get("/api/products/categories"),
          ]
        );

        if (isMounted) {
          setLocations(locRes.data);
          setStockStatuses(statusRes.data);
          setSuppliers(suppRes.data.suppliers);
          setCustomers(custRes.data.customers);
          setCategories(catRes.data);
        }
      } catch (error) {
        if (isMounted) toast.error("Gagal memuat data master.");
      } finally {
        if (isMounted) setLoadingMaster(false);
      }
    }
    fetchMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- Handler Submit Utama ---
  const onSubmit = async (data) => {
    if (!transactionType) {
      toast.error("Tipe transaksi tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalItems = data.items.map((item, index) => {
        const avgCost =
          transactionType === "OUT"
            ? itemStockInfo[index]?.currentAvgCost
            : null;

        return {
          product_id: item.product.value,
          location_id: item.location.value,
          quantity: parseInt(item.quantity),
          stock_status_id: item.stockStatus.value,
          batch_number: item.batchNumber || null,
          expiry_date: item.expiryDate || null,
          purchase_price: item.purchasePrice || avgCost,
          selling_price: item.sellingPrice,
        };
      });

      const payload = {
        notes: data.notes,
        items: finalItems,
        supplier_id: data.supplier?.value || null,
        customer_id: data.customer?.value || null,
      };

      const endpoint =
        transactionType === "IN"
          ? "/api/transactions/in"
          : "/api/transactions/out";
      await axios.post(endpoint, payload);

      toast.success(
        `Transaksi ${
          transactionType === "IN" ? "Masuk" : "Keluar"
        } berhasil dicatat!`
      );
      navigate("/reports");
    } catch (err) {
      const errorMsg =
        err.response?.data?.msg ||
        `Gagal mencatat transaksi ${transactionType}.`;
      if (err.response?.status === 400 && err.response.data?.msg) {
        toast.error(err.response.data.msg);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Fungsi pencarian produk untuk AsyncSelect ---
  const loadProductOptions = async (inputValue) => {
    const categoryId = getValues("categoryFilter")?.value || "";
    try {
      const response = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}&categoryId=${categoryId}`
      );
      return response.data.products.map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
        purchasePrice: parseFloat(p.purchase_price),
        sellingPrice: parseFloat(p.selling_price),
      }));
    } catch (err) {
      return [];
    }
  };

  if (loadingMaster) {
    return <div className="p-6">Memuat data master...</div>;
  }

  const title =
    transactionType === "IN"
      ? "📥 Transaksi Barang Masuk"
      : "📤 Transaksi Barang Keluar";

  if (transactionType !== "IN" && transactionType !== "OUT") {
    return (
      <div className="p-6">
        Tipe transaksi tidak valid. Silakan pilih Barang Masuk atau Barang
        Keluar.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-7xl mx-auto">
      <TransactionTypeSelector transactionType={transactionType} />

      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
        {title}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <TransactionHeader
          transactionType={transactionType}
          control={control}
          register={register}
          errors={errors}
          suppliers={suppliers}
          customers={customers}
          setValue={setValue}
          watch={watch}
        />

        <TransactionItemsTable
          fields={fields}
          append={append}
          remove={remove}
          register={register}
          errors={errors}
          transactionType={transactionType}
          locations={locations}
          stockStatuses={stockStatuses}
          loadProductOptions={loadProductOptions}
          setValue={setValue}
          watch={watch}
          itemStockInfo={itemStockInfo}
          fetchStockInfo={fetchStockInfo}
          categories={categories}
          selectedCategoryFilter={selectedCategoryFilter}
        />

        {/* --- FOOTER / SUBMIT --- */}
        <div className="flex justify-end mt-6 border-t pt-4">
          <button
            type="submit"
            disabled={isSubmitting || fields.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400"
          >
            {isSubmitting
              ? "Memproses..."
              : `Catat Transaksi ${transactionType}`}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TransactionForm;
