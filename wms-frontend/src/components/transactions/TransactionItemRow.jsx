import React from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";

const TransactionItemRow = ({
  index,
  register,
  errors,
  remove,
  transactionType,
  locations,
  stockStatuses,
  loadProductOptions,
  setValue,
  watch,
  itemStockInfo,
  fetchStockInfo,
}) => {
  // Helper untuk format mata uang
  const formatCurrency = (amount) => {
    return `Rp ${parseFloat(amount || 0).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Helper untuk menampilkan error
  const ErrorMessage = ({ error }) => {
    return error ? (
      <p className="text-red-500 text-xs mt-1">{error.message}</p>
    ) : null;
  };

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.name,
  }));
  const statusOptions = stockStatuses.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  // Watch values for this specific row
  const watchedProduct = watch(`items.${index}.product`);
  const watchedLocation = watch(`items.${index}.location`);

  return (
    <div className="p-4 border rounded-lg mb-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-blue-600">
          Item #{index + 1}
        </h3>
        <button
          type="button"
          onClick={() => remove(index)}
          className="text-red-500 hover:text-red-700 font-bold"
        >
          Hapus
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* 1. Produk */}
        <div className="col-span-4">
          <label className="block text-xs font-medium text-gray-700">
            Produk *
          </label>
          <AsyncSelect
            loadOptions={loadProductOptions}
            defaultOptions
            value={watchedProduct}
            onChange={(option) => {
              setValue(`items.${index}.product`, option, {
                shouldValidate: true,
              });
              // Auto-fill harga berdasarkan tipe transaksi
              if (transactionType === "IN") {
                setValue(
                  `items.${index}.purchasePrice`,
                  option?.purchasePrice || 0
                );
              } else if (transactionType === "OUT") {
                fetchStockInfo(index, option?.value, watchedLocation?.value);
              }
            }}
            placeholder="Cari Produk..."
            classNamePrefix="react-select"
          />
          <ErrorMessage error={errors.items?.[index]?.product} />
        </div>

        {/* 2. Lokasi */}
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700">
            Lokasi *
          </label>
          <Select
            options={locationOptions}
            value={watchedLocation}
            onChange={(option) => {
              setValue(`items.${index}.location`, option, {
                shouldValidate: true,
              });
              fetchStockInfo(index, watchedProduct?.value, option?.value);
            }}
            placeholder="Pilih Lokasi"
            classNamePrefix="react-select"
          />
          <ErrorMessage error={errors.items?.[index]?.location} />
        </div>

        {/* 3. Status Stok */}
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700">
            Status Stok *
          </label>
          <Select
            options={statusOptions}
            value={watch(`items.${index}.stockStatus`)}
            onChange={(option) =>
              setValue(`items.${index}.stockStatus`, option, {
                shouldValidate: true,
              })
            }
            placeholder="Pilih Status"
            classNamePrefix="react-select"
          />
          <ErrorMessage error={errors.items?.[index]?.stockStatus} />
        </div>

        {/* 4. Kuantitas */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700">
            Jumlah *
          </label>
          <input
            type="number"
            min="1"
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            className={`w-full px-3 py-2 border rounded-md shadow-sm ${
              errors.items?.[index]?.quantity
                ? "border-red-500"
                : "border-gray-300"
            }`}
          />
          <ErrorMessage error={errors.items?.[index]?.quantity} />
          {/* Tampilkan stok tersedia untuk OUT */}
          {transactionType === "OUT" && (
            <p className="text-xs text-yellow-700 mt-1">
              Stok Asal: {itemStockInfo[index]?.availableStock || 0} unit
            </p>
          )}
        </div>

        {/* --- HARGA (Kondisional) --- */}

        {/* 5A. Harga Beli (Hanya untuk IN) */}
        {transactionType === "IN" && (
          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-700">
              Harga Beli / Unit *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register(`items.${index}.purchasePrice`, {
                valueAsNumber: true,
              })}
              className={`w-full px-3 py-2 border rounded-md shadow-sm ${
                errors.items?.[index]?.purchasePrice
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            <ErrorMessage error={errors.items?.[index]?.purchasePrice} />
          </div>
        )}

        {/* 5B. Harga Jual (Hanya untuk OUT) */}
        {transactionType === "OUT" && (
          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-700">
              Harga Jual / Unit *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register(`items.${index}.sellingPrice`, {
                valueAsNumber: true,
              })}
              className={`w-full px-3 py-2 border rounded-md shadow-sm ${
                errors.items?.[index]?.sellingPrice
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            <ErrorMessage error={errors.items?.[index]?.sellingPrice} />
            <p className="text-xs text-green-700 mt-1">
              HPP Avg: {formatCurrency(itemStockInfo[index]?.currentAvgCost)}
            </p>
          </div>
        )}

        {/* 6. Batch Number */}
        <div className="col-span-4">
          <label className="block text-xs font-medium text-gray-700">
            Batch Number
          </label>
          <input
            type="text"
            {...register(`items.${index}.batchNumber`)}
            className="w-full px-3 py-2 border rounded-md shadow-sm"
          />
        </div>

        {/* 7. Expiry Date */}
        <div className="col-span-4">
          <label className="block text-xs font-medium text-gray-700">
            Expiry Date
          </label>
          <input
            type="date"
            {...register(`items.${index}.expiryDate`)}
            className="w-full px-3 py-2 border rounded-md shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionItemRow;
