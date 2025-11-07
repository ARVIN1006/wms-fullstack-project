const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET semua lokasi
router.get('/', auth, async (req, res) => {
  try {
    // Query ini melakukan LEFT JOIN dengan stock_levels untuk menghitung total stok
    const query = `
      SELECT 
        l.id,
        l.name,
        l.description,
        -- Menggunakan COALESCE untuk mengembalikan 0 jika tidak ada stok di lokasi tersebut
        COALESCE(SUM(s.quantity), 0) AS total_stock 
      FROM locations l
      -- LEFT JOIN agar lokasi yang TIDAK ada barangnya tetap muncul
      LEFT JOIN stock_levels s ON l.id = s.location_id 
      GROUP BY l.id, l.name, l.description
      ORDER BY l.name ASC;
    `;
    
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST tambah lokasi baru
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const newLocation = await db.query(
      'INSERT INTO locations (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.json(newLocation.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;