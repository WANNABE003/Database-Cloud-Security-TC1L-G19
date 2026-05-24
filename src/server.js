require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { securityHeaders } = require("./middleware/security");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const securityRoutes = require("./routes/security");
const userRoutes = require("./routes/users");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Copy .env.example to .env and configure it.");
}

const app = express();

app.use(securityHeaders);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/users", userRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "secure-ecommerce-management-system" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Secure E-Commerce Management System running on http://localhost:${port}`);
});
