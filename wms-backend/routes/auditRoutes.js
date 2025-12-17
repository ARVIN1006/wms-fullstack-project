const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// Only Admins can view audit logs
router.get("/", auth, authorize(["admin"]), auditController.getAuditLogs);

module.exports = router;
