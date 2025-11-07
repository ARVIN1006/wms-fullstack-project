const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth'); // Kita amankan semua rute
const authorize = require('../middleware/role');

// GET /api/suppliers (Ambil semua supplier)
// Kita buat ini bisa pagination & search juga, untuk jaga-jaga
router.get('/', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let queryParams = [];
    let whereClauses = [];

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(name ILIKE $${queryParams.length} OR contact_person ILIKE $${queryParams.length})`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Hitung total
    const countQuery = `SELECT COUNT(*) FROM suppliers ${whereString}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Ambil data
    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    
    const dataQuery = `
      SELECT * FROM suppliers 
      ${whereString} 
      ORDER BY name ASC 
      LIMIT $${queryParams.length - 1} 
      OFFSET $${queryParams.length}
    `;
    
    const dataResult = await db.query(dataQuery, queryParams);

    res.json({
      suppliers: dataResult.rows,
      totalPages,
      currentPage: parseInt(page, 10),
      totalCount
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/suppliers (Buat supplier baru)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const { name, contact_person, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Nama supplier wajib diisi.' });
    }
    const newSupplier = await db.query(
      'INSERT INTO suppliers (name, contact_person, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, contact_person, phone, address]
    );
    res.status(201).json(newSupplier.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/suppliers/:id (Update supplier)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Nama supplier wajib diisi.' });
    }
    const updatedSupplier = await db.query(
      'UPDATE suppliers SET name = $1, contact_person = $2, phone = $3, address = $4 WHERE id = $5 RETURNING *',
      [name, contact_person, phone, address, id]
    );
    if (updatedSupplier.rows.length === 0) {
      return res.status(404).json({ msg: 'Supplier tidak ditemukan.' });
    }
    res.json(updatedSupplier.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/suppliers/:id (Hapus supplier)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOp = await db.query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [id]);
    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: 'Supplier tidak ditemukan.' });
    }
    res.json({ msg: 'Supplier berhasil dihapus.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;