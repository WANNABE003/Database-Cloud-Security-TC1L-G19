const sql = require("mssql");

const rawServer = process.env.DB_SERVER || "localhost";
const [serverName, instanceName] = rawServer.split("\\");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: serverName,
  database: process.env.DB_DATABASE || "SecureECommerce",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
    ...(instanceName ? { instanceName } : {})
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config);
  }
  return poolPromise;
}

async function query(text, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  Object.entries(params).forEach(([name, param]) => {
    request.input(name, param.type, param.value);
  });

  return request.query(text);
}

async function audit({ actorId, actorRole, action, targetType, targetId, status, ipAddress }) {
  await query(
    `INSERT INTO AuditLog (EventTime, ActorID, ActorRole, Action, TargetType, TargetID, Status, IpAddress)
     VALUES (DATEADD(HOUR, 8, SYSUTCDATETIME()), @actorId, @actorRole, @action, @targetType, @targetId, @status, @ipAddress)`,
    {
      actorId: { type: sql.NVarChar(50), value: actorId || "anonymous" },
      actorRole: { type: sql.NVarChar(30), value: actorRole || "Guest" },
      action: { type: sql.NVarChar(100), value: action },
      targetType: { type: sql.NVarChar(50), value: targetType },
      targetId: { type: sql.NVarChar(50), value: targetId || null },
      status: { type: sql.NVarChar(30), value: status },
      ipAddress: { type: sql.NVarChar(64), value: ipAddress || null }
    }
  );
}

async function setSecurityContext(user) {
  if (!user) return;

  await query(
    `EXEC sp_set_session_context @key=N'user_id', @value=@userId;
     EXEC sp_set_session_context @key=N'user_role', @value=@userRole;
     EXEC sp_set_session_context @key=N'actor_id', @value=@userId;
     EXEC sp_set_session_context @key=N'actor_role', @value=@userRole;`,
    {
      userId: { type: sql.NVarChar(50), value: user.userId },
      userRole: { type: sql.NVarChar(30), value: user.role }
    }
  );
}

module.exports = { sql, query, audit, getPool, setSecurityContext };
