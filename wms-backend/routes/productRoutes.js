const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/products - DENGAN SEARCH DAN PAGINATION
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let queryParams = [];
    let whereClauses = [];
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(sku ILIKE $${queryParams.length} OR name ILIKE $${queryParams.length})`);
    }
    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countQuery = `SELECT COUNT(*) FROM products ${whereString}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    const dataQuery = `
      SELECT * FROM products 
      ${whereString} 
      ORDER BY created_at DESC 
      LIMIT $${queryParams.length - 1} 
      OFFSET $${queryParams.length}
    `;
    const dataResult = await db.query(dataQuery, queryParams);
    res.json({
      products: dataResult.rows,
      totalPages,
      currentPage: parseInt(page, 10),
      totalCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/products
router.post('/', auth, async (req, res) => {
  try {
    const { sku, name, description, unit } = req.body;
    const newProduct = await db.query(
      'INSERT INTO products (sku, name, description, unit) VALUES ($1, $2, $3, $4) RETURNING *',
      [sku, name, description, unit]
    );
    res.json(newProduct.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/products/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, description, unit } = req.body;
    const updateProduct = await db.query(
      'UPDATE products SET sku = $1, name = $2, description = $3, unit = $4 WHERE id = $5 RETURNING *',
      [sku, name, description, unit, id]
    );
    if (updateProduct.rows.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan!" });
    }
    res.json({ msg: "Produk berhasil diupdate!", product: updateProduct.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/products/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteProduct = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (deleteProduct.rows.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan!" });
    }
    res.json({ msg: "Produk berhasil dihapus!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;