const Joi = require("joi");

const schemas = {
  // --- AUTH SCHEMAS ---
  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("admin", "staff").default("staff"),
  }),
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    newPasswordConfirm: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({ "any.only": "Konfirmasi password tidak cocok" }),
  }),

  // --- PRODUCT SCHEMAS ---
  createProduct: Joi.object({
    sku: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().allow("", null),
    unit: Joi.string().required(),
    purchase_price: Joi.number().min(0).required(),
    selling_price: Joi.number().min(0).required(),
    main_supplier_id: Joi.number().integer().allow(null),
    category_id: Joi.number().integer().allow(null),
    volume_m3: Joi.number().min(0).allow(null),
    initial_stock_qty: Joi.number().integer().min(0).default(0),
    initial_location_id: Joi.number().integer().allow(null),
  }),
  updateProduct: Joi.object({
    sku: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().allow("", null),
    unit: Joi.string().required(),
    purchase_price: Joi.number().min(0).required(),
    selling_price: Joi.number().min(0).required(),
    main_supplier_id: Joi.number().integer().allow(null),
    category_id: Joi.number().integer().allow(null),
    volume_m3: Joi.number().min(0).allow(null),
  }),

  // --- TRANSACTION SCHEMAS ---
  transactionIn: Joi.object({
    notes: Joi.string().allow("", null),
    supplier_id: Joi.number().integer().required(),
    items: Joi.array()
      .items(
        Joi.object({
          product_id: Joi.number().integer().required(),
          location_id: Joi.number().integer().required(),
          quantity: Joi.number().integer().min(1).required(),
          stock_status_id: Joi.number().integer().required(),
          purchase_price: Joi.number().min(0).required(),
          selling_price: Joi.number().min(0).allow(null), // Optional for IN
          batch_number: Joi.string().allow("", null),
          expiry_date: Joi.date().allow(null),
        })
      )
      .min(1)
      .required(),
  }),
  transactionOut: Joi.object({
    notes: Joi.string().allow("", null),
    customer_id: Joi.number().integer().required(),
    items: Joi.array()
      .items(
        Joi.object({
          product_id: Joi.number().integer().required(),
          location_id: Joi.number().integer().required(),
          quantity: Joi.number().integer().min(1).required(),
          stock_status_id: Joi.number().integer().required(),
          selling_price: Joi.number().min(0).required(),
          batch_number: Joi.string().allow("", null),
          expiry_date: Joi.date().allow(null),
        })
      )
      .min(1)
      .required(),
  }),
};

module.exports = schemas;
