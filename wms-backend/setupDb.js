const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'database.sql')).toString();
    await db.query(sql);
    console.log("✅ Semua tabel berhasil dibuat!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Gagal membuat tabel:", err.message);
    process.exit(1);
  }
}

setupDatabase();