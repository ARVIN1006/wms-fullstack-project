const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// Middleware: Semua user yang login boleh akses list (READ)
router.use(auth, authorize(["admin", "staff"]));

// GET /api/customers (Ambil semua customer dengan Pagination)
router.get("/", customerController.getCustomers);

// POST /api/customers (Hanya Admin)
router.post("/", authorize(["admin"]), customerController.createCustomer);

// PUT /api/customers/:id (Hanya Admin)
router.put("/:id", authorize(["admin"]), customerController.updateCustomer);

// DELETE /api/customers/:id (Hanya Admin)
router.delete("/:id", authorize(["admin"]), customerController.deleteCustomer);

module.exports = router;
