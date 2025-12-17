# 🏭 Modern Warehouse Management System (WMS)

> A full-stack, real-time inventory management solution built for modern logistics operations. Features advanced batch tracking, FIFO cost accounting, and live dashboard analytics.

**[🚀 Live Demo](https://wms-project-4dtd.vercel.app/)**

![Dashboard Preview](./assets/Dashboard.png)

## 🌟 Key Features

### 📦 Advanced Inventory Control

- **Batch & Expiry Tracking**: Monitor stock freshness with precise batch-level tracking.
- **FIFO & Average Costing**: Automatic COGS calculation using First-In-First-Out logic and Moving Average cost.
- **Stock Opname**: Digital reconciliation of physical vs system stock with audit trails.
- **Low Stock Alerts**: Real-time notifications when inventory dips below safety thresholds.

### 🔄 Order Management

- **Purchase Orders (PO)**: Complete procurement cycle from Draft -> Submitted -> Received.
- **Sales Orders (SO)**: Streamlined fulfillment with automatic stock deduction and status updates.
- **Goods Receipt & Shipment**: Validation checks to prevent shipping expired or locked stock.

### 📊 Real-Time Analytics

- **Live Dashboard**: WebSocket-powered updates for incoming/outgoing activities.
- **Financial Reports**: COGS, Gross Profit, and Inventory Valuation reports.
- **Movement History**: Complete traceability of every item moving through the warehouse.

## 🛠️ Tech Stack

**Frontend:**

- **React 18**: Component-based UI with Hooks.
- **Vite**: Lightning-fast build tool.
- **Tailwind CSS**: Modern utility-first styling.
- **Chart.js**: Interactive data visualization.
- **Socket.io Client**: Real-time event handling.

**Backend:**

- **Node.js & Express**: Robust REST API architecture.
- **PostgreSQL**: Relational database for complex data modeling.
- **Knex.js**: SQL Query Builder & Migration manager.
- **Socket.io**: Real-time server-client communication.
- **Joi**: Schemas & Data validation.

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/wms-fullstack-project.git
    cd wms-fullstack-project
    ```

2.  **Setup Backend**

    ```bash
    cd wms-backend
    npm install

    # Setup Environment Variables
    cp .env.example .env
    # Update .env with your PostgreSQL credentials

    # Run Migrations & Seed Data
    npm run migrate
    npm run seed

    # Start Server
    npm run dev
    ```

3.  **Setup Frontend**

    ```bash
    cd ../wms-frontend
    npm install
    npm run dev
    ```

4.  **Access Application**
    Open `http://localhost:5173` in your browser.
    - **Default Admin Login**: `admin` / `password123`

## 📸 Screenshots

| Dashboard                            | Stock List                               |
| ------------------------------------ | ---------------------------------------- |
| ![Dashboard](./assets/Dashboard.png) | ![Stock List](./assets/Product_list.png) |

| Order Form                             | Audit Logs                            |
| -------------------------------------- | ------------------------------------- |
| ![Order Form](./assets/Order_form.png) | ![Audit Logs](./assets/Audit_log.png) |

## 🤝 Contributing

Contributions are welcome! Please run the test suite before submitting a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

_Built with ❤️ by Arvin_
