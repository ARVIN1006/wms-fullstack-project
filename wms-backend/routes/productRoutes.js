const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

const ALLOWED_SORT_FIELDS = ["sku", "name", "created_at"];
// GET /api/products - DENGAN SEARCH DAN PAGINATION
router.get("/", auth, authorize(["admin", "staff"]), async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      sortBy = "created_at", // <-- Default sorting
      sortOrder = "DESC", // <-- Default order
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let queryParams = [];
    let whereClauses = [];

    // Validasi Sortir
    const sortField = ALLOWED_SORT_FIELDS.includes(sortBy)
      ? sortBy
      : "created_at";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(
        `(sku ILIKE $${queryParams.length} OR name ILIKE $${queryParams.length})`
      );
    }

    const whereString =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Query A: Hitung total
    const countQuery = `SELECT COUNT(*) FROM products ${whereString}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Query B: Ambil data
    queryParams.push(parseInt(limit));
    queryParams.push(offset);

    // Gunakan sortField dan order langsung di query string (karena sudah divalidasi)
    const dataQuery = `
      SELECT * FROM products 
      ${whereString} 
      ORDER BY ${sortField} ${order} 
      LIMIT $${queryParams.length - 1} 
      OFFSET $${queryParams.length}
    `;

    const dataResult = await db.query(dataQuery, queryParams);

    res.json({
      products: dataResult.rows,
      totalPages,
      currentPage: parseInt(page, 10),
      totalCount,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// POST /api/products
router.post("/", auth, authorize(["admin", "staff"]), async (req, res) => {
  try {
    // TAMBAH VARIABEL HARGA
    const { sku, name, description, unit, purchase_price, selling_price } =
      req.body;

    // Tambah kolom harga ke query INSERT
    const newProduct = await db.query(
      "INSERT INTO products (sku, name, description, unit, purchase_price, selling_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [sku, name, description, unit, purchase_price, selling_price] // TAMBAH PARAMETER
    );
    res.json(newProduct.rows[0]);
  } catch (err) {
    /* ... */
  }
});

// PUT /api/products/:id
router.put('/:id', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;
    // BARU: Tambah kolom harga dari body
    const { sku, name, description, unit, purchase_price, selling_price } = req.body; 

    // Perhatikan urutan parameter ($1 sampai $7)
    const updateProduct = await db.query(
      'UPDATE products SET sku = $1, name = $2, description = $3, unit = $4, purchase_price = $5, selling_price = $6 WHERE id = $7 RETURNING *',
      [sku, name, description, unit, purchase_price, selling_price, id] // Kirim 7 parameter
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
router.delete("/:id", auth, authorize(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const deleteProduct = await db.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );
    if (deleteProduct.rows.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan!" });
    }
    res.json({ msg: "Produk berhasil dihapus!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
