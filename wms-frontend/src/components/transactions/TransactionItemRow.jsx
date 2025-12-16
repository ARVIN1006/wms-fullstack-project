import React, { useState, useEffect } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import axios from "axios"; // Import axios
import Input from "../common/Input";
import Button from "../common/Button";
import Card from "../common/Card";

import { formatCurrency } from "../../utils/formatters";

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
  const ErrorMessage = ({ error }) => {
    return error ? (
      <p className="text-red-500 text-xs mt-1 font-medium">{error.message}</p>
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

  const watchedProduct = watch(`items.${index}.product`);
  const watchedLocation = watch(`items.${index}.location`);
  const [batchOptions, setBatchOptions] = useState([]);

  // Fetch batches when product/location changes for OUT transactions
  useEffect(() => {
    if (
      transactionType === "OUT" &&
      watchedProduct?.value &&
      watchedLocation?.value
    ) {
      const fetchBatches = async () => {
        try {
          const res = await axios.get(
            `/api/stocks/batches?productId=${watchedProduct.value}&locationId=${watchedLocation.value}`
          );
          const options = res.data.map((b) => ({
            value: b.batch_number,
            label: `${b.batch_number || "No Batch"} (Exp: ${
              b.expiry_date
                ? new Date(b.expiry_date).toLocaleDateString("id-ID")
                : "-"
            }) - Qty: ${b.quantity}`,
          }));
          setBatchOptions(options);
        } catch (err) {
          console.error("Failed to fetch batches", err);
        }
      };
      fetchBatches();
    } else {
      setBatchOptions([]);
    }
  }, [transactionType, watchedProduct?.value, watchedLocation?.value]);

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderColor: "#e5e7eb",
      borderRadius: "0.75rem",
      padding: "2px",
      minHeight: "42px",
      "&:hover": { borderColor: "#cbd5e1" },
      boxShadow: "none",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      zIndex: 20,
    }),
  };

  return (
    <Card className="!p-5 border border-indigo-50 shadow-md relative overflow-visible group transition-all hover:shadow-lg">
      {/* Row Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          Item #{index + 1}
        </h3>
        <Button
          type="button"
          onClick={() => remove(index)}
          variant="danger"
          size="sm"
          className="!py-1 !px-3 !text-xs opacity-70 group-hover:opacity-100 transition-opacity"
        >
          Hapus Item 🗑️
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 1. Produk */}
        <div className="col-span-12 md:col-span-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Produk <span className="text-red-500">*</span>
          </label>
          <AsyncSelect
            loadOptions={loadProductOptions}
            defaultOptions
            value={watchedProduct}
            onChange={(option) => {
              setValue(`items.${index}.product`, option, {
                shouldValidate: true,
              });
              if (transactionType === "IN") {
                setValue(
                  `items.${index}.purchasePrice`,
                  option?.purchasePrice || 0
                );
              } else if (transactionType === "OUT") {
                fetchStockInfo(index, option?.value, watchedLocation?.value);
              }
            }}
            placeholder="Cari Produk (SKU/Nama)..."
            styles={customSelectStyles}
            className="text-sm"
          />
          <ErrorMessage error={errors.items?.[index]?.product} />
        </div>

        {/* 2. Lokasi */}
        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Lokasi <span className="text-red-500">*</span>
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
            styles={customSelectStyles}
            className="text-sm"
          />
          <ErrorMessage error={errors.items?.[index]?.location} />
        </div>

        {/* 3. Status Stok */}
        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Status Stok <span className="text-red-500">*</span>
          </label>
          <Select
            options={statusOptions}
            value={watch(`items.${index}.stockStatus`)}
            onChange={(option) =>
              setValue(`items.${index}.stockStatus`, option, {
                shouldValidate: true,
              })
            }
            placeholder="Kondisi Item"
            styles={customSelectStyles}
            className="text-sm"
          />
          <ErrorMessage error={errors.items?.[index]?.stockStatus} />
        </div>

        {/* 4. Kuantitas */}
        <div className="col-span-12 md:col-span-2">
          <Input
            label="Jumlah *"
            type="number"
            min="1"
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            error={errors.items?.[index]?.quantity?.message}
            className="!text-center font-bold"
          />
          {transactionType === "OUT" && (
            <p className="text-[10px] text-orange-600 mt-1 font-medium bg-orange-50 px-2 py-0.5 rounded text-center">
              Stok: {itemStockInfo[index]?.availableStock || 0}
            </p>
          )}
        </div>

        {/* --- HARGA --- */}
        {transactionType === "IN" && (
          <div className="col-span-12 md:col-span-4">
            <Input
              label="Harga Beli / Unit *"
              type="number"
              step="0.01"
              min="0"
              {...register(`items.${index}.purchasePrice`, {
                valueAsNumber: true,
              })}
              error={errors.items?.[index]?.purchasePrice?.message}
              startIcon="Rp"
            />
          </div>
        )}

        {transactionType === "OUT" && (
          <div className="col-span-12 md:col-span-4">
            <Input
              label="Harga Jual / Unit *"
              type="number"
              step="0.01"
              min="0"
              {...register(`items.${index}.sellingPrice`, {
                valueAsNumber: true,
              })}
              error={errors.items?.[index]?.sellingPrice?.message}
              startIcon="Rp"
            />
            <p className="text-[10px] text-emerald-600 mt-1 font-medium text-right">
              HPP Avg: {formatCurrency(itemStockInfo[index]?.currentAvgCost)}
            </p>
          </div>
        )}

        {/* 6. Batch Number */}
        <div className="col-span-12 md:col-span-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Batch Number
          </label>
          {transactionType === "IN" ? (
            <Input
              type="text"
              {...register(`items.${index}.batchNumber`)}
              placeholder="No Batch (Opsional)"
            />
          ) : (
            <Select
              options={[{ value: "", label: "Auto (FIFO)" }, ...batchOptions]}
              onChange={(otp) =>
                setValue(`items.${index}.batchNumber`, otp?.value || "")
              }
              placeholder="Pilih Batch / Auto"
              isClearable
              styles={customSelectStyles}
              className="text-sm"
            />
          )}
        </div>

        {/* 7. Expiry Date */}
        <div className="col-span-12 md:col-span-4">
          <Input
            label="Expiry Date"
            type="date"
            {...register(`items.${index}.expiryDate`)}
          />
        </div>
      </div>
    </Card>
  );
};

export default TransactionItemRow;
