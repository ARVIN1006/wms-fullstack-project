const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// POST /api/transactions/in
router.post('/in', auth, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Ambil supplier_id dan notes dari body
    const { notes, items, supplier_id } = req.body; 

    // 2. Masukkan supplier_id ke query
    const transResult = await client.query(
      "INSERT INTO transactions (type, notes, supplier_id) VALUES ('IN', $1, $2) RETURNING id",
      [notes, supplier_id || null] // Kirim null jika supplier_id tidak ada
    );
    const transactionId = transResult.rows[0].id;

    // ... (Sisa kodenya sama persis) ...
    for (const item of items) {
      const { product_id, location_id, quantity } = item;
      await client.query(
        'INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity) VALUES ($1, $2, $3, $4)',
        [transactionId, product_id, location_id, quantity]
      );
      await client.query(`
        INSERT INTO stock_levels (product_id, location_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
      `, [product_id, location_id, quantity]);
    }
    await client.query('COMMIT');
    res.json({ msg: "Barang masuk berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Transaksi Gagal: ' + err.message);
  } finally {
    client.release();
  }
});

// POST /api/transactions/out
router.post('/out', auth, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { notes, items } = req.body;
    const transResult = await client.query(
      "INSERT INTO transactions (type, notes) VALUES ('OUT', $1) RETURNING id",
      [notes]
    );
    const transactionId = transResult.rows[0].id;

    for (const item of items) {
      const { product_id, location_id, quantity } = item;
      const stockCheck = await client.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
        [product_id, location_id]
      );
      const currentStock = stockCheck.rows[0]?.quantity || 0;

      if (currentStock < quantity) {
        throw new Error(`Stok tidak cukup untuk produk ID ${product_id} di lokasi ID ${location_id}. Sisa: ${currentStock}, Diminta: ${quantity}`);
      }
      await client.query(
        'INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity) VALUES ($1, $2, $3, $4)',
        [transactionId, product_id, location_id, quantity]
      );
      await client.query(
        'UPDATE stock_levels SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3',
        [quantity, product_id, location_id]
      );
    }
    await client.query('COMMIT');
    res.json({ msg: "Barang keluar berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(400).json({ msg: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;