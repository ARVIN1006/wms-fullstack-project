const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");
const stockController = require("../controllers/stockController");

// GET /api/stocks - Ambil semua data stok (Pagination)
router.get("/", auth, authorize(["admin", "staff"]), stockController.getStocks);

// GET /api/stocks/low-stock - Ambil stok menipis
router.get(
  "/low-stock",
  auth,
  authorize(["admin", "staff"]),
  stockController.getLowStock
);

// NEW: GET /api/stocks/batches - Ambil saran batch (FIFO)
router.get(
  "/batches",
  auth,
  authorize(["admin", "staff"]),
  stockController.getBatchSuggestions
);

// GET /api/stocks/specific/:productId/:locationId - Stok spesifik
router.get(
  "/specific/:productId/:locationId",
  auth,
  authorize(["admin", "staff"]),
  stockController.getSpecificStock
);

// POST /api/stocks/opname - Stok Opname
router.post(
  "/opname",
  auth,
  authorize(["admin", "staff"]),
  stockController.createOpname
);

module.exports = router;
