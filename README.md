```markdown
# VigilNODE

### AI-Assisted Criminal Investigation & Network Analysis Platform

VigilNODE is an AI-assisted investigation platform designed to help investigators organize case information, extract entities and relationships from reports, visualize criminal networks, and identify potentially significant investigative patterns.

The platform combines secure authentication, case management, natural language processing, voice transcription, graph-based relationship analysis, and rule-based anomaly detection into a unified workflow.

---

## 🚨 Overview

Traditional investigations often require investigators to manually review large amounts of information and cross-reference people, locations, organizations, vehicles, communications, and financial details.

VigilNODE provides a centralized workspace where investigators can:

- Create and manage investigation cases
- Submit text-based reports
- Convert voice reports into text
- Extract important entities and relationships
- Build case-specific criminal network graphs
- Explore connections between entities
- Identify rule-based investigative signals
- Keep cases isolated between different users
- Secure access through multi-step authentication

---

## 🔄 Investigation Workflow

```text
                 ┌─────────────────────┐
                 │   Investigator      │
                 └──────────┬──────────┘
                            │
                    Text / Voice Report
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Speech-to-Text     │
                 │      Whisper        │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ NLP Entity &        │
                 │ Relationship        │
                 │ Extraction          │
                 │ spaCy + Regex       │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Neo4j Graph       │
                 │     Database        │
                 └──────────┬──────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌─────────────────┐         ┌─────────────────┐
     │ Network         │         │ Investigative   │
     │ Visualization   │         │ Rule Engine     │
     └────────┬────────┘         └────────┬────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
                 ┌─────────────────────┐
                 │ Investigation       │
                 │ Dashboard            │
                 └─────────────────────┘
```

---

## ✨ Key Features

### 🔐 Secure Authentication

- Email and password authentication
- Fresh email OTP verification during login
- Email OTP verification during signup
- Password reset workflow
- HTTP-only authentication cookies
- Server-side session handling
- OTP hashing using HMAC-SHA256
- Pending authentication session encryption using AES-256-GCM
- Rate limiting for authentication endpoints
- Secure authentication event logging

### 📁 Case Management

- Create and manage investigation cases
- FIR-based case identification
- Case-specific reports and investigation data
- Current-user case isolation
- Case ownership enforced server-side
- Selected case synchronization across the dashboard
- Uppercase FIR normalization

### 🎙️ Voice & Text Investigation

Investigators can submit information through:

- Text reports
- Voice reports
- Audio transcription

Voice reports are processed using speech-to-text before being passed into the investigation pipeline.

### 🧠 NLP-Based Extraction

VigilNODE processes investigation reports to identify relevant information such as:

- Persons
- Locations
- Organizations
- Vehicles
- Phone numbers
- Other investigative entities
- Relationships between entities

The system combines NLP processing with rule-based extraction techniques.

### 🕸️ Criminal Network Analysis

Extracted information is represented as a graph using Neo4j.

Example:

```text
        PERSON
          │
       KNOWS
          │
          ▼
        PERSON
          │
      TRANSFER
          │
          ▼
       ACCOUNT
          │
       LINKED_TO
          │
          ▼
     ORGANIZATION
```

This allows investigators to explore relationships that may be difficult to identify from isolated records.

### 📊 Graph Visualization

The investigation graph provides a visual representation of:

- People
- Organizations
- Locations
- Vehicles
- Accounts
- Relationships
- Case-specific connections

Investigators can explore the network interactively and inspect connected entities.

### ⚠️ Investigative Signals

VigilNODE includes rule-based detection for potentially significant patterns.

Examples include:

- Unusual relationship patterns
- Repeated connections
- Suspicious network structures
- Multiple entities connected through common relationships

These signals are intended to support investigation and human review rather than automatically determine conclusions.

---

# 🏗️ System Architecture

```text
┌──────────────────────────────────────────────┐
│              React + Vite Frontend           │
│                                              │
│  Authentication │ Cases │ Reports │ Graph   │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│             Node.js + Express                │
│                                              │
│ Authentication │ OTP │ Sessions │ Security  │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  Supabase   │
                 │             │
                 │ Auth + Data │
                 └─────────────┘


