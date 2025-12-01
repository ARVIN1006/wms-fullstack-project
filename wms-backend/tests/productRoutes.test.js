const request = require("supertest");
const express = require("express");
const productController = require("../controllers/productController");
const knexDb = require("../config/db-knex");

// Mock knex
jest.mock("../config/db-knex", () => {
  const mKnex = {
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue([
      { id: 1, name: "Electronics" },
      { id: 2, name: "Furniture" },
    ]),
  };
  return jest.fn(() => mKnex);
});

const app = express();
app.get("/api/products/categories", productController.getCategories);

describe("GET /api/products/categories", () => {
  it("should return list of categories", async () => {
    const res = await request(app).get("/api/products/categories");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([
      { id: 1, name: "Electronics" },
      { id: 2, name: "Furniture" },
    ]);
  });
});
