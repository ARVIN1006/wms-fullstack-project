const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");
const validate = require("../middleware/validate");
const schemas = require("../middleware/schemas");
const productController = require("../controllers/productController");

// GET /api/products/categories - Ambil semua kategori
router.get(
  "/categories",
  auth,
  authorize(["admin", "staff"]),
  productController.getCategories
);

// GET /api/products - DENGAN AGGREGATE STOK, FILTER KATEGORI, SEARCH, PAGINATION, DAN SORTING
router.get(
  "/",
  auth,
  authorize(["admin", "staff"]),
  productController.getProducts
);

// GET /api/products/:id/main-stock - Mendapatkan stok di lokasi tertentu (untuk MovementForm)
router.get(
  "/:id/main-stock",
  auth,
  authorize(["admin", "staff"]),
  productController.getProductMainStock
);

// GET /api/products/:id/stock - Mendapatkan detail stok per lokasi (untuk Tabel Produk)
router.get(
  "/:id/stock",
  auth,
  authorize(["admin", "staff"]),
  productController.getProductStockDetail
);

// GET /api/products/by-sku/:sku (FIX: Tambah category_id dan volume_m3)
router.get(
  "/by-sku/:sku",
  auth,
  authorize(["admin", "staff"]),
  productController.getProductBySku
);

// POST /api/products - Tambah produk BARU (FIX: Tambahkan category_id)
router.post(
  "/",
  auth,
  authorize(["admin", "staff"]),
  validate(schemas.createProduct),
  productController.createProduct
);

// PUT /api/products/:id - Update data produk (FIX: Tambahkan category_id)
router.put(
  "/:id",
  auth,
  authorize(["admin", "staff"]),
  validate(schemas.updateProduct),
  productController.updateProduct
);

// DELETE /api/products/:id - Mencegah penghapusan jika masih ada stok aktif
router.delete(
  "/:id",
  auth,
  authorize(["admin"]),
  productController.deleteProduct
);

module.exports = router;