┌──────────────────────────────────────────────┐
│              React Model Frontend             │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│               Python + FastAPI               │
│                                              │
│ Whisper │ NLP │ Extraction │ Rules │ Graph  │
└───────────────┬──────────────────────┬───────┘
                │                      │
                ▼                      ▼
        ┌──────────────┐       ┌──────────────┐
        │    Neo4j     │       │ Investigation│
        │ Graph DB     │       │   Pipeline   │
        └──────────────┘       └──────────────┘
```

---

# 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Authentication Server | Node.js + Express |
| AI / Processing Backend | Python + FastAPI |
| Speech-to-Text | Whisper |
| NLP | spaCy |
| Rule Engine | Python + Regex |
| Graph Database | Neo4j |
| Structured Database | Supabase |
| Graph Visualization | Cytoscape |
| Email | Nodemailer + SMTP |
| Security | Helmet, Rate Limiting, HTTP-only Cookies |
| Containerization | Docker |

---

# 📂 Project Structure

```text
VigilNODE/
│
├── secure-auth-app/
│   ├── client/
│   │   └── React Authentication Frontend
│   │
│   ├── server/
│   │   └── Express Authentication Backend
│   │
│   └── supabase/
│       └── Database Migrations
│
├── criminal-network-platform/
│   ├── frontend/
│   │   └── React Investigation Dashboard
│   │
│   └── backend/
│       ├── FastAPI Application
│       ├── NLP Processing
│       ├── Whisper Integration
│       ├── Graph Services
│       └── Investigation Rules
│
├── .gitignore
└── README.md
```

---

# 🔒 Security Architecture

VigilNODE is designed with security and user isolation as core requirements.

### Authentication

```text
Email + Password
       │
       ▼
Password Verification
       │
       ▼
Fresh Email OTP
       │
       ▼
OTP Verification
       │
       ▼
Authenticated Session
```

### Security Controls

- HTTP-only cookies
- Secure authentication sessions
- HMAC-SHA256 OTP hashing
- AES-256-GCM encryption for pending authentication sessions
- Timing-safe OTP comparison
- Authentication rate limiting
- Helmet security headers
- Server-side ownership validation
- Supabase authentication
- Row-level security for protected data
- Server-only authentication challenge tables

---

# 👤 Case & User Isolation

Each case is associated with the authenticated user's profile.

```text
User A
 ├── FIR-2026-ARREST-101
 └── FIR-2026-FRAUD-202

User B
 └── FIR-2026-BETA-999
```

Users cannot access or modify cases belonging to another user.

Case ownership is enforced server-side using the authenticated user's profile identity rather than relying only on frontend state.

---

# 🗄️ Data Architecture

VigilNODE uses two complementary data layers.

### Supabase

Stores structured application information such as:

- Users
- Profiles
- Cases
- FIR information
- Authentication events
- Case metadata

### Neo4j

Stores investigation relationships such as:

- People
- Organizations
- Locations
- Vehicles
- Accounts
- Connections
- Case-specific graph relationships

### Simple Model

```text
Supabase
   │
   ├── Who owns the case?
   ├── What is the case?
   └── What structured information belongs to it?
   
Neo4j
   │
   ├── Who is connected to whom?
   ├── What entities are related?
   └── How is the investigation network connected?
```

---

# 🧠 Investigation Processing Pipeline

```text
Report
  │
  ├── Text
  │
  └── Voice
       │
       ▼
   Whisper
       │
       ▼
 Transcribed Text
       │
       ▼
 Entity Extraction
       │
       ▼
Relationship Extraction
       │
       ▼
 Graph Construction
       │
       ▼
 Neo4j
       │
       ├── Network Visualization
       │
       └── Rule-Based Analysis
                    │
                    ▼
          Investigative Signals
