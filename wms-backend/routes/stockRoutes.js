const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

// GET /api/stocks - (Mendapatkan semua stok untuk Dashboard) - DENGAN PAGINATION
router.get('/', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { page = 1, limit = 1000 } = req.query; // Default limit tinggi untuk dashboard
    
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    // 1. Query COUNT (Hitung total baris stok)
    const countQuery = `SELECT COUNT(*) FROM stock_levels s`;
    const countResult = await db.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parsedLimit);
    
    // 2. Query DATA
    const query = `
      SELECT 
        p.name as product_name,
        p.sku,
        s.average_cost AS purchase_price, 
        l.name as location_name,
        s.quantity,
        (s.quantity * s.average_cost) AS stock_value
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [parsedLimit, offset]);
    
    // 3. Kirim data paginated
    res.json({
        stocks: result.rows,
        totalPages,
        currentPage: parsedPage,
        totalCount
    });
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
});// BARU: POST /api/stocks/opname - Mencatat dan Menyesuaikan Stok Opname
router.post('/opname', auth, authorize(['admin', 'staff']), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN'); // Mulai transaksi database

    const { product_id, location_id, adjustment_quantity, physical_count, system_count, notes } = req.body;
    // req.user.id sudah disuntikkan dari middleware auth
    const adjustmentQty = parseInt(adjustment_quantity, 10);

    if (!product_id || !location_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ msg: 'Produk dan Lokasi wajib diisi.' });
    }
    
    // Hanya lakukan penyesuaian jika ada perbedaan (adjustmentQty != 0)
    if (adjustmentQty !== 0) {
        // Logika Update Stok (UPSERT: Tambah/Kurangi stok yang ada)
        await client.query(`
            INSERT INTO stock_levels (product_id, location_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (product_id, location_id)
            DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
        `, [product_id, location_id, adjustmentQty]);
        
        // Catat: Untuk WMS sesungguhnya, log detail opname (physical_count, system_count, notes) 
        // ke tabel khusus `stock_opname_history`
    }

    await client.query('COMMIT'); // Simpan perubahan
    
    res.status(200).json({ msg: `Stok opname berhasil dicatat. Penyesuaian: ${adjustmentQty}` });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('STOCK OPNAME ERROR:', err.message);
    res.status(500).json({ msg: 'Gagal mencatat penyesuaian stok: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;