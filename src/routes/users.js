const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { sql, query, audit } = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

const userUpdateSchema = z.object({
  role: z.enum(["Customer", "InventoryOfficer", "Admin"]),
  email: z.string().email(),
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(1).max(80),
  phoneNumber: z.string().min(8).max(20),
  addressLine1: z.string().min(6).max(255),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  postcode: z.string().min(4).max(12),
  isActive: z.boolean(),
  password: z.string().min(8).max(120).optional()
});

router.get("/", requireAuth(["Admin"]), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT UserID, Role, Email, FirstName, LastName, PhoneNumber, AddressLine1, City, State, Postcode, IsActive, CreatedAt
       FROM AppUser
       ORDER BY CreatedAt DESC`
    );
    res.json({ users: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireAuth(["Admin"]), async (req, res, next) => {
  try {
    const body = userUpdateSchema.parse(req.body);
    if (req.params.id === req.user.userId && (!body.isActive || body.role !== "Admin")) {
      return res.status(400).json({ error: "Admin cannot remove their own admin access." });
    }

    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
    const result = await query(
      `UPDATE AppUser
       SET Role = @role,
           Email = @email,
           FirstName = @firstName,
           LastName = @lastName,
           PhoneNumber = @phoneNumber,
           AddressLine1 = @addressLine1,
           City = @city,
           State = @state,
           Postcode = @postcode,
           PasswordHash = COALESCE(@passwordHash, PasswordHash),
           IsActive = @isActive,
           UpdatedAt = DATEADD(HOUR, 8, SYSUTCDATETIME())
       WHERE UserID = @userId`,
      {
        userId: { type: sql.NVarChar(50), value: req.params.id },
        role: { type: sql.NVarChar(30), value: body.role },
        email: { type: sql.NVarChar(255), value: body.email.toLowerCase() },
        firstName: { type: sql.NVarChar(80), value: body.firstName },
        lastName: { type: sql.NVarChar(80), value: body.lastName },
        phoneNumber: { type: sql.NVarChar(20), value: body.phoneNumber },
        addressLine1: { type: sql.NVarChar(255), value: body.addressLine1 },
        city: { type: sql.NVarChar(80), value: body.city },
        state: { type: sql.NVarChar(80), value: body.state },
        postcode: { type: sql.NVarChar(12), value: body.postcode },
        passwordHash: { type: sql.NVarChar(255), value: passwordHash },
        isActive: { type: sql.Bit, value: body.isActive }
      }
    );

    await audit({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: body.password ? "UserUpdatedWithPasswordReset" : "UserUpdated",
      targetType: "User",
      targetId: req.params.id,
      status: result.rowsAffected[0] === 1 ? "Success" : "NotFound",
      ipAddress: req.ip
    });

    if (result.rowsAffected[0] !== 1) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid user data" });
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: "This email is already used by another user." });
    }
    return next(error);
  }
});

router.delete("/:id", requireAuth(["Admin"]), async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: "Admin cannot delete their own account." });
    }

    const result = await query(
      `UPDATE AppUser
       SET IsActive = 0, UpdatedAt = DATEADD(HOUR, 8, SYSUTCDATETIME())
       WHERE UserID = @userId`,
      { userId: { type: sql.NVarChar(50), value: req.params.id } }
    );

    await audit({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: "UserDeleted",
      targetType: "User",
      targetId: req.params.id,
      status: result.rowsAffected[0] === 1 ? "Success" : "NotFound",
      ipAddress: req.ip
    });

    if (result.rowsAffected[0] !== 1) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
