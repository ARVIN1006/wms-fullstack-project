const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// Middleware: Hanya Admin yang boleh mengakses rute di file ini
router.use(auth, authorize(["admin"]));

// GET /api/users - Ambil semua user (Hanya Admin)
router.get("/", userController.getUsers);

// PUT /api/users/:id - Update/Edit user yang sudah ada (Hanya Admin)
router.put("/:id", userController.updateUser);

// DELETE /api/users/:id - Hapus user (Hanya Admin)
router.delete("/:id", userController.deleteUser);

module.exports = router;
