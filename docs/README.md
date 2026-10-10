# Alpine — Project Documentation (`docs/`)

This directory contains the central product requirements and technical handover specifications for the **Alpine Adaptive AI Study Mentor**.

---

## Documentation Index

### 1. [Product Requirements Document (`PRD.pdf`)](PRD.pdf)
The original locked product specifications outlining:
- Class-scoped MVP boundaries (no external APIs, fixed semester curriculum, pure local algorithms).
- Core student flows (onboarding, elective/honors selection, availability, confidence ratings).
- Database entity relationship schema.
- Three-person team division of responsibilities (Member A, Member B, Member C).

### 2. [Frontend Elements & Backend Implementation Guide (`FRONTEND_AND_BACKEND_HANDOVER.md`)](FRONTEND_AND_BACKEND_HANDOVER.md)
**The primary handover specification for Member C (Full-Stack / Backend & Frontend Developers)**:
- **System Architecture & Sequence Diagrams**: End-to-end data flow between Next.js, FastAPI, Supabase, and the Adaptive Engine.
- **Database-to-Engine Bridge**: Complete breakdown of the **PRD Leaf Schedulable Unit Rule** (converting database topics/subtopics into `engine.models.PlanRequest`).
- **Backend API Specification**: Full REST contract covering onboarding, availability management, calendar querying, and the adaptive check-in loop.
- **Frontend UI/UX Specification**: Screen-by-screen breakdown including the 4-step Onboarding Wizard, Today's Focus Dashboard, Confidence Check-In Modal (1–5 scale), Interactive Calendar, and Curriculum Mastery Explorer.
- **Error Handling & Phase-by-Phase Roadmap**: Step-by-step developer checklist for seamless implementation.

---

## Related Layer Documentation
- **Database & Data Layer (Member A)**: See [`database/README.md`](../database/README.md) for migrations, seeds, and synthetic data generation.
- **Adaptive Engine (Member B)**: See [`engine/README.md`](../engine/README.md) for constraint solving logic, mathematical formulations, and local test instructions.