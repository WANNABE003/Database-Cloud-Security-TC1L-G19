const express = require("express");
const { z } = require("zod");
const { sql, query, audit } = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

const productSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().min(3).max(40),
  price: z.number().positive(),
  stockQty: z.number().int().min(0),
  category: z.enum(["Dresses", "Outerwear", "Bags", "Skirts"])
});

const deleteStockSchema = z.object({
  quantity: z.number().int().positive()
});

const addStockSchema = z.object({
  quantity: z.number().int().positive()
});

router.get("/", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ProductID, Name, SKU, Price, StockQty, Category, IsActive, CreatedAt
       FROM Product
       WHERE IsActive = 1
       ORDER BY CreatedAt DESC`
    );
    res.json({ products: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth(["InventoryOfficer", "Admin"]), async (req, res, next) => {
  try {
    const body = productSchema.parse(req.body);
    const productId = `PRD-${Date.now()}`;

    await query(
      `INSERT INTO Product (ProductID, Name, SKU, Price, StockQty, Category, CreatedBy, CreatedAt)
       VALUES (@productId, @name, @sku, @price, @stockQty, @category, @createdBy, DATEADD(HOUR, 8, SYSUTCDATETIME()))`,
      {
        productId: { type: sql.NVarChar(50), value: productId },
        name: { type: sql.NVarChar(120), value: body.name },
        sku: { type: sql.NVarChar(40), value: body.sku },
        price: { type: sql.Decimal(18, 2), value: body.price },
        stockQty: { type: sql.Int, value: body.stockQty },
        category: { type: sql.NVarChar(80), value: body.category },
        createdBy: { type: sql.NVarChar(50), value: req.user.userId }
      }
    );

    await audit({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: "ProductCreated",
      targetType: "Product",
      targetId: productId,
      status: "Success",
      ipAddress: req.ip
    });

    res.status(201).json({ productId });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid product data" });
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: "This SKU already exists. Please use a unique SKU." });
    }
    return next(error);
  }
});

router.delete("/:id", requireAuth(["Admin"]), async (req, res, next) => {
  try {
    const body = deleteStockSchema.parse(req.body);
    const productResult = await query(
      `SELECT ProductID, StockQty
       FROM Product
       WHERE ProductID = @productId AND IsActive = 1`,
      { productId: { type: sql.NVarChar(50), value: req.params.id } }
    );

    const product = productResult.recordset[0];
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (body.quantity > product.StockQty) {
      return res.status(400).json({ error: "Delete quantity cannot be more than current stock." });
    }

    const remainingStock = product.StockQty - body.quantity;
    const result = await query(
      `UPDATE Product
       SET StockQty = @remainingStock,
           IsActive = CASE WHEN @remainingStock = 0 THEN 0 ELSE IsActive END,
           UpdatedAt = DATEADD(HOUR, 8, SYSUTCDATETIME())
       WHERE ProductID = @productId AND IsActive = 1`,
      {
        productId: { type: sql.NVarChar(50), value: req.params.id },
        remainingStock: { type: sql.Int, value: remainingStock }
      }
    );

    await audit({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: remainingStock === 0 ? "ProductDeleted" : "ProductStockReduced",
      targetType: "Product",
      targetId: req.params.id,
      status: result.rowsAffected[0] === 1 ? "Success" : "NotFound",
      ipAddress: req.ip
    });

    if (result.rowsAffected[0] !== 1) return res.status(404).json({ error: "Product not found" });
    return res.json({ ok: true, remainingStock });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Delete quantity must be at least 1." });
    return next(error);
  }
});

router.patch("/:id/stock", requireAuth(["InventoryOfficer", "Admin"]), async (req, res, next) => {
  try {
    const body = addStockSchema.parse(req.body);
    const result = await query(
      `UPDATE Product
       SET StockQty = StockQty + @quantity,
           IsActive = 1,
           UpdatedAt = DATEADD(HOUR, 8, SYSUTCDATETIME())
       WHERE ProductID = @productId`,
      {
        productId: { type: sql.NVarChar(50), value: req.params.id },
        quantity: { type: sql.Int, value: body.quantity }
      }
    );

    await audit({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: "ProductStockAdded",
      targetType: "Product",
      targetId: req.params.id,
      status: result.rowsAffected[0] === 1 ? "Success" : "NotFound",
      ipAddress: req.ip
    });

    if (result.rowsAffected[0] !== 1) return res.status(404).json({ error: "Product not found" });
    return res.json({ ok: true, addedStock: body.quantity });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Add quantity must be at least 1." });
    return next(error);
  }
});

module.exports = router;
