# Secure Fashion E-Commerce Management System

SecureStyle is a SQL Server-backed fashion e-commerce management system for CCS6344 Database & Cloud Security Assignment 1. It demonstrates a role-based web application with database security controls, customer ordering, inventory management, order approval, user administration, masking, auditing, backup, and row-level security.

## Features

- Customer registration and login
- Role-based access for `Customer`, `InventoryOfficer`, and `Admin`
- Storefront catalog with cart checkout
- Pending order approval and rejection by staff
- Inventory product insertion and stock reduction
- Admin user management with edit, deactivate, and password reset
- Masked customer data view for authorized staff
- Audit log review for admins
- bcrypt password hashing
- Parameterized SQL queries through the `mssql` driver
- HTTP hardening with Helmet and login rate limiting
- SQL Server scripts for schema, seed data, roles, views, row-level security, dynamic data masking, triggers, TDE setup, and backup

## System Modules

| Module | Main Functions |
| --- | --- |
| Customer Module | Register, sign in, browse products, add items to cart, and place orders |
| Inventory Officer Module | Add products, approve or reject pending orders, and view masked customer records |
| Admin Module | Approve or reject orders, reduce product stock, manage users, reset passwords, view masked customer records, and review audit logs |

## Run With Docker

This option runs SQL Server and the web app in Docker. SSMS on Windows can connect to the SQL Server container.

### 1. Start SQL Server

```powershell
docker compose up -d sqlserver
```

Check the container:

```powershell
docker ps
```

### 2. Connect With SSMS

```text
Server type: Database Engine
Server name: localhost,1433
Authentication: SQL Server Authentication
Login: sa
Password: Password123
Trust server certificate: checked
```

### 3. Run SQL Scripts

Run these scripts in SSMS in order:

```text
sql/01_schema.sql
sql/02_seed.sql
sql/03_security.sql
```

The seed script already contains a bcrypt hash for the demo password `Password@123`.

For Docker SQL Server, the backup paths in `sql/03_security.sql` use:

```text
/var/opt/mssql/data/
```

If the TDE certificate/private key backup file already exists, SQL Server may show a file-write warning. The schema, roles, views, triggers, RLS, and database backup can still be verified separately in SSMS.

### 4. Start The Web App

```powershell
docker compose up -d --build app
```

Open:

```text
http://localhost:3000
```

## Run Inside Oracle VirtualBox

Use this option when running everything inside a Windows Server VM.

### 1. Prepare The VM

Install these inside the VM:

- Node.js 20 or newer
- Git
- Microsoft SQL Server Developer Edition or Express
- SQL Server Management Studio
- Microsoft Edge or Chrome

Recommended VM settings:

```text
RAM: 4 GB minimum, 8 GB recommended
CPU: 2 cores minimum
Disk: 40 GB minimum
Network: NAT is enough if the browser, app, SSMS, and SQL Server run inside the same VM
```

### 2. Get The Project

```powershell
git clone https://github.com/WANNABE003/Database-Cloud-Security-TC1L-G19.git
cd Database-Cloud-Security-TC1L-G19
```

### 3. Install Dependencies

```powershell
npm.cmd install
```

### 4. Configure SQL Server

Open SSMS and connect to the local SQL Server instance.

Common server names:

```text
localhost
localhost\SQLEXPRESS
.\SQLEXPRESS
```

Use Windows Authentication or SQL Server Authentication. If using `sa`, enable SQL Server Authentication mode and set the password used in `.env`.

### 5. Run SQL Scripts

Run these scripts in SSMS:

```text
sql/01_schema.sql
sql/02_seed.sql
sql/03_security.sql
```

For a normal Windows SQL Server installation, update the backup paths in `sql/03_security.sql` to a Windows folder such as:

```text
C:\SQLBackups
```

Create the folder before running the backup commands.

### 6. Configure `.env`

Copy `.env.example` to `.env`.

Example for local SQL Server:

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

For SQL Server Express:

```env
DB_SERVER=localhost\\SQLEXPRESS
```

### 7. Start The App

```powershell
npm.cmd run dev
```

Open inside the VM:

```text
http://localhost:3000
```

### 8. Optional Host Access

To open the VM website from the host machine, configure VirtualBox NAT port forwarding:

```text
Name: WebApp
Protocol: TCP
Host Port: 3000
Guest Port: 3000
```

Then open on the host:

```text
http://localhost:3000
```

## Demo Accounts

All seed users use:

```text
Password@123
```

| Role | Email |
| --- | --- |
| Admin | admin@securecart.local |
| InventoryOfficer | officer@securecart.local |
| Customer | customer@securecart.local |

New users can register from the login screen. Self-registration always creates a `Customer` account.

## Role Behaviour

The UI hides sections that the signed-in role is not allowed to use. The backend also enforces the same permissions.

| Role | Add Product | Approve/Reject Orders | Reduce Stock | Manage Users | Create Order | View Audit Logs | View Masked Customers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Admin | Yes | Yes | Yes | Yes | No | Yes | Yes |
| InventoryOfficer | Yes | Yes | No | No | No | No | Yes |
| Customer | No | No | No | No | Yes | No | No |

Pending orders show **Approve** and **Reject** actions for Admin and InventoryOfficer. Completed orders show only their final status.

## Audit Log Coverage

The `AuditLog` table records important actions, including:

- Successful and failed login attempts
- Customer registration
- Logout actions
- Product creation
- Product stock reduction and deletion
- User update and deletion
- Order creation
- Order approval and rejection
- Product updates through SQL trigger
- Order inserts through SQL trigger

Admins can view recent audit records in the website or directly in SSMS:

```sql
USE SecureECommerce;
SELECT * FROM AuditLog
ORDER BY EventTime DESC;
```

## Useful SSMS Checks

Check table data:

```sql
USE SecureECommerce;
SELECT * FROM AppUser;
SELECT * FROM Product;
SELECT * FROM CustomerOrder;
SELECT * FROM OrderItem;
SELECT * FROM AuditLog;
```

Check the RLS function:

```sql
SELECT OBJECT_DEFINITION(OBJECT_ID('Security.fn_order_access')) AS RLSFunction;
```

The function should allow `Admin` and `InventoryOfficer` to view orders for approval.
