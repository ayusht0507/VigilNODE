```markdown
# VigilNODE

### AI-Assisted Criminal Investigation & Network Analysis Platform

VigilNODE is an AI-assisted investigation platform designed to transform text- and voice-based case information into structured entities, relationships, investigation graphs, and rule-based investigative signals.

The platform combines secure authentication, case management, speech-to-text, NLP-based extraction, graph-based relationship analysis, and an investigator-focused dashboard into a unified workflow.

> **Project Type:** Academic / Hackathon Prototype

---

## Overview

Investigative reports can contain large amounts of interconnected information, including people, locations, vehicles, organizations, and other entities.

Finding meaningful relationships between these entities manually can be time-consuming. VigilNODE addresses this problem by processing investigation reports and representing extracted information as a case-specific graph.

### Core Workflow

```text
                 Text / Voice Report
                         │
                         ▼
                  Speech-to-Text
                     (Whisper)
                         │
                         ▼
              NLP + Rule-Based Extraction
                 (spaCy + Regex)
                         │
                         ▼
              Entities & Relationships
                         │
                         ▼
                Neo4j Investigation Graph
                         │
                         ▼
                  Graph Analysis
                         │
                         ▼
              Investigator Dashboard
```

---

# Key Features

### 🔐 Secure Authentication

- Email/password authentication
- Email OTP verification
- Password reset
- HTTP-only authentication cookies
- Supabase-based authentication
- HMAC-SHA256 OTP protection
- AES-256-GCM protected pending authentication state
- Rate limiting
- Helmet security headers

### 📁 Case Management

- Create and manage investigation cases
- FIR-based case identification
- Case-specific data isolation
- User-level ownership enforcement
- Investigator profile and case selection
- Server-side ownership validation

### 🎙️ Voice & Text Investigation

- Text-based report submission
- Voice-based report submission
- Speech-to-text using Whisper
- NLP-based information extraction
- Rule-based extraction using Python and Regex

### 🧠 Investigation Intelligence

- Entity extraction
- Relationship extraction
- Case-specific graph construction
- Neo4j-powered relationship analysis
- Interactive graph visualization
- Rule-based anomaly and investigative signal detection

### 🗄️ Data Management

- Supabase / PostgreSQL for authentication and structured case data
- Neo4j for relationship-oriented investigation data
- Case-level graph isolation
- Separation of authentication, structured data, and graph analysis

---

# System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION LAYER                     │
└───────────────────────────────────────────────────────────────┘

        ┌──────────────────────┐
        │   React Auth Client  │
        │      Port 5173       │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Node.js / Express  │
        │      Port 5000       │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │    Supabase Auth     │
        │      + PostgreSQL    │
        └──────────────────────┘


┌───────────────────────────────────────────────────────────────┐
│                  INVESTIGATION & ANALYSIS                    │
└───────────────────────────────────────────────────────────────┘

        ┌──────────────────────┐
        │ Investigation UI     │
        │ React / Vite :5174   │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   FastAPI Backend    │
        │      Port 8000       │
        └───────┬────────┬─────┘
                │        │
                ▼        ▼
       ┌────────────┐  ┌────────────┐
       │  Supabase  │  │   Neo4j    │
       │ PostgreSQL │  │  Graph DB  │
       └────────────┘  └────────────┘
```

### Architecture Principle

> **Supabase stores what the case contains.**  
> **Neo4j represents how the case information is connected.**

This separation allows structured application data and relationship-oriented investigation data to be handled independently.

---

# Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Graph Visualization | Cytoscape |
| Authentication API | Node.js, Express |
| Authentication | Supabase Auth |
| Investigation API | Python, FastAPI |
| Speech-to-Text | Whisper |
| NLP | spaCy |
| Rule Engine | Python, Regex |
| Structured Database | Supabase / PostgreSQL |
| Graph Database | Neo4j |
| Graph Query Language | Cypher |
| Email | Nodemailer, Brevo SMTP |
| Security | HTTP-only Cookies, Helmet, Rate Limiting, HMAC-SHA256, AES-256-GCM |
| Infrastructure | Docker |
| Version Control | Git, GitHub |

---

# Project Structure

```text
VigilNODE/
│
├── secure-auth-app/
│   ├── client/
│   │   └── React authentication frontend
│   │
│   ├── server/
│   │   └── Express authentication backend
│   │
│   └── supabase/
│       └── Database migrations
│
├── criminal-network-platform/
│   ├── frontend/
│   │   └── React investigation dashboard
│   │
│   └── backend/
│       ├── app/
│       │   ├── dependencies/
│       │   ├── models/
│       │   ├── routers/
│       │   └── services/
│       │
│       └── requirements.txt
│
├── README.md
└── .gitignore
```

---

# Getting Started

## Prerequisites

Install the following before running VigilNODE locally:

- Node.js
- npm
- Python 3.x
- Git
- Docker Desktop
- A Supabase project
- Neo4j

---

# 1. Clone the Repository

```bash
git clone https://github.com/ayusht0507/VigilNODE.git
cd VigilNODE
```

---

# 2. Authentication Application

The authentication service consists of a React frontend and a Node.js / Express backend.

### Install frontend dependencies

```powershell
cd secure-auth-app/client
npm install
```

### Install backend dependencies

```powershell
cd ../server
npm install
```

### Configure environment variables

Use the provided `.env.example` files as templates.

Create the required `.env` files locally and provide your own credentials.

**Never commit real credentials, API keys, passwords, encryption keys, or authentication secrets to GitHub.**

---

# 3. Investigation Backend

Navigate to the FastAPI backend:

```powershell
cd ../../criminal-network-platform/backend
```

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```powershell
pip install -r requirements.txt
```

Configure the required environment variables using:

```text
.env.example
```

