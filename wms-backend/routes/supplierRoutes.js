const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// GET /api/suppliers (Ambil semua supplier)
router.get(
  "/",
  auth,
  authorize(["admin", "staff"]),
  supplierController.getSuppliers
);

// POST /api/suppliers (Buat supplier baru)
router.post("/", auth, authorize(["admin"]), supplierController.createSupplier);

// PUT /api/suppliers/:id (Update supplier)
router.put(
  "/:id",
  auth,
  authorize(["admin"]),
  supplierController.updateSupplier
);

// DELETE /api/suppliers/:id (Hapus supplier)
router.delete(
  "/:id",
  auth,
  authorize(["admin"]),
  supplierController.deleteSupplier
);

module.exports = router;
