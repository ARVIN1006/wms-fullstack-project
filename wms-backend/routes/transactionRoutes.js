const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// Fungsi untuk mendapatkan data stok saat ini
async function getCurrentStockAndCost(client, productId, locationId) {
  const result = await client.query(
    "SELECT quantity, average_cost FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE",
    [productId, locationId]
  );
  return result.rows[0] || { quantity: 0, average_cost: 0.0 };
}

// POST /api/transactions/in (Barang Masuk - AVERAGE COST IMPLEMENTATION)
router.post("/in", auth, authorize(["admin", "staff"]), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { notes, items, supplier_id } = req.body;
    const operator_id = req.user.id;

    // 1. Buat Header Transaksi
    const transResult = await client.query(
      "INSERT INTO transactions (type, notes, supplier_id, operator_id, process_start, process_end) VALUES ('IN', $1, $2, $3, NOW(), NOW()) RETURNING id",
      [notes, supplier_id || null, operator_id]
    );
    const transactionId = transResult.rows[0].id;

    // 2. Proses Setiap Item Barang
    for (const item of items) {
      const {
        product_id,
        location_id,
        quantity,
        stock_status_id,
        purchase_price, // Harga Beli Item Masuk
        selling_price,
        batch_number,
        expiry_date,
      } = item;

      if (quantity <= 0 || !product_id || !location_id) {
        throw new Error(
          "Item baris wajib memiliki Produk, Lokasi, dan Jumlah."
        );
      }

      // --- LOGIKA AVERAGE COST BARU ---
      const currentStock = await getCurrentStockAndCost(
        client,
        product_id,
        location_id
      );
      const oldQty = parseFloat(currentStock.quantity);
      const oldAvgCost = parseFloat(currentStock.average_cost);
      const inQty = parseFloat(quantity);
      const inPrice = parseFloat(purchase_price);

      // Hitung Biaya Rata-Rata Baru
      let newAvgCost;
      if (oldQty + inQty > 0) {
        newAvgCost =
          (oldQty * oldAvgCost + inQty * inPrice) / (oldQty + inQty);
      } else {
        newAvgCost = inPrice;
      }
      
      // 2a. Menyimpan detail di transaction_items (purchase_price_at_trans = Harga Masuk)
      // Harga di sini adalah harga HPP untuk item yang baru masuk
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, purchase_price_at_trans, selling_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          transactionId,
          product_id,
          location_id,
          quantity,
          stock_status_id,
          batch_number || null,
          expiry_date || null,
          inPrice, // Simpan Harga Beli Item Masuk sebagai HPP Transaksi IN
          selling_price,
        ] 
      );

      // 2b. Update Stok dan Average Cost (UPSERT + UPDATE COST)
      await client.query(
        `
        INSERT INTO stock_levels (product_id, location_id, quantity, average_cost)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET 
            quantity = stock_levels.quantity + EXCLUDED.quantity,
            average_cost = $4 -- Set cost baru setelah perhitungan
      `,
        [product_id, location_id, quantity, newAvgCost] // Gunakan newAvgCost
      );
      
      // 2c. Update Master Data Produk (Harga Jual Terbaru saja)
      if (selling_price > 0) {
        await client.query(
          "UPDATE products SET selling_price = $1 WHERE id = $2",
          [selling_price, product_id]
        );
      }
    }

    await client.query("COMMIT");

    req.io.emit("new_activity", {
      message: "Aktivitas Inbound baru tercatat!",
      type: "IN",
    });

    res.json({ msg: "Barang masuk berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("TRANSACTION IN ERROR:", err.message); 
    res.status(500).json({ msg: "Gagal mencatat transaksi: " + err.message });
  } finally {
    client.release();
  }
});

// POST /api/transactions/out (Barang Keluar - AVERAGE COST IMPLEMENTATION)
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
        selling_price, 
        batch_number,
        expiry_date,
      } = item;

      if (quantity <= 0 || !product_id || !location_id || !stock_status_id) {
        throw new Error(
          "Item baris wajib memiliki Produk, Lokasi, Status, dan Jumlah."
        );
      }

      // 2a. Cek Stok Dulu & Ambil AVERAGE COST saat ini
      const stockCheck = await client.query(
        "SELECT quantity, average_cost FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE",
        [product_id, location_id]
      );
      const currentStock = stockCheck.rows[0];
      const currentQty = currentStock?.quantity || 0;

      if (currentQty < quantity) {
        throw new Error(
          `Stok tidak cukup di lokasi asal. Sisa: ${currentQty}, Diminta: ${quantity}`
        );
      }
      
      // HPP saat ini adalah Average Cost di stock_levels
      const purchasePriceAtTrans = currentStock.average_cost; 

      // 2b. Menyimpan detail di transaction_items (purchase_price_at_trans = HPP Rata-Rata)
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
          selling_price, 
          purchasePriceAtTrans, // <-- HPP DARI AVERAGE COST
        ] 
      );

      // 2c. Update Stok (Kurangi)
      // NOTE: Average Cost TIDAK BERUBAH saat barang keluar
      await client.query(
        "UPDATE stock_levels SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3",
        [quantity, product_id, location_id]
      );

      // 2d. Update Master Data Produk (Harga Jual Terbaru)
      if (selling_price > 0) {
        await client.query(
          "UPDATE products SET selling_price = $1 WHERE id = $2",
          [selling_price, product_id]
        );
      }
    }

    await client.query("COMMIT");

    req.io.emit("new_activity", {
      message: "Aktivitas Outbound baru tercatat!",
      type: "OUT",
    });

    res.json({ msg: "Barang keluar berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query("ROLLBACK");
    const statusCode = err.message.includes("Stok tidak cukup") ? 400 : 500;
    console.error("TRANSACTION OUT ERROR:", err.message);
    res.status(statusCode).json({ msg: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;