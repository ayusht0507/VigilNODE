from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.graph_service import graph_service
from app.routers import reports, graph, anomalies


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast (but don't crash the app) if Neo4j isn't reachable at boot.
    try:
        graph_service.verify_connectivity()
        app.state.neo4j_ok = True
    except Exception:
        app.state.neo4j_ok = False
    yield
    graph_service.close()


app = FastAPI(
    title="Criminal Network Analysis Platform API",
    description="Extracts entities/relationships from crime reports, stores them in a graph, and runs anomaly detection.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router)
app.include_router(graph.router)
app.include_router(anomalies.router)

from fastapi import Depends
from app.dependencies.auth import get_current_user
from app.services import supabase_cases


@app.get("/api/auth/me", tags=["auth"])
def get_auth_me(user: dict = Depends(get_current_user)):
    """Return validated caller session details without storing or trusting client user_id."""
    return {"success": True, "user": user}


@app.get("/api/cases", tags=["cases"])
def list_user_cases(user: dict = Depends(get_current_user)):
    """List all structured cases owned by the authenticated investigator."""
    cases = supabase_cases.get_user_cases(user["id"])
    return {"success": True, "cases": cases}


@app.get("/api/cases/{fir_number}", tags=["cases"])
def get_case(fir_number: str, user: dict = Depends(get_current_user)):
    """
    Retrieve details of a specific case owned by the authenticated investigator.
    Strictly isolated: returns 404/403 if the case does not exist or belongs to another user.
    """
    clean_fir = fir_number.strip()
    # Check if case belongs to someone else
    if supabase_cases.check_fir_belongs_to_other(user["id"], clean_fir):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this case is unauthorized.",
        )

    case = supabase_cases.get_case_by_fir(user["id"], clean_fir)
    if not case:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{clean_fir}' not found.",
        )

    return {"success": True, "case": case}


@app.get("/api/health", tags=["health"])
def health_check():
    """Simple health-check endpoint used by the frontend and deploy tooling."""
    return {
        "status": "ok",
        "neo4j_connected": getattr(app.state, "neo4j_ok", False),
    }


@app.get("/", tags=["health"])
def root():
    return {"message": "Criminal Network Analysis Platform API is running. See /docs for the API reference."}