---

# 4. Investigation Frontend

Navigate to the investigation frontend:

```powershell
cd ../frontend
```

Install dependencies:

```powershell
npm install
```

For local development, configure:

```env
VITE_API_BASE=http://localhost:8000
VITE_AUTH_API_URL=http://localhost:5000
VITE_AUTH_APP_URL=http://localhost:5173
```

---

# 5. Neo4j Setup

VigilNODE uses **Neo4j** as the graph database for investigation relationships.

Make sure Docker Desktop is running.

Check the running containers:

```powershell
docker ps
```

Neo4j uses the following ports:

| Port | Purpose |
|---:|---|
| 7474 | Neo4j Browser |
| 7687 | Neo4j Bolt Protocol |

Neo4j can be accessed locally through:

```text
http://localhost:7474
```

---

# Running VigilNODE

VigilNODE uses four application processes during local development.

## Terminal 1 — Authentication Backend

```powershell
cd "VigilNODE/secure-auth-app/server"
npm run dev
```

Runs on:

```text
http://localhost:5000
```

---

## Terminal 2 — Authentication Frontend

```powershell
cd "VigilNODE/secure-auth-app/client"
npm run dev
```

Runs on:

```text
http://localhost:5173
```

---

## Terminal 3 — Investigation Backend

```powershell
cd "VigilNODE/criminal-network-platform/backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Runs on:

```text
http://localhost:8000
```

---

## Terminal 4 — Investigation Frontend

```powershell
cd "VigilNODE/criminal-network-platform/frontend"
npm run dev -- --port 5174
```

Runs on:

```text
http://localhost:5174
```

---

# Local Services

| Service | Address |
|---|---|
| Authentication Frontend | `http://localhost:5173` |
| Authentication Backend | `http://localhost:5000` |
| Investigation Frontend | `http://localhost:5174` |
| Investigation Backend | `http://localhost:8000` |
| Neo4j Browser | `http://localhost:7474` |
| Neo4j Bolt | `localhost:7687` |

---

# Data Architecture

VigilNODE separates authentication, structured application data, and relationship-oriented investigation data.

### Supabase

Used for:

- Authentication
- User profiles
- Structured case information
- Case ownership
- Application data

### Neo4j

Used for:

- Investigation entities
- Relationships
- Case-specific graph representation
- Graph-based analysis

In simple terms:

> **Supabase stores what the case contains.**

> **Neo4j represents how the case information is connected.**

---

# Security Architecture

VigilNODE incorporates multiple security mechanisms:

- Supabase authentication
- Email OTP verification
- HTTP-only cookies
- HMAC-SHA256 OTP protection
- AES-256-GCM protected pending authentication state
- Rate limiting
- Helmet security headers
- Server-side case ownership validation
- User-level case isolation
- Environment-based secret management

### Secret Management

Environment files containing credentials are excluded from version control.

The repository provides `.env.example` files containing the expected configuration variables without exposing actual secrets.

**Never commit:**

```text
.env
API keys
Passwords
SMTP credentials
JWT secrets
Encryption keys
Service-role keys
Private case data
```

---

# Case & User Isolation

Each investigation case is associated with its authenticated owner.

The application performs server-side ownership checks so that users can only access cases belonging to their account.

Conceptually:

```text
User A
 ├── FIR-2026-CASE-001
 └── FIR-2026-CASE-002

User B
 └── FIR-2026-CASE-003
```

The application prevents User A from accessing User B's cases through client-side manipulation alone.

---

# Investigation Processing

A report follows this general processing pipeline:

```text
Input
 │
 ├── Text
 │
 └── Voice
       │
       ▼
   Transcription
     (Whisper)
       │
       ▼
   Text Processing
       │
       ▼
 Entity Extraction
   (spaCy / Regex)
       │
       ▼
Relationship Extraction
       │
       ▼
 Case-Specific Graph
       │
       ▼
   Neo4j / Cypher
       │
       ▼
Graph Visualization
       │
       ▼
Investigative Signals
```

The system is designed to assist investigators in organizing and exploring complex relationships within a case.

---

# Current Scope

The current implementation includes:

- Secure authentication
- Email OTP verification
- Password reset
- Case management
- User and case isolation
- Text reports
- Voice reports
- Speech-to-text
- NLP-based entity extraction
- Relationship extraction
- Case-specific graph construction
- Neo4j graph storage
- Interactive graph visualization
- Rule-based investigative signals

---

# Limitations

VigilNODE is currently an **academic and prototype implementation**.

A production deployment would require additional work including:

- Production infrastructure and high availability
- Comprehensive monitoring and observability
- Additional security hardening
- Formal access-control policies
- Larger-scale performance testing
- Improved entity resolution
- Validation against representative datasets
- Integration with authorized external systems
- Operational, legal, and compliance requirements

The current system should therefore be considered a prototype rather than a production-ready national investigation platform.

---

# Future Scope

Potential future improvements include:

- Integration with authorized investigation systems
- Advanced graph analytics
- Improved entity resolution
- Expanded investigative rules
- Large-scale deployment
- Production monitoring and observability
- Role-based access control
- Enhanced audit and compliance capabilities
- Improved model evaluation and benchmarking

---

# Important Note

VigilNODE is an **AI-assisted investigation and analysis prototype**.

Extracted entities, relationships, anomalies, and investigative signals are intended to support investigative workflows. They should not be treated as automatic determinations of criminal activity, guilt, or legal conclusions.

---

# Project Status

**Status:** Active Prototype

The project is being developed as an academic/hackathon-oriented system demonstrating secure authentication, AI-assisted information extraction, case management, and graph-based investigation analysis.

---

# License

This project is developed as an academic and prototype project.

See the repository for the applicable project licensing terms.
```