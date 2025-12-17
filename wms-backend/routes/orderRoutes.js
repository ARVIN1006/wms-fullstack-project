const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

router.use(auth);

// Purchase Orders
router.get("/purchase", orderController.getPurchaseOrders);
router.get("/purchase/:id", orderController.getPurchaseOrderById);
router.post(
  "/purchase",
  authorize(["admin", "staff"]),
  orderController.createPurchaseOrder
);
router.put(
  "/purchase/:id/status",
  authorize(["admin", "staff"]),
  orderController.updatePurchaseOrderStatus
);

// Sales Orders
router.get("/sales", orderController.getSalesOrders);
router.get("/sales/:id", orderController.getSalesOrderById);
router.post(
  "/sales",
  authorize(["admin", "staff"]),
  orderController.createSalesOrder
);
router.put(
  "/sales/:id/status",
  authorize(["admin", "staff"]),
  orderController.updateSalesOrderStatus
);

router.get("/pending-counts", auth, orderController.getPendingCounts);

module.exports = router;
