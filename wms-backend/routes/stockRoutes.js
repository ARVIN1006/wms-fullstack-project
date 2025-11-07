const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
// GET /api/stocks - (Mendapatkan semua stok untuk Dashboard)
router.get('/', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const query = `
      SELECT 
        p.name as product_name,
        p.sku,
        p.purchase_price, -- BARU: Ambil harga beli
        l.name as location_name,
        s.quantity,
        -- HITUNG NILAI STOK: quantity * purchase_price
        (s.quantity * p.purchase_price) AS stock_value
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) { /* ... */ }
});

// GET /api/stocks/low-stock - (Mencari stok tipis)
router.get('/low-stock', auth, async (req, res) => {
  try {
    // Tentukan batas stok tipis (default 10)
    const threshold = parseInt(req.query.threshold, 10) || 10;

    const query = `
      SELECT 
        p.id as product_id,
        p.sku,
        p.name as product_name,
        l.name as location_name,
        s.quantity
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE s.quantity <= $1 AND s.quantity > 0
      ORDER BY s.quantity ASC;
    `;

    const result = await db.query(query, [threshold]);
    res.json(result.rows);

  } catch (err)
 {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;