/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return (
    knex.schema
      // Purchase Orders
      .createTable("purchase_orders", function (table) {
        table.increments("id").primary();
        table
          .integer("supplier_id")
          .references("id")
          .inTable("suppliers")
          .onDelete("SET NULL");
        table.timestamp("order_date").defaultTo(knex.fn.now());
        table.string("status").defaultTo("draft"); // draft, submitted, received, cancelled
        table.text("notes");
        table.timestamps(true, true);
      })
      .createTable("purchase_order_items", function (table) {
        table.increments("id").primary();
        table
          .integer("purchase_order_id")
          .references("id")
          .inTable("purchase_orders")
          .onDelete("CASCADE");
        table
          .integer("product_id")
          .references("id")
          .inTable("products")
          .onDelete("SET NULL");
        table.integer("quantity").notNullable();
        table.decimal("unit_price", 14, 2); // Cost price at moment of order
      })

      // Sales Orders
      .createTable("sales_orders", function (table) {
        table.increments("id").primary();
        table
          .integer("customer_id")
          .references("id")
          .inTable("customers")
          .onDelete("SET NULL");
        table.timestamp("order_date").defaultTo(knex.fn.now());
        table.string("status").defaultTo("draft"); // draft, confirmed, shipped, cancelled
        table.text("notes");
        table.timestamps(true, true);
      })
      .createTable("sales_order_items", function (table) {
        table.increments("id").primary();
        table
          .integer("sales_order_id")
          .references("id")
          .inTable("sales_orders")
          .onDelete("CASCADE");
        table
          .integer("product_id")
          .references("id")
          .inTable("products")
          .onDelete("SET NULL");
        table.integer("quantity").notNullable();
        table.decimal("unit_price", 14, 2); // Selling price at moment of order
      })
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("sales_order_items")
    .dropTableIfExists("sales_orders")
    .dropTableIfExists("purchase_order_items")
    .dropTableIfExists("purchase_orders");
};
