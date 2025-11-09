const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role'); // <-- IMPOR authorize

// GET semua lokasi (DI-UPGRADE dengan Utilisasi)
router.get('/', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const query = `
      SELECT 
        l.id,
        l.name,
        l.description,
        l.max_capacity_m3,
        COALESCE(SUM(s.quantity), 0) AS total_stock, 
        
        -- BARU: Menghitung Total Volume yang Terpakai (Stok * Volume Produk)
        COALESCE(SUM(s.quantity * p.volume_m3), 0) AS current_volume_used,
        
        -- BARU: Hitung Persentase Utilisasi (Nyata)
        (COALESCE(SUM(s.quantity * p.volume_m3), 0) / l.max_capacity_m3) * 100 AS utilization_percentage
        
      FROM locations l
      LEFT JOIN stock_levels s ON l.id = s.location_id 
      LEFT JOIN products p ON s.product_id = p.id -- JOIN ke Produk untuk dapat volume
      GROUP BY l.id, l.name, l.description, l.max_capacity_m3
      ORDER BY l.name ASC;
    `;
    
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST tambah lokasi baru (DI-UPGRADE dengan Kapasitas)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  const client = await db.connect(); 
  try {
    const { name, description, max_capacity_m3 } = req.body;
    const newLocation = await client.query(
      'INSERT INTO locations (name, description, max_capacity_m3) VALUES ($1, $2, $3) RETURNING *',
      [name, description, max_capacity_m3 || 100] 
    );
    res.json(newLocation.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release(); 
  }
});

module.exports = router;