# Secure Fashion E-Commerce Management System

This project is a SQL Server-backed secure fashion e-commerce management system for CCS6344 Assignment 1. It follows the referenced project structure conceptually, but changes the business domain from banking to an online boutique.

## Features

- Role-based access for `Customer`, `InventoryOfficer`, and `Admin`
- Parameterized SQL queries through the `mssql` driver
- Password hashing with bcrypt
- HTTP hardening with Helmet and login rate limiting
- Audit logging for login, logout, product, and order actions
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
Password: Password123
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

## Option 2: Run Fully Inside Oracle VirtualBox

Use this option if using Oracle VirtualBox virtual machine. This is the easiest VirtualBox method because SQL Server, SSMS, Node.js, and the web app all run inside the same Windows VM.

### 1. Prepare The Virtual Machine

Create a Windows VM in Oracle VirtualBox and install:

- Node.js 20 or newer
- Git
- Microsoft SQL Server Developer Edition
- SQL Server Management Studio (SSMS)
- A browser such as Microsoft Edge or Chrome

Recommended VM settings:

```text
RAM: 4 GB minimum, 8 GB recommended
CPU: 2 cores minimum
Disk: 40 GB minimum
Network: NAT is enough if everything runs inside the VM
```

### 2. Get The Project Code

Inside the VM, open PowerShell and clone the repository:

```powershell
git clone https://github.com/WANNABE003/Database-Cloud-Security-TC1L-G19.git
cd Database-Cloud-Security-TC1L-G19
```

If the project folder is copied manually into the VM instead, open PowerShell inside that copied folder.

### 3. Configure SQL Server

Open SSMS inside the VM and connect to the local SQL Server instance.

Common server names:

```text
localhost
localhost\SQLEXPRESS
.\SQLEXPRESS
```

Use either Windows Authentication or SQL Server Authentication. If using SQL login, `sa` must be enabled and SQL Server Authentication mode must be turned on.

### 4. Run The Database Scripts

In SSMS, run:

```text
sql/01_schema.sql
```

Install Node dependencies:

```powershell
npm.cmd install
```

Generate the demo password hash:

```powershell
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

Create this folder in the VM before running the security script:

```text
C:\SQLBackups
```

Then run:

```text
sql/03_security.sql
```

### 5. Configure `.env`

Inside the VM, copy `.env.example` to `.env`.

Example if SQL Server is running locally in the VM:

```env
PORT=3000
JWT_SECRET=replace-with-a-long-random-secret
DB_USER=sa
DB_PASSWORD=Password123
DB_SERVER=localhost
DB_DATABASE=SecureECommerce
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

If your SQL Server instance is named `SQLEXPRESS`, use:

```env
DB_SERVER=localhost\\SQLEXPRESS
```

### 6. Start The Web App Inside The VM

```powershell
npm.cmd run dev
```

Open this inside the VM browser:

```text
http://localhost:3000
```

### 7. Optional: Open The VM Website From The Host Machine

If you want to open the website from your host Windows browser, configure VirtualBox networking:

1. Shut down the VM.
2. Open VirtualBox settings for the VM.
3. Go to Network.
4. Use either Bridged Adapter or NAT with Port Forwarding.

For NAT Port Forwarding, add:

```text
Name: WebApp
Protocol: TCP
Host Port: 3000
Guest Port: 3000
```

Then start the VM and open this on the host:

```text
http://localhost:3000
```

## Demo Accounts

All seed users use password `Password@123`.

| Role | Email |
| --- | --- |
| Admin | admin@securecart.local |
| InventoryOfficer | officer@securecart.local |
| Customer | customer@securecart.local |

## Role Behaviour

The application has three roles. The UI disables actions that the logged-in role is not allowed to perform, and the backend still enforces the same permission checks.

| Role | Add Product | Delete Product | Create Order | View Audit Logs | View Masked Customers |
| --- | --- | --- | --- | --- | --- |
| Admin | Yes | Yes | No | Yes | Yes |
| InventoryOfficer | Yes | No | No | No | Yes |
| Customer | No | No | Yes | No | No |

## Audit Log Coverage

The `AuditLog` table records important security and business actions, including:

- Successful and failed login attempts
- Logout actions
- Product creation
- Product deletion
- Order creation
- Product updates through SQL trigger
- Order inserts through SQL trigger

Admins can view recent audit records from the website using **Load Audit Logs**, or directly in SSMS:

```sql
USE SecureECommerce;
SELECT * FROM AuditLog
ORDER BY EventTime DESC;
```

