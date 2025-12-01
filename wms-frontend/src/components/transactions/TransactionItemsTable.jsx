import React from "react";
import TransactionItemRow from "./TransactionItemRow";
import Select from "react-select";

const TransactionItemsTable = ({
  fields,
  append,
  remove,
  register,
  errors,
  transactionType,
  locations,
  stockStatuses,
  loadProductOptions,
  setValue,
  watch,
  itemStockInfo,
  fetchStockInfo,
  categories,
  selectedCategoryFilter,
}) => {
  const categoryOptions = [
    { value: "", label: "Semua Kategori" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div>
      {/* --- FILTER KATEGORI (KONTROL PRODUK) --- */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter Produk Berdasarkan Kategori
        </label>
        <Select
          options={categoryOptions}
          value={selectedCategoryFilter}
          // Saat filter kategori berubah, item yang sudah ada TIDAK perlu direset
          onChange={(option) => setValue("categoryFilter", option)}
          placeholder="Semua Kategori"
          isClearable={true}
          classNamePrefix="react-select"
        />
      </div>

      {/* --- ITEM BARIS (FIELD ARRAY) --- */}
      <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
        Detail Item Transaksi
      </h2>

      {errors.items && (
        <p className="text-red-500 text-sm mb-4">
          Minimal harus ada 1 item transaksi.
        </p>
      )}

      {fields.map((field, index) => (
        <TransactionItemRow
          key={field.id}
          index={index}
          register={register}
          errors={errors}
          remove={remove}
          transactionType={transactionType}
          locations={locations}
          stockStatuses={stockStatuses}
          loadProductOptions={loadProductOptions}
          setValue={setValue}
          watch={watch}
          itemStockInfo={itemStockInfo}
          fetchStockInfo={fetchStockInfo}
        />
      ))}

      {/* Tombol Tambah Item */}
      <button
        type="button"
        onClick={() =>
          append({
            product: null,
            location: null,
            stockStatus: stockStatuses.find((s) => s.name === "Good") || null,
            quantity: 1,
            purchasePrice: 0,
            sellingPrice: 0,
            batchNumber: "",
            expiryDate: "",
          })
        }
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition mb-6"
      >
        + Tambah Item
      </button>
    </div>
  );
};

export default TransactionItemsTable;
