const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

// Middleware: Semua user yang login boleh akses
router.use(auth, authorize(['admin', 'staff']));

// GET /api/customers (Ambil semua customer)
router.get('/', async (req, res) => {
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

    // Hitung total (tidak ditampilkan di frontend, tapi bagus untuk struktur)
    const countQuery = `SELECT COUNT(*) FROM customers ${whereString}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    // Ambil data
    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    const dataQuery = `SELECT * FROM customers ${whereString} ORDER BY name ASC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    const dataResult = await db.query(dataQuery, queryParams);

    res.json({ customers: dataResult.rows, totalPages, currentPage: parseInt(page, 10), totalCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/customers (Hanya Admin yang boleh membuat)
router.post('/', authorize(['admin']), async (req, res) => {
  try {
    const { name, contact_person, phone, address } = req.body;
    if (!name) return res.status(400).json({ msg: 'Nama customer wajib diisi.' });
    
    const newCustomer = await db.query(
      'INSERT INTO customers (name, contact_person, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, contact_person, phone, address]
    );
    res.status(201).json(newCustomer.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/customers/:id (Hanya Admin yang boleh mengubah)
router.put('/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, address } = req.body;
    if (!name) return res.status(400).json({ msg: 'Nama customer wajib diisi.' });
    
    const updatedCustomer = await db.query(
      'UPDATE customers SET name = $1, contact_person = $2, phone = $3, address = $4 WHERE id = $5 RETURNING *',
      [name, contact_person, phone, address, id]
    );
    if (updatedCustomer.rows.length === 0) return res.status(404).json({ msg: 'Customer tidak ditemukan.' });
    res.json(updatedCustomer.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/customers/:id (Hanya Admin yang boleh menghapus)
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOp = await db.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    if (deleteOp.rows.length === 0) return res.status(404).json({ msg: 'Customer tidak ditemukan.' });
    res.json({ msg: 'Customer berhasil dihapus.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;