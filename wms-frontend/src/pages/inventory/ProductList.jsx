import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import ProductForm from "../../components/ProductForm";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import Select from "react-select";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";
import { formatCurrency } from "../../utils/formatters";

const LIMIT_PER_PAGE = 10;

// --- KOMPONEN SKELETON BARU ---
const ProductListSkeleton = () => {
  // Skeleton untuk baris tabel
  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-100">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded skeleton-shimmer w-full"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="h-8 bg-gray-300 rounded w-48"></div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="h-10 bg-gray-300 rounded w-full md:w-64"></div>
          <div className="h-10 bg-gray-300 rounded w-20"></div>
        </div>
      </div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
    </div>
  );
};

function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Pagination dan Search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Sorting
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  // State untuk menyimpan detail stok yang baru diambil
  const [productStockDetails, setProductStockDetails] = useState({});

  // Role dari Context
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  // Opsi Dropdown Kategori
  const categoryOptions = [
    { value: "", label: "Semua Kategori" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  // Custom Styles for React Select
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(8px)",
      borderColor: state.isFocused ? "#8b5cf6" : "rgba(255, 255, 255, 0.6)",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(139, 92, 246, 0.2)" : "none",
      "&:hover": {
        borderColor: "#8b5cf6",
      },
      borderRadius: "12px",
      padding: "2px",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#8b5cf6"
        : state.isFocused
        ? "#ede9fe"
        : "white",
      color: state.isSelected ? "white" : "#1f2937",
      cursor: "pointer",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "12px",
      overflow: "hidden",
      zIndex: 100,
    }),
  };

  // --- Fungsi untuk Toggle Detail Stok ---
  const toggleStockDetail = async (productId) => {
    if (productStockDetails[productId]) {
      setProductStockDetails((prev) => ({ ...prev, [productId]: null }));
      return;
    }

    try {
      const response = await axios.get(`/api/products/${productId}/stock`);
      setProductStockDetails((prev) => ({
        ...prev,
        [productId]: response.data,
      }));
    } catch (err) {
      toast.error("Gagal memuat detail stok.");
    }
  };

  // --- useEffect: Fetch Data Master dan Produk ---
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch Data Master (Kategori)
    async function fetchMasterData() {
      try {
        const categoryRes = await axios.get("/api/products/categories");
        if (isMounted) setCategories(categoryRes.data);
      } catch (err) {
        if (isMounted) toast.error("Gagal memuat data kategori.");
      }
    }

    // 2. Fetch Data Produk
    async function fetchProductsData() {
      try {
        if (isMounted) setLoading(true);
        const response = await axios.get(
          `/api/products?page=${currentPage}&limit=${LIMIT_PER_PAGE}&search=${activeSearch}&sortBy=${sortBy}&sortOrder=${sortOrder}&categoryId=${
            selectedCategory?.value || ""
          }`
        );

        if (isMounted) {
          setProducts(response.data.products);
          setTotalPages(response.data.totalPages);
          setCurrentPage(response.data.currentPage);
        }
      } catch (err) {
        if (
          isMounted &&
          err.response?.status !== 401 &&
          err.response?.status !== 403
        ) {
          toast.error("Gagal memuat data produk.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMasterData();
    fetchProductsData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, activeSearch, sortBy, sortOrder, selectedCategory]);

  // --- Handlers CRUD ---
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingProduct(null);
  };
  const handleAddClick = () => {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };
  const handleEditClick = (product) => {
    setIsFormModalOpen(true);
    setEditingProduct(product);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (productData.id) {
        await axios.put(`/api/products/${productData.id}`, productData);
        toast.success("Produk berhasil diupdate!");
      } else {
        await axios.post("/api/products", productData);
        toast.success("Produk baru berhasil ditambahkan!");
      }
      handleCloseFormModal();
      if (currentPage !== 1) setCurrentPage(1);
      else setCurrentPage((c) => c);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menyimpan produk.");
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setIsConfirmModalOpen(true);
  };
  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setProductToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await axios.delete(`/api/products/${productToDelete.id}`);
      toast.success(`Produk "${productToDelete.name}" berhasil dihapus.`);

      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        setCurrentPage((c) => c);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menghapus produk.");
    } finally {
      handleCloseConfirmModal();
    }
  };

  // --- Handlers Sorting, Pagination, Search ---
  const handleSortClick = (field) => {
    if (field === sortBy) setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    else {
      setSortBy(field);
      setSortOrder("DESC");
    }
  };
  const renderSortIcon = (field) => {
    if (field !== sortBy) return null;
    return sortOrder === "ASC" ? " ▲" : " ▼";
  };

  const handleSearchAndFilterSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    setActiveSearch(searchQuery);
  };

  const handleCategoryChange = (selectedOption) => {
    setSelectedCategory(selectedOption);
    setCurrentPage(1);
    setActiveSearch(searchQuery);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return <ProductListSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Manajemen Produk
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Kelola katalog produk, harga, dan stok
          </p>
        </div>

        {isAdmin && (
          <Button onClick={handleAddClick} variant="primary" startIcon="+">
            Produk Baru
          </Button>
        )}
      </div>

      <Card>
        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6 items-end">
          <div className="w-full lg:w-1/3">
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
              Cari Produk
            </label>
            <form onSubmit={handleSearchAndFilterSubmit} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SKU atau Nama..."
                className="w-full"
              />
              <Button type="submit" variant="secondary">
                Cari
              </Button>
            </form>
          </div>

          <div className="w-full lg:w-1/3">
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
              Kategori
            </label>
            <Select
              options={categoryOptions}
              value={selectedCategory}
              onChange={handleCategoryChange}
              placeholder="Semua Kategori"
              isClearable={true}
              styles={customSelectStyles}
              classNamePrefix="react-select"
            />
          </div>
        </div>

        {/* Table */}
        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Tidak ada produk ditemukan.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80 backdrop-blur-sm">
                  <tr>
                    {[
                      { key: "sku", label: "SKU" },
                      { key: "name", label: "Nama Produk" },
                      { key: "category", label: "Kategori" },
                      { key: "unit", label: "Satuan" },
                      { key: "main_location", label: "Lokasi" },
                      { key: "purchase_price", label: "HPP" },
                      { key: "selling_price", label: "Harga Jual" },
                      { key: "total_quantity_in_stock", label: "Total Stok" },
                      { key: "total_value_asset", label: "Nilai Aset" },
                      { key: "actions", label: "Aksi" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() =>
                          col.key !== "category" &&
                          col.key !== "unit" &&
                          col.key !== "actions" &&
                          handleSortClick(col.key)
                        }
                        className={`px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider ${
                          col.key !== "category" &&
                          col.key !== "unit" &&
                          col.key !== "actions"
                            ? "cursor-pointer hover:bg-gray-100/50"
                            : ""
                        }`}
                      >
                        {col.label} {renderSortIcon(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white/60 divide-y divide-gray-100">
                  {products.map((product) => (
                    <Fragment key={product.id}>
                      <tr
                        className={`hover:bg-indigo-50/30 transition-colors ${
                          productStockDetails[product.id]
                            ? "bg-indigo-50/20"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <Badge variant="neutral" size="sm">
                            {product.category_name || "-"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                          {product.main_location_name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(product.purchase_price || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(product.selling_price || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-bold text-gray-800">
                              {product.total_quantity_in_stock}
                            </span>
                            <button
                              onClick={() => toggleStockDetail(product.id)}
                              className="text-[10px] text-indigo-500 hover:text-indigo-700 underline font-medium mt-1"
                            >
                              {productStockDetails[product.id]
                                ? "Tutup"
                                : "Detail"}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                          {formatCurrency(product.total_value_asset || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          {isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEditClick(product)}
                                className="!px-2 !py-1"
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDeleteClick(product)}
                                className="!px-2 !py-1"
                              >
                                🗑️
                              </Button>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">🔒</span>
                          )}
                        </td>
                      </tr>

                      {/* Detail Stok */}
                      {productStockDetails[product.id] && (
                        <tr className="bg-indigo-50/20">
                          <td colSpan="11" className="px-6 py-3">
                            <div className="ml-4 pl-4 border-l-2 border-indigo-200">
                              <p className="font-bold text-xs text-indigo-800 mb-2 uppercase tracking-wide">
                                📦 Rincian Stok per Lokasi
                              </p>
                              {productStockDetails[product.id].length === 0 ? (
                                <p className="text-xs text-red-500 italic">
                                  Stok habis di semua lokasi.
                                </p>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {productStockDetails[product.id].map(
                                    (stock, index) => (
                                      <div
                                        key={index}
                                        className="bg-white px-3 py-2 rounded-lg border border-indigo-100 shadow-sm flex justify-between items-center"
                                      >
                                        <span className="text-xs text-gray-600 font-medium">
                                          {stock.location_name}
                                        </span>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                          {stock.quantity}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-gray-100/50">
                <div className="text-sm text-gray-500">
                  Halaman{" "}
                  <span className="font-bold text-indigo-600">
                    {currentPage}
                  </span>{" "}
                  dari <span className="font-bold">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    variant="secondary"
                    size="sm"
                  >
                    &laquo; Prev
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    variant="secondary"
                    size="sm"
                  >
                    Next &raquo;
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal Form */}
      {isFormModalOpen && (
        <ProductForm
          onClose={handleCloseFormModal}
          onSave={handleSaveProduct}
          productToEdit={editingProduct}
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {isConfirmModalOpen && (
        <ConfirmModal
          title="Hapus Produk"
          message={`Apakah Anda yakin ingin menghapus produk "${productToDelete?.name}"?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default ProductList;
