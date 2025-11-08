const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

// Daftar kolom yang diizinkan untuk sorting
const ALLOWED_SORT_FIELDS = ['sku', 'name', 'created_at', 'main_supplier_id', 'purchase_price', 'selling_price']; 

// GET /api/products - DENGAN JOIN SUPPLIER, SEARCH, PAGINATION, DAN SORTING
router.get("/", auth, authorize(["admin", "staff"]), async (req, res) => {
  try {
    const { 
      search = "", 
      page = 1, 
      limit = 10, 
      sortBy = "created_at", 
      sortOrder = "DESC"      
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let queryParams = [];
    let whereClauses = [];
    let paramIndex = 0;

    const sortField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "created_at";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    if (search) {
      paramIndex++;
      queryParams.push(`%${search}%`);
      whereClauses.push(`(p.sku ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`);
    }

    const whereString = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // Query A: Hitung total data
    const countQuery = `SELECT COUNT(p.id) FROM products p ${whereString}`; 
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Query B: Ambil data
    const limitIndex = queryParams.length + 1;
    const offsetIndex = queryParams.length + 2;

    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    
    const dataQuery = `
      SELECT 
        p.*, 
        s.name AS supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.main_supplier_id = s.id 
      ${whereString} 
      ORDER BY p.${sortField} ${order} 
      LIMIT $${limitIndex} 
      OFFSET $${offsetIndex}
    `;
    
    const dataResult = await db.query(dataQuery, queryParams);

    res.json({
      products: dataResult.rows,
      totalPages,
      currentPage: parseInt(page, 10),
      totalCount
    });

  } catch (err) {
    console.error('ERROR IN GET /API/PRODUCTS:', err.message);
    res.status(500).send('Server Error: Gagal memuat data produk master.');
  }
});
// ... (POST, PUT, DELETE, dan GET /:id/stock)
// (Pastikan rute POST/PUT/DELETE di file ini sudah sesuai dengan kode lengkap yang terakhir saya berikan)

// GET /api/products/:id/main-stock - Mendapatkan lokasi dengan stok terbanyak (untuk Auto-Fill Movement)
router.get('/:id/main-stock', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        l.id AS location_id,
        l.name AS location_name,
        s.quantity
      FROM stock_levels s
      JOIN locations l ON s.location_id = l.id
      WHERE s.product_id = $1 AND s.quantity > 0
      ORDER BY s.quantity DESC
      LIMIT 1 -- Ambil hanya yang terbanyak
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Stok produk ini kosong di semua lokasi." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/products/:id/stock - Mendapatkan detail stok per lokasi (untuk Tabel Produk)
router.get('/:id/stock', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        s.quantity,
        l.name as location_name,
        l.id as location_id
      FROM stock_levels s
      JOIN locations l ON s.location_id = l.id
      WHERE s.product_id = $1 AND s.quantity > 0
      ORDER BY l.name ASC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/products - (PERBAIKAN PADA INSERT)
router.post('/', auth, authorize(['admin', 'staff']), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { sku, name, description, unit, purchase_price, selling_price, main_supplier_id, initial_stock_qty, initial_location_id } = req.body; 
    const operator_id = req.user.id; 
    const stock_status_id = 1; 

    // 1. Masukkan data Master Produk (FIX: Tambahkan main_supplier_id di sini)
    const newProduct = await client.query(
      'INSERT INTO products (sku, name, description, unit, purchase_price, selling_price, main_supplier_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, sku',
      [sku, name, description, unit, purchase_price, selling_price, main_supplier_id || null] 
    );
    const productId = newProduct.rows[0].id;
    
    // 2. Jika ada Stok Awal, catat sebagai Transaksi Masuk
    if (initial_stock_qty > 0 && initial_location_id) {
        
        const transResult = await client.query(
            "INSERT INTO transactions (type, notes, operator_id, process_start, process_end) VALUES ('IN', $1, $2, NOW(), NOW()) RETURNING id",
            [`Stok Awal Produk Baru (${sku})`, operator_id]
        );
        const transactionId = transResult.rows[0].id;

        await client.query(
            'INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id) VALUES ($1, $2, $3, $4, $5)', 
            [transactionId, productId, initial_location_id, initial_stock_qty, stock_status_id]
        );
        
        await client.query(`
          INSERT INTO stock_levels (product_id, location_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, location_id)
          DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
        `, [productId, initial_location_id, initial_stock_qty]);
    }
    
    await client.query('COMMIT'); 

    res.status(201).json({ msg: 'Produk berhasil dibuat.', product: newProduct.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR IN POST /API/PRODUCTS:', err.message);
    res.status(500).send('Gagal membuat produk: ' + err.message);
  } finally {
    client.release();
  }
});

// PUT /api/products/:id - Update data produk (Kode ini sudah benar)
router.put('/:id', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, description, unit, purchase_price, selling_price, main_supplier_id, category_id } = req.body; 

    const updateProduct = await db.query(
      'UPDATE products SET sku = $1, name = $2, description = $3, unit = $4, purchase_price = $5, selling_price = $6, main_supplier_id = $7, category_id = $8 WHERE id = $9 RETURNING *',
      [sku, name, description, unit, purchase_price, selling_price, main_supplier_id || null, category_id || null, id]
    );

    if (updateProduct.rows.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan!" });
    }
    res.json({ msg: "Produk berhasil diupdate!", product: updateProduct.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error saat update produk.');
  }
});

// DELETE /api/products/:id (FIX: Hapus '/s' yang salah ketik)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOp = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan!" });
    }
    res.json({ msg: "Produk berhasil dihapus!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;