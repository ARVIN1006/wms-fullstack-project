const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role'); // <-- IMPOR authorize

// GET semua lokasi (DI-UPDATE: Izinkan 'staff' membaca)
router.get('/', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const query = `
      SELECT 
        l.id,
        l.name,
        l.description,
        COALESCE(SUM(s.quantity), 0) AS total_stock 
      FROM locations l
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

// POST tambah lokasi baru (DI-UPDATE: Hanya Admin)
router.post('/', auth, authorize(['admin']), async (req, res) => {
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

// PUT dan DELETE (Tambahkan authorize(['admin']))
// ... (Tambahkan authorize(['admin']) ke rute PUT dan DELETE jika ada)

module.exports = router;