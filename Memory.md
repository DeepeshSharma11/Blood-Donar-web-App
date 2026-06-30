# Memory - BloodDonar Project

## User Intent & Goal
Build a Blood Donation Web Application with:
- Next.js frontend (TypeScript, Tailwind CSS)
- Spring Boot backend (Java, Maven)
- FastAPI backend (Python, matching features)
- Supabase (PostgreSQL database and auth)
- Four Panels/Features:
  1. Admin Panel
  2. Add Donor Panel (User)
  3. Locate Donor Panel (Needer)
  4. Hospital Panel

## Tech Stack & Architecture
- **Frontend**: Next.js (App Router, Tailwind CSS, `@supabase/supabase-js`, `lucide-react`)
- **Backend (Main)**: Spring Boot 3.x, Java 21, Maven, Spring Web, Spring Data JPA, PostgreSQL JDBC (for Supabase connection)
- **Backend (Matching)**: FastAPI, Python 3.10+, Uvicorn, Supabase Client
- **Database**: Supabase PostgreSQL

## Active Development State
- [x] Create project structure and documentation
- [x] Initialize Next.js frontend with 4 panels
- [x] Initialize Spring Boot backend with JPA Entities, Repositories, and REST Controller
- [x] Initialize FastAPI backend connected to Supabase for live matching and health screening
- [x] Real-time WebSocket broadcasting and Leaflet map selector implementation
- [x] Self-healing login and light warm-white theme refactoring
- [x] Verify local builds (Next.js builds, Spring Boot compiles, FastAPI runs)

## Technical Decisions & Patterns
- Multi-service workspace with service folders (`frontend/`, `backend-spring/`, `backend-fastapi/`).
- Shared local testing strategy.
- Next.js pages interact with FastAPI for matching and screening, and Spring Boot for operational writes. Both backend systems connect to the Supabase database.
- **Real-Time Layer**: Starlette WebSocket broadcast connection.
- **Theme**: Premium warm white styling system (`#FDFBF7` background, deep stone text, soft shadows and borders, red accents).
- **Docker Deployment**: Added individual Dockerfiles for Next.js (standalone production configuration), Spring Boot (Eclipse Temurin JRE build stage), and FastAPI, along with a root `docker-compose.yml` for multi-container orchestration.

## Do not use technical words in whole project
- don't use technical words in UI like Engineering, ai-powered, AI, Algorithm. 

## System instructions
- Make it simple as possible and easy to understand. 
- Make it beautiful, modern and user-friendly.
- Make it fast and responsive.
- Make it accessible to everyone.