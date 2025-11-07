const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Impor middleware
const auth = require('../middleware/auth'); // Penjaga Login
const authorize = require('../middleware/role'); // Penjaga Role

// POST /api/auth/register (HANYA BOLEH OLEH ADMIN YANG SUDAH LOGIN)
router.post('/register', auth, authorize(['admin']), async (req, res) => {
  try {
    // Admin sekarang boleh menentukan role untuk user baru yang didaftarkan
    const { username, password, role = 'staff' } = req.body; 

    // 1. Validasi Input Sederhana
    if (!username || !password) {
      return res.status(400).json({ msg: 'Username dan Password tidak boleh kosong!' });
    }
    
    // 2. Validasi Role (Pastikan Admin tidak membuat role yang tidak valid)
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ msg: 'Role tidak valid.' });
    }

    // 3. Cek apakah username sudah ada
    const userExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ msg: 'Username sudah digunakan, coba yang lain.' });
    }

    // 4. Enkripsi (Hash) Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Simpan user baru ke database (termasuk role yang ditentukan Admin)
    const newUser = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, role] // Gunakan role yang dikirim Admin
    );

    res.status(201).json({
      msg: 'User berhasil terdaftar!',
      user: newUser.rows[0],
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error saat registrasi');
  }
});

// POST /api/auth/login (Login tetap terbuka untuk umum)
router.post('/login', async (req, res) => {
    // ... (kode login tetap sama) ...
    try {
        const { username, password } = req.body;
        if (!username || !password) {
          return res.status(400).json({ msg: 'Username dan Password tidak boleh kosong!' });
        }
        const userResult = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) {
          return res.status(400).json({ msg: 'Username tidak ditemukan.' });
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          return res.status(400).json({ msg: 'Password salah.' });
        }
        const payload = {
          user: {
            id: user.id,
            role: user.role
          }
        };
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: '1h' },
          (err, token) => {
            if (err) throw err;
            res.json({ token });
          }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error saat login');
    }
});

module.exports = router;