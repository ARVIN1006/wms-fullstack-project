const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

// Middleware: Hanya Admin/Staff yang boleh mengakses
router.use(auth, authorize(['admin', 'staff']));

// POST /api/movements - Mencatat Perpindahan Baru (DENGAN UPDATE STOK)
router.post('/', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN'); // Mulai transaksi database

    const { product_id, from_location_id, to_location_id, quantity, reason } = req.body;
    const operator_id = req.user.id; 

    if (!product_id || !from_location_id || !to_location_id || !quantity || quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ msg: 'Semua detail pergerakan wajib diisi, dan jumlah harus positif.' });
    }
    if (from_location_id === to_location_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ msg: 'Lokasi Asal dan Lokasi Tujuan tidak boleh sama.' });
    }

    // --- 1. CEK STOK ASAL ---
    const stockCheck = await client.query(
      'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
      [product_id, from_location_id]
    );
    const currentStock = stockCheck.rows[0]?.quantity || 0;

    if (currentStock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ msg: `Stok tidak cukup di lokasi asal. Sisa: ${currentStock}, Diminta: ${quantity}` });
    }

    // --- 2. KURANGI STOK LOKASI ASAL (FROM) ---
    await client.query(
      'UPDATE stock_levels SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3',
      [quantity, product_id, from_location_id]
    );

    // --- 3. TAMBAH STOK LOKASI TUJUAN (TO) ---
    // Gunakan UPSERT: Tambah stok jika lokasi tujuan sudah ada, atau buat baris baru jika belum pernah ada stok di sana.
    await client.query(`
      INSERT INTO stock_levels (product_id, location_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, location_id)
      DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
    `, [product_id, to_location_id, quantity]);


    // --- 4. CATAT PERPINDAHAN ---
    const newMovement = await client.query(
      'INSERT INTO movements (product_id, from_location_id, to_location_id, quantity, reason, operator_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [product_id, from_location_id, to_location_id, quantity, reason, operator_id]
    );

    await client.query('COMMIT'); // Simpan semua perubahan
    res.status(201).json(newMovement.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK'); // Batalkan jika ada kesalahan di tengah jalan
    console.error(err.message);
    res.status(500).json({ msg: 'Gagal mencatat pergerakan: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;