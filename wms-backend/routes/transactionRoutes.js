const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");
const validate = require("../middleware/validate");
const schemas = require("../middleware/schemas");
const transactionController = require("../controllers/transactionController");

// POST /api/transactions/in (Barang Masuk - DENGAN KAPASITAS CEK)
router.post(
  "/in",
  auth,
  authorize(["admin", "staff"]),
  validate(schemas.transactionIn),
  transactionController.createTransactionIn
);

// POST /api/transactions/out (Barang Keluar - AVERAGE COST IMPLEMENTATION)
router.post(
  "/out",
  auth,
  authorize(["admin", "staff"]),
  validate(schemas.transactionOut),
  transactionController.createTransactionOut
);

module.exports = router;
