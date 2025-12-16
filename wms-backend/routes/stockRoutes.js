const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");
const stockController = require("../controllers/stockController");

// GET /api/stocks - Mendapatkan semua stok (Dashboard)
router.get("/", auth, authorize(["admin", "staff"]), stockController.getStocks);

// GET /api/stocks/low-stock - Mencari stok tipis
router.get(
  "/low-stock",
  auth,
  authorize(["admin", "staff"]),
  stockController.getLowStock
);

// GET /api/stocks/specific/:productId/:locationId - Untuk Stock Opname
router.get(
  "/specific/:productId/:locationId",
  auth,
  authorize(["admin", "staff"]),
  stockController.getSpecificStock
);

// POST /api/stocks/opname - Mencatat dan Menyesuaikan Stok Opname
router.post(
  "/opname",
  auth,
  authorize(["admin", "staff"]),
  stockController.createOpname
);

module.exports = router;
