const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// GET semua lokasi (DI-UPGRADE dengan Utilisasi)
router.get(
  "/",
  auth,
  authorize(["admin", "staff"]),
  locationController.getLocations
);

// POST tambah lokasi baru (DI-UPGRADE dengan Kapasitas)
router.post("/", auth, authorize(["admin"]), locationController.createLocation);

module.exports = router;
