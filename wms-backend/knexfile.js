```javascript
require("dotenv").config();

// Konfigurasi Database Robust untuk Vercel & Local
const dbConfig = {
  client: "pg",
  connection: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Wajib untuk Neon/Cloud DB
      }
    : {
        // Fallback ke Localhost (hanya jika DATABASE_URL tidak ada)
        host: process.env.DB_HOST || "127.0.0.1",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "password",
        database: process.env.DB_NAME || "wms_db",
        port: process.env.DB_PORT || 5432,
      },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: "./migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};

module.exports = {
  development: dbConfig,
  production: dbConfig, // Gunakan config yang SAMA untuk production
};
```;
