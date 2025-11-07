const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const bcrypt = require('bcryptjs');

// Middleware: Hanya Admin yang boleh mengakses rute di file ini
router.use(auth, authorize(['admin']));

// GET /api/users - Ambil semua user (Hanya Admin)
router.get('/', async (req, res) => {
  try {
    // Ambil data user, tapi jangan ambil password_hash!
    const result = await db.query('SELECT id, username, role, created_at FROM users ORDER BY username ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/users/:id - Update/Edit user yang sudah ada (Hanya Admin)
router.put('/:id', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN'); // Mulai transaksi

    const { id } = req.params;
    const { username, password, role } = req.body;
    
    // 1. Cek apakah pengguna yang sedang di-edit adalah Admin
    const userToEditRes = await client.query('SELECT role FROM users WHERE id = $1', [id]);
    const originalRole = userToEditRes.rows[0]?.role;

    // 2. Jika user yang di-edit saat ini adalah ADMIN, dan role barunya BUKAN admin,
    //    kita harus pastikan ada admin lain yang tersisa.
    if (originalRole === 'admin' && role && role !== 'admin') {
      const adminCountRes = await client.query(`SELECT COUNT(*) FROM users WHERE role = 'admin'`);
      const adminCount = parseInt(adminCountRes.rows[0].count, 10);
      
      // Jika hanya tersisa SATU admin (yaitu diri sendiri/user yang sedang diubah), GAGALKAN
      if (adminCount <= 1) {
        await client.query('ROLLBACK');
        return res.status(403).json({ msg: 'Gagal. Anda adalah Admin terakhir, role Anda tidak bisa diturunkan.' });
      }
    }
    
    // --- Lanjutkan proses update jika lolos cek ---
    let query = 'UPDATE users SET username = $1, role = $2';
    let params = [username, role, id];
    let paramCount = 3;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      paramCount++;
      query += `, password_hash = $${paramCount}`;
      params.splice(2, 0, passwordHash);
    }
    
    query += ` WHERE id = $${paramCount} RETURNING id, username, role, created_at`;

    const updatedUser = await client.query(query, params);

    if (updatedUser.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: "User tidak ditemukan." });
    }
    
    await client.query('COMMIT'); // Commit jika semua sukses
    res.json(updatedUser.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error saat update user');
  } finally {
    client.release();
  }
});

// DELETE /api/users/:id - Hapus user (Hanya Admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek agar admin tidak menghapus dirinya sendiri
    if (req.user.id === parseInt(id, 10)) {
        return res.status(400).json({ msg: 'Anda tidak bisa menghapus akun Anda sendiri.' });
    }
    
    const deleteOp = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: 'User tidak ditemukan.' });
    }
    res.json({ msg: 'User berhasil dihapus.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;