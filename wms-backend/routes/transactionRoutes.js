const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// POST /api/transactions/in (Barang Masuk - Final Upgrade)
router.post("/in", auth, authorize(["admin", "staff"]), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { notes, items, supplier_id } = req.body;
    const operator_id = req.user.id;
    const stock_status_id = items[0]?.stock_status_id || 1; // Ambil status ID (default 1 jika gagal)

    // 1. Buat Header Transaksi
    const transResult = await client.query(
      "INSERT INTO transactions (type, notes, supplier_id, operator_id, process_start, process_end) VALUES ('IN', $1, $2, $3, NOW(), NOW()) RETURNING id",
      [notes, supplier_id || null, operator_id]
    );
    const transactionId = transResult.rows[0].id;

    // 2. Proses Setiap Item Barang
    for (const item of items) {
      // Ambil Status, Harga, Batch, Expiry (SEMUA FIELD BARU)
      const {
        product_id,
        location_id,
        quantity,
        stock_status_id,
        purchase_price, // Diambil dari frontend
        selling_price,
        batch_number,
        expiry_date,
      } = item;

      // 2a. Validasi Dasar
      if (quantity <= 0 || !product_id || !location_id) {
        throw new Error(
          "Item baris wajib memiliki Produk, Lokasi, dan Jumlah."
        );
      }

      // 2b. Menyimpan detail di transaction_items (Query DI-UPGRADE)
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, purchase_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          transactionId,
          product_id,
          location_id,
          quantity,
          stock_status_id,
          batch_number || null,
          expiry_date || null,
          purchase_price, // <-- DISIMPAN UNTUK AKURASI AKUNTANSI
        ] 
      );

      // 2c. Update Master Data Produk (Harga Beli Terbaru)
      if (purchase_price > 0) {
        await client.query(
          "UPDATE products SET purchase_price = $1 WHERE id = $2",
          [purchase_price, product_id]
        );
      }

      // 2d. Update Stok (UPSERT)
      await client.query(
        `
        INSERT INTO stock_levels (product_id, location_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
      `,
        [product_id, location_id, quantity]
      );
    }

    await client.query("COMMIT");

    // --- Kirim Sinyal Realtime (Wajib menggunakan req.io yang disuntikkan di index.js) ---
    req.io.emit("new_activity", {
      message: "Aktivitas Inbound baru tercatat!",
      type: "IN",
    });

    res.json({ msg: "Barang masuk berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("TRANSACTION IN ERROR:", err.message); // <-- Logger yang lebih jelas
    res.status(500).json({ msg: "Gagal mencatat transaksi: " + err.message });
  } finally {
    client.release();
  }
});

// POST /api/transactions/out (Barang Keluar - Final Upgrade)
router.post("/out", auth, authorize(["admin", "staff"]), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { notes, items, customer_id } = req.body;
    const operator_id = req.user.id;

    // 1. Buat Header Transaksi
    const transResult = await client.query(
      "INSERT INTO transactions (type, notes, customer_id, operator_id, process_start, process_end) VALUES ('OUT', $1, $2, $3, NOW(), NOW()) RETURNING id",
      [notes, customer_id || null, operator_id]
    );
    const transactionId = transResult.rows[0].id;

    // 2. Proses Setiap Item Barang
    for (const item of items) {
      const {
        product_id,
        location_id,
        quantity,
        stock_status_id,
        selling_price, // Diambil dari frontend
        batch_number,
        expiry_date,
      } = item;

      // 2a. Validasi Dasar
      if (quantity <= 0 || !product_id || !location_id || !stock_status_id) {
        throw new Error(
          "Item baris wajib memiliki Produk, Lokasi, Status, dan Jumlah."
        );
      }

      // 2b. Cek Stok Dulu (PENTING)
      const stockCheck = await client.query(
        "SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE",
        [product_id, location_id]
      );
      const currentStock = stockCheck.rows[0]?.quantity || 0;

      if (currentStock < quantity) {
        throw new Error(
          `Stok tidak cukup di lokasi asal. Sisa: ${currentStock}, Diminta: ${quantity}`
        );
      }
      
      // Ambil Harga Pokok (HPP) dari master produk untuk mencatat COGS
      const productMaster = await client.query(
          "SELECT purchase_price FROM products WHERE id = $1", [product_id]
      );
      const purchasePriceAtTrans = productMaster.rows[0]?.purchase_price || 0;

      // 2c. Menyimpan detail di transaction_items (Simpan Selling dan Purchase Price)
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, selling_price_at_trans, purchase_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          transactionId,
          product_id,
          location_id,
          quantity,
          stock_status_id,
          batch_number || null,
          expiry_date || null,
          selling_price, // <-- DISIMPAN UNTUK AKURASI AKUNTANSI
          purchasePriceAtTrans, // <-- HPP DISIMPAN UNTUK AKURASI COGS
        ] 
      );

      // 2d. Update Stok (Kurangi)
      await client.query(
        "UPDATE stock_levels SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3",
        [quantity, product_id, location_id]
      );

      // 2e. Update Master Data Produk (Harga Jual Terbaru)
      if (selling_price > 0) {
        await client.query(
          "UPDATE products SET selling_price = $1 WHERE id = $2",
          [selling_price, product_id]
        );
      }
    }

    await client.query("COMMIT");

    // --- Kirim Sinyal Realtime ---
    req.io.emit("new_activity", {
      message: "Aktivitas Outbound baru tercatat!",
      type: "OUT",
    });

    res.json({ msg: "Barang keluar berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query("ROLLBACK");
    // Kirim pesan error yang jelas (status 400 jika error dari validasi stok)
    const statusCode = err.message.includes("Stok tidak cukup") ? 400 : 500;
    console.error("TRANSACTION OUT ERROR:", err.message);
    res.status(statusCode).json({ msg: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;