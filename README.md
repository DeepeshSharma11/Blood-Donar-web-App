# BloodDonar - Blood Donation Platform

BloodDonar is a multi-service workspace designed to help blood donation, finding donors, and hospital coordination.

## Service Folders

The project is structured into three main folders:

*   **`/frontend`**: The user interface (Next.js, React, TypeScript, Tailwind CSS)
*   **`/backend-spring`**: The main service managing registrations and records (Spring Boot, Java 21, Maven)
*   **`/backend-fastapi`**: The supporting service for finding matches and health checks (FastAPI, Python 3.10+)

## Core Sections & Features

1.  **Management Center**: Global platform oversight, clinic verifications, and system safety checks.
2.  **Become a Donor**: Form where users can sign up as active blood donors, update their status, and check health criteria.
3.  **Find Donors**: Location-based search to find matching donors nearby.
4.  **Hospital Center**: Clinics can request blood units, view matches, and coordinate donation requests.

## Setup & Startup

To build and run the entire application stack locally using Docker Compose:
```bash
docker compose up --build
```

Setup and manual run instructions for each directory are located in their respective folders.

> **Windows PowerShell Note**: When running any local script commands (such as Maven wrappers), remember to prepend `.\` (for example, `.\mvnw.cmd` instead of `mvnw.cmd`), as PowerShell does not run local scripts directly by default.

## Deployment Guide (Vercel & Docker Hybrid)

Vercel is a serverless platform optimized for frontends; it does **not** support running persistent Docker containers, Java (Spring Boot) backends, or Python (FastAPI) WebSockets. The recommended production architecture is:

1. **Frontend (Vercel)**:
   - Import the `/frontend` subfolder directly to Vercel.
   - Configure environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) inside the Vercel dashboard.

2. **Backends (Docker Container Hosting)**:
   - Build and host the `/backend-spring` and `/backend-fastapi` folders using their respective `Dockerfile`s on container platforms like **Railway.app**, **Render.com**, **Fly.io**, or **AWS ECS / GCP Cloud Run**.