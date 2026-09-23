```markdown

\# VigilNODE



\## AI-Assisted Criminal Investigation \& Network Analysis Platform



VigilNODE is an AI-assisted investigation platform designed to process text and voice-based case information and represent extracted entities and relationships through an interactive investigation graph.



\## Features



\- Secure authentication

\- Email OTP verification

\- Password reset

\- HTTP-only authentication cookies

\- Case management

\- User-level case isolation

\- Text report processing

\- Voice report processing

\- Speech-to-text using Whisper

\- NLP-based entity extraction using spaCy

\- Rule-based extraction using Python and Regex

\- Neo4j investigation graphs

\- Graph visualization

\- Case-specific graph isolation

\- Rule-based anomaly and investigative signal detection

\- Investigator profile and case selection

\- Supabase-backed structured case data



\## Core Workflow



```text

Text / Voice Report

&#x20;       ↓

Speech-to-Text

&#x20;       ↓

NLP + Rule-Based Extraction

&#x20;       ↓

Entities \& Relationships

&#x20;       ↓

Neo4j Investigation Graph

&#x20;       ↓

Graph Analysis

&#x20;       ↓

Investigator Dashboard

```



\## System Architecture



```text

&#x20;                   ┌──────────────────────┐

&#x20;                   │   React Auth Client  │

&#x20;                   │      Port 5173       │

&#x20;                   └──────────┬───────────┘

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌──────────────────────┐

&#x20;                   │ Node.js / Express    │

&#x20;                   │      Port 5000       │

&#x20;                   └──────────┬───────────┘

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌──────────────────────┐

&#x20;                   │ Supabase Auth + DB   │

&#x20;                   └──────────────────────┘





&#x20;                   ┌──────────────────────┐

&#x20;                   │ Investigation UI     │

&#x20;                   │ React / Vite :5174   │

&#x20;                   └──────────┬───────────┘

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌──────────────────────┐

&#x20;                   │ FastAPI Backend      │

&#x20;                   │      Port 8000       │

&#x20;                   └───────┬───────┬──────┘

&#x20;                           │       │

&#x20;                ┌──────────┘       └──────────┐

&#x20;                ▼                             ▼

&#x20;         ┌───────────────┐             ┌──────────────┐

&#x20;         │ Supabase      │             │    Neo4j     │

&#x20;         │ PostgreSQL    │             │  Graph DB    │

&#x20;         └───────────────┘             └──────────────┘

```



\## Technology Stack



\### Frontend

\- React

\- Vite

\- Tailwind CSS

\- Cytoscape



\### Authentication

\- Node.js

\- Express

\- Supabase Auth

\- Nodemailer

\- Brevo SMTP

\- HTTP-only cookies



\### Investigation Backend

\- Python

\- FastAPI

\- Whisper

\- spaCy

\- Python Regex

\- Cypher



\### Databases

\- Supabase / PostgreSQL

\- Neo4j



\### Infrastructure

\- Docker

\- Git / GitHub



\## Project Structure



```text

VigilNODE/

│

├── secure-auth-app/

│   ├── client/

│   └── server/

│

├── criminal-network-platform/

│   ├── frontend/

│   └── backend/

│

├── README.md

└── .gitignore

```



\## Local Setup



\### Prerequisites



Install the following:



\- Node.js

\- npm

\- Python 3.x

\- Git

\- Docker Desktop

\- A Supabase project

\- Neo4j



\### 1. Clone the Repository



```bash

git clone https://github.com/YOUR\_USERNAME/VigilNODE.git

cd VigilNODE

```



\### 2. Authentication Application



Install client dependencies:



```bash

cd secure-auth-app/client

npm install

```



Install server dependencies:



```bash

cd ../server

npm install

```



Configure the required environment variables using the provided `.env.example` files.



\### 3. Investigation Backend



```bash

cd ../../criminal-network-platform/backend

```



Create a Python virtual environment:



```powershell

python -m venv .venv

```



Activate it on Windows:



```powershell

.\\.venv\\Scripts\\Activate.ps1

```



Install dependencies:



```powershell

pip install -r requirements.txt

```



Configure the required environment variables.



\### 4. Investigation Frontend



```bash

cd ../frontend

npm install

```



For local development, configure the frontend environment variables:



```env

VITE\_API\_BASE=http://localhost:8000

VITE\_AUTH\_API\_URL=http://localhost:5000

VITE\_AUTH\_APP\_URL=http://localhost:5173

```



\### 5. Neo4j



VigilNODE uses Neo4j as the investigation graph database.



Make sure Docker Desktop is running and verify the Neo4j container:



```powershell

docker ps

```



Neo4j uses:



```text

7474  → Neo4j Browser

7687  → Neo4j Bolt

```



\## Running VigilNODE



\### Terminal 1 — Authentication Backend



```powershell

cd "VigilNODE/secure-auth-app/server"

npm run dev

```



\### Terminal 2 — Authentication Frontend



```powershell

cd "VigilNODE/secure-auth-app/client"

npm run dev

```



\### Terminal 3 — Investigation Backend



```powershell

cd "VigilNODE/criminal-network-platform/backend"

.\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

```



\### Terminal 4 — Investigation Frontend



```powershell

cd "VigilNODE/criminal-network-platform/frontend"

npm run dev -- --port 5174

```



\## Local URLs



| Service | URL |

|---|---|

| Authentication Frontend | http://localhost:5173 |

| Authentication Backend | http://localhost:5000 |

| Investigation Frontend | http://localhost:5174 |

| Investigation Backend | http://localhost:8000 |

| Neo4j Browser | http://localhost:7474 |



\## Data Architecture



Supabase is used for authentication and structured application data.



Neo4j is used for relationship-oriented investigation data.



In simple terms:



> \*\*Supabase stores what the case contains.\*\*



> \*\*Neo4j shows how the case information is connected.\*\*



\## Security



VigilNODE includes multiple security mechanisms:



\- Supabase authentication

\- Email OTP verification

\- HTTP-only cookies

\- HMAC-SHA256 OTP protection

\- AES-256-GCM protected pending authentication state

\- Rate limiting

\- Helmet security headers

\- Server-side case ownership checks

\- User-level case isolation



Never commit real credentials, API keys, passwords, authentication secrets, or private case data to GitHub.



\## Important Note



VigilNODE is an AI-assisted investigation and analysis prototype.



Extracted entities, relationships, and investigative signals are intended to support investigative workflows and should not be treated as automatic determinations of criminal activity.



\## Current Scope



The current implementation focuses on:



\- Secure authentication

\- Case management

\- Text and voice reports

\- Speech-to-text

\- NLP-based entity extraction

\- Relationship extraction

\- Case-specific graph construction

\- Graph visualization

\- Rule-based investigative signals

\- User and case isolation



\## Future Scope



\- Integration with authorized external investigation systems

\- Larger-scale deployment

\- Advanced graph analytics

\- Improved entity resolution

\- Additional investigative rules

\- Production monitoring and observability

\- Role-based access control

\- Enhanced audit and compliance capabilities



\## License



This project is developed as an academic and prototype project.

```

