const fs = require("fs");
const path = require("path");

const filesToDelete = [
  "src/pages/AdminControl.jsx",
  "src/pages/CustomerList.jsx",
  "src/pages/CustomerOrderReport.jsx",
  "src/pages/Dashboard.jsx",
  "src/pages/FinancialReport.jsx",
  "src/pages/LocationList.jsx",
  "src/pages/Login.jsx",
  "src/pages/MovementForm.jsx",
  "src/pages/MovementReport.jsx",
  "src/pages/PerformanceReport.jsx",
  "src/pages/ProductList.jsx",
  "src/pages/Profile.jsx",
  "src/pages/Reports.jsx",
  "src/pages/StatusInventoryReport.jsx",
  "src/pages/StockOpname.jsx",
  "src/pages/SupplierList.jsx",
  "src/pages/TransactionForm.jsx",
  "src/pages/UserActivityReport.jsx",
  "move_files.bat",
];

const baseDir = __dirname;

console.log("Starting cleanup...");

filesToDelete.forEach((file) => {
  const filePath = path.join(baseDir, file);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    } else {
      console.log(`File not found (already deleted): ${file}`);
    }
  } catch (err) {
    console.error(`Error deleting ${file}:`, err.message);
  }
});

console.log("Cleanup complete.");
