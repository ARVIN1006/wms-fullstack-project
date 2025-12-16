require("dotenv").config(); // WMS Backend Service
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./config/logger");

// Impor Rute
const productRoutes = require("./routes/productRoutes");
const locationRoutes = require("./routes/locationRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const stockRoutes = require("./routes/stockRoutes");
const reportRoutes = require("./routes/reportRoutes");
const authRoutes = require("./routes/authRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const userRoutes = require("./routes/userRoutes");
const customerRoutes = require("./routes/customerRoutes");
const movementRoutes = require("./routes/movementRoutes");
const financialRoutes = require("./routes/financialRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Keamanan
app.use(helmet());

// Rate Limiting
const compression = require("compression"); // Import compression

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10000,
  message: "Terlalu banyak permintaan, santai dulu bang.",
});
app.use(limiter);

// Middleware
app.use(compression()); // Gunakan compression
app.use(cors());
app.use(express.json());

// --- SETUP SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware untuk menyisipkan io ke req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Gunakan Rute
app.use("/api/products", productRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/movements", movementRoutes);
app.use("/api/reports/financial", financialRoutes);

app.get("/", (req, res) => {
  res.send("Halo! Server WMS sudah aktif 🚀");
});

// Logika Koneksi Socket.IO
io.on("connection", (socket) => {
  logger.info("🔌 Seorang pengguna terhubung (Socket.IO)");

  socket.on("disconnect", () => {
    logger.info("❌ Pengguna terputus");
  });
});

server.listen(PORT, () => {
  logger.info(`Server berjalan di http://localhost:${PORT}`);
});
