# Secure Fashion E-Commerce Management System

This project is a SQL Server-backed secure fashion e-commerce management system for CCS6344 Assignment 1. It follows the referenced project structure conceptually, but changes the business domain from banking to an online boutique.

## Features

- Role-based access for `Customer`, `InventoryOfficer`, and `Admin`
- Parameterized SQL queries through the `mssql` driver
- Password hashing with bcrypt
- HTTP hardening with Helmet and login rate limiting
- Audit logging for product and order actions
- SQL Server scripts for schema, sample data, roles, views, row-level security, dynamic data masking, triggers, backup, and encryption notes
- Simple web UI for report screenshots: add product, delete product, add another product, create order, view audit logs

## Option 1: Run With Docker

This option runs both SQL Server and the web app in Docker. SSMS on Windows can still connect to the SQL Server container.

### 1. Start SQL Server

```powershell
docker compose up -d sqlserver
```

Check that the container is running:

```powershell
docker ps
```

### 2. Connect Using SSMS

Use these SSMS settings:

```text
Server type: Database Engine
Server name: localhost,1433
Authentication: SQL Server Authentication
Login: sa
Password: YourStrong@Passw0rd
Trust server certificate: checked
```

### 3. Run Database Scripts

In SSMS, run:

```text
sql/01_schema.sql
```

Generate the demo password hash using Docker:

```powershell
docker compose run --rm app node scripts/hash-password.js Password@123
```

Copy the generated hash and replace this placeholder in `sql/02_seed.sql`:

```text
$2a$10$replaceWithGeneratedBcryptHashBeforeDemo
```

Then run:

```text
sql/02_seed.sql
```

For Docker SQL Server, update the backup path near the bottom of `sql/03_security.sql`:

```sql
TO DISK = '/var/opt/mssql/data/SecureECommerce_full.bak'
```

Then run:

```text
sql/03_security.sql
```

### 4. Start The Web App

```powershell
docker compose up -d --build app
```

Open:

```text
http://localhost:3000
```

## Option 2: Run Without Docker

Use this option when running SQL Server and SSMS inside an Oracle VirtualBox Windows VM, or when SQL Server is installed directly on Windows.

### 1. Install Required Software

Install:

- Node.js 20 or newer
- Microsoft SQL Server Developer Edition
- SQL Server Management Studio (SSMS)

If using Oracle VirtualBox, install SQL Server and SSMS inside the Windows VM. Make sure the VM network allows your host machine to access SQL Server if the Node app runs outside the VM. The simplest setup is to run both SQL Server and the Node app inside the same VM.

### 2. Create SQL Server Login

In SSMS, connect to your SQL Server instance. You may use:

```text
Login: sa
Password: your SQL Server password
```

If `sa` login is disabled, enable SQL Server Authentication and restart SQL Server service, or create a new SQL login with permission to create and use the `SecureECommerce` database.

### 3. Run Database Scripts

Open SSMS and run:

```text
sql/01_schema.sql
```

Install Node dependencies:

```bash
npm install
```

On Windows PowerShell, use this if `npm.ps1` is blocked by execution policy:

```powershell
npm.cmd install
```

Generate a bcrypt hash:

```bash
node scripts/hash-password.js Password@123
```

Copy the generated hash and replace this placeholder in `sql/02_seed.sql`:

```text
$2a$10$replaceWithGeneratedBcryptHashBeforeDemo
```

Then run:

```text
sql/02_seed.sql
```

For a normal Windows SQL Server installation, keep or create this backup folder before running `sql/03_security.sql`:

```text
C:\SQLBackups
```

Then run:

```text
sql/03_security.sql
```

### 4. Configure `.env`

Copy `.env.example` to `.env` and update the database settings.

Example for SQL Server on the same machine:

```env
PORT=3000
JWT_SECRET=replace-with-a-long-random-secret
DB_USER=sa
DB_PASSWORD=YourStrong@Passw0rd
DB_SERVER=localhost
DB_DATABASE=SecureECommerce
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

If the Node app runs on your host but SQL Server runs inside a VirtualBox VM, replace `DB_SERVER=localhost` with the VM IP address. Example:

```env
DB_SERVER=192.168.56.10
```

### 5. Start The Web App

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Accounts

All seed users use password `Password@123`.

| Role | Email |
| --- | --- |
| Admin | admin@securecart.local |
| InventoryOfficer | officer@securecart.local |
| Customer | customer@securecart.local |

## Report Helpers

Use `docs/report-outline.md` for a concise report draft aligned to the assignment tasks, including STRIDE, DREAD, PDPA mapping, and screenshot checklist.
