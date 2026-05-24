const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { sql, query, audit } = require("../db");
const { cookieName, signSession, comparePassword, requireAuth } = require("../auth");
const { loginLimiter } = require("../middleware/security");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phoneNumber: z.string().min(8).max(20),
  addressLine1: z.string().min(6).max(255),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  postcode: z.string().min(4).max(12),
  password: z.string().min(8)
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const userId = `USR-CUST-${Date.now()}`;
    const email = body.email.toLowerCase();
    const passwordHash = await bcrypt.hash(body.password, 10);

    await query(
      `INSERT INTO AppUser
       (UserID, Role, Email, FirstName, LastName, PhoneNumber, AddressLine1, City, State, Postcode, PasswordHash, CreatedAt)
       VALUES
       (@userId, 'Customer', @email, @firstName, @lastName, @phoneNumber, @addressLine1, @city, @state, @postcode, @passwordHash, DATEADD(HOUR, 8, SYSUTCDATETIME()))`,
      {
        userId: { type: sql.NVarChar(50), value: userId },
        email: { type: sql.NVarChar(255), value: email },
        firstName: { type: sql.NVarChar(80), value: body.firstName },
        lastName: { type: sql.NVarChar(80), value: body.lastName },
        phoneNumber: { type: sql.NVarChar(20), value: body.phoneNumber },
        addressLine1: { type: sql.NVarChar(255), value: body.addressLine1 },
        city: { type: sql.NVarChar(80), value: body.city },
        state: { type: sql.NVarChar(80), value: body.state },
        postcode: { type: sql.NVarChar(12), value: body.postcode },
        passwordHash: { type: sql.NVarChar(255), value: passwordHash }
      }
    );

    await audit({
      actorId: userId,
      actorRole: "Customer",
      action: "Register",
      targetType: "User",
      targetId: userId,
      status: "Success",
      ipAddress: req.ip
    });

    res.status(201).json({ userId, email });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid registration data" });
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: "This email is already registered." });
    }
    return next(error);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await query(
      `SELECT UserID, Role, Email, FirstName, LastName, PasswordHash, IsActive
       FROM AppUser
       WHERE Email = @email`,
      { email: { type: sql.NVarChar(255), value: body.email.toLowerCase() } }
    );

    const user = result.recordset[0];
    const valid = user && user.IsActive && (await comparePassword(body.password, user.PasswordHash));

    await audit({
      actorId: user?.UserID,
      actorRole: user?.Role || "Guest",
      action: "Login",
      targetType: "User",
      targetId: user?.UserID,
      status: valid ? "Success" : "Failed",
      ipAddress: req.ip
    });

    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    res.cookie(cookieName, signSession(user), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 60 * 60 * 1000
    });

    return res.json({
      user: {
        userId: user.UserID,
        role: user.Role,
        email: user.Email,
        name: `${user.FirstName} ${user.LastName}`
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid login payload" });
    return next(error);
  }
});

router.post("/logout", requireAuth(), async (req, res, next) => {
  try {
    await audit({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: "Logout",
      targetType: "User",
      targetId: req.user.userId,
      status: "Success",
      ipAddress: req.ip
    });
    res.clearCookie(cookieName);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
