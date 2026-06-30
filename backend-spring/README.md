# BloodDonar Main Service (Spring Boot)

This is the main service managing donor registrations, hospital accounts, and active donation requests.

## Setup & Prerequisites

*   Java JDK 21
*   Maven (or wrapper script `mvnw`)

Ensure connection credentials are set up. You can provide them via environment variables:
```cmd
set SUPABASE_DB_HOST=your-supabase-db-host
set SUPABASE_DB_PORT=5432
set SUPABASE_DB_NAME=postgres
set SUPABASE_DB_USER=postgres
set SUPABASE_DB_PASSWORD=your-db-password
```

## Running the Service

On Windows PowerShell, you must run commands with a prepended `.\` to target the local directory folder:
```powershell
.\mvnw.cmd spring-boot:run
```
(Using `mvnw.cmd` directly will cause PowerShell to throw an error since it does not load local scripts by default).

The service will start on `http://localhost:8080`.
