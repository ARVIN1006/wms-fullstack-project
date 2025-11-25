const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// Daftar kolom yang diizinkan untuk sorting
const ALLOWED_SORT_FIELDS = [
  "sku",
  "name",
  "created_at",
  "main_supplier_id",
  "purchase_price",
  "selling_price",
];

// --- BARU: GET /api/products/categories - Ambil semua kategori ---
router.get("/categories", auth, authorize(["admin", "staff"]), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name FROM categories ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR IN /categories:", err.message);
    res.status(500).send("Server Error saat mengambil kategori.");
  }
});

// GET /api/products - DENGAN AGGREGATE STOK, FILTER KATEGORI, SEARCH, PAGINATION, DAN SORTING
router.get("/", auth, authorize(["admin", "staff"]), async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      categoryId, 
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let queryParams = [];
    let whereClauses = [];
    let paramIndex = 0;

    const sortField = ALLOWED_SORT_FIELDS.includes(sortBy)
      ? sortBy
      : "created_at";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // 1. Bangun query pencarian dan filter
    if (search) {
      paramIndex++;
      queryParams.push(`%${search}%`);
      whereClauses.push(
        `(p.sku ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`
      );
    }
    
    if (categoryId) {
        paramIndex++;
        queryParams.push(categoryId);
        whereClauses.push(`p.category_id = $${paramIndex}`);
    }

    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // 2. Query A: Hitung total data
    const countQuery = `SELECT COUNT(p.id) FROM products p 
                        ${whereString}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // 3. Query B: Ambil data (Melakukan JOIN ke Suppliers, Categories, Stock Levels, dan MAIN LOCATION)

    const limitIndex = queryParams.length + 1;
    const offsetIndex = queryParams.length + 2;

    queryParams.push(parseInt(limit));
    queryParams.push(offset);

    const dataQuery = `
      SELECT 
        p.*, 
        s.name AS supplier_name,
        c.name AS category_name, 
        COALESCE(SUM(sl.quantity), 0) AS total_quantity_in_stock,
        COALESCE(SUM(sl.quantity * sl.average_cost), 0) AS total_value_asset,
        
        -- BARU: Menggunakan LATERAL JOIN untuk mencari lokasi dengan stok terbanyak (Main Location)
        tml.location_name AS main_location_name 
      FROM products p
      LEFT JOIN suppliers s ON p.main_supplier_id = s.id 
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_levels sl ON p.id = sl.product_id
      
      -- Subquery untuk mendapatkan Main Location
      LEFT JOIN LATERAL (
          SELECT l.name AS location_name
          FROM stock_levels sl_main
          JOIN locations l ON sl_main.location_id = l.id
          WHERE sl_main.product_id = p.id AND sl_main.quantity > 0
          ORDER BY sl_main.quantity DESC
          LIMIT 1
      ) tml ON true
      
      ${whereString} 
      GROUP BY p.id, s.name, c.name, tml.location_name -- Group by Main Location Name
      ORDER BY p.${sortField} ${order} 
      LIMIT $${limitIndex} 
      OFFSET $${offsetIndex}
    `;

    const dataResult = await db.query(dataQuery, queryParams);

    // 4. Kirim Respons
    res.json({
      products: dataResult.rows,
      totalPages,
      currentPage: parseInt(page, 10),
      totalCount,
    });
  } catch (err) {
    console.error("FINAL ERROR IN GET /API/PRODUCTS:", err.message);
    res.status(500).send("Server Error: Gagal memuat data produk master.");
  }
});
// GET /api/products/:id/main-stock - Mendapatkan stok di lokasi tertentu (untuk MovementForm)
router.get(
  "/:id/main-stock",
  auth,
  authorize(["admin", "staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { locationId } = req.query; // Ambil parameter locationId dari querystring

      let queryText;
      let queryParams = [id];

      // LOGIKA DIPERBAIKI: Jika locationId spesifik diberikan, ambil stok di lokasi tersebut.
      if (locationId) {
        queryText = `
          SELECT 
            l.id AS location_id,
            l.name AS location_name,
            s.quantity
          FROM stock_levels s
          JOIN locations l ON s.location_id = l.id
          WHERE s.product_id = $1 AND l.id = $2
        `;
        queryParams.push(locationId); // $2 = locationId
      } else {
        // Logika Fallback: Ambil lokasi dengan stok terbanyak (jika tidak ada locationId)
        queryText = `
          SELECT 
            l.id AS location_id,
            l.name AS location_name,
            s.quantity
          FROM stock_levels s
          JOIN locations l ON s.location_id = l.id
          WHERE s.product_id = $1 AND s.quantity > 0
          ORDER BY s.quantity DESC
          LIMIT 1
        `;
      }


      const result = await db.query(queryText, queryParams);

      // Jika tidak ada stok, kirim 0, tapi jangan 404
      if (result.rows.length === 0) {
        return res.json({ location_id: locationId, location_name: 'N/A', quantity: 0 }); 
      }

      // Kirim data stok yang ditemukan
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// GET /api/products/:id/stock - Mendapatkan detail stok per lokasi (untuk Tabel Produk)
router.get(
  "/:id/stock",
  auth,
  authorize(["admin", "staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        `
      SELECT 
        s.quantity,
        l.name as location_name,
        l.id as location_id
      FROM stock_levels s
      JOIN locations l ON s.location_id = l.id
      WHERE s.product_id = $1 AND s.quantity > 0
      ORDER BY l.name ASC
    `,
        [id]
      );

      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// GET /api/products/by-sku/:sku (FIX: Tambah category_id dan volume_m3)
router.get(
  "/by-sku/:sku",
  auth,
  authorize(["admin", "staff"]),
  async (req, res) => {
    try {
      const { sku } = req.params;

      // Tambahkan volume_m3 dan category_id ke SELECT
      const productResult = await db.query(
        "SELECT id, sku, name, purchase_price, selling_price, volume_m3, category_id FROM products WHERE sku ILIKE $1 LIMIT 1",
        [sku]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ msg: "Produk tidak ditemukan." });
      }

      res.json(productResult.rows[0]);
    } catch (err) {
      console.error("ERROR IN /by-sku:", err.message);
      res.status(500).send("Server Error");
    }
  }
);

// POST /api/products - Tambah produk BARU (FIX: Tambahkan category_id)
router.post("/", auth, authorize(["admin", "staff"]), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Ambil semua data master
    const {
      sku,
      name,
      description,
      unit,
      purchase_price,
      selling_price,
      main_supplier_id,
      category_id, // BARU: Ambil category_id
      volume_m3,
      initial_stock_qty,
      initial_location_id,
    } = req.body;
    const operator_id = req.user.id;
    const stock_status_id = 1;

    // FIX 1: Masukkan data Master Produk (Menggunakan 9 parameter baru)
    const newProduct = await client.query(
      "INSERT INTO products (sku, name, description, unit, purchase_price, selling_price, main_supplier_id, category_id, volume_m3) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, sku",
      [
        sku,
        name,
        description,
        unit,
        purchase_price,
        selling_price,
        main_supplier_id || null,
        category_id || null, // BARU: Sisipkan category_id
        volume_m3 || 0.01, // Tambahkan volume_m3 (default 0.01 jika null)
      ]
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
        "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id) VALUES ($1, $2, $3, $4, $5)",
        [
          transactionId,
          productId,
          initial_location_id,
          initial_stock_qty,
          stock_status_id,
        ]
      );

      await client.query(
        `
          INSERT INTO stock_levels (product_id, location_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, location_id)
          DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
        `,
        [productId, initial_location_id, initial_stock_qty]
      );
    }

    await client.query("COMMIT");

    res
      .status(201)
      .json({ msg: "Produk berhasil dibuat.", product: newProduct.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERROR IN POST /API/PRODUCTS:", err.message);
    res.status(500).send("Gagal membuat produk: " + err.message);
  } finally {
    client.release();
  }
});

// PUT /api/products/:id - Update data produk (FIX: Tambahkan category_id)
router.put("/:id", auth, authorize(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sku,
      name,
      description,
      unit,
      purchase_price,
      selling_price,
      main_supplier_id,
      category_id, // BARU: Ambil category_id
      volume_m3,
    } = req.body;

    // Query UPDATE (9 parameter untuk produk)
    const updateProduct = await db.query(
      "UPDATE products SET sku = $1, name = $2, description = $3, unit = $4, purchase_price = $5, selling_price = $6, main_supplier_id = $7, category_id = $8, volume_m3 = $9 WHERE id = $10 RETURNING *",
      [
        sku,
        name,
        description,
        unit,
        purchase_price,
        selling_price,
        main_supplier_id || null,
        category_id || null, // BARU: Sisipkan category_id
        volume_m3 || 0.01,
        id,
      ]
    );

    if (updateProduct.rows.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan!" });
    }
    res.json({
      msg: "Produk berhasil diupdate!",
      product: updateProduct.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error saat update produk.");
  }
});

// DELETE /api/products/:id - Mencegah penghapusan jika masih ada stok aktif
router.delete("/:id", auth, authorize(["admin"]), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // 1. Cek Total Stok yang Tersisa untuk Produk ini
    const stockCheck = await client.query(
      "SELECT COALESCE(SUM(quantity), 0) AS total_stock FROM stock_levels WHERE product_id = $1",
      [id]
    );
    const totalStock = parseInt(stockCheck.rows[0].total_stock, 10);
    
    // 2. Jika total stok > 0, batalkan penghapusan
    if (totalStock > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        msg: `Gagal: Produk tidak dapat dihapus karena masih memiliki stok aktif sebesar ${totalStock} unit.` 
      });
    }

    // 3. Jika stok 0, lanjutkan penghapusan
    const deleteOp = await client.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (deleteOp.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: "Produk tidak ditemukan!" });
    }
    
    await client.query('COMMIT');
    res.json({ msg: "Produk berhasil dihapus!" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send("Server Error saat menghapus produk.");
  } finally {
    client.release();
  }
});

module.exports = router;