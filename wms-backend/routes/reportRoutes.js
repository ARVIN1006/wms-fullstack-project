const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/reports/history (SEKARANG DENGAN LIMIT)
router.get('/history', auth, async (req, res) => {
  try {
    const { limit } = req.query; // Ambil query 'limit'

    // Siapkan query dasar
    let query = `
      SELECT 
        t.id,
        t.date as transaction_date,
        t.type as transaction_type,
        t.notes,
        p.sku,
        p.name as product_name,
        l.name as location_name,
        ti.quantity
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      JOIN locations l ON ti.location_id = l.id
      ORDER BY t.date DESC
    `;
    
    const queryParams = [];

    // Jika ada query limit, tambahkan ke SQL
    if (limit) {
      queryParams.push(parseInt(limit));
      query += ` LIMIT $1`;
    }

    const result = await db.query(query, queryParams);
    res.json(result.rows);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;