```

---

# 🐳 Neo4j with Docker

Neo4j is used as the graph database for investigation networks.

The local development environment runs Neo4j inside Docker.

Default ports:

```text
Neo4j Browser → 7474
Neo4j Bolt    → 7687
```

Docker provides the isolated environment used to run the Neo4j database locally.

---

# 🚀 Local Development

## Prerequisites

Install:

- Node.js
- npm
- Python 3.x
- Docker Desktop
- Neo4j
- Supabase project

---

## 1. Clone the Repository

```bash
git clone https://github.com/ayusht0507/VigilNODE.git
cd VigilNODE
```

---

## 2. Install Authentication Dependencies

### Terminal 1 — Authentication Backend

```powershell
cd secure-auth-app/server
npm install
npm run dev
```

### Terminal 2 — Authentication Frontend

```powershell
cd secure-auth-app/client
npm install
npm run dev
```

---

## 3. Install Investigation Backend

### Terminal 3 — FastAPI Backend

```powershell
cd criminal-network-platform/backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## 4. Install Investigation Frontend

### Terminal 4 — React Frontend

```powershell
cd criminal-network-platform/frontend
npm install
npm run dev -- --port 5174
```

---

# 🌐 Local Application

Authentication application:

```text
http://localhost:5173
```

Investigation dashboard:

```text
http://localhost:5174
```

FastAPI backend:

```text
http://localhost:8000
```

Neo4j Browser:

```text
http://localhost:7474
```

---

# 🔑 Environment Variables

Create environment files locally using the provided example environment files.

Never commit real credentials, API keys, passwords, SMTP credentials, encryption keys, or Supabase service-role keys to Git.

Example structure:

```text
secure-auth-app/
├── client/
│   └── .env
│
└── server/
    └── .env

criminal-network-platform/
├── frontend/
│   └── .env
│
└── backend/
    └── .env
```

Environment files containing secrets should remain local and must not be uploaded to GitHub.

---

# 🧪 Testing

The project includes testing for:

- Authentication flow
- Email OTP verification
- Password reset
- Session handling
- Protected API access
- Case ownership
- Multi-user case isolation
- Graph isolation
- Case-specific data access
- Neo4j connectivity
- Backend health
- Frontend/backend integration

A key security requirement is:

```text
User A → Can access User A's cases
User B → Can access User B's cases
User A → Cannot access User B's cases
User B → Cannot access User A's cases
```

---

# 📌 Current Scope

The current VigilNODE implementation includes:

- Secure authentication
- Email OTP verification
- Password reset
- Case management
- FIR-based case identification
- Text report processing
- Voice report transcription
- NLP-based entity extraction
- Relationship extraction
- Neo4j graph construction
- Interactive graph visualization
- Rule-based investigative signals
- Supabase structured data
- User-level case isolation

---

# ⚠️ Current Limitations

VigilNODE is currently a prototype intended for demonstration and development.

Before production deployment, additional work would be required in areas such as:

- Large-scale infrastructure
- High availability
- Advanced monitoring
- Production-grade logging
- Comprehensive security auditing
- Deployment hardening
- Performance optimization
- Extensive model evaluation
- Integration with authorized government systems
- Data governance and retention policies
- Comprehensive testing with real-world datasets

---

# 🔮 Future Scope

Potential future development includes:

- Advanced graph analytics
- Improved entity resolution
- Multilingual speech and text processing
- Additional investigative rules
- Explainable AI-assisted insights
- Advanced anomaly detection
- Secure integration with authorized external systems
- Distributed deployment
- Real-time investigation collaboration
- Enhanced audit and compliance capabilities

---

# ⚖️ Responsible Use

VigilNODE is designed as an investigative decision-support platform.

AI-generated entities, relationships, patterns, and investigative signals should be reviewed and verified by authorized investigators before being used in any operational or legal context.

The platform is intended to assist human investigators, not replace human judgment or due process.

---

# 📊 Project Status

**Status:** Active Prototype

VigilNODE currently demonstrates an integrated workflow covering authentication, case management, report processing, NLP extraction, graph-based investigation, and user-level data isolation.

---

# 👥 Project

**VigilNODE**

**AI-Assisted Criminal Investigation & Network Analysis Platform**

Built as a technology prototype for intelligent investigation, relationship discovery, and case analysis.

---

## 📄 License

This project is intended for educational, research, and prototype development purposes.
```
