# Alpine — Project Documentation (`docs/`)

This directory contains the central product requirements and technical handover specifications for the **Alpine Adaptive AI Study Mentor**.

---

## Documentation Index

### 1. [Product Requirements Document (`PRD.pdf`)](PRD.pdf)
The original locked product specifications outlining:
- Class-scoped MVP boundaries (no external APIs, fixed semester curriculum, pure local algorithms).
- Core student flows (onboarding, elective/honors selection, availability, confidence ratings).
- Relational schema structure and multi-member project split.

### 2. [Frontend Elements & Backend Implementation Guide (`FRONTEND_AND_BACKEND_HANDOVER.md`)](FRONTEND_AND_BACKEND_HANDOVER.md)
**The primary handover specification for Member C (Full-Stack / Backend & Frontend Developers) — Version 2.0 (Local SQLite + Profile Switcher)**:
- **Local SQLite & SQLAlchemy 2.0 Architecture**: Replaces cloud Supabase with a zero-credential local SQLite database (`alpine.db`) running in Write-Ahead Logging (WAL) mode.
- **Profile Switcher (Zero Auth Friction)**: Replaces email/password login and JWT verification with an interactive profile switcher (`X-Student-Id` header resolution), enabling instant switching between demo learners ("Alex", "Maya", "Sam") and custom user profiles.
- **System Architecture & Sequence Diagrams**: End-to-end data flows between Next.js, FastAPI, SQLite, and the Adaptive Engine.
- **Database-to-Engine Bridge**: Complete breakdown of the **PRD Leaf Schedulable Unit Rule** (converting database topics/subtopics into `engine.models.PlanRequest`).
- **Backend REST API Specification**: Complete contract covering profile management (`/api/v1/students`), curriculum queries, student onboarding, calendar viewing, and the adaptive check-in loop.
- **Frontend UI/UX Specification**: Screen-by-screen breakdown including the top navigation Profile Switcher, Onboarding Wizard, Today's Focus Dashboard, Confidence Check-In Modal, Calendar, and Decayed Mastery Explorer.
- **One-Command Setup & Checklist**: Zero-configuration startup steps for running backend and frontend locally.

---

## Related Layer Documentation
- **Database & Data Layer (Member A)**: See [`database/README.md`](../database/README.md) for curriculum JSON seeds and synthetic data generation.
- **Adaptive Engine (Member B)**: See [`engine/README.md`](../engine/README.md) for constraint solving logic, FSRS memory retention models, and local test instructions.