const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");
const reportController = require("../controllers/reportController");

// Middleware: Hanya Admin yang boleh melihat semua laporan utama
router.use(auth, authorize(["admin"]));

// ====================================================
// 1. RUTE EXCEPTION (WAJIB STAFF/MASTER DATA)
// ====================================================

// GET /api/reports/stock-statuses
router.get(
  "/stock-statuses",
  auth,
  authorize(["admin", "staff"]),
  reportController.getStockStatuses
);

// GET /api/reports/recent-activity
router.get(
  "/recent-activity",
  auth,
  authorize(["admin", "staff"]),
  reportController.getRecentActivity
);

// ====================================================
// 2. LAPORAN RIWAYAT TRANSAKSI (HISTORY)
// ====================================================
router.get("/history", reportController.getHistory);

// ====================================================
// 2A. RUTE EXPORT HISTORY (IGNORING PAGINATION) - BARU
// ====================================================
router.get("/history/export-all", reportController.getHistoryExport);

// ====================================================
// 3. LAPORAN PERPINDAHAN BARANG (MOVEMENT) - DITAMBAH PAGINATION
// ====================================================
router.get("/movements", reportController.getMovements);

// ====================================================
// 3A. RUTE EXPORT ALL MOVEMENT (TANPA PAGINATION) - BARU
// ====================================================
router.get("/movements/export-all", reportController.getMovementsExport);

// ====================================================
// 4. LAPORAN KINERJA GUDANG (FIXED: Per Operator)
// ====================================================
router.get("/performance", reportController.getPerformance);

// ====================================================
// 5. LAPORAN AKTIVITAS USER (FIX BUG FILTER TANGGAL)
// ====================================================
router.get("/activity", reportController.getActivity);

// ====================================================
// 6. LAPORAN CUSTOMER & ORDER (FIXED: PROFIT & FILTER TANGGAL)
// ====================================================
router.get("/customer-order", reportController.getCustomerOrder);

// ====================================================
// 7. LAPORAN KEUANGAN - PROFIT & LOSS (REVAMPED)
// ====================================================
router.get("/financial", reportController.getFinancial);

// ====================================================
// 8. LAPORAN STOK BERMASALAH (Rusak/Kadaluarsa) DENGAN PAGINATION
// ====================================================
router.get("/inventory-status", reportController.getInventoryStatus);

module.exports = router;
