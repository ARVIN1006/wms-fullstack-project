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
        p.purchase_price,
        l.name as location_name,
        s.quantity,
        (s.quantity * p.purchase_price) AS stock_value
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) { 
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/stocks/low-stock - (Mencari stok tipis)
router.get('/low-stock', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
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

// GET /api/stocks/specific/:productId/:locationId - (BARU: Untuk Stock Opname)
// Mengizinkan Admin dan Staff
router.get('/specific/:productId/:locationId', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { productId, locationId } = req.params;

    const query = `
      SELECT quantity 
      FROM stock_levels 
      WHERE product_id = $1 AND location_id = $2
    `;
    
    const result = await db.query(query, [productId, locationId]);

    // Jika tidak ada data (belum pernah ada stok), kirim 0
    if (result.rows.length === 0) {
      return res.json({ system_count: 0 });
    }

    res.json({ system_count: result.rows[0].quantity });

  } catch (err) {
    console.error('ERROR IN /stocks/specific:', err.message);
    res.status(500).send('Server Error');
  }
});
module.exports = router